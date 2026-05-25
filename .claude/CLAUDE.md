# Apple Ads MCP Server

STDIO MCP server wrapping Apple's Search Ads Campaign Management API v5.

## Tech Stack
- **Runtime**: Node.js (ESM)
- **MCP SDK**: `@modelcontextprotocol/sdk` with stdio transport
- **Auth**: `jose` for ES256 JWT signing (Apple OAuth 2.0)
- **Validation**: `zod` for input schemas
- **Testing**: `vitest`
- **Language**: TypeScript

## Commands
```bash
npm test              # Run all tests (vitest)
npm run test:watch    # Watch mode
npm run build         # TypeScript compile to dist/
npm start             # Run the MCP server (requires API credentials)
```

## Architecture
```
src/
├── index.ts          # MCP server entry point (McpServer + stdio transport)
├── auth.ts           # JWT signing, token caching, auto-refresh
├── client.ts         # HTTP client with retry, rate limit parsing, pagination
├── tools/            # One file per MCP tool group
│   ├── campaigns.ts  # get_campaigns, get_campaign_performance
│   ├── campaign-management.ts # create/update campaign, create/update/list ad groups
│   ├── keywords.ts   # get_keyword_performance, update_keyword_bid, add/pause
│   ├── search-terms.ts
│   ├── impression-share.ts (rate-limit aware: max 10/day)
│   ├── budget.ts
│   └── negatives.ts
└── utils/
    ├── pkei.ts       # PKEI formula (pure function)
    └── formatters.ts # CSV/JSON output formatters
```

## Key Design Decisions
- **No sandbox**: Apple Search Ads API has no sandbox — all tests mock at the client level
- **PKEI server-side**: PKEI scores are calculated in the MCP server, not by the agent
- **Rate limit awareness**: `X-Rate-Limit` header parsed on every response; impression share capped at 10/day
- **Token auto-refresh**: Tokens cached and refreshed 60s before 3600s expiry
- **CSV-first output**: Reports return pre-formatted CSV for direct file storage by the agent

## Environment Variables
See `.env.example` for required credentials. Never commit `.env` or private keys.
