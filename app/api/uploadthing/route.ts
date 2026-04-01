import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Exposes standard Next.js App Router API Endpoint pattern
export const { GET, POST } = createRouteHandler({
    router: ourFileRouter,
});
