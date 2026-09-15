"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** "danger" for destructive actions (the default here — every current
   * caller is destructive); pass "primary" for a non-destructive confirm. */
  confirmVariant?: "danger" | "primary";
  /** Return an error message to show inline and keep the dialog open, or
   * null on success. On success the caller is expected to navigate away —
   * this component does not close itself, so the buttons stay disabled
   * (via `submitting`) until that unmount happens instead of flashing back
   * to their normal state first. */
  onConfirm: () => Promise<string | null>;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = "Отмена",
  confirmVariant = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when the dialog is (re)opened, matching offer-dialog.tsx's identical reset-on-open pattern
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  async function handleConfirm() {
    if (submitting) return; // guards against a second click landing before the disabled state paints
    setSubmitting(true);
    setError(null);
    const err = await onConfirm();
    if (err) {
      setSubmitting(false);
      setError(err);
    }
    // else: caller navigates away — stay disabled/submitting until unmount.
  }

  // Ignore Escape/backdrop/close-button while a request is in flight, so a
  // stray close can't leave the delete running with no visible dialog.
  const guardedClose = submitting ? () => {} : onClose;

  return (
    <Dialog open={open} onClose={guardedClose} title={title} description={description}>
      {error && <p className="mb-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={confirmVariant} onClick={handleConfirm} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
