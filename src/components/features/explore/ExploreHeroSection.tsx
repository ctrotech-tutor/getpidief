"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/features/search/SearchBar";
import { Lightning as Zap, UsersThree as Users, BookOpen, TrendUp as TrendingUp, Star, Clock, Funnel as Filter } from "@phosphor-icons/react";
import { getGreeting } from "@/lib/utils/format";

interface ExploreHeroSectionProps {
  firstName: string;
}

export function ExploreHeroSection({ firstName }: ExploreHeroSectionProps) {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border border-border/50 p-8 lg:p-12"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('/logo.svg')] bg-center bg-no-repeat bg-contain opacity-5" />
      
      <div className="relative z-10 space-y-6">
        {/* Welcome Header */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-background">
              <Zap className="w-3 h-3 mr-1" />
              Powered by AI
            </Badge>
            <Badge variant="secondary" className="bg-background">
              <Users className="w-3 h-3 mr-1" />
              {new Intl.NumberFormat('en-US', { notation: 'compact' }).format(50000)}+ Resources
            </Badge>
          </div>
          <h1 className="font-heading font-bold text-3xl lg:text-5xl tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Discover millions of verified academic resources from top institutions worldwide.
          </p>
        </motion.div>

        {/* Enhanced Search Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div className="relative">
            <SearchBar size="lg" placeholder="Search by title, course, keyword, institution…" className="bg-background border-border/50" />
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Quick Search Tags */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20 transition-colors">
              <BookOpen className="w-3 h-3 mr-1" />
              Computer Science
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20 transition-colors">
              <TrendingUp className="w-3 h-3 mr-1" />
              Engineering
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20 transition-colors">
              <Star className="w-3 h-3 mr-1" />
              Medicine
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20 transition-colors">
              <Clock className="w-3 h-3 mr-1" />
              Recent Uploads
            </Badge>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
