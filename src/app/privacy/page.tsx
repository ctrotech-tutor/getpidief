import { Metadata } from "next"
import { Navigation } from "@/components/landing/Navigation"
import { Footer } from "@/components/landing/Footer"

export const metadata: Metadata = {
  title: "Privacy Policy - getpidief",
  description: "Learn how getpidief protects your privacy and handles your personal information.",
}

export default function PrivacyPage() {
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
                Privacy Policy
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Your privacy is important to us. This policy explains how we collect, use, and protect your information.
              </p>
              <p className="text-sm text-muted-foreground">
                Last updated: November 2024
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Content */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto prose prose-lg max-w-none">
              
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Introduction</h2>
                  <p className="text-muted-foreground">
                    getpidief ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
                    explains how we collect, use, disclose, and safeguard your information when you visit our website 
                    getpidief.com and use our services.
                  </p>
                  <p className="text-muted-foreground">
                    By using getpidief, you consent to the collection and use of information in accordance with this policy.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Information We Collect</h2>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3">Personal Information</h3>
                  <p className="text-muted-foreground mb-4">We may collect the following personal information:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
                    <li>Name and email address</li>
                    <li>Institutional affiliation</li>
                    <li>Academic information (degree, field of study)</li>
                    <li>Account credentials</li>
                    <li>Communication preferences</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-foreground mb-3">Usage Information</h3>
                  <p className="text-muted-foreground mb-4">We automatically collect information about how you use our services:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
                    <li>Pages visited and time spent</li>
                    <li>Documents accessed and downloaded</li>
                    <li>Search queries</li>
                    <li>Device and browser information</li>
                    <li>IP address and location data</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-foreground mb-3">Cookies and Tracking</h3>
                  <p className="text-muted-foreground">
                    We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
                    and provide personalized content. You can control cookie settings through your browser preferences.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">How We Use Your Information</h2>
                  <p className="text-muted-foreground mb-4">We use your information to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Provide and maintain our services</li>
                    <li>Process transactions and send related information</li>
                    <li>Send technical notices and support messages</li>
                    <li>Respond to comments and questions</li>
                    <li>Monitor and analyze usage patterns</li>
                    <li>Detect, prevent, and address technical issues</li>
                    <li>Comply with legal obligations</li>
                    <li>Improve our services and develop new features</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Information Sharing</h2>
                  <p className="text-muted-foreground mb-4">We may share your information in the following circumstances:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
                    <li><strong>With Partner Institutions:</strong> We may share academic information with partner institutions to facilitate document access and collaboration.</li>
                    <li><strong>Service Providers:</strong> We engage trusted third-party service providers to perform functions on our behalf.</li>
                    <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights.</li>
                    <li><strong>Business Transfers:</strong> Information may be transferred in connection with mergers, acquisitions, or asset sales.</li>
                  </ul>
                  <p className="text-muted-foreground">
                    We do not sell your personal information to third parties for marketing purposes.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Data Security</h2>
                  <p className="text-muted-foreground mb-4">
                    We implement appropriate technical and organizational measures to protect your information, including:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Encryption of sensitive data</li>
                    <li>Secure authentication protocols</li>
                    <li>Regular security assessments</li>
                    <li>Access controls and employee training</li>
                    <li>Secure data storage and transmission</li>
                  </ul>
                  <p className="text-muted-foreground">
                    However, no method of transmission over the internet is 100% secure. While we strive to protect 
                    your information, we cannot guarantee absolute security.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights</h2>
                  <p className="text-muted-foreground mb-4">You have the right to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Access and update your personal information</li>
                    <li>Delete your account and associated data</li>
                    <li>Opt out of marketing communications</li>
                    <li>Request a copy of your data</li>
                    <li>Object to certain processing activities</li>
                    <li>Withdraw consent where processing is based on consent</li>
                  </ul>
                  <p className="text-muted-foreground">
                    To exercise these rights, please contact us at privacy@getpidief.com.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Data Retention</h2>
                  <p className="text-muted-foreground">
                    We retain your information for as long as necessary to provide our services and fulfill the purposes 
                    outlined in this policy, unless a longer retention period is required or permitted by law.
                  </p>
                  <p className="text-muted-foreground">
                    When you delete your account, we will remove your personal information from our active servers 
                    and take reasonable steps to ensure it is not recoverable.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Children's Privacy</h2>
                  <p className="text-muted-foreground">
                    Our services are not intended for individuals under the age of 13. We do not knowingly collect 
                    personal information from children under 13. If you become aware that a child has provided us 
                    with personal information, please contact us immediately.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">International Data Transfers</h2>
                  <p className="text-muted-foreground">
                    Your information may be transferred to and processed in countries other than your country of residence. 
                    We ensure appropriate safeguards are in place to protect your information in accordance with 
                    applicable data protection laws.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Changes to This Policy</h2>
                  <p className="text-muted-foreground">
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                    the new policy on this page and updating the "Last updated" date. You are advised to review this 
                    policy periodically for any changes.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
                  <p className="text-muted-foreground mb-4">If you have any questions about this Privacy Policy, please contact us:</p>
                  <div className="bg-surface/30 rounded-lg p-6 space-y-2">
                    <p className="text-muted-foreground"><strong>Email:</strong> privacy@getpidief.com</p>
                    <p className="text-muted-foreground"><strong>Address:</strong> Innovation Hub, Lagos, Nigeria</p>
                    <p className="text-muted-foreground"><strong>Phone:</strong> +234 123 456 7890</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </div>
  )
}
