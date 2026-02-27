import { Form, Link, redirect } from "react-router";
import { Button } from "~/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/Card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "~/components/ui/FieldSet";
import { Input } from "~/components/ui/Input";
import { createSession, verifyPassword } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.passwordHash)))
    return { error: "email and password do not match an existing account" };

  const setCookie = await createSession(user.id, request);

  return redirect("/", { headers: { "Set-Cookie": setCookie } });
}

export default function SignIn({ actionData }: Route.ComponentProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
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
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </Field>
              </FieldGroup>
              {actionData?.error && (
                <FieldError>{actionData.error}</FieldError>
              )}
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </FieldSet>
          </Form>
          <div className="flex flex-col gap-2 text-center text-sm">
            <Link to="/password-recovery" className="underline">
              Forgot your password?
            </Link>
            <Link to="/sign-up" className="underline">
              Don't have an account? Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
