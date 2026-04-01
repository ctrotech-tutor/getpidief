import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// Future: Define middleware to gate uploads directly via checking server-side session cookies

export const ourFileRouter = {
    pdfUploader: f({ pdf: { maxFileSize: "16MB" } })
        .middleware(async ({ req }) => {
            // Logic runs on the server before upload
            return {};
        })
        .onUploadComplete(async ({ metadata, file }) => {
            // Logic runs on server after successful upload.
            console.log("Upload complete for url:", file.url);

            // We can persist any additional logic here, but most Firestore 
            // linking will happen client side or via a dedicated API
            return { url: file.url };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
