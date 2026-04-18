# DomainKeeper

[View Simplified Chinese README](./README.md)

DomainKeeper is the English README for `域管家（DomainKeeper）`, a hosted domain management tool provided on `sanpin.ltd`.

## Brand Identity

- Chinese name: 域管家
- English name: DomainKeeper
- Official site: https://sanpin.ltd/

GitHub, the official site, and the in-site docs use `域管家（DomainKeeper） / sanpin.ltd` as one public brand identity.

This is a closed-source hosted product. Customers buy activation codes and usage access on the official site. Source code and self-hosting are not provided.

This GitHub repository is for public-facing product information, entry links, and preview screenshots only. It does not include Worker source code, activation-code logic, or private deployment details.

## Public Entry Points

- Homepage: https://sanpin.ltd/
- Docs: https://sanpin.ltd/docs
- Register: https://sanpin.ltd/register
- Login: https://sanpin.ltd/login
- Password reset: https://sanpin.ltd/login?authMode=reset
- Frontend demo: https://sanpin.ltd/test
- Admin demo: https://test.sanpin.ltd/admin
- Public market demo: https://test.sanpin.ltd/market
- Activation-code purchase: https://fk.bacon123.eu.org/products/domainkeeper

## Screenshots

### Frontend

[![Frontend preview](https://cdn1.sanpin.ltd/frontend-demo-viewport.png?v=1.9.75)](https://sanpin.ltd/test)

### Admin

[![Admin preview](https://cdn1.sanpin.ltd/admin-demo-viewport.png?v=1.9.75)](https://sanpin.ltd/test/admin)

### Market

[![Market preview](https://cdn1.sanpin.ltd/market-demo-viewport.png?v=1.9.75)](https://sanpin.ltd/test/market)

## Routing

If your username is `abc`, the system creates these three stable entries:

- Frontend: `abc.sanpin.ltd`
- Admin: `abc.sanpin.ltd/admin`
- Public market: `abc.sanpin.ltd/market`

Legacy path routes are still accepted and redirected to the subdomain form:

- Frontend: `/abc`
- Admin: `/abc/admin`
- Public market: `/abc/market`

The demo account follows the same rule: `sanpin.ltd/test*` redirects to `test.sanpin.ltd*`.

For the current custom-domain onboarding phase:

- Point your domain, for example `sale.example.com`, to `abc.sanpin.ltd` with a `CNAME`
- Add `_acme-challenge.sale.example.com CNAME sale.example.com.88b45d2aa589730e.dcv.cloudflare.com`
- After onboarding, these routes work:
  - `sale.example.com`
  - `sale.example.com/admin`
  - `sale.example.com/market`

## Highlights

- Manage top-level domains, subdomains, and connected custom domains in one place
- Switch between top-level and subdomain views with synced registration, expiration, and remaining-time columns
- Sort, filter, enrich WHOIS automatically, and fill missing data manually
- Sync domains from Cloudflare and DNSPod, and refresh WHOIS for the top-level domains currently in the snapshot
- Frontend, admin, and public market pages read from the latest sync snapshot; public pages also use short caching for faster loading
- Keep the default sort as “least remaining time first,” while still allowing account-level override
- Control whether domains are clickable from the admin side
- Show pricing in both the frontend list and the public market
- Add taglines or domain meaning notes that appear in both public views
- Search the public market by domain, registrar, and tagline
- Manage DNS records directly in admin based on the current hosting provider
- Keep contact methods as structured fields with built-in `Email / WeChat / QQ / Phone`, while still accepting custom fields and legacy text values
- Support DNSHE `API Key / Secret` and DNSPod `Token` in account settings and sync those domains into the same snapshot
- Auto-complete parent WHOIS for DNSHE subdomains and show a single current DNS hosting provider in the type column
- Detect DNSHE’s 180-day renewal window and backfill the current expiration date when needed
- Keep each user’s username, routes, and data fully isolated

## Admin Settings

- Site title
- Market contact methods
- Contact parsing and copy-ready display cards
- Frontend login requirement
- Per-account visible columns shared across admin, frontend, and public market
- Default frontend sort rule
- Domain click-through toggle
- Personal Cloudflare API Token
- Personal DNSPod Token with split `Token ID` and `Token` inputs
- DNSHE API Key / Secret and DNSHE sync
- Cloudflare / DNSPod sync and WHOIS backfill
- DNS management entry based on the current effective hosting provider
- Hosting-switch entry based on actual registrar and target-provider capability
- Manual domain entry with tagline support
- Excel batch import for manual domains
- Separate super-admin display for each customer’s frontend, public market, and connected custom hostname

## Recent Updates

- Added an in-site simplified-Chinese `TG Bot` guide with BotFather, Token, Chat ID, and test-send steps
- Added a `?` help link in the admin `TG 到期提醒` section that jumps to `docs#tg-bot-guide`
- Updated the registrar `官网` control to a clearer dropdown button in admin
- Re-captured the frontend and admin previews and synced them across README and `DEMO_ASSETS`

## Notes

- This repository is for public-facing documentation only
- Source code, deployment details, and internal implementation stay private
- If anything here drifts from production, treat the official site and in-site docs as the source of truth

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ypq123456789/domainkeeper&type=Date)](https://star-history.com/#ypq123456789/domainkeeper&Date)
