import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";

interface DeleteSiteDialogProps {
  isOpen: boolean;
  domain: string;
  siteId: string;
  onClose: () => void;
  onConfirm: (siteId: string) => void;
  isSubmitting?: boolean;
}

export default function DeleteSiteDialog({
  isOpen,
  domain,
  siteId,
  onClose,
  onConfirm,
  isSubmitting = false,
}: DeleteSiteDialogProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isValid = input === domain;

  useEffect(() => {
    if (isOpen) {
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-base border-2 border-black bg-white p-6 shadow-shadow">
        <h2 className="mb-4 font-bold font-heading text-xl">Delete Site</h2>

        <p className="mb-4 text-base text-foreground/70">
          Are you sure you want to delete <strong>{domain}</strong>? This action cannot be undone.
        </p>

        <p className="mb-4 text-foreground/60 text-sm">
          Type the domain name below to confirm deletion:
        </p>

        <Input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={domain}
          disabled={isSubmitting}
          className="mb-6"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-base border-2 border-black px-4 py-3 font-bold text-base transition-all duration-100 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            onClick={() => {
              if (isValid) onConfirm(siteId);
            }}
            disabled={!isValid || isSubmitting}
            variant="destructive"
          >
            Delete Site
          </Button>
        </div>
      </div>
    </div>
  );
}
