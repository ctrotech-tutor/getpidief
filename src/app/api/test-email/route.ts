import { NextRequest, NextResponse } from "next/server";
import { sgMail, EMAIL_FROM } from "@/lib/email/client";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // Send a simple test email
    const [response] = await sgMail.send({
      from: EMAIL_FROM.noreply,
      to: email,
      subject: "Test Email from getpidief",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563EB; text-align: center;">Test Email</h1>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2>Hello!</h2>
            <p>This is a test email from the getpidief email system.</p>
            <p>If you're receiving this email, it means the email functionality is working correctly!</p>
            <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated test email from getpidief.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", response);
    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
    });

  } catch (error) {
    console.error("Test email API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to send email", details: errorMessage },
      { status: 500 }
    );
  }
}
