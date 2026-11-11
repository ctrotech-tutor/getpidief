import { Metadata } from "next"
import { Navigation } from "@/components/landing/Navigation"
import { Footer } from "@/components/landing/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, MapPin, Send } from "lucide-react"

export const metadata: Metadata = {
  title: "Contact Us - getpidief",
  description: "Get in touch with the getpidief team. We're here to help with any questions or feedback.",
}

export default function ContactPage() {
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
                Get in Touch
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Have questions, feedback, or want to partner with us? We'd love to hear from you.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Content */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <Card className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">Send us a Message</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" required />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john@example.com" required />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="institution">Institution (Optional)</Label>
                      <Input id="institution" placeholder="University of Example" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="How can we help?" required />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Tell us more about your inquiry..." 
                        rows={6} 
                        required 
                      />
                    </div>
                    
                    <Button type="submit" className="w-full group">
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h2 className="font-heading font-black text-foreground tracking-tight mb-6" style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>
                    Let's Connect
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    Whether you're a student, educator, or institution representative, we're here to support your journey with getpidief.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Email</h3>
                      <p className="text-muted-foreground">support@getpidief.me</p>
                      <p className="text-sm text-muted-foreground">For general inquiries and support</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Partnerships</h3>
                      <p className="text-muted-foreground">partnerships@getpidief.me</p>
                      <p className="text-sm text-muted-foreground">For institutional partnerships</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Phone</h3>
                      <p className="text-muted-foreground">+234 904 162 2945</p>
                      <p className="text-sm text-muted-foreground">Mon-Fri, 9AM-5PM WAT</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Office</h3>
                      <p className="text-muted-foreground">
                        Innovation Hub, Lagos, Nigeria<br />
                        West Africa Regional Office
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                  <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
                  <div className="space-y-2">
                    <a href="/about" className="block text-primary hover:underline">About Us</a>
                    <a href="/institutions" className="block text-primary hover:underline">Partner Institutions</a>
                    <a href="/careers" className="block text-primary hover:underline">Careers</a>
                    <a href="/privacy" className="block text-primary hover:underline">Privacy Policy</a>
                    <a href="/terms" className="block text-primary hover:underline">Terms of Service</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 px-4 bg-surface/30">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Common questions about getpidief
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-3">How can my institution partner with getpidief?</h3>
                <p className="text-muted-foreground">
                  We welcome partnerships with educational institutions across Africa and beyond. 
                  Contact us at partnerships@getpidief.com to learn more about our partnership programs.
                </p>
              </div>

              <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-3">Is getpidief free to use?</h3>
                <p className="text-muted-foreground">
                  Yes, getpidief is completely free for students and researchers. We believe in making 
                  academic knowledge accessible to everyone, regardless of their financial situation.
                </p>
              </div>

              <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-3">How do I contribute documents?</h3>
                <p className="text-muted-foreground">
                  If you're affiliated with a partner institution, you can contribute documents through 
                  your institution's portal. Individual contributors can also submit content for review.
                </p>
              </div>

              <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-3">What types of documents are accepted?</h3>
                <p className="text-muted-foreground">
                  We accept academic papers, research documents, lecture notes, study materials, 
                  and other educational resources that meet our quality standards.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </div>
  )
}
