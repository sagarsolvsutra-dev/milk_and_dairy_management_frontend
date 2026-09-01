"use client";

import { Fragment, useMemo } from "react";
import { FiEye, FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { Permission } from "@/types";

export type ModuleDef = { key: string; label: string; group: string };

const ACTIONS = [
  { key: "view", label: "View", icon: FiEye },
  { key: "add", label: "Add", icon: FiPlus },
  { key: "edit", label: "Edit", icon: FiEdit2 },
  { key: "delete", label: "Delete", icon: FiTrash2 },
] as const;

type ActionKey = (typeof ACTIONS)[number]["key"];

export function buildEmptyPermissions(modules: ModuleDef[]): Permission[] {
  return modules.map((m) => ({ module: m.key, view: false, add: false, edit: false, delete: false }));
}

export function mergePermissions(modules: ModuleDef[], existing: Permission[]): Permission[] {
  return modules.map(
    (m) => existing.find((p) => p.module === m.key) || { module: m.key, view: false, add: false, edit: false, delete: false }
  );
}

export function PermissionMatrix({
  modules,
  value,
  onChange,
}: {
  modules: ModuleDef[];
  value: Permission[];
  onChange: (next: Permission[]) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, ModuleDef[]>();
    modules.forEach((m) => {
      if (!map.has(m.group)) map.set(m.group, []);
      map.get(m.group)!.push(m);
    });
    return Array.from(map.entries());
  }, [modules]);

  const getPerm = (moduleKey: string) => value.find((p) => p.module === moduleKey);

  const toggleCell = (moduleKey: string, action: ActionKey) => {
    onChange(value.map((p) => (p.module === moduleKey ? { ...p, [action]: !p[action] } : p)));
  };

  const toggleRow = (moduleKey: string) => {
    const perm = getPerm(moduleKey);
    const nextVal = !(perm?.view && perm?.add && perm?.edit && perm?.delete);
    onChange(
      value.map((p) => (p.module === moduleKey ? { module: p.module, view: nextVal, add: nextVal, edit: nextVal, delete: nextVal } : p))
    );
  };

  const toggleColumn = (action: ActionKey, moduleKeys: string[]) => {
    const allChecked = moduleKeys.every((key) => getPerm(key)?.[action]);
    onChange(value.map((p) => (moduleKeys.includes(p.module) ? { ...p, [action]: !allChecked } : p)));
  };

  const allModuleKeys = modules.map((m) => m.key);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Module</th>
            {ACTIONS.map((a) => {
              const allChecked = allModuleKeys.every((key) => getPerm(key)?.[a.key]);
              return (
                <th key={a.key} className="px-3 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => toggleColumn(a.key, allModuleKeys)}
                    className="flex w-full flex-col items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-indigo-600"
                    title={`Toggle ${a.label} for all modules`}
                  >
                    <a.icon className="h-3.5 w-3.5" />
                    {a.label}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {groups.map(([groupName, groupModules]) => (
            <Fragment key={groupName}>
              <tr>
                <td colSpan={5} className="bg-slate-50/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {groupName}
                </td>
              </tr>
              {groupModules.map((m) => {
                const perm = getPerm(m.key);
                const fullAccess = Boolean(perm?.view && perm?.add && perm?.edit && perm?.delete);
                return (
                  <tr key={m.key} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={fullAccess}
                          onChange={() => toggleRow(m.key)}
                        />
                        <span className={cn("text-slate-700", fullAccess && "font-medium text-slate-900")}>{m.label}</span>
                      </label>
                    </td>
                    {ACTIONS.map((a) => (
                      <td key={a.key} className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={Boolean(perm?.[a.key])}
                          onChange={() => toggleCell(m.key, a.key)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
