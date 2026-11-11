import { Metadata } from "next"
import { Navigation } from "@/components/landing/Navigation"
import { Footer } from "@/components/landing/Footer"

export const metadata: Metadata = {
  title: "Terms of Service - getpidief",
  description: "Read getpidief's terms of service and user agreement.",
}

export default function TermsPage() {
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
                Terms of Service
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                These terms govern your use of getpidief's services and platform. Please read them carefully.
              </p>
              <p className="text-sm text-muted-foreground">
                Last updated: November 2024
              </p>
            </div>
          </div>
        </section>

        {/* Terms Content */}
        <section className="py-24 px-4">
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto prose prose-lg max-w-none">
              
              <div className="space-y-8">
                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Agreement to Terms</h2>
                  <p className="text-muted-foreground">
                    By accessing and using getpidief ("the Service"), you agree to be bound by these Terms of Service 
                    ("Terms"). If you disagree with any part of these terms, then you may not access the Service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Description of Service</h2>
                  <p className="text-muted-foreground">
                    getpidief is an academic knowledge-sharing platform that connects students, researchers, and 
                    educational institutions. Our service allows users to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Access and download academic documents</li>
                    <li>Share educational resources</li>
                    <li>Connect with academic institutions</li>
                    <li>Participate in knowledge communities</li>
                    <li>Contribute to academic discourse</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">User Accounts</h2>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3">Registration</h3>
                  <p className="text-muted-foreground mb-4">
                    To access certain features of the Service, you must register for an account. You agree to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain and update your account information</li>
                    <li>Keep your password secure and confidential</li>
                    <li>Accept responsibility for all activities under your account</li>
                  </ul>

                  <h3 className="text-xl font-semibold text-foreground mb-3">Account Termination</h3>
                  <p className="text-muted-foreground">
                    We reserve the right to suspend or terminate your account at any time for violations of these 
                    Terms or for any other reason we deem appropriate.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Acceptable Use</h2>
                  <p className="text-muted-foreground mb-4">You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Use the Service for any illegal or unauthorized purpose</li>
                    <li>Violate any applicable laws or regulations</li>
                    <li>Infringe upon intellectual property rights</li>
                    <li>Upload or share malicious content</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                    <li>Interfere with or disrupt the Service</li>
                    <li>Spam or harass other users</li>
                    <li>Share false or misleading information</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Content and Intellectual Property</h2>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3">User Content</h3>
                  <p className="text-muted-foreground mb-4">
                    You retain ownership of any content you submit to the Service. By submitting content, you grant us a 
                    worldwide, non-exclusive, royalty-free license to use, reproduce, and distribute your content for 
                    the purpose of providing and improving the Service.
                  </p>

                  <h3 className="text-xl font-semibold text-foreground mb-3">Service Content</h3>
                  <p className="text-muted-foreground mb-4">
                    The Service and its original content, features, and functionality are owned by getpidief and are 
                    protected by international copyright, trademark, and other intellectual property laws.
                  </p>

                  <h3 className="text-xl font-semibold text-foreground mb-3">Copyright Policy</h3>
                  <p className="text-muted-foreground">
                    We respect intellectual property rights and comply with the Digital Millennium Copyright Act (DMCA). 
                    If you believe your copyrighted work has been infringed, please contact us at copyright@getpidief.com.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Privacy</h2>
                  <p className="text-muted-foreground">
                    Your privacy is important to us. Please review our Privacy Policy, which also governs your use 
                    of the Service, to understand our practices.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Disclaimers</h2>
                  <p className="text-muted-foreground mb-4">
                    The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no representations or warranties 
                    of any kind, express or implied, including but not limited to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Accuracy, reliability, or availability of the Service</li>
                    <li>Quality or suitability of content shared by users</li>
                    <li>Uninterrupted or error-free operation</li>
                    <li>Compatibility with your specific requirements</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Limitation of Liability</h2>
                  <p className="text-muted-foreground">
                    In no event shall getpidief, its directors, employees, partners, agents, suppliers, or affiliates be 
                    liable for any indirect, incidental, special, consequential, or punitive damages, including loss of 
                    profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Indemnification</h2>
                  <p className="text-muted-foreground">
                    You agree to defend, indemnify, and hold harmless getpidief and its licensee and licensors, and 
                    their employees, contractors, agents, officers and directors, from and against any and all claims, 
                    damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited 
                    to attorney's fees).
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Termination</h2>
                  <p className="text-muted-foreground">
                    We may terminate or suspend your account and bar access to the Service immediately, without prior 
                    notice or liability, under our sole discretion, for any reason whatsoever and without limitation.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Governing Law</h2>
                  <p className="text-muted-foreground">
                    These Terms shall be interpreted and governed by the laws of Nigeria, without regard to its 
                    conflict of law provisions. Any disputes arising from these Terms shall be resolved in the 
                    courts of Lagos, Nigeria.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Changes to Terms</h2>
                  <p className="text-muted-foreground">
                    We reserve the right to modify these Terms at any time. If we make material changes, we will 
                    notify you by email or by posting a notice on the Service prior to the change becoming effective.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Contact Information</h2>
                  <p className="text-muted-foreground mb-4">If you have any questions about these Terms, please contact us:</p>
                  <div className="bg-surface/30 rounded-lg p-6 space-y-2">
                    <p className="text-muted-foreground"><strong>Email:</strong> legal@getpidief.com</p>
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
