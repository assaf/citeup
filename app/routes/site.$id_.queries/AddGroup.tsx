import { PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Alert, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import type { action } from "./route";

export default function AddGroup() {
  const addGroupFetcher = useFetcher<typeof action>();
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const newGroupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingGroup) newGroupInputRef.current?.focus();
  }, [isAddingGroup]);

  function submitNewGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    addGroupFetcher.submit(
      { _intent: "add-group", group: name },
      { method: "post" },
    );
    setIsAddingGroup(false);
    setNewGroupName("");
  }

  return (
    <>
      {isAddingGroup ? (
        <div className="flex items-center gap-2">
          <Input
            ref={newGroupInputRef}
            placeholder="Group name, e.g. 1.discovery"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNewGroup();
              if (e.key === "Escape") {
                setIsAddingGroup(false);
                setNewGroupName("");
              }
            }}
            onBlur={submitNewGroup}
          />
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              setIsAddingGroup(false);
              setNewGroupName("");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => setIsAddingGroup(true)}
        >
          <PlusIcon className="h-4 w-4" />
          Add group
        </Button>
      )}

      {addGroupFetcher.data?.ok === false && (
        <Alert variant="destructive">
          <AlertTitle>
            {addGroupFetcher.data.error ??
              "Failed to add group. Please try again."}
          </AlertTitle>
        </Alert>
      )}
    </>
  );
}
