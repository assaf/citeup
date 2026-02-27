import { invariant } from "es-toolkit";
import { MailIcon } from "lucide-react";
import { Form, redirect } from "react-router";
import { Button } from "~/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";
import { createEmailVerificationToken } from "~/lib/auth.server";
import { sendEmailVerificationEmail } from "~/lib/email.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export async function loader({ params }: Route.LoaderArgs) {
  const { token } = params;
  const now = new Date();

  const result = await prisma.emailVerificationToken.updateMany({
    where: { token, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });

  if (result.count === 0) return { invalid: true };

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    select: { userId: true },
  });

  invariant(record, "token not found after atomic update");

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerifiedAt: now },
  });

  return redirect("/");
}

export async function action({ params }: Route.ActionArgs) {
  const { token } = params;

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    select: {
      user: { select: { id: true, email: true, emailVerifiedAt: true } },
    },
  });

  if (record?.user && !record.user.emailVerifiedAt) {
    const newToken = await createEmailVerificationToken(record.user.id);
    await sendEmailVerificationEmail(record.user.email, newToken);
  }

  return { resent: true };
}

export default function VerifyEmail({ actionData }: Route.ComponentProps) {
  if (actionData?.resent)
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="fade-in-0 zoom-in-95 w-full max-w-md animate-in bg-secondary-background text-secondary-foreground duration-300">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Check your email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              We've sent a new verification link to your email address. It
              expires in 24 hours.
            </p>
          </CardContent>
        </Card>
      </main>
    );

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="fade-in-0 zoom-in-95 w-full max-w-md animate-in bg-secondary-background text-secondary-foreground duration-300">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Link expired</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-sm">
            This verification link is invalid or has already been used.
          </p>
          <Form method="post">
            <Button type="submit" className="w-full">
              <MailIcon className="size-4" />
              Send new verification email
            </Button>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
