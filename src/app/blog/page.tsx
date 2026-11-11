import { Metadata } from "next"
import { Navigation } from "@/components/landing/Navigation"
import { Footer } from "@/components/landing/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Calendar, Clock, User, ArrowRight, BookOpen, TrendingUp, Lightbulb } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Blog - getpidief",
  description: "Discover academic insights, study tips, and the latest updates from the getpidief community.",
}

// Sample blog posts data
const blogPosts = [
  {
    id: 1,
    title: "10 Study Techniques That Actually Work for African Students",
    excerpt: "Discover evidence-based study methods specifically tailored for the African educational context. From collaborative learning to digital note-taking, these techniques will transform your academic performance.",
    author: "Dr. Amara Okonkwo",
    date: "2024-11-15",
    readTime: "8 min read",
    category: "Study Tips",
    image: "/images/blog/study-techniques.jpg",
    featured: true,
    tags: ["Study Tips", "Productivity", "Academic Success"]
  },
  {
    id: 2,
    title: "How to Access Academic Resources Without Breaking the Bank",
    excerpt: "Learn practical strategies for accessing high-quality academic materials affordably. We explore free databases, institutional partnerships, and open educational resources.",
    author: "Michael Chen",
    date: "2024-11-12",
    readTime: "6 min read",
    category: "Resources",
    image: "/images/blog/academic-resources.jpg",
    featured: false,
    tags: ["Resources", "Open Access", "Cost Savings"]
  },
  {
    id: 3,
    title: "The Future of Academic Collaboration in Africa",
    excerpt: "Exploring how digital platforms are revolutionizing research collaboration across African universities and beyond. Discover success stories and emerging trends.",
    author: "Prof. Fatima Al-Rashid",
    date: "2024-11-08",
    readTime: "10 min read",
    category: "Industry Insights",
    image: "/images/blog/collaboration-future.jpg",
    featured: true,
    tags: ["Collaboration", "Research", "Digital Transformation"]
  },
  {
    id: 4,
    title: "Digital Note-Taking: Tools and Techniques for Modern Students",
    excerpt: "Master the art of digital note-taking with our comprehensive guide. Compare the best tools and learn proven methodologies for effective knowledge retention.",
    author: "Sarah Johnson",
    date: "2024-11-05",
    readTime: "7 min read",
    category: "Technology",
    image: "/images/blog/digital-notes.jpg",
    featured: false,
    tags: ["Technology", "Note-taking", "Productivity"]
  },
  {
    id: 5,
    title: "Building Your Academic Network: A Student's Guide",
    excerpt: "Networking isn't just for professionals. Learn how to build meaningful academic relationships that will support your career long after graduation.",
    author: "Dr. James Osei",
    date: "2024-11-01",
    readTime: "9 min read",
    category: "Career Development",
    image: "/images/blog/networking.jpg",
    featured: false,
    tags: ["Networking", "Career", "Professional Development"]
  },
  {
    id: 6,
    title: "Research Methods 101: A Beginner's Guide",
    excerpt: "Everything you need to know about conducting academic research. From literature reviews to data analysis, we cover the fundamentals every student should know.",
    author: "Dr. Lisa Wang",
    date: "2024-10-28",
    readTime: "12 min read",
    category: "Research",
    image: "/images/blog/research-methods.jpg",
    featured: false,
    tags: ["Research", "Methodology", "Academic Writing"]
  }
]

const categories = [
  { name: "All", count: 24 },
  { name: "Study Tips", count: 8 },
  { name: "Resources", count: 6 },
  { name: "Technology", count: 5 },
  { name: "Research", count: 3 },
  { name: "Career Development", count: 2 }
]

export default function BlogPage() {
  const featuredPosts = blogPosts.filter(post => post.featured)
  const regularPosts = blogPosts.filter(post => !post.featured)

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
                Academic Insights & Resources
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Discover study tips, research strategies, and success stories from the getpidief community. 
                Your gateway to academic excellence.
              </p>
              
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto mb-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input 
                    placeholder="Search articles, topics, or authors..." 
                    className="pl-12 h-12 text-lg bg-surface/60 backdrop-blur-20 border-border/50"
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap justify-center gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">24+</div>
                  <div className="text-sm text-muted-foreground">Articles</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">15+</div>
                  <div className="text-sm text-muted-foreground">Contributors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">50K+</div>
                  <div className="text-sm text-muted-foreground">Readers</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="py-24 px-4">
            <div className="container mx-auto">
              <div className="text-center mb-16">
                <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                  Featured Articles
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Handpicked content from our community of educators and students
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                {featuredPosts.map((post) => (
                  <Card key={post.id} className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 overflow-hidden group cursor-pointer">
                    <div className="relative h-64 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-primary/30" />
                      </div>
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-8">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(post.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {post.readTime}
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground mb-6 line-clamp-3">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">{post.author}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="group">
                          Read More
                          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Categories and Recent Posts */}
        <section className="py-24 px-4 bg-surface/30">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {/* Categories Sidebar */}
              <div className="lg:col-span-1">
                <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6 sticky top-24">
                  <h3 className="text-lg font-bold text-foreground mb-6">Categories</h3>
                  <div className="space-y-3">
                    {categories.map((category) => (
                      <button
                        key={category.name}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-primary/10 transition-colors text-left"
                      >
                        <span className="text-foreground">{category.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {category.count}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Posts */}
              <div className="lg:col-span-3">
                <div className="text-center mb-16">
                  <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                    Recent Articles
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                    Latest insights and updates from our community
                  </p>
                </div>

                <div className="space-y-8">
                  {regularPosts.map((post) => (
                    <Card key={post.id} className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 overflow-hidden group cursor-pointer">
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lightbulb className="w-12 h-12 text-primary/30" />
                          </div>
                        </div>
                        <CardContent className="p-6 md:w-2/3">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <Badge variant="secondary">{post.category}</Badge>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(post.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {post.readTime}
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-muted-foreground mb-4 line-clamp-2">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="w-3 h-3 text-primary" />
                              </div>
                              <span className="text-sm text-muted-foreground">{post.author}</span>
                            </div>
                            <Button variant="ghost" size="sm" className="group">
                              Read More
                              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Load More */}
                <div className="text-center mt-12">
                  <Button size="lg" variant="outline">
                    Load More Articles
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="font-heading font-black text-foreground tracking-tight mb-6" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                Stay Updated
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Get the latest academic insights and resources delivered straight to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input placeholder="Enter your email" className="flex-1" />
                <Button size="lg">Subscribe</Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Join 50,000+ students and educators. No spam, unsubscribe anytime.
              </p>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </div>
  )
}
