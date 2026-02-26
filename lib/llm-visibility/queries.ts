/**
 * Simulated queries representing different merchant intents and search patterns
 * for finding short-term retail space in shopping malls.
 */

type Category =
  | "1.discovery"
  | "2.active_search"
  | "3.location_specific"
  | "4.cost_process";

type Query = {
  query: string;
  category: Category;
  intent: string;
};

const queries: Query[] = [
  // Discovery Phase - Learning about the market
  {
    query: "How do I find short-term retail space in shopping malls?",
    category: "1.discovery",
    intent: "Learning about available options and platforms",
  },
  {
    query:
      "What are the best platforms for finding pop-up shops in shopping centers?",
    category: "1.discovery",
    intent: "Platform comparison and discovery",
  },
  {
    query: "How does specialty leasing in malls work?",
    category: "1.discovery",
    intent: "Understanding the leasing process",
  },

  // Active Search Phase - Ready to lease
  {
    query: "Where can I lease a kiosk in a mall for 3-6 months?",
    category: "2.active_search",
    intent: "Immediate need with specific timeframe",
  },
  {
    query: "Find available temporary retail space in shopping centers",
    category: "2.active_search",
    intent: "Browsing current inventory",
  },
  {
    query: "Websites to browse short-term mall retail spaces",
    category: "2.active_search",
    intent: "Platform search for browsing",
  },

  // Location-Specific Searches
  {
    query:
      "Short-term retail leasing opportunities in Los Angeles shopping malls",
    category: "3.location_specific",
    intent: "Geographic-specific search (LA market)",
  },
  {
    query: "Pop-up shop space available in NYC shopping centers",
    category: "3.location_specific",
    intent: "Geographic-specific search (NYC market)",
  },

  // Cost and Process Questions
  {
    query:
      "How much does it cost to rent mall kiosk space for a holiday season?",
    category: "4.cost_process",
    intent: "Budget planning and cost research",
  },
  {
    query: "How to contact mall managers about temporary retail space",
    category: "4.cost_process",
    intent: "Process understanding and contact methods",
  },
];

export default queries;
