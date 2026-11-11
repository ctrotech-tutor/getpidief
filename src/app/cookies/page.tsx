import { Metadata } from "next"
import { Navigation } from "@/components/landing/Navigation"
import { Footer } from "@/components/landing/Footer"
import { Button } from "@/components/ui/button"
import { Cookie, Settings, Shield, Eye } from "lucide-react"

export const metadata: Metadata = {
  title: "Cookie Policy - getpidief",
  description: "Learn how getpidief uses cookies and tracking technologies.",
}

export default function CookiePolicyPage() {
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
                Cookie Policy
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                This policy explains how getpidief uses cookies and similar tracking technologies to enhance your experience.
              </p>
              <p className="text-sm text-muted-foreground">
                Last updated: November 2024
              </p>
            </div>
          </div>
        </section>

        {/* Cookie Content */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto">
              
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">What Are Cookies?</h2>
                  <p className="text-muted-foreground mb-4">
                    Cookies are small text files stored on your device when you visit websites. They help us:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Remember your preferences and settings</li>
                    <li>Understand how you use our service</li>
                    <li>Provide personalized content</li>
                    <li>Improve website performance</li>
                    <li>Ensure security and prevent fraud</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Types of Cookies We Use</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                      <div className="flex items-center mb-4">
                        <Settings className="w-6 h-6 text-primary mr-3" />
                        <h3 className="text-lg font-semibold text-foreground">Essential Cookies</h3>
                      </div>
                      <p className="text-muted-foreground mb-3">
                        Required for the website to function properly, including security and basic features.
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• User authentication</li>
                        <li>• Security tokens</li>
                        <li>• Session management</li>
                      </ul>
                    </div>

                    <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                      <div className="flex items-center mb-4">
                        <Eye className="w-6 h-6 text-primary mr-3" />
                        <h3 className="text-lg font-semibold text-foreground">Analytics Cookies</h3>
                      </div>
                      <p className="text-muted-foreground mb-3">
                        Help us understand how visitors interact with our website to improve performance.
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Page views and sessions</li>
                        <li>• User behavior patterns</li>
                        <li>• Performance metrics</li>
                      </ul>
                    </div>

                    <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                      <div className="flex items-center mb-4">
                        <Cookie className="w-6 h-6 text-primary mr-3" />
                        <h3 className="text-lg font-semibold text-foreground">Functional Cookies</h3>
                      </div>
                      <p className="text-muted-foreground mb-3">
                        Enable enhanced functionality and personalization features.
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Language preferences</li>
                        <li>• Theme settings</li>
                        <li>• Content recommendations</li>
                      </ul>
                    </div>

                    <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6">
                      <div className="flex items-center mb-4">
                        <Shield className="w-6 h-6 text-primary mr-3" />
                        <h3 className="text-lg font-semibold text-foreground">Security Cookies</h3>
                      </div>
                      <p className="text-muted-foreground mb-3">
                        Used for security purposes, including fraud detection and prevention.
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• CSRF protection</li>
                        <li>• Login security</li>
                        <li>• Anomaly detection</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Third-Party Cookies</h2>
                  <p className="text-muted-foreground mb-4">
                    We may use third-party services that place cookies on your device:
                  </p>
                  <div className="space-y-4">
                    <div className="bg-surface/30 rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-2">Google Analytics</h4>
                      <p className="text-sm text-muted-foreground">
                        Used to analyze website traffic and user behavior. Google's privacy policy applies.
                      </p>
                    </div>
                    <div className="bg-surface/30 rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-2">Cloudflare</h4>
                      <p className="text-sm text-muted-foreground">
                        Provides security and performance optimization services.
                      </p>
                    </div>
                    <div className="bg-surface/30 rounded-lg p-4">
                      <h4 className="font-semibold text-foreground mb-2">Educational Partners</h4>
                      <p className="text-sm text-muted-foreground">
                        Partner institutions may use cookies for authentication and content delivery.
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Managing Your Preferences</h2>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3">Browser Settings</h3>
                  <p className="text-muted-foreground mb-4">
                    You can control cookies through your browser settings:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
                    <li>Accept or reject all cookies</li>
                    <li>Delete existing cookies</li>
                    <li>Block third-party cookies</li>
                    <li>Set cookie preferences for specific sites</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-foreground mb-3">Cookie Consent Banner</h3>
                  <p className="text-muted-foreground mb-4">
                    When you first visit getpidief, you'll see a cookie consent banner where you can:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Accept all cookies for the best experience</li>
                    <li>Customize your cookie preferences</li>
                    <li>Reject non-essential cookies</li>
                    <li>Change preferences at any time</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Cookie Duration</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="font-medium text-foreground">Session Cookies</span>
                      <span className="text-sm text-muted-foreground">Deleted when you close your browser</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="font-medium text-foreground">Persistent Cookies</span>
                      <span className="text-sm text-muted-foreground">Typically 30 days to 1 year</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="font-medium text-foreground">Authentication Cookies</span>
                      <span className="text-sm text-muted-foreground">7 days (with activity extension)</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-foreground">Analytics Cookies</span>
                      <span className="text-sm text-muted-foreground">2 years (Google Analytics)</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights</h2>
                  <p className="text-muted-foreground mb-4">You have the right to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Know what cookies are being used</li>
                    <li>Accept or reject cookies</li>
                    <li>Withdraw consent at any time</li>
                    <li>Access information about cookie usage</li>
                    <li>Request deletion of your data</li>
                  </ul>
                  <p className="text-muted-foreground">
                    Note that blocking or deleting cookies may affect your experience on our website.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Updates to This Policy</h2>
                  <p className="text-muted-foreground">
                    We may update this Cookie Policy to reflect changes in our practices or for legal reasons. 
                    We will notify you of any significant changes by updating the "Last updated" date and 
                    displaying a notice on our website.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
                  <p className="text-muted-foreground mb-4">If you have questions about our Cookie Policy, please contact us:</p>
                  <div className="bg-surface/30 rounded-lg p-6 space-y-2">
                    <p className="text-muted-foreground"><strong>Email:</strong> privacy@getpidief.com</p>
                    <p className="text-muted-foreground"><strong>Address:</strong> Innovation Hub, Lagos, Nigeria</p>
                    <p className="text-muted-foreground"><strong>Phone:</strong> +234 123 456 7890</p>
                  </div>
                </section>

                {/* Cookie Settings CTA */}
                <div className="text-center py-8">
                  <Button size="lg" className="group">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Cookie Preferences
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </div>
  )
}
