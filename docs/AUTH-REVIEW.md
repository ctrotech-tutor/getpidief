# Authentication and public-page review

This work improves the implementation but is not a security audit or a declaration of production readiness.

## Before deployment

- Review `0002_kind_leper_queen.sql`, back up the existing database, and apply it through the deployment migration process. The migration was tested only on a new, disposable PostgreSQL instance. No existing database was touched. Credential registration requires the new table.
- A session update previously merged client-controlled fields into JWTs, including roles. Deploy the fix promptly and rotate the Auth.js secret (`AUTH_SECRET`, and `NEXTAUTH_SECRET` if separately configured) using the provider's secret management. Rotation invalidates existing sessions. Review privileged activity and accounts, since previously issued tokens cannot be trusted solely because this code is fixed. Do not paste secrets into chat or source control.
- Configure and verify PostgreSQL, both Upstash Redis clients, Inngest delivery and worker connectivity, and the email provider. In production, credential login, registration, verification resend and password-reset requests fail closed when their required rate-limit store is not configured. Real delivery, OAuth and deployed flows have not been verified.
- The old terms and privacy policies are retained as legacy content with an explicit review notice. `legacy-2024` records which legacy policy text was presented, not legal approval. Confirm the operator, contact addresses, data practices, retention, cookies and applicable law with qualified counsel before treating these as final terms. Implement a policy-version publication process before changing the documents. The optional student/researcher selection is a stored self-description, not a verified credential or an authorization role.
- Google sign-up is not offered on the registration form until a consent-aware OAuth onboarding flow is designed and tested. The login button remains for existing Google accounts, but the provider integration has not been tested here. Do not assume Google account linking or new account creation works end to end.

## Remaining security and reliability work

- A password reset consumes the token atomically, but existing JWT sessions are not revoked. Implement server-side session versioning/revocation and test reset, suspension, and deletion across existing sessions.
- Registration and email event delivery are not backed by a transactional outbox. If dispatch or the worker fails, the user must request verification again; monitor failures. Reset and verification tokens depend on Redis, and delivery depends on Inngest and the configured email service.
- The current rate-limit key uses forwarded IP headers and depends on trusted deployment proxy configuration. Verify trusted client IP handling and test abuse scenarios in the actual deployment. Registration currently discloses an existing email; account-enumeration protection needs a deliberate product and recovery design.
- Existing legacy credential accounts might not have profile/agreement records. The migration does not invent prior consent or backfill profiles. Plan a safe, explicit remediation for existing users.
- The public legal pages contain historical claims that have not been validated, and the contact addresses were inherited from existing content, not verified. Do not rely on them as legal or operational facts until reviewed.
- Visual fit varies with zoom, device height, validation messages and accessibility settings. The sign-up layout is compact and remains scrollable when needed; browser viewport/assistive technology testing remains necessary.
