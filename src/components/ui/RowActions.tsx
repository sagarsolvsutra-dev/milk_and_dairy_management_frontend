"use client";

import { FiEye, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiXCircle, FiKey, FiBookOpen } from "react-icons/fi";
import { Button } from "./Button";

type ActionProps = {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
};

/** Wrap a row's action buttons — keeps consistent spacing everywhere. */
export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

export function ViewAction({ onClick, title = "View", disabled }: ActionProps) {
  return (
    <Button variant="ghost" size="icon" title={title} onClick={onClick} disabled={disabled}>
      <FiEye className="h-4 w-4" />
    </Button>
  );
}

export function EditAction({ onClick, title = "Edit", disabled }: ActionProps) {
  return (
    <Button variant="ghost" size="icon" title={title} onClick={onClick} disabled={disabled}>
      <FiEdit2 className="h-4 w-4" />
    </Button>
  );
}

export function DeleteAction({ onClick, title = "Delete", disabled }: ActionProps) {
  return (
    <Button variant="ghost" size="icon" title={title} onClick={onClick} disabled={disabled}>
      <FiTrash2 className="h-4 w-4 text-red-500" />
    </Button>
  );
}

export function CancelAction({ onClick, title = "Cancel", disabled }: ActionProps) {
  return (
    <Button variant="ghost" size="icon" title={title} onClick={onClick} disabled={disabled}>
      <FiXCircle className="h-4 w-4 text-red-500" />
    </Button>
  );
}

export function ToggleStatusAction({
  active,
  onClick,
  title = "Toggle status",
  disabled,
}: ActionProps & { active: boolean }) {
  return (
    <Button variant="ghost" size="icon" title={title} onClick={onClick} disabled={disabled}>
      {active ? <FiToggleRight className="h-4 w-4 text-emerald-600" /> : <FiToggleLeft className="h-4 w-4 text-slate-400" />}
    </Button>
  );
}

export function ResetPasswordAction({ onClick, title = "Reset password", disabled }: ActionProps) {
  return (
    <Button variant="ghost" size="icon" title={title} onClick={onClick} disabled={disabled}>
      <FiKey className="h-4 w-4" />
    </Button>
  );
}

export function LedgerAction({ onClick, title = "Ledger", disabled }: ActionProps) {
  return (
    <Button variant="ghost" size="icon" title={title} onClick={onClick} disabled={disabled}>
      <FiBookOpen className="h-4 w-4" />
    </Button>
  );
}
