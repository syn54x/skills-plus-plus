---
"@syn54x/spp": minor
---

`spp feedback check` now scans every skill-feedback body for secrets (GitHub, GitLab, AWS, Google Cloud, Slack, Anthropic, OpenAI, npm and Stripe tokens, JWTs and private keys, with patterns taken from gitleaks' default rules) and blocks a body holding one in every Self-improvement mode. Each hit prints the secret as `[REDACTED]`. Under Full Detail the six other rules now print as `warning: ` lines and exit 0, so you see what a body says about your project without being stopped by it; under Anonymous they still block.
