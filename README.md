# DomainKeeper

Closed-source domain management software built for Cloudflare Workers.

## Public Repo Notice

This GitHub repository is intentionally limited to public-facing documentation.

- Proprietary source code is kept local only.
- Activation, license, and tenant-isolation logic are not published.
- Deployment internals and private configuration are not published.

## Product Summary

DomainKeeper is used to manage and display domain lifecycle data in a multi-user setup.

- Each user has an independent account.
- Each username is also the route segment, such as `/{username}` and `/{username}/admin`.
- Registration requires a valid activation code.
- Each user has isolated domain data and isolated account configuration.

## Access

Production deployment:

- `https://domainkeeper.648558021.workers.dev`

Public entry points:

- `/login`
- `/register`

After activation and registration:

- `/{username}`
- `/{username}/admin`

## Authorization

If you need access, activation codes, or a private deployment, contact the software owner directly.

## License

All rights reserved.

This software is closed source. No copying, redistribution, reverse engineering, or secondary hosting is permitted without explicit authorization.
