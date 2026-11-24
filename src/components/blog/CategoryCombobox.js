"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/admin-panel/Icon";

const norm = (value) => String(value || "").trim().toLowerCase();

// A searchable category picker. It replaces the browser's native <datalist>, which
// looks different in every browser and cannot be styled. The admin can still type a
// brand-new category: the text field is the value, the list only suggests existing ones.
export default function CategoryCombobox({
  id,
  value,
  onChange,
  options = [],
  placeholder,
  maxLength,
  invalid = false,
  describedBy,
}) {
  const [open, setOpen] = useState(false);
  // Show every category until the admin starts typing, then narrow the list down.
  const [filtering, setFiltering] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = `${id}-listbox`;

  const visible = useMemo(() => {
    const query = norm(value);
    if (!filtering || !query) return options;
    return options.filter((option) => norm(option.name).includes(query));
  }, [options, value, filtering]);

  const typed = String(value || "").trim();
  const hasExact = options.some((option) => norm(option.name) === norm(value));
  const showEmpty = open && visible.length === 0 && filtering && typed !== "";
  const panelOpen = open && (visible.length > 0 || showEmpty);

  // Close when the pointer goes down anywhere outside the field and its list.
  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  // Keep the keyboard-highlighted row in view when the list scrolls.
  useEffect(() => {
    if (!panelOpen || activeIndex < 0) return;
    const node = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, panelOpen]);

  function openList() {
    setOpen(true);
    setActiveIndex(-1);
  }

  function choose(option) {
    onChange(option.name);
    setOpen(false);
    setFiltering(false);
    setActiveIndex(-1);
  }

  function handleInput(event) {
    onChange(event.target.value);
    setFiltering(true);
    setActiveIndex(-1);
    setOpen(true);
  }

  function toggleList() {
    if (open) {
      setOpen(false);
      return;
    }
    setFiltering(false);
    openList();
    inputRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setFiltering(false);
        openList();
        return;
      }
      if (visible.length) setActiveIndex((index) => (index + 1) % visible.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setFiltering(false);
        openList();
        return;
      }
      if (visible.length) setActiveIndex((index) => (index <= 0 ? visible.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      // Only take over Enter while a row is highlighted; otherwise it behaves as before.
      if (panelOpen && activeIndex >= 0 && visible[activeIndex]) {
        event.preventDefault();
        choose(visible[activeIndex]);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={panelOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={panelOpen && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        autoComplete="off"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={handleInput}
        onFocus={() => {
          setFiltering(false);
          openList();
        }}
        onClick={() => {
          if (!open) {
            setFiltering(false);
            openList();
          }
        }}
        onKeyDown={handleKeyDown}
        className="field-input h-10 pr-10"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? "Hide categories" : "Show categories"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleList}
        className="absolute right-0 top-0 grid h-10 w-10 place-items-center rounded-r-xl text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
      >
        <Icon name="chevron-down" className={`h-4 w-4 transition-transform duration-150 ${panelOpen ? "rotate-180" : ""}`} />
      </button>

      {panelOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Categories"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-popover dark:border-white/10 dark:bg-darksurface2"
        >
          {visible.map((option, index) => {
            const selected = hasExact && norm(option.name) === norm(value);
            const active = index === activeIndex;
            return (
              <li
                key={option.slug}
                id={`${id}-option-${index}`}
                data-index={index}
                role="option"
                aria-selected={selected}
                // Keep focus in the input so the list does not close before the click lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-slate-100 dark:bg-white/10" : ""
                } ${selected ? "text-primary-600 dark:text-accent-400" : "text-slate-700 dark:text-slate-200"}`}
              >
                <span className="truncate">{option.name}</span>
                {selected && <Icon name="check" className="h-4 w-4 shrink-0" />}
              </li>
            );
          })}
          {showEmpty && (
            <li role="presentation" className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
              No matching category. &ldquo;{typed}&rdquo; will be created as a new one.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
