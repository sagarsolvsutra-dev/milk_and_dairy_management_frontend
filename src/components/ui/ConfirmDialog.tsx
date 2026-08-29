"use client";

import { Dialog } from "./Dialog";
import { Button } from "./Button";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "શું તમે ખાતરી છો? (Are you sure?)",
  description = "આ ક્રિયા પાછી ફેરવી શકાશે નહીં. (This action cannot be undone.)",
  confirmLabel = "ખાતરી કરો (Confirm)",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            રદ કરો (Cancel)
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div />
    </Dialog>
  );
}
