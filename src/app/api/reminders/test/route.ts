import { NextRequest, NextResponse } from "next/server";
import { sendSmtpEmail, isSmtpConfigured } from "@/lib/email/smtp";
import { z } from "zod";

const testEmailSchema = z.object({
  destinationEmail: z.string().email("Please provide a valid email address"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = testEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid email" },
        { status: 400 }
      );
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SMTP server is not configured in .env.local. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS to send real emails.",
        },
        { status: 503 }
      );
    }

    const { destinationEmail } = parsed.data;

    const result = await sendSmtpEmail({
      to: destinationEmail,
      subject: "Daymark — Test Email Verification",
      html: `
        <div style="background-color: #141719; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #E7ECE9;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #1C2023; border: 1px solid #343C40; border-radius: 12px; padding: 24px;">
            <h2 style="color: #94CDB5; margin-top: 0;">Test Email Successful</h2>
            <p style="color: #E7ECE9; font-size: 14px;">Your Daymark email reminder delivery via SMTP is configured and working properly.</p>
            <p style="color: #9AA5A3; font-size: 13px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
      text: "Daymark Test Email: Your email reminder delivery via SMTP is configured and working properly.",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to send test email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: `Test email sent successfully to ${destinationEmail}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
