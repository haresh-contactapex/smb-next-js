"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import Icon from "@/components/admin-panel/Icon";
import { ACTIONS, STANDARD_ACTIONS, getAllPermissionKeys } from "@/lib/permissions";

const CHECKBOX_CLASSES = "w-4 h-4 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";
const NORMAL_ACCENT = "accent-primary-500 dark:accent-accent-500";
const DANGER_ACCENT = "accent-red-600 dark:accent-red-500";

function Checkbox({ checked, indeterminate = false, onChange, label, danger = false, disabled = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      aria-checked={indeterminate && !checked ? "mixed" : checked}
      title={label}
      disabled={disabled}
      className={`${CHECKBOX_CLASSES} ${danger ? DANGER_ACCENT : NORMAL_ACCENT}`}
    />
  );
}

// Read-only cell mark used on the View screen.
function GrantMark({ granted, danger, label }) {
  if (!granted) {
    return (
      <span className="inline-grid place-items-center w-5 h-5 text-slate-300 dark:text-slate-600" title={`${label}: not granted`}>
        <Icon name="x" className="w-3.5 h-3.5" />
        <span className="sr-only">{label}: not granted</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-grid place-items-center w-5 h-5 rounded-full ${
        danger ? "bg-red-50 text-error dark:bg-red-500/10" : "bg-success/10 text-success"
      }`}
      title={`${label}: granted`}
    >
      <Icon name="check" className="w-3.5 h-3.5" />
      <span className="sr-only">{label}: granted</span>
    </span>
  );
}

/**
 * Module × action permission matrix. Rows come from `modules`
 * (src/lib/permissions.js, derived from the sidebar), so menus added later
 * appear here without changes to this component.
 *
 * Granting any action also grants that module's View, and removing View
 * removes the rest — an Edit permission is meaningless without seeing the page.
 */
export default function PermissionMatrix({ modules, selected, onChange, readOnly = false, fullAccess = false }) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allKeys = useMemo(() => getAllPermissionKeys(modules), [modules]);
  const disabled = readOnly || fullAccess;

  const extraActions = useMemo(() => {
    const extras = [];
    modules.forEach((module) =>
      module.permissions.forEach((permission) => {
        if (!permission.standard && !extras.includes(permission.action)) extras.push(permission.action);
      })
    );
    return extras;
  }, [modules]);

  const selectedCount = allKeys.filter((key) => selectedSet.has(key)).length;
  const dangerCount = modules.reduce(
    (count, module) => count + module.permissions.filter((p) => p.danger && selectedSet.has(p.key)).length,
    0
  );

  function commit(nextSet) {
    onChange(allKeys.filter((key) => nextSet.has(key)));
  }

  function togglePermission(module, permission, checked) {
    const next = new Set(selectedSet);
    const viewKey = module.permissions.find((p) => p.action === "view")?.key;
    if (checked) {
      next.add(permission.key);
      if (viewKey) next.add(viewKey);
    } else if (permission.key === viewKey) {
      module.permissions.forEach((p) => next.delete(p.key));
    } else {
      next.delete(permission.key);
    }
    commit(next);
  }

  function toggleKeys(keys, checked) {
    const next = new Set(selectedSet);
    keys.forEach((key) => (checked ? next.add(key) : next.delete(key)));
    commit(next);
  }

  // Consecutive modules from the same sidebar menu form a section. A section
  // gets a header row (with its own select-all) when it is a group menu such
  // as Settings, holds several modules, or collects modules with no menu yet.
  const sections = useMemo(() => {
    const list = [];
    for (const entry of modules) {
      const key = entry.group?.key ?? entry.key;
      const last = list[list.length - 1];
      if (last && last.key === key) last.modules.push(entry);
      else list.push({ key, group: entry.group, modules: [entry] });
    }
    return list.map((section) => ({
      ...section,
      keys: section.modules.flatMap((module) => module.permissions.map((p) => p.key)),
      showHeader: Boolean(section.group) && (section.group.expanded || section.group.system || section.modules.length > 1),
    }));
  }, [modules]);

  const columnCount = 1 + STANDARD_ACTIONS.length + (extraActions.length > 0 ? 1 : 0);

  const allSelected = selectedCount === allKeys.length && allKeys.length > 0;

  function renderModuleRow(module, indented) {
    const moduleSelected = module.permissions.filter((p) => selectedSet.has(p.key)).length;
    const byAction = Object.fromEntries(module.permissions.map((p) => [p.action, p]));
    const extras = module.permissions.filter((p) => !p.standard);

    return (
          <tr key={module.key} className="table-row transition-colors">
            <th scope="row" className={`py-3 pr-3 text-left font-normal ${indented ? "pl-9" : "pl-3"}`}>
              <div className="flex items-center gap-2.5">
                {!readOnly && (
                  <Checkbox
                    checked={moduleSelected === module.permissions.length}
                    indeterminate={moduleSelected > 0}
                    onChange={(checked) => toggleKeys(module.permissions.map((p) => p.key), checked)}
                    label={`Select all ${module.displayLabel} permissions`}
                    disabled={disabled}
                  />
                )}
                <span className="min-w-0">
                  <span className="block font-medium text-slate-700 dark:text-slate-200">{module.label}</span>
                  <span className="block text-[11px] text-slate-400">
                    {moduleSelected} of {module.permissions.length}
                  </span>
                  {module.pages?.length > 0 && (
                    <span
                      className="block text-[11px] text-slate-400 truncate max-w-[280px]"
                      title={`Sidebar pages: ${module.pages.join(", ")}`}
                    >
                      Pages: {module.pages.join(", ")}
                    </span>
                  )}
                </span>
              </div>
            </th>

            {STANDARD_ACTIONS.map((action) => {
              const permission = byAction[action];
              return (
                <td key={action} className="py-3 px-2 text-center">
                  {!permission ? (
                    <span className="text-slate-300 dark:text-slate-600" aria-label="Not applicable">
                      —
                    </span>
                  ) : readOnly ? (
                    <GrantMark granted={selectedSet.has(permission.key)} danger={permission.danger} label={permission.label} />
                  ) : (
                    <Checkbox
                      checked={selectedSet.has(permission.key)}
                      onChange={(checked) => togglePermission(module, permission, checked)}
                      label={permission.label}
                      danger={permission.danger}
                      disabled={disabled}
                    />
                  )}
                </td>
              );
            })}

            {extraActions.length > 0 && (
              <td className="py-3 px-3">
                {extras.length === 0 ? (
                  <span className="text-slate-300 dark:text-slate-600">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {extras.map((permission) => {
                      const granted = selectedSet.has(permission.key);
                      const tone = permission.danger
                        ? granted
                          ? "border-red-300 bg-red-50 text-error dark:border-red-500/40 dark:bg-red-500/10"
                          : "border-red-200 text-red-500/80 dark:border-red-500/20 dark:text-red-400/70"
                        : granted
                          ? "border-primary-200 bg-primary-50 text-primary-700 dark:border-accent-500/40 dark:bg-accent-500/10 dark:text-accent-300"
                          : "border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400";

                      if (readOnly) {
                        return (
                          <span
                            key={permission.key}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${tone} ${granted ? "" : "line-through opacity-70"}`}
                            title={`${permission.label}: ${granted ? "granted" : "not granted"}`}
                          >
                            {permission.danger && <Icon name="alert-triangle" className="w-3 h-3" />}
                            {permission.actionLabel}
                          </span>
                        );
                      }

                      return (
                        <label
                          key={permission.key}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold ${tone} ${
                            disabled ? "cursor-not-allowed" : "cursor-pointer"
                          }`}
                        >
                          <Checkbox
                            checked={granted}
                            onChange={(checked) => togglePermission(module, permission, checked)}
                            label={permission.label}
                            danger={permission.danger}
                            disabled={disabled}
                          />
                          {permission.danger && <Icon name="alert-triangle" className="w-3 h-3" />}
                          {permission.actionLabel}
                        </label>
                      );
                    })}
                  </div>
                )}
              </td>
            )}
          </tr>
    );
  }


  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <Checkbox
              checked={allSelected}
              indeterminate={selectedCount > 0}
              onChange={(checked) => commit(checked ? new Set(allKeys) : new Set())}
              label="Select all permissions"
              disabled={disabled}
            />
          )}
          <p className="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
            <span className="font-bold text-slate-800 dark:text-white">{selectedCount}</span> of {allKeys.length}{" "}
            permissions selected
          </p>
          {dangerCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-error dark:bg-red-500/10">
              <Icon name="alert-triangle" className="w-3 h-3" />
              {dangerCount} sensitive
            </span>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => commit(new Set(allKeys))}
              disabled={disabled || allSelected}
              className="px-3 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => commit(new Set())}
              disabled={disabled || selectedCount === 0}
              className="px-3 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {fullAccess && (
        <div className="flex items-start gap-2 rounded-xl bg-accent-50 dark:bg-accent-500/10 text-accent-800 dark:text-accent-300 px-3 py-2.5 text-xs">
          <Icon name="shield" className="w-4 h-4 shrink-0 mt-px" />
          <span>This role always has full access, including modules added to the sidebar later. Its permissions can&apos;t be changed.</span>
        </div>
      )}

      <div className="overflow-x-auto custom-scroll -mx-1 border border-slate-100 dark:border-white/5 rounded-xl">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02]">
              <th scope="col" className="py-3 px-3 font-semibold text-left">Module</th>
              {STANDARD_ACTIONS.map((action) => (
                <th
                  key={action}
                  scope="col"
                  className={`py-3 px-2 font-semibold text-center w-[72px] ${ACTIONS[action].danger ? "text-error" : ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {ACTIONS[action].danger && <Icon name="alert-triangle" className="w-3 h-3" />}
                    {ACTIONS[action].label}
                  </span>
                </th>
              ))}
              {extraActions.length > 0 && (
                <th scope="col" className="py-3 px-3 font-semibold text-left">Other</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {sections.map((section) => {
              const sectionSelected = section.keys.filter((key) => selectedSet.has(key)).length;
              return (
                <Fragment key={section.key}>
                  {section.showHeader && (
                    <tr className="bg-slate-50/70 dark:bg-white/[0.02]">
                      <th scope="rowgroup" colSpan={columnCount} className="py-2.5 px-3 text-left font-normal">
                        <div className="flex items-center gap-2.5">
                          {!readOnly && (
                            <Checkbox
                              checked={sectionSelected === section.keys.length}
                              indeterminate={sectionSelected > 0}
                              onChange={(checked) => toggleKeys(section.keys, checked)}
                              label={`Select all ${section.group.label} permissions`}
                              disabled={disabled}
                            />
                          )}
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                            {section.group.label}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {sectionSelected} of {section.keys.length}
                          </span>
                        </div>
                      </th>
                    </tr>
                  )}
                  {section.modules.map((module) => renderModuleRow(module, section.showHeader))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1 text-error">
          <Icon name="alert-triangle" className="w-3 h-3" />
          Sensitive — deletes data, moves money or changes access
        </span>
        <span>— Not available for this module</span>
        {!readOnly && <span>Granting any action also grants View.</span>}
      </div>
    </div>
  );
}
