import { Check } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { ActiveLink } from "~/components/ui/ActiveLink";
import { Badge } from "~/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";

const plans = [
  {
    name: "Starter",
    description: "For individuals and small teams getting started",
    price: "Free",
    period: "forever",
    features: [
      "1 domain",
      "All 4 AI platforms (Claude, ChatGPT, Gemini, Perplexity)",
      "Daily monitoring",
      "Up to 10 search queries",
      "30-day history",
    ],
    cta: "Get Started Free",
    href: "/sign-up",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For brands that take their AI visibility seriously",
    price: "$49",
    period: "per month",
    features: [
      "Up to 5 domains",
      "All 4 AI platforms",
      "Daily monitoring",
      "Unlimited search queries",
      "Full history",
      "CSV export",
      "Email alerts",
    ],
    cta: "Start Free Trial",
    href: "/sign-up",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "For agencies and large brands with custom needs",
    price: "Custom",
    period: "contact us",
    features: [
      "Unlimited domains",
      "All 4 AI platforms",
      "Custom query cadence",
      "API access",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    href: `mailto:hello@citeup.com?subject=${encodeURIComponent("Enterprise Inquiry")}`,
    highlighted: false,
  },
];

export default function PricingPlans() {
  return (
    <section className="container mx-auto max-w-7xl bg-[hsl(60,100%,99%)]">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {plans.map((plan) => (
          <PricingPlan key={plan.name} plan={plan} />
        ))}
      </div>
    </section>
  );
}

function PricingPlan({
  plan,
}: {
  plan: {
    name: string;
    description: string;
    price: string;
    period: string;
    features: string[];
    cta: string;
    href: string;
    highlighted: boolean;
  };
}) {
  return (
    <Card
      className={twMerge(
        "relative flex flex-col rounded-md border-2 border-black bg-white p-8",
        plan.highlighted
          ? "shadow-[8px_8px_0px_0px_black]"
          : "shadow-[4px_4px_0px_0px_black]",
      )}
    >
      {plan.highlighted && (
        <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#F59E0B] text-md">
          Most Popular
        </Badge>
      )}

      <CardHeader>
        <CardTitle>
          <div className="mb-6">
            <h3 className="mb-2 font-bold text-2xl text-black">{plan.name}</h3>
            <p className="font-medium text-black text-sm">{plan.description}</p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-5xl text-black">{plan.price}</span>
          <span className="font-medium text-black text-md">{plan.period}</span>
        </div>

        <ActiveLink
          bg={plan.highlighted ? "yellow" : "white"}
          className="w-full px-6 py-3 text-center"
          size="xl"
          to={plan.href}
          variant="button"
        >
          {plan.cta}
        </ActiveLink>

        <ul className="flex flex-col gap-4">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="h-5 w-5 shrink-0 text-[#F59E0B]" />
              <span className="font-medium text-black text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
