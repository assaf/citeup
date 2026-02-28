import { Form, redirect } from "react-router";
import { Button } from "~/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";
import { Field, FieldError, FieldLabel } from "~/components/ui/FieldSet";
import { Input } from "~/components/ui/Input";
import { requireUser } from "~/lib/auth.server";
import prisma from "~/lib/prisma.server";
import { extractDomain, fetchPageContent, verifyDomain } from "~/lib/sites.server";
import type { Route } from "./+types/route";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export function meta(): Route.MetaDescriptors {
  return [{ title: "Add a Site | CiteUp" }];
}

type ActionResult =
  | { step: 1; error: string; url?: string }
  | { step: 2; domain: string; error: string }
  | { step: 3; domain: string; content: string; error: string };

export async function action({ request }: Route.ActionArgs): Promise<ActionResult> {
  const user = await requireUser(request);
  const form = await request.formData();
  const step = Number(form.get("step") ?? 1);

  if (step === 1) {
    const url = form.get("url")?.toString().trim() ?? "";
    const domain = extractDomain(url);
    if (!domain) return { step: 1, error: "Enter a valid website URL", url };
    const ok = await verifyDomain(domain);
    if (!ok)
      return { step: 1, error: `No DNS records found for ${domain}. Is the domain live?`, url };
    return { step: 2, domain, error: "" };
  }

  if (step === 2) {
    const domain = form.get("domain")?.toString() ?? "";
    const content = await fetchPageContent(domain);
    if (!content)
      return {
        step: 2,
        domain,
        error: `Couldn't fetch ${domain} — is the site live and accessible?`,
      };
    return { step: 3, domain, content, error: "" };
  }

  if (step === 3) {
    const domain = form.get("domain")?.toString() ?? "";
    const content = form.get("content")?.toString() ?? "";
    const existing = await prisma.site.findFirst({
      where: { accountId: user.accountId, domain },
    });
    if (existing)
      return { step: 3, domain, content, error: "That domain is already added to your account" };
    await prisma.site.create({ data: { domain, accountId: user.accountId, content } });
    throw redirect("/sites");
  }

  return { step: 1, error: "Invalid step" };
}

function StepIndicator({ current }: { current: number }) {
  const steps = ["Enter URL", "Verify DNS", "Fetch Content", "Confirm"];
  return (
    <div className="flex items-center gap-1 text-sm">
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <span key={label} className="flex items-center gap-1">
            {index > 0 && <span className="text-foreground/40">→</span>}
            <span
              className={
                done
                  ? "text-green-600"
                  : active
                    ? "font-bold text-foreground"
                    : "text-foreground/40"
              }
            >
              {done ? `✓ ${label}` : `${stepNum}. ${label}`}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function Step1Form({ actionData }: { actionData?: { step: 1; error: string; url?: string } }) {
  const error = actionData?.error;
  const url = actionData?.url ?? "";
  return (
    <Form method="post" noValidate className="space-y-4">
      <input type="hidden" name="step" value="1" />
      <Field>
        <FieldLabel htmlFor="url">Website URL</FieldLabel>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder="https://yoursite.com"
          defaultValue={url}
          autoFocus
        />
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <Button type="submit">Continue</Button>
    </Form>
  );
}

function Step2Form({ actionData }: { actionData: { step: 2; domain: string; error: string } }) {
  const { domain, error } = actionData;
  return (
    <Form method="post" className="space-y-4">
      <input type="hidden" name="step" value="2" />
      <input type="hidden" name="domain" value={domain} />
      <div className="rounded-md border border-green-200 bg-green-50 p-3 text-green-800 text-sm">
        DNS verified: <strong>{domain}</strong>
      </div>
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit">Continue</Button>
    </Form>
  );
}

function Step3Form({
  actionData,
}: { actionData: { step: 3; domain: string; content: string; error: string } }) {
  const { domain, content, error } = actionData;
  return (
    <Form method="post" className="space-y-4">
      <input type="hidden" name="step" value="3" />
      <input type="hidden" name="domain" value={domain} />
      <input type="hidden" name="content" value={content} />
      <div className="rounded-md border border-green-200 bg-green-50 p-3 text-green-800 text-sm">
        DNS verified: <strong>{domain}</strong>
      </div>
      <div className="rounded-md border border-green-200 bg-green-50 p-3 text-green-800 text-sm">
        Content fetched successfully
      </div>
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit">Add Site</Button>
    </Form>
  );
}

export default function AddSitePage({ actionData }: Route.ComponentProps) {
  const data = actionData as ActionResult | undefined;
  const currentStep = data?.step ?? 1;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg space-y-2">
        <CardHeader>
          <CardTitle className="text-2xl">Add a Site</CardTitle>
          <StepIndicator current={currentStep} />
        </CardHeader>
        <CardContent>
          {currentStep <= 1 && (
            <Step1Form actionData={data?.step === 1 ? data : undefined} />
          )}
          {currentStep === 2 && data?.step === 2 && <Step2Form actionData={data} />}
          {currentStep === 3 && data?.step === 3 && <Step3Form actionData={data} />}
        </CardContent>
      </Card>
    </main>
  );
}
