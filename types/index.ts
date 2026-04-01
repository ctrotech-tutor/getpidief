export type ResourceCategory =
    | "Mathematics"
    | "Physics"
    | "Chemistry"
    | "Biology"
    | "Computer Science"
    | "Literature"
    | "History"
    | "General";

export interface ResourceDocument {
    id: string; // Document ID in Firestore
    title: string;
    description: string;
    category: ResourceCategory;
    tags: string[];
    fileUrl: string; // The UploadThing URL
    uploadedBy: string; // Admin User ID/Email
    createdAt: number; // Timestamp
    updatedAt: number;
}
