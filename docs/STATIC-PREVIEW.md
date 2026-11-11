# Standalone social preview

The production application and its database credentials are not needed for this prototype. `npm run build:preview` exports a separate static site to `preview-app/out`. Its `/feed-preview/` page uses the same sample feed component as the main application. The preview contains no API routes or server-side data connections. Actions are local to the browser session and reset on refresh.

To host it separately on Vercel, create a **separate project**, not a new deployment configuration for the production project. Connect this repository and set the root directory to the repository root, framework preset to Other, build command to `npm run build:preview`, and output directory to `preview-app/out`. It needs no production environment variables. Protect the deployment using Vercel access controls if desired. This has not been deployed or tested on Vercel yet.

Do not copy production database, auth, storage, or other secrets into a preview environment just to display the prototype. A future preview of real server features needs isolated non-production services, synthetic data, appropriate access controls, and a separate security review.

The existing application deployment is separate from this static export. The app still requires its own service configuration, and this build does not verify those routes.
