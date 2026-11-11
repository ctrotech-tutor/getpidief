"use client";

import { motion } from "framer-motion";
import { Suspense } from "react";
import { CategoriesStripSkeleton } from "@/components/features/search/CategoriesStrip";

interface ExploreCategoriesSectionProps {
  children: React.ReactNode;
}

export function ExploreCategoriesSection({ children }: ExploreCategoriesSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <Suspense fallback={<CategoriesStripSkeleton />}>
        {children}
      </Suspense>
    </motion.div>
  );
}
