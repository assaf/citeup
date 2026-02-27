import { invariant } from "es-toolkit";
import { Link, redirect } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";
import { createSession } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/route";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { token } = params;

  const result = await prisma.passwordRecoveryToken.updateMany({
    where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  if (result.count === 0) return { invalid: true };

  const record = await prisma.passwordRecoveryToken.findUnique({
    where: { token },
    select: { userId: true },
  });

  invariant(record, "token not found after atomic update");
  const setCookie = await createSession(record.userId, request);

  return redirect("/", { headers: { "Set-Cookie": setCookie } });
}

export default function ResetPassword() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="fade-in-0 zoom-in-95 w-full max-w-md animate-in bg-secondary-background text-secondary-foreground duration-300">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Link expired</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            This link is invalid or has already been used. Request a new one
            from the{" "}
            <Link to="/password-recovery" className="text-blue-500 underline">
              password recovery page
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
