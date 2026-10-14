import nodemailer from "nodemailer";

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface MailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_HOST !== "smtp.gmail.com" ||
    (process.env.SMTP_USER && process.env.SMTP_USER !== "your-email@example.com")
  );
}

export function getSmtpTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP credentials (SMTP_USER, SMTP_PASS) are not configured.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendSmtpEmail(options: SendMailOptions): Promise<MailSendResult> {
  try {
    const transporter = getSmtpTransporter();
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "Daymark <no-reply@daymark.app>";

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    console.error("SMTP sendMail error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email via SMTP",
    };
  }
}

/**
 * Builds the Graphite & Mint styled reminder email HTML template.
 */
export function buildReminderEmailHtml(data: {
  date: string;
  tasks: Array<{ title: string; priority: string; dueTime?: string }>;
  isSummary?: boolean;
}): string {
  const taskRows = data.tasks
    .map(
      (t) => `
    <tr style="border-bottom: 1px solid #343C40;">
      <td style="padding: 12px 8px; color: #E7ECE9; font-size: 15px;">
        <strong>${t.title}</strong>
        ${t.dueTime ? `<span style="color: #9AA5A3; font-size: 13px; margin-left: 8px;">Due ${t.dueTime}</span>` : ""}
      </td>
      <td style="padding: 12px 8px; text-align: right; color: ${
        t.priority === "high" ? "#E28C8C" : t.priority === "medium" ? "#E5B978" : "#94CDB5"
      }; font-size: 13px; text-transform: uppercase;">
        ${t.priority}
      </td>
    </tr>`
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Daymark Reminder</title>
  </head>
  <body style="margin: 0; padding: 24px; background-color: #141719; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #E7ECE9;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #1C2023; border: 1px solid #343C40; border-radius: 12px; padding: 28px;">
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <span style="font-size: 20px; font-weight: 600; color: #94CDB5; letter-spacing: -0.5px;">Daymark</span>
      </div>
      
      <h2 style="font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 8px; color: #E7ECE9;">
        ${data.isSummary ? "Daily Progress Summary" : "You have unfinished tasks today"}
      </h2>
      <p style="color: #9AA5A3; font-size: 14px; margin-top: 0; margin-bottom: 24px;">
        ${data.date} • ${data.tasks.length} task${data.tasks.length === 1 ? "" : "s"} remaining
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
        ${taskRows}
      </table>

      <div style="padding-top: 16px; border-top: 1px solid #343C40; text-align: center;">
        <a href="${process.env.APP_BASE_URL || "http://localhost:3000"}" style="display: inline-block; background-color: #94CDB5; color: #141719; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 22px; border-radius: 8px;">
          Open Daymark
        </a>
      </div>
    </div>
  </body>
  </html>
  `;
}
