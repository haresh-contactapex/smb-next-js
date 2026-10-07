"use client";

import { useRef, useState } from "react";
import EngravingFields from "./EngravingFields";
import EngravingLines from "./EngravingLines";
import useEngravingConfig from "./useEngravingConfig";
import { readEngravingValue, valueFromEngraving } from "./engravingHelpers";

const LINK_BUTTON = "text-[13px] font-medium text-[#555555] underline transition-colors hover:text-[#ef9822] disabled:pointer-events-none disabled:opacity-50";

// The edit form for one line's engraving. It only mounts once the rules and fonts have arrived, so
// its starting value can be worked out from them.
function EditForm({ item, config, onSave, onCancel }) {
  const [value, setValue] = useState(() => valueFromEngraving(item.engraving, config));
  const [notice, setNotice] = useState("");
  const { engraving, blocked } = readEngravingValue(value, config);

  function submit(event) {
    event.preventDefault();
    if (blocked) return;
    if (!engraving) {
      setNotice("Enter the engraving text, or choose Remove to take the engraving off this item.");
      return;
    }
    onSave(engraving);
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 border-t border-gray-200 pt-4">
      <EngravingFields
        config={config}
        value={value}
        onChange={(next) => {
          setNotice("");
          setValue(next);
        }}
        showHelp={false}
      />
      <p role="status" className={`text-[13px] text-error ${notice ? "mt-2" : ""}`}>
        {notice}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={blocked}
          className="rounded bg-[#4A4A4A] px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#ef9822] disabled:pointer-events-none disabled:opacity-50"
        >
          Save engraving
        </button>
        <button type="button" onClick={onCancel} className={LINK_BUTTON}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// An engraved line on the cart page: what was asked for, with Edit and Remove. `onChange(item,
// engraving)` applies the change (engraving null removes it); the cart then re-keys the line, and
// merges it with another line that has become identical.
export default function CartEngraving({ item, onChange }) {
  const { status, config, load } = useEngravingConfig();
  const [editing, setEditing] = useState(false);
  const editRef = useRef(null);

  if (!item.engraving) return null;

  function closeEditor() {
    setEditing(false);
    // The Edit button comes back in place of the form; keep keyboard focus on it.
    requestAnimationFrame(() => editRef.current?.focus());
  }

  function startEditing() {
    setEditing(true);
    load();
  }

  function remove() {
    if (!window.confirm(`Remove the engraving "${item.engraving.text}" from ${item.title}?`)) return;
    onChange(item, null);
  }

  return (
    <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4 sm:mt-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#333333]">Personalization</p>
          <EngravingLines engraving={item.engraving} className="mt-1.5 space-y-0.5 text-[14px] text-[#555555]" />
        </div>
        <div className="flex flex-shrink-0 items-center gap-4">
          <button
            ref={editRef}
            type="button"
            onClick={editing ? closeEditor : startEditing}
            aria-expanded={editing}
            aria-label={`${editing ? "Close" : "Edit"} engraving on ${item.title}`}
            className={LINK_BUTTON}
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button type="button" onClick={remove} aria-label={`Remove engraving from ${item.title}`} className={LINK_BUTTON}>
            Remove
          </button>
        </div>
      </div>

      {editing && status === "loading" && <p className="mt-4 text-[13px] text-gray-500">Loading engraving options…</p>}
      {editing && status === "failed" && (
        <p role="status" className="mt-4 text-[13px] text-error">
          We couldn&apos;t load the engraving options. Close this and try again.
        </p>
      )}
      {editing && status === "unavailable" && (
        <p role="status" className="mt-4 text-[13px] text-error">
          Engraving can&apos;t be changed right now. You can still remove it from this item.
        </p>
      )}
      {editing && status === "ready" && (
        <EditForm
          item={item}
          config={config}
          onSave={(engraving) => {
            onChange(item, engraving);
            closeEditor();
          }}
          onCancel={closeEditor}
        />
      )}
    </div>
  );
}
