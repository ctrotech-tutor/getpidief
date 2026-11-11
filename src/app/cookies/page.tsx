import type { Metadata } from "next";
import { PublicShell } from "@/components/public/PublicShell";
import styles from "@/components/public/pages.module.css";
import { Cookie, Shield, Eye, Settings } from "lucide-react";

export const metadata: Metadata = { title: "Cookie Policy | getpidief", description: "The existing policy on cookies and similar technologies." };
export default function PolicyPage() {
  return <PublicShell><section className={`${styles.hero} ${styles.legalHero}`}><div className={styles.eyebrow}>THE DETAILS</div><div><h1>Cookie Policy</h1><p className={styles.lead}>The existing policy on cookies and similar technologies.</p><div className={styles.notice}><strong>Review in progress.</strong> This is the existing policy text, dated November 2024. It has not yet been verified against the current service or reviewed for legal accuracy. Some contact details and described practices may be outdated.</div></div></section><div className={styles.legalLayout}><nav className={styles.legalNav} aria-label="On this page"><span>ON THIS PAGE</span><a href="#what-are-cookies">What Are Cookies?</a><a href="#types-of-cookies-we-use">Types of Cookies We Use</a><a href="#third-party-cookies">Third-Party Cookies</a><a href="#managing-your-preferences">Managing Your Preferences</a><a href="#your-rights">Your Rights</a><a href="#updates-to-this-policy">Updates to This Policy</a><a href="#contact-us">Contact Us</a></nav><article className={styles.legalBody}>
                <section id="what-are-cookies">
                  <h2>What Are Cookies?</h2>
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

                <section id="types-of-cookies-we-use">
                  <h2>Types of Cookies We Use</h2>

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

                <section id="third-party-cookies">
                  <h2>Third-Party Cookies</h2>
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

                <section id="managing-your-preferences">
                  <h2>Managing Your Preferences</h2>

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
                </section>

                <section id="your-rights">
                  <h2>Your Rights</h2>
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

                <section id="updates-to-this-policy">
                  <h2>Updates to This Policy</h2>
                  <p className="text-muted-foreground">
                    We may update this Cookie Policy to reflect changes in our practices or for legal reasons.
                    We will notify you of any significant changes by updating the "Last updated" date and
                    displaying a notice on our website.
                  </p>
                </section>

                <section id="contact-us">
                  <h2>Contact Us</h2>
                  <p className="text-muted-foreground mb-4">If you have questions about our Cookie Policy, please contact us:</p>
                  <div className="bg-surface/30 rounded-lg p-6 space-y-2">
                    <p className="text-muted-foreground"><strong>Email:</strong> privacy@getpidief.com</p>


                  </div>
                </section></article></div></PublicShell>;
}
