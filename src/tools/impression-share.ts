import { AppleAdsClient } from '../client.js';
import {
  formatImpressionShareJSON,
  type ImpressionShareEntry,
} from '../utils/formatters.js';

const DAILY_LIMIT = 10;
const DEFAULT_MAX_POLL_ATTEMPTS = 30;
const DEFAULT_POLL_INTERVAL_MS = 2000;
// Floor for pollIntervalMs to avoid tight-looping against Apple's API.
const MIN_POLL_INTERVAL_MS = 500;
// Matches the client.ts error format `Apple Ads API error (${status}): ...`
// anchored on the status code so we don't false-positive on a 403 substring
// appearing elsewhere in an error body.
const UPSTREAM_403_PATTERN = /Apple Ads API error \(403\)/;
// Apple report states we treat as "still pending — keep polling". Anything
// outside this set (besides COMPLETED / FAILED / ERROR) is surfaced as an
// error so a new terminal state from Apple (CANCELLED, EXPIRED, etc.) cannot
// silently masquerade as a poll timeout.
const PENDING_STATES: ReadonlySet<unknown> = new Set([
  'IN_PROGRESS',
  'PENDING',
  'QUEUED',
  undefined,
  null,
]);

export interface GetImpressionShareOptions {
  /** Delay between poll attempts in ms. Floored at 500ms. Defaults to 2000. */
  pollIntervalMs?: number;
  /** Max number of GET polls before returning a timeout error. Defaults to 30. */
  maxPollAttempts?: number;
  /** Sleep implementation — tests inject a no-op. */
  sleep?: (ms: number) => Promise<void>;
}

// Impression Share lives on /custom-reports (two-step async flow), NOT on the
// standard /reports/campaigns/{id}/* endpoints. See
// docs/apple-ads/investigations/sov-404-investigation-2026-04-16.md for the
// full root-cause investigation.
//
// Flow:
//   1. POST /custom-reports with reportType=IMPRESSION_SHARE — returns {id}
//   2. Poll GET /custom-reports/{id} until state === 'COMPLETED'
//   3. Parse reportingDataResponse.row from the completed payload
//
// UPSTREAM CAVEAT (reported April 2026): Apple's GET leg of this flow was
// returning 403 HTML gateway errors for many developers (Apple Developer
// Forum thread 820073). We heuristically detect that failure mode so the
// agent surfaces a clear message instead of blaming our MCP.
// REVIEW after 2026-04-23 check-in — if Apple's GET returns 200, this branch
// and its message become obsolete and can be simplified.
export async function getImpressionShare(
  client: AppleAdsClient,
  campaignId: string,
  startDate: string,
  endDate: string,
  currentDailyCount: number,
  options: GetImpressionShareOptions = {}
): Promise<{ entries: ImpressionShareEntry[]; json?: string; error?: string }> {
  if (currentDailyCount >= DAILY_LIMIT) {
    return {
      error: 'Daily impression share report limit reached (10/day)',
      entries: [],
    };
  }

  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const pollInterval = Math.max(
    MIN_POLL_INTERVAL_MS,
    options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  );
  const maxAttempts = options.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;

  const createBody = {
    name: `ImpressionShare_${campaignId}_${Date.now()}`,
    startTime: startDate,
    endTime: endDate,
    reportType: 'IMPRESSION_SHARE',
    dimensions: ['searchTerm', 'countryOrRegion'],
    metrics: [
      'lowImpressionShare',
      'highImpressionShare',
      'rank',
      'searchPopularity',
    ],
    granularity: 'MONTHLY',
    selector: {
      conditions: [
        { field: 'campaignId', operator: 'IN', values: [campaignId] },
      ],
      orderBy: [{ field: 'rank', sortOrder: 'ASCENDING' }],
      pagination: { limit: 1000, offset: 0 },
    },
  };

  let reportId: string;
  try {
    const createResult = await client.post('/custom-reports', createBody);
    reportId = createResult?.data?.id;
    if (!reportId) {
      return {
        error: 'Custom report creation returned no report id',
        entries: [],
      };
    }
  } catch (err: any) {
    return {
      error: `Failed to create custom report: ${err?.message ?? String(err)}`,
      entries: [],
    };
  }

  let reportPayload: any = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const pollResult = await client.get(`/custom-reports/${reportId}`);
      const state = pollResult?.data?.state;

      if (state === 'COMPLETED') {
        reportPayload = pollResult.data;
        break;
      }

      if (state === 'FAILED' || state === 'ERROR') {
        return {
          error: `Custom report ${reportId} failed with state: ${state}`,
          entries: [],
        };
      }

      if (!PENDING_STATES.has(state)) {
        return {
          error: `Custom report ${reportId} returned unexpected state: ${JSON.stringify(state)}`,
          entries: [],
        };
      }

      await sleep(pollInterval);
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      if (UPSTREAM_403_PATTERN.test(errMsg)) {
        return {
          error:
            `Custom report download blocked by Apple upstream (403). ` +
            `Reported as a known issue during April 2026 — see ` +
            `docs/apple-ads/investigations/sov-404-investigation-2026-04-16.md. ` +
            `Report id: ${reportId}`,
          entries: [],
        };
      }
      return {
        error: `Failed to poll custom report ${reportId}: ${errMsg}`,
        entries: [],
      };
    }
  }

  if (!reportPayload) {
    return {
      error: `Custom report ${reportId} did not complete within ${maxAttempts} poll attempts`,
      entries: [],
    };
  }

  // Extract entries. Apple docs (CustomReportResponse) show rows nested under
  // reportingDataResponse.row; some payloads return a flat top-level row.
  // Accept both shapes, but fail loudly if NEITHER is present — a silent
  // `entries: []` here is exactly the class of bug the original investigation
  // was chasing.
  const envelope = reportPayload.reportingDataResponse ?? reportPayload;
  if (!('row' in envelope)) {
    return {
      error:
        `Custom report ${reportId} payload missing 'row' field — Apple may ` +
        `have changed the response envelope. Top-level keys: ` +
        Object.keys(reportPayload).join(', '),
      entries: [],
    };
  }
  const rows = envelope.row;
  if (!Array.isArray(rows)) {
    return {
      error: `Custom report ${reportId} 'row' field is not an array (got ${typeof rows})`,
      entries: [],
    };
  }

  const entries: ImpressionShareEntry[] = rows.map((row: any) => ({
    keyword: row.metadata?.searchTerm ?? row.metadata?.keyword ?? '',
    campaign: row.metadata?.campaignName || campaignId,
    impressionShare:
      row.total?.impressionShare ?? row.total?.highImpressionShare ?? '0',
    rank: row.total?.rank ?? 0,
    searchPopularity: row.total?.searchPopularity ?? 0,
  }));

  return {
    entries,
    json: formatImpressionShareJSON(entries, startDate),
  };
}
