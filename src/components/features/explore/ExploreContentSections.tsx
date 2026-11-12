"use client";

import { motion } from "framer-motion";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, UsersThree as Users, Star, TrendUp as TrendingUp } from "@phosphor-icons/react";
import { PulseFeed } from "@/components/features/dashboard/PulseFeed";
import { ResourceCardSkeleton } from "@/components/features/documents/ResourceCard";
import { ShareModal } from "@/components/features/documents/ShareModal";
import { ReportModal } from "@/components/features/documents/ReportModal";

interface ExploreContentSectionsProps {
  userId?: string;
  recommendedSection: React.ReactNode;
  trendingSection: React.ReactNode;
  recentSection: React.ReactNode;
}

export function ExploreContentSections({ 
  userId, 
  recommendedSection, 
  trendingSection, 
  recentSection 
}: ExploreContentSectionsProps) {
  return (
    <div className="space-y-12">
      {/* Pulse Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <PulseFeed />
      </motion.div>

      {/* Recommended Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <Suspense fallback={<ResourceCardSkeleton variant="grid" />}>
          {recommendedSection}
        </Suspense>
      </motion.div>

      {/* Trending Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <Suspense fallback={<ResourceCardSkeleton variant="grid" />}>
          {trendingSection}
        </Suspense>
      </motion.div>

      {/* Recent Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <Suspense fallback={<ResourceCardSkeleton variant="grid" />}>
          {recentSection}
        </Suspense>
      </motion.div>

      {/* Premium Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Resources</p>
                <p className="text-2xl font-bold text-primary">50K+</p>
              </div>
              <BookOpen className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-emerald-600">12K+</p>
              </div>
              <Users className="h-8 w-8 text-emerald-500/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Institutions</p>
                <p className="text-2xl font-bold text-amber-600">500+</p>
              </div>
              <Star className="h-8 w-8 text-amber-500/20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Downloads</p>
                <p className="text-2xl font-bold text-purple-600">1M+</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500/20" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Global Modals */}
      <ShareModal />
      <ReportModal />
    </div>
  );
}
