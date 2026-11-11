# Email providers

The server selects one provider at send time with `EMAIL_PROVIDER`. If the variable is unset, it defaults to `sendgrid` for compatibility with existing deployments. Provider credentials are server-only. Restart the app and its workers after changing environment variables. Provider acceptance does not guarantee inbox delivery.

| EMAIL_PROVIDER | Required environment variables | Notes |
| --- | --- | --- |
| `local` | Mailpit SMTP on `127.0.0.1:1025` | Captures email in the local inbox at `http://localhost:8025`. Development only, no email is delivered externally. Optional `MAILPIT_SMTP_PORT` overrides the port for a host-run Next.js app. |
| `console` | None for email | Logs complete message HTML and one-time links. Development only. Do not use real user data or shared logs. |
| `resend` | `RESEND_API_KEY` | Set `EMAIL_FROM` to a sender verified with Resend. The older `RESEND_FROM_EMAIL` is supported as a fallback if `EMAIL_FROM` is absent. |
| `sendgrid` | `SENDGRID_API_KEY` | Set `EMAIL_FROM` to a sender verified with SendGrid, or retain the existing per-message getpidief senders. |
| `gmail` | `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Uses Gmail SMTP and an app password, not the account password. The default sender is `GMAIL_USER`. Google account requirements and sending limits apply. An `EMAIL_FROM` override must be a sender Gmail permits. |
| `brevo` | `BREVO_API_KEY` | Uses Brevo's transactional email API. Set `EMAIL_FROM` to a sender verified in Brevo. |

`EMAIL_FROM` overrides the sender for all categories, including notification and digest emails. It can be a bare address or a display name plus address, such as `getpidief <noreply@example.com>`. Sender verification, domain authentication, delivery limits, bounces, and provider restrictions are the operator's responsibility. Keep all keys out of Git and chat.

Signup verification, password-reset, welcome and notification workers use this shared interface. Their delivery is asynchronous via Inngest; setting an email provider alone is insufficient. Use `NEXT_PUBLIC_APP_URL=http://localhost:3000` for local verification/reset links, and a reachable Upstash Redis REST database for token storage. The public test-email endpoint remains disabled to prevent abuse.

Automated tests mock providers and do not prove actual delivery. Before production use, verify the selected sender/domain and test signup, verification and password reset with a real recipient. Provider failures propagate to Inngest for retries, though an event can be accepted before delivery later fails.

For local development, `docker compose up -d` starts Mailpit as well as PostgreSQL. SMTP and its unauthenticated web inbox are bound to loopback and contain sensitive verification links. Do not expose them to a network or use real user data. Mailpit messages do not persist across container recreation. `EMAIL_PROVIDER=local` connects only to `127.0.0.1` and is not intended for an app running in a separate container.
