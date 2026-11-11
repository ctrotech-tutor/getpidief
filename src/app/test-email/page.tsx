"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";

export default function TestEmailPage() {
  const [email, setEmail] = useState("ctrotech.devs@gmail.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string }>({});

  const sendTestEmail = async () => {
    setLoading(true);
    setResult({});

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Test email sent successfully!",
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to send test email",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Network error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Mail className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Test Email</CardTitle>
            <CardDescription>
              Send a test email to verify the email functionality is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <Button
              onClick={sendTestEmail}
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>

            {result.message && (
              <div
                className={`p-4 rounded-md flex items-center space-x-2 ${
                  result.success
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="text-sm">{result.message}</span>
              </div>
            )}

            <div className="text-xs text-gray-500 space-y-1">
              <p>This will send a test email using Resend.</p>
              <p>Check your inbox (and spam folder) for the test email.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
