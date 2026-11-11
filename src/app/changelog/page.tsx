import { Metadata } from "next"
import { Navigation } from "@/components/landing/Navigation"
import { Footer } from "@/components/landing/Footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Rocket, Bug, Zap, Star, Users, ChevronRight, ArrowRight } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Changelog - getpidief",
  description: "Stay updated with the latest features, improvements, and fixes to the getpidief platform.",
}

// Sample changelog data
const changelogEntries = [
  {
    version: "2.4.0",
    date: "2024-11-15",
    type: "major",
    title: "Enhanced Institution Partnerships",
    description: "Major update to our institution partnership program with new features and improved collaboration tools.",
    features: [
      { title: "New Partnership Dashboard", description: "Institutions can now track their impact and contribution metrics", type: "feature" },
      { title: "Bulk Document Upload", description: "Upload multiple documents at once with improved processing", type: "feature" },
      { title: "Custom Institution Profiles", description: "Showcase your institution with enhanced branding options", type: "feature" },
      { title: "API Access for Partners", description: "Programmatic access for institutional integrations", type: "feature" }
    ],
    improvements: [
      "Improved document processing speed by 40%",
      "Enhanced search algorithm for better relevance",
      "Redesigned institution onboarding flow"
    ],
    fixes: [
      "Fixed document preview issues on mobile devices",
      "Resolved login problems for some institutional accounts"
    ]
  },
  {
    version: "2.3.2",
    date: "2024-11-08",
    type: "patch",
    title: "Performance Improvements",
    description: "Bug fixes and performance optimizations based on user feedback.",
    features: [],
    improvements: [
      "Reduced page load times by 25%",
      "Improved mobile responsiveness across all pages",
      "Enhanced accessibility compliance (WCAG 2.1 AA)"
    ],
    fixes: [
      "Fixed broken links in help documentation",
      "Resolved issues with PDF downloads on slow connections",
      "Fixed notification delivery delays"
    ]
  },
  {
    version: "2.3.1",
    date: "2024-11-01",
    type: "patch",
    title: "Critical Security Update",
    description: "Important security patches and stability improvements.",
    features: [],
    improvements: [
      "Enhanced password security requirements",
      "Improved session management",
      "Better error handling for failed uploads"
    ],
    fixes: [
      "Fixed potential XSS vulnerability in search",
      "Resolved session timeout issues",
      "Fixed data export formatting problems"
    ]
  },
  {
    version: "2.3.0",
    date: "2024-10-25",
    type: "minor",
    title: "Community Features",
    description: "New community engagement features and improved user interactions.",
    features: [
      { title: "User Profiles", description: "Enhanced user profiles with contribution history", type: "feature" },
      { title: "Comment System", description: "Add comments and discussions to documents", type: "feature" },
      { title: "Reputation System", description: "Earn reputation points for quality contributions", type: "feature" }
    ],
    improvements: [
      "Improved document recommendation algorithm",
      "Better notification system with email summaries",
      "Enhanced search filters and sorting options"
    ],
    fixes: [
      "Fixed avatar upload issues",
      "Resolved notification badge synchronization",
      "Fixed mobile menu navigation problems"
    ]
  },
  {
    version: "2.2.1",
    date: "2024-10-15",
    type: "patch",
    title: "Mobile Experience",
    description: "Focused improvements for mobile users and touch interactions.",
    features: [],
    improvements: [
      "Optimized touch targets for mobile devices",
      "Improved offline functionality",
      "Better mobile document viewer"
    ],
    fixes: [
      "Fixed swipe gestures in document viewer",
      "Resolved mobile keyboard overlapping issues",
      "Fixed mobile upload flow interruptions"
    ]
  },
  {
    version: "2.2.0",
    date: "2024-10-01",
    type: "minor",
    title: "Advanced Search & Filters",
    description: "Powerful new search capabilities and intelligent filtering.",
    features: [
      { title: "Advanced Search", description: "Search within documents, by author, institution, and more", type: "feature" },
      { title: "Smart Filters", description: "AI-powered document categorization and filtering", type: "feature" },
      { title: "Search History", description: "Save and revisit your search queries", type: "feature" }
    ],
    improvements: [
      "50% faster search indexing",
      "Better search result relevance",
      "Improved search suggestions and autocomplete"
    ],
    fixes: [
      "Fixed search result pagination",
      "Resolved special character search issues",
      "Fixed search result preview loading"
    ]
  }
]

const upcomingFeatures = [
  { title: "AI-Powered Document Summarization", description: "Get instant summaries of long academic papers", eta: "Q1 2025" },
  { title: "Collaborative Study Groups", description: "Create and join study groups with real-time collaboration", eta: "Q1 2025" },
  { title: "Mobile App", description: "Native iOS and Android apps for better mobile experience", eta: "Q2 2025" },
  { title: "Plagiarism Checker", description: "Built-in plagiarism detection for uploaded documents", eta: "Q2 2025" }
]

function getVersionIcon(type: string) {
  switch (type) {
    case 'major': return <Rocket className="w-4 h-4 text-orange-500" />
    case 'minor': return <Star className="w-4 h-4 text-blue-500" />
    case 'patch': return <Bug className="w-4 h-4 text-green-500" />
    default: return <Zap className="w-4 h-4 text-primary" />
  }
}

function getVersionBadge(type: string) {
  switch (type) {
    case 'major': return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Major</Badge>
    case 'minor': return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Minor</Badge>
    case 'patch': return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Patch</Badge>
    default: return <Badge variant="secondary">Update</Badge>
  }
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Fixed Navigation Container */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navigation />
      </div>
      <div className="pt-16"></div>
      {/* Content with padding to account for fixed nav */}
      <div className="">
        {/* Hero Section */}
        <section className="py-24 px-4 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="font-heading font-black text-foreground tracking-tight mb-6" style={{ fontSize: "clamp(48px, 6vw, 72px)" }}>
                What's New
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Stay updated with the latest features, improvements, and fixes to the getpidief platform. 
                We're constantly evolving to better serve our academic community.
              </p>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap justify-center gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">2.4.0</div>
                  <div className="text-sm text-muted-foreground">Current Version</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">50+</div>
                  <div className="text-sm text-muted-foreground">Features Released</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">200+</div>
                  <div className="text-sm text-muted-foreground">Improvements Made</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Latest Update */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                  Latest Release
                </h2>
              </div>

              <Card className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getVersionIcon(changelogEntries[0].type)}
                        <span className="text-2xl font-bold text-foreground">v{changelogEntries[0].version}</span>
                      </div>
                      {getVersionBadge(changelogEntries[0].type)}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(changelogEntries[0].date).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-foreground mb-4">{changelogEntries[0].title}</h3>
                  <p className="text-muted-foreground mb-8">{changelogEntries[0].description}</p>

                  {changelogEntries[0].features.length > 0 && (
                    <div className="mb-8">
                      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-primary" />
                        New Features
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {changelogEntries[0].features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <div>
                              <h5 className="font-medium text-foreground">{feature.title}</h5>
                              <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {changelogEntries[0].improvements.length > 0 && (
                    <div className="mb-8">
                      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-500" />
                        Improvements
                      </h4>
                      <ul className="space-y-2">
                        {changelogEntries[0].improvements.map((improvement, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground">{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {changelogEntries[0].fixes.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Bug className="w-5 h-5 text-green-500" />
                        Bug Fixes
                      </h4>
                      <ul className="space-y-2">
                        {changelogEntries[0].fixes.map((fix, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground">{fix}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* All Updates */}
        <section className="py-24 px-4 bg-surface/30">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                Previous Updates
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                A history of our continuous improvement and feature development
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
              {changelogEntries.slice(1).map((entry) => (
                <Card key={entry.version} className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getVersionIcon(entry.type)}
                          <span className="text-lg font-bold text-foreground">v{entry.version}</span>
                        </div>
                        {getVersionBadge(entry.type)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(entry.date).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-2">{entry.title}</h3>
                    <p className="text-muted-foreground mb-4">{entry.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {entry.features.length > 0 && (
                        <div>
                          <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                            <Star className="w-4 h-4 text-primary" />
                            Features ({entry.features.length})
                          </h5>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {entry.features.slice(0, 2).map((feature, index) => (
                              <li key={index}>• {feature.title}</li>
                            ))}
                            {entry.features.length > 2 && <li>• +{entry.features.length - 2} more</li>}
                          </ul>
                        </div>
                      )}
                      
                      {entry.improvements.length > 0 && (
                        <div>
                          <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-500" />
                            Improvements ({entry.improvements.length})
                          </h5>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {entry.improvements.slice(0, 2).map((improvement, index) => (
                              <li key={index}>• {improvement}</li>
                            ))}
                            {entry.improvements.length > 2 && <li>• +{entry.improvements.length - 2} more</li>}
                          </ul>
                        </div>
                      )}
                      
                      {entry.fixes.length > 0 && (
                        <div>
                          <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                            <Bug className="w-4 h-4 text-green-500" />
                            Fixes ({entry.fixes.length})
                          </h5>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {entry.fixes.slice(0, 2).map((fix, index) => (
                              <li key={index}>• {fix}</li>
                            ))}
                            {entry.fixes.length > 2 && <li>• +{entry.fixes.length - 2} more</li>}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Features */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                Coming Soon
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Exciting features we're working on for future releases
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {upcomingFeatures.map((feature, index) => (
                <Card key={index} className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">
                        Upcoming
                      </Badge>
                      <span className="text-sm text-muted-foreground">{feature.eta}</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="container mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="font-heading font-black text-foreground tracking-tight mb-6" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                Stay Updated
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Be the first to know about new features and improvements. Join our community and get exclusive insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/blog">
                  <Button size="lg" className="group">
                    Read Our Blog
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg">
                  <Users className="w-4 h-4 mr-2" />
                  Join Community
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </div>
  )
}
