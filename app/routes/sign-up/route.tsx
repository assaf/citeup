import { Form, redirect } from "react-router";
import { ActiveLink } from "~/components/ui/ActiveLink";
import { Button } from "~/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "~/components/ui/FieldSet";
import { Input } from "~/components/ui/Input";
import {
  createEmailVerificationToken,
  createSession,
  hashPassword,
} from "~/lib/auth.server";
import { sendEmailVerificationEmail } from "~/lib/email.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const errors: Record<string, string> = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Enter a valid email address";

  if (password.length < 6)
    errors.password = "Password must be at least 6 characters";

  if (password !== confirm) errors.confirm = "Passwords do not match";

  if (Object.keys(errors).length > 0) return { errors };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return { errors: { email: "An account with this email already exists" } };

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({ data: {} });
    return tx.user.create({
      data: { email, passwordHash, accountId: account.id },
    });
  });

  const setCookie = await createSession(user.id, request);

  try {
    const verifyToken = await createEmailVerificationToken(user.id);
    await sendEmailVerificationEmail(user.email, verifyToken);
  } catch (err) {
    console.error("[sign-up] failed to send verification email: %o", err);
  }

  return redirect("/", { headers: { "Set-Cookie": setCookie } });
}

export default function SignUp({ actionData }: Route.ComponentProps) {
  const errors = actionData?.errors ?? {};

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="fade-in-0 zoom-in-95 w-full max-w-md animate-in bg-secondary-background text-secondary-foreground duration-300">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Create account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Form method="post">
            <FieldSet>
              <FieldGroup>
                <Field data-invalid={!!errors.email}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    autoFocus
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="Your email"
                  />
                  {errors.email && <FieldError>{errors.email}</FieldError>}
                </Field>
                <Field data-invalid={!!errors.password}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder="Your password"
                  />
                  {errors.password && (
                    <FieldError>{errors.password}</FieldError>
                  )}
                </Field>
                <Field data-invalid={!!errors.confirm}>
                  <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
                  <Input
                    id="confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder="Confirm your password"
                  />
                  {errors.confirm && <FieldError>{errors.confirm}</FieldError>}
                </Field>
              </FieldGroup>
              <Button type="submit" className="w-full text-lg">
                Create account
              </Button>
            </FieldSet>
          </Form>
          <div className="text-center text-sm">
            <ActiveLink to="/sign-in" variant="button">
              Already have an account? Sign in
            </ActiveLink>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
