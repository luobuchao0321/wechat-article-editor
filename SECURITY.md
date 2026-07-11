# Security Policy

## Supported versions

Security fixes are applied to the latest release on the `main` branch.

## Reporting a vulnerability

Please do not open a public Issue for a suspected vulnerability. Email a short reproduction and impact summary to `luobuchao0321@users.noreply.github.com`.

We will acknowledge reports within seven days and publish a fix or mitigation plan after validation.

## Deployment notes

ContentCraft can import public WeChat article links and proxy their assets for preview. Public deployments must keep the built-in remote URL restrictions enabled, use HTTPS, and add platform-level rate limiting before being exposed broadly.

The desktop app is the recommended option for private articles and sensitive drafts because content, drafts, and the module library remain on the local device by default.
