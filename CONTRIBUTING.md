# Contributing

Thanks for your interest in improving `apple-ads-mcp-agent`. Contributions of all sizes are welcome: bug fixes, new tools, docs, and methodology improvements.

## Getting set up

```bash
git clone https://github.com/MakingJamie/apple-ads-mcp-agent.git
cd apple-ads-mcp-agent
npm install
npm run build
npm test
```

Requires Node 20 or later (the `jose` JWT library relies on the global Web Crypto API, which Node exposes without a flag from 20+).

## Development workflow

- `npm test` runs the unit/integration suite (Vitest).
- `npm run test:coverage` runs the suite with coverage and enforces the thresholds in `vitest.config.ts`.
- `npm run build` compiles TypeScript to `dist/`.
- `npm run test:watch` is handy while iterating.

CI runs build + coverage on Node 20 and 22. Please make sure both pass before opening a PR.

## Testing notes

The Apple Search Ads API has no sandbox, so **all tests mock at the client boundary** (`AppleAdsClient`). Do not write tests that hit the live API. When adding a tool:

1. Add the tool function under `src/tools/` and keep it pure where possible (no direct env reads; pass config in).
2. Mirror the existing test pattern in `test/tools/` (see `keywords.test.ts`): mock `client.get/post/put`, assert both the request body sent and the parsed result.
3. Register the tool in `src/index.ts` and thread any deployment defaults via `src/config.ts`.
4. Keep coverage at or above the configured thresholds.

## Code style

- TypeScript, ESM (note the `.js` import extensions, required for Node ESM resolution).
- Match the conventions in `src/auth.ts` and `src/client.ts`.
- Currency and other deployment specifics are configuration, not hardcoded values. Read them from `src/config.ts`, never inline a default like `'EUR'`.
- Prose in docs avoids em dashes; use periods, commas, colons, or parentheses.

## Pull requests

- Keep PRs focused; one logical change per PR.
- Describe what changed and why. If it changes tool behavior, note it.
- Ensure `npm run build` and `npm run test:coverage` are green.

## Reporting bugs

Open an issue with steps to reproduce, the tool involved, and any error output (with credentials redacted). For security issues, see [SECURITY.md](./SECURITY.md) instead of filing a public issue.
