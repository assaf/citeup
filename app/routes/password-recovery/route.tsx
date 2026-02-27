import { Form, Link } from "react-router";
import { Button } from "~/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/Card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "~/components/ui/FieldSet";
import { Input } from "~/components/ui/Input";
import { sendPasswordRecoveryEmail } from "~/lib/email.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordRecoveryToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    await sendPasswordRecoveryEmail(email, token);
  }

  return { sent: true };
}

export default function PasswordRecovery({ actionData }: Route.ComponentProps) {
  if (actionData?.sent) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              If that email is associated with an account, we've sent a sign-in
              link. It expires in 30 minutes.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset password</CardTitle>
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
              </FieldGroup>
              <Button type="submit" className="w-full">
                Send recovery link
              </Button>
            </FieldSet>
          </Form>
          <div className="text-center text-sm">
            <Link to="/sign-in" className="underline">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
