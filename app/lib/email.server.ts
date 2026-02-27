import { Resend } from "resend";
import envVars from "~/lib/envVars";

const resend = new Resend(envVars.RESEND_API_KEY);

export async function sendPasswordRecoveryEmail(to: string, token: string) {
  const url = `${envVars.APP_URL}/reset-password/${token}`;

  const { error } = await resend.emails.send({
    from: envVars.EMAIL_FROM,
    to,
    subject: "Reset your citeup password",
    html: `<p>Click <a href="${url}">this link</a> to sign in to citeup. The link expires in 30 minutes and can only be used once.</p><p>If you didn't request this, ignore this email.</p>`,
  });
  if (error) throw new Error(error.message);
}
