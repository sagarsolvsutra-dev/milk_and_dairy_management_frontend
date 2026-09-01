"use client";

import { useMemo, useRef, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { RowActions, EditAction, ToggleStatusAction, DeleteAction } from "@/components/ui/RowActions";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table, type Column } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { getErrorMessage } from "@/lib/api";
import { createMasterService } from "@/services/masters.service";
import { useAuth } from "@/hooks/useAuth";

export type FieldConfig = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select";
  /** Required when type is "select". */
  options?: { label: string; value: string }[];
  required?: boolean;
  span?: 1 | 2;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  /** Runs on submit against the raw string form value; return an error message to block saving. */
  validate?: (value: string) => string | undefined;
  /** Transforms user input as they type, e.g. digits-only for a mobile-style field. */
  transform?: (value: string) => string;
};

type MasterRow = { _id: string; isActive?: boolean; [key: string]: unknown };

type SimpleMasterManagerProps = {
  endpoint: string;
  /** Permission module key gating add/edit/delete on this master (view is enforced by the route guard). */
  module: string;
  title: string;
  /** Singular form of the record name, used in the edit dialog title and save/add toasts (e.g. "Unit" for a title of "Units"). */
  singularLabel: string;
  description?: string;
  addLabel: string;
  fields: FieldConfig[];
  searchPlaceholder?: string;
  hasToggle?: boolean;
  displayColumns: { header: string; render: (row: MasterRow) => React.ReactNode }[];
};

export function SimpleMasterManager({
  endpoint,
  module,
  title,
  singularLabel,
  description,
  addLabel,
  fields,
  searchPlaceholder = "Search...",
  hasToggle = true,
  displayColumns,
}: SimpleMasterManagerProps) {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canAdd = hasPermission(module, "add");
  const canEdit = hasPermission(module, "edit");
  const canDelete = hasPermission(module, "delete");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { items, total, pages, loading, refetch } = usePaginatedList<MasterRow>(endpoint, { search, page });
  const service = useMemo(() => createMasterService(endpoint), [endpoint]);

  const emptyForm = Object.fromEntries(fields.map((f) => [f.name, ""]));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MasterRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm as Record<string, string>);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MasterRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const togglingRef = useRef<string | null>(null);
  const deletingRef = useRef(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm as Record<string, string>);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (row: MasterRow) => {
    setEditing(row);
    const next: Record<string, string> = {};
    fields.forEach((f) => {
      next[f.name] = row[f.name] !== undefined && row[f.name] !== null ? String(row[f.name]) : "";
    });
    setForm(next);
    setErrors({});
    setDialogOpen(true);
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    fields.forEach((f) => {
      const raw = form[f.name] ?? "";
      if (f.required && !raw.trim()) {
        nextErrors[f.name] = `${f.label} required`;
        return;
      }
      const customError = f.validate?.(raw);
      if (customError) nextErrors[f.name] = customError;
    });
    return { errors: nextErrors, isValid: Object.keys(nextErrors).length === 0 };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: fieldErrors, isValid } = validate();
    setErrors(fieldErrors);
    if (!isValid) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      fields.forEach((f) => {
        payload[f.name] = f.type === "number" ? Number(form[f.name]) || 0 : form[f.name];
      });
      if (editing) {
        await service.update(editing._id, payload);
        toast.success(`${singularLabel} updated successfully`);
      } else {
        await service.create(payload);
        toast.success(`${singularLabel} added successfully`);
      }
      setDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row: MasterRow) => {
    // A ref guards synchronously — state alone would still let a second click
    // through if it fires before the re-render that reflects the first.
    if (togglingRef.current) return;
    togglingRef.current = row._id;
    setTogglingId(row._id);
    try {
      await service.toggleStatus(row._id);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      togglingRef.current = null;
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await service.remove(deleteTarget._id);
      toast.success("Deleted successfully");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const columns: Column<MasterRow>[] = [
    ...displayColumns.map((c) => ({ header: c.header, accessor: (row: MasterRow) => c.render(row) })),
    ...(hasToggle
      ? [
          {
            header: "Status",
            accessor: (row: MasterRow) => (
              <Badge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Inactive"}</Badge>
            ),
          },
        ]
      : []),
    ...(canEdit || canDelete
      ? [
          {
            header: "Actions",
            accessor: (row: MasterRow) => (
              <RowActions>
                {canEdit && <EditAction onClick={() => openEdit(row)} />}
                {canEdit && hasToggle && (
                  <ToggleStatusAction active={Boolean(row.isActive)} disabled={togglingId === row._id} onClick={() => handleToggle(row)} />
                )}
                {canDelete && <DeleteAction onClick={() => setDeleteTarget(row)} />}
              </RowActions>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          canAdd ? (
            <Button icon={<FiPlus className="h-4 w-4" />} onClick={openCreate}>
              {addLabel}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={searchPlaceholder} />
      </div>

      <Table columns={columns} data={items} keyField={(row) => row._id} loading={loading} />
      <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? `Edit ${singularLabel}` : addLabel}
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editing ? "Save Changes" : "Add"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) =>
            f.type === "textarea" ? (
              <Textarea
                key={f.name}
                label={f.label}
                required={f.required}
                placeholder={f.placeholder}
                error={errors[f.name]}
                hint={f.hint}
                value={form[f.name] ?? ""}
                onChange={(e) => setForm({ ...form, [f.name]: f.transform ? f.transform(e.target.value) : e.target.value })}
                className={f.span === 2 ? "sm:col-span-2" : undefined}
              />
            ) : f.type === "select" ? (
              <Select
                key={f.name}
                label={f.label}
                required={f.required}
                options={f.options || []}
                error={errors[f.name]}
                hint={f.hint}
                value={form[f.name] ?? ""}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                wrapperClassName={f.span === 2 ? "sm:col-span-2" : undefined}
              />
            ) : (
              <Input
                key={f.name}
                label={f.label}
                type={f.type === "number" ? "number" : "text"}
                required={f.required}
                placeholder={f.placeholder}
                error={errors[f.name]}
                hint={f.hint}
                min={f.min}
                max={f.max}
                value={form[f.name] ?? ""}
                onChange={(e) => setForm({ ...form, [f.name]: f.transform ? f.transform(e.target.value) : e.target.value })}
                wrapperClassName={f.span === 2 ? "sm:col-span-2" : undefined}
              />
            )
          )}
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${singularLabel}`}
        description="Are you sure you want to delete this record? This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
