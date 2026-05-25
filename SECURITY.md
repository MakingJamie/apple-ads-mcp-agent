# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security vulnerabilities.

Instead, use GitHub's private vulnerability reporting: go to the **Security** tab of this repository and click **Report a vulnerability**. This opens a private advisory visible only to the maintainers.

Please include:
- A description of the issue and its impact
- Steps to reproduce
- Any relevant logs or proof of concept (with credentials and account data redacted)

You can expect an initial response within a few days. Once a fix is available, we will coordinate disclosure.

## Supported versions

This project is pre-1.0; security fixes are applied to the latest released version on `main`.

## Handling credentials (for users of this tool)

This tool authenticates against the Apple Search Ads API with a private key and signs ES256 JWTs locally. To stay secure:

- **Never commit your private key or `.env`.** The repository's `.gitignore` excludes `.env`, `*.pem`, and all generated account data by default, but verify with `git status --ignored` before your first commit.
- Store the Apple private key outside the repository and reference it by absolute path via `APPLE_ADS_PRIVATE_KEY_PATH`.
- Treat the generated `data/`, `strategy/`, change ledger, and agent memory as sensitive: they contain real campaign performance and spend. They are gitignored by default; keep them that way.
- Rotate your Apple Search Ads API certificate before it expires (Apple certificates are valid for 24 months).

## Scope

The MCP server makes outbound requests only to Apple's official endpoints (`appleid.apple.com` for token exchange and `api.searchads.apple.com` for the Campaign Management API). It does not transmit your data anywhere else.
