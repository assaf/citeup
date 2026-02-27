import { ActiveLink } from "~/components/ui/ActiveLink";
import type { Route } from "./+types/route";
import PricingFAQ from "./PricingFAQ";
import PricingPlans from "./PricingPlans";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Pricing | CiteUp" },
    {
      name: "description",
      content:
        "Simple, transparent pricing for LLM citation visibility monitoring. Free plan available. No hidden fees.",
    },
  ];
}

export default function Pricing() {
  return (
    <main
      className="flex min-h-screen flex-col bg-[hsl(60,100%,99%)]"
      aria-label="Pricing"
    >
      <div className="container mx-auto my-10 space-y-8 p-5">
        <section className="bg-[hsl(60,100%,99%)] py-20 text-center">
          <h1 className="mb-6 font-bold text-5xl text-black leading-tight md:text-6xl">
            Simple, transparent pricing
          </h1>
          <p className="font-medium text-black text-xl leading-relaxed md:text-2xl">
            Start free. Upgrade when you need more.
          </p>
        </section>

        <PricingPlans />
        <PricingFAQ />
      </div>

      <section className="bg-[hsl(47,100%,95%)] px-4 py-20">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="mb-6 font-bold text-4xl text-black leading-tight md:text-5xl">
            Ready to see your citations?
          </h2>
          <p className="mb-8 font-medium text-black text-xl leading-relaxed">
            Start monitoring your LLM citation visibility today.
          </p>
          <ActiveLink to="/sign-up" variant="button" bg="yellow" size="xl">
            Get Started Free
          </ActiveLink>
        </div>
      </section>
    </main>
  );
}
