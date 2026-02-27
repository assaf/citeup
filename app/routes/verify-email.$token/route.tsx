import { invariant } from "es-toolkit";
import { Form, redirect } from "react-router";
import { Button } from "~/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "~/components/ui/FieldSet";
import { Input } from "~/components/ui/Input";
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

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && !user.emailVerifiedAt) {
    const token = await createEmailVerificationToken(user.id);
    await sendEmailVerificationEmail(email, token);
  }

  return { resent: true };
}

export default function VerifyEmail({ actionData }: Route.ComponentProps) {
  if (actionData?.resent)
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              If that email has a pending verification, we've sent a new link.
              It expires in 24 hours.
            </p>
          </CardContent>
        </Card>
      </main>
    );

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Link expired</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-sm">
            This verification link is invalid or has already been used. Enter
            your email to receive a new one.
          </p>
          <Form method="post">
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </Field>
              </FieldGroup>
              <Button type="submit" className="w-full">
                Send new verification email
              </Button>
            </FieldSet>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
