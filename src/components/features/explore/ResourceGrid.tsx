"use client";

import { motion } from "framer-motion";
import { ResourceCard } from "@/components/features/documents/ResourceCard";
import type { DocumentCard } from "@/lib/db/repositories/documents";

interface ResourceGridProps {
  docs: DocumentCard[];
}

export function ResourceGrid({ docs }: ResourceGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {docs.map((doc, index) => (
        <motion.div
          key={doc.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <ResourceCard document={doc} variant="grid" />
        </motion.div>
      ))}
    </div>
  );
}
