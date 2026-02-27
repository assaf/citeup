import { redirect } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/Card";
import { createSession } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { token } = params;

  const record = await prisma.passwordRecoveryToken.findUnique({
    where: { token },
  });

  if (!record || record.expiresAt < new Date() || record.usedAt !== null)
    return { invalid: true };

  await prisma.passwordRecoveryToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  const setCookie = await createSession(record.userId, request);

  return redirect("/", { headers: { "Set-Cookie": setCookie } });
}

export default function ResetPassword({ loaderData }: Route.ComponentProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Link expired</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            This link is invalid or has already been used. Request a new one
            from the{" "}
            <a href="/password-recovery" className="underline">
              password recovery page
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
