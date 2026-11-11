"use client";

import dynamic from "next/dynamic";

interface PDFViewerWrapperProps {
  documentId: string;
  fileUrl: string;
  title: string;
  className?: string;
}

const PDFViewer = dynamic(() => import("./PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-100">
      <p className="text-gray-500">Loading PDF...</p>
    </div>
  ),
});

export function PDFViewerWrapper({
  documentId,
  fileUrl,
  title,
  className,
}: PDFViewerWrapperProps) {
  return (
    <PDFViewer
      key={documentId + fileUrl}
      documentId={documentId}
      fileUrl={fileUrl}
      title={title}
      className={className}
    />
  );
}