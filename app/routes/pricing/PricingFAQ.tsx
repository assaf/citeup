import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";

const faq = [
  {
    question: "Is the Starter plan really free?",
    answer:
      "Yes. One domain, all four platforms, daily monitoring — no credit card required. Upgrade when you need more domains or longer history.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Yes. Upgrade or downgrade at any time. Changes take effect at your next billing cycle.",
  },
  {
    question: "What counts as a domain?",
    answer:
      "A domain is a root hostname you want to monitor (e.g. example.com). Subdomains count toward the same domain.",
  },
  {
    question: "Do you offer a free trial for Pro?",
    answer:
      "Yes — 14 days free, no credit card required. Cancel before the trial ends and you won't be charged.",
  },
];

export default function PricingFAQ() {
  return (
    <section className="bg-[hsl(60,100%,99%)] py-20">
      <h2 className="mb-12 text-center font-bold text-4xl text-black leading-tight">
        Frequently asked questions
      </h2>

      <div className="flex flex-col gap-6">
        {faq.map((item) => (
          <Card
            key={item.question}
            className="rounded-md border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_black]"
          >
            <CardHeader>
              <CardTitle>
                <h3 className="font-bold text-black text-xl">{item.question}</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>{item.answer}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
