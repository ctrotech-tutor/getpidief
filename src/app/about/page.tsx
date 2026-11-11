import { Metadata } from "next"
import { Navigation } from "@/components/landing/Navigation"
import { Footer } from "@/components/landing/Footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Globe, BookOpen, Target, Heart } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About Us - getpidief",
  description: "Learn about getpidief's mission to democratize academic knowledge sharing across Africa and beyond.",
}

export default function AboutPage() {
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
                Democratizing Academic Knowledge
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                getpidief is on a mission to break down barriers to academic knowledge across Africa and beyond, 
                creating a world where every student and researcher has access to the resources they need to succeed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/institutions">
                  <Button size="lg" className="group">
                    Explore Institutions
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg">
                  Join Our Mission
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                  Our Mission
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  We believe knowledge should be accessible to everyone, regardless of their location or economic background.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Globe className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Global Access</h3>
                  <p className="text-muted-foreground">
                    Breaking down geographical barriers to make academic resources available to students and researchers worldwide.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Community Driven</h3>
                  <p className="text-muted-foreground">
                    Building a collaborative ecosystem where institutions and individuals contribute to a shared knowledge pool.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Educational Excellence</h3>
                  <p className="text-muted-foreground">
                    Ensuring high-quality, peer-reviewed content that meets the standards of academic institutions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-24 px-4 bg-surface/30">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-heading font-black text-foreground tracking-tight mb-8 text-center" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                Our Story
              </h2>
              <div className="prose prose-lg max-w-none text-muted-foreground">
                <p className="lead text-foreground">
                  getpidief began with a simple observation: while academic knowledge is abundant, access remains unequal.
                </p>
                <p>
                  Founded by a team of passionate educators and technologists, we witnessed firsthand how students across Africa 
                  struggled to access the same resources available to their peers in other parts of the world. This digital divide 
                  wasn't just about internet connectivity—it was about accessibility, affordability, and relevance.
                </p>
                <p>
                  In 2024, we set out to build a platform that would change this narrative. getpidief was created to serve as a 
                  bridge between knowledge producers and knowledge seekers, ensuring that academic resources could flow freely 
                  across institutional and geographical boundaries.
                </p>
                <p>
                  Today, we partner with over 38 institutions across 15 countries, facilitating the sharing of more than 12,000 
                  academic documents and serving a community of over 450,000 students. But this is just the beginning.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                Our Values
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                The principles that guide everything we do
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                <Target className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-foreground mb-2">Purpose-Driven</h3>
                <p className="text-sm text-muted-foreground">
                  Every decision we make is guided by our mission to democratize education.
                </p>
              </div>
              <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                <Heart className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-foreground mb-2">Community First</h3>
                <p className="text-sm text-muted-foreground">
                  We exist to serve our community of students, educators, and researchers.
                </p>
              </div>
              <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                <Globe className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-foreground mb-2">Inclusive</h3>
                <p className="text-sm text-muted-foreground">
                  We ensure our platform serves diverse needs and backgrounds.
                </p>
              </div>
              <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                <BookOpen className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-foreground mb-2">Quality Focused</h3>
                <p className="text-sm text-muted-foreground">
                  We maintain high standards for all content shared on our platform.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 px-4 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                Our Impact
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">38+</div>
                <div className="text-sm text-muted-foreground">Partner Institutions</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">15+</div>
                <div className="text-sm text-muted-foreground">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">12K+</div>
                <div className="text-sm text-muted-foreground">Documents Shared</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">450K+</div>
                <div className="text-sm text-muted-foreground">Students Reached</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="font-heading font-black text-foreground tracking-tight mb-6" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                Join Us in Our Mission
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Whether you're an institution looking to share knowledge or a student seeking resources, 
                there's a place for you in the getpidief community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/institutions">
                  <Button size="lg" className="group">
                    Partner With Us
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" size="lg">
                    Get in Touch
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </div>
  )
}
