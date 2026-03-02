import { PlusIcon, SparklesIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { Alert, AlertTitle } from "~/components/ui/Alert";
import { Button } from "~/components/ui/Button";
import { Card, CardContent } from "~/components/ui/Card";
import type { action } from "./route";

const CATEGORY_LABELS: Record<string, string> = {
  "1.discovery": "Discovery",
  "2.active_search": "Active search",
  "3.comparison": "Comparison",
};

const GROUPS = ["1.discovery", "2.active_search", "3.comparison"];

export default function SuggestedQueries({ hasContent }: { hasContent: boolean }) {
  const fetcher = useFetcher<typeof action>();
  const [dismissed, setDismissed] = useState(false);

  if (!hasContent) return null;

  const isLoading = fetcher.state !== "idle";
  const data = fetcher.data;
  const suggestions = !dismissed && data && "suggestions" in data ? data.suggestions : undefined;
  const error = fetcher.state === "idle" && data && !data.ok ? data.error : undefined;

  return (
    <div className="space-y-3">
      {!suggestions && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={isLoading}
            onClick={() => {
              setDismissed(false);
              fetcher.submit({ _intent: "suggest" }, { method: "post" });
            }}
          >
            <SparklesIcon className="h-4 w-4" />
            {isLoading ? "Generating…" : "Suggest queries"}
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="outline">
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {suggestions && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-heading text-sm font-semibold">Suggested queries</p>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Dismiss suggestions"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>

            {GROUPS.map((group) => {
              const items = suggestions.filter((s) => s.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className="space-y-1">
                  <p className="text-foreground/50 text-xs uppercase tracking-wide">
                    {CATEGORY_LABELS[group] ?? group}
                  </p>
                  <ul className="space-y-1">
                    {items.map((s) => (
                      <SuggestionRow key={s.query} suggestion={s} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SuggestionRow({
  suggestion,
}: {
  suggestion: { group: string; query: string };
}) {
  const addFetcher = useFetcher<typeof action>();
  const added = addFetcher.data?.ok === true;

  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="flex-1 text-foreground/80">{suggestion.query}</span>
      <Button
        variant="outline"
        size="sm"
        type="button"
        disabled={added || addFetcher.state !== "idle"}
        onClick={() =>
          addFetcher.submit(
            {
              _intent: "add-query",
              group: suggestion.group,
              query: suggestion.query,
            },
            { method: "post" },
          )
        }
      >
        {added ? "Added" : <PlusIcon className="h-3 w-3" />}
      </Button>
    </li>
  );
}
