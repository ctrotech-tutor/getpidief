import type { Metadata } from "next";
import { PublicShell } from "@/components/public/PublicShell";
import styles from "@/components/public/pages.module.css";

export const metadata: Metadata = { title: "Privacy Policy | getpidief", description: "How information is described in the existing privacy policy." };
export default function PolicyPage() {
  return <PublicShell><section className={`${styles.hero} ${styles.legalHero}`}><div className={styles.eyebrow}>THE DETAILS</div><div><h1>Privacy Policy</h1><p className={styles.lead}>How information is described in the existing privacy policy.</p><div className={styles.notice}><strong>Review in progress.</strong> This is the existing policy text, dated November 2024. It has not yet been verified against the current service or reviewed for legal accuracy. Some contact details and described practices may be outdated.</div></div></section><div className={styles.legalLayout}><nav className={styles.legalNav} aria-label="On this page"><span>ON THIS PAGE</span><a href="#introduction">Introduction</a><a href="#information-we-collect">Information We Collect</a><a href="#how-we-use-your-information">How We Use Your Information</a><a href="#information-sharing">Information Sharing</a><a href="#data-security">Data Security</a><a href="#your-rights">Your Rights</a><a href="#data-retention">Data Retention</a><a href="#children-s-privacy">Children's Privacy</a><a href="#international-data-transfers">International Data Transfers</a><a href="#changes-to-this-policy">Changes to This Policy</a><a href="#contact-us">Contact Us</a></nav><article className={styles.legalBody}>
                <section id="introduction">
                  <h2>Introduction</h2>
                  <p className="text-muted-foreground">
                    getpidief ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
                    explains how we collect, use, disclose, and safeguard your information when you visit our website 
                    getpidief.com and use our services.
                  </p>
                  <p className="text-muted-foreground">
                    By using getpidief, you consent to the collection and use of information in accordance with this policy.
                  </p>
                </section>

                <section id="information-we-collect">
                  <h2>Information We Collect</h2>
                  
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

                <section id="how-we-use-your-information">
                  <h2>How We Use Your Information</h2>
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

                <section id="information-sharing">
                  <h2>Information Sharing</h2>
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

                <section id="data-security">
                  <h2>Data Security</h2>
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

                <section id="your-rights">
                  <h2>Your Rights</h2>
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

                <section id="data-retention">
                  <h2>Data Retention</h2>
                  <p className="text-muted-foreground">
                    We retain your information for as long as necessary to provide our services and fulfill the purposes 
                    outlined in this policy, unless a longer retention period is required or permitted by law.
                  </p>
                  <p className="text-muted-foreground">
                    When you delete your account, we will remove your personal information from our active servers 
                    and take reasonable steps to ensure it is not recoverable.
                  </p>
                </section>

                <section id="children-s-privacy">
                  <h2>Children's Privacy</h2>
                  <p className="text-muted-foreground">
                    Our services are not intended for individuals under the age of 13. We do not knowingly collect 
                    personal information from children under 13. If you become aware that a child has provided us 
                    with personal information, please contact us immediately.
                  </p>
                </section>

                <section id="international-data-transfers">
                  <h2>International Data Transfers</h2>
                  <p className="text-muted-foreground">
                    Your information may be transferred to and processed in countries other than your country of residence. 
                    We ensure appropriate safeguards are in place to protect your information in accordance with 
                    applicable data protection laws.
                  </p>
                </section>

                <section id="changes-to-this-policy">
                  <h2>Changes to This Policy</h2>
                  <p className="text-muted-foreground">
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                    the new policy on this page and updating the "Last updated" date. You are advised to review this 
                    policy periodically for any changes.
                  </p>
                </section>

                <section id="contact-us">
                  <h2>Contact Us</h2>
                  <p className="text-muted-foreground mb-4">If you have any questions about this Privacy Policy, please contact us:</p>
                  <div className="bg-surface/30 rounded-lg p-6 space-y-2">
                    <p className="text-muted-foreground"><strong>Email:</strong> privacy@getpidief.com</p>
                    <p className="text-muted-foreground"><strong>Address:</strong> Innovation Hub, Lagos, Nigeria</p>
                    <p className="text-muted-foreground"><strong>Phone:</strong> +234 123 456 7890</p>
                  </div>
                </section>
</article></div></PublicShell>;
}
