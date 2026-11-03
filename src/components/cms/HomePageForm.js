"use client";

import { useEffect, useRef, useState } from "react";
import Breadcrumbs from "@/components/admin-panel/Breadcrumbs";
import Icon from "@/components/admin-panel/Icon";
import MediaSelectModal from "@/components/media/MediaSelectModal";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/components/ui/useToast";
import SectionCard from "@/components/settings-shared/SectionCard";
import TextAreaField from "@/components/settings-shared/TextAreaField";
import TextField from "@/components/settings-shared/TextField";
import { ASSURANCE_ICONS, LIMITS, normalizeHomePage } from "@/lib/shared/homePage";

const NO_ERRORS = {};

// A copy of `object` with the value at `path` (["hero", "photosLeft", 0, "src"]) replaced.
function setIn(object, path, value) {
  const [key, ...rest] = path;
  const copy = Array.isArray(object) ? [...object] : { ...object };
  copy[key] = rest.length ? setIn(object[key], rest, value) : value;
  return copy;
}

const ADD_BUTTON =
  "inline-flex items-center gap-2 px-3 h-9 rounded-xl border border-dashed border-slate-300 dark:border-white/20 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const REMOVE_BUTTON =
  "inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

// A picked image: a thumbnail, "Choose image" (opens the Media library dialog) and the address.
function ImageField({ id, label, src, error, onChoose }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <button
          type="button"
          id={id}
          onClick={onChoose}
          className="px-3 h-9 rounded-xl border border-slate-300 dark:border-white/20 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          {src ? "Change image" : "Choose image"}
        </button>
        {src && <span className="min-w-0 truncate text-xs text-slate-400">{src}</span>}
      </div>
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}

/**
 * CMS -> Home Page. `initial` is the saved content (see DEFAULT_HOME_PAGE). Text fields
 * show the checks from normalizeHomePage as the server runs them; images come from the
 * Media library or an upload.
 */
export default function HomePageForm({ initial }) {
  const [content, setContent] = useState(initial);
  const [errors, setErrors] = useState(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(null); // { path, title } while the Media dialog is open
  const { toast, showToast, dismissToast } = useToast();

  const savingRef = useRef(false);
  const initialSnapshot = useRef(JSON.stringify(initial));
  const dirty = JSON.stringify(content) !== initialSnapshot.current;

  // Closing the tab or reloading with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const clearError = (key) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  function update(path, value) {
    setContent((prev) => setIn(prev, path, value));
    clearError(path.join("."));
  }

  // Changing a list's length shifts its rows' errors, so clear them all.
  function changeList(path, next) {
    setContent((prev) => setIn(prev, path, next));
    setErrors(NO_ERRORS);
  }
  const addTo = (path, list, item) => changeList(path, [...list, item]);
  const removeFrom = (path, list, index) =>
    changeList(
      path,
      list.filter((_, i) => i !== index),
    );

  async function uploadImage(fileList) {
    const file = fileList?.[0];
    if (!file || !picker) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "cms");
    const res = await fetch("/api/media", { method: "POST", body: formData });
    const json = await res.json().catch(() => null);
    if (!json?.success) throw new Error(json?.error || "The image couldn't be uploaded.");
    update(picker.path, json.data.url);
  }

  function showFieldErrors(fieldErrors, message) {
    setErrors(fieldErrors);
    const first = Object.keys(fieldErrors)[0];
    if (first) document.getElementById(`home-${first}`)?.focus();
    showToast(message || "Check the highlighted fields and try again.", "error");
  }

  async function handleSave(event) {
    event?.preventDefault();
    if (savingRef.current) return;

    const { content: cleaned, errors: fieldErrors } = normalizeHomePage(content);
    if (Object.keys(fieldErrors).length) {
      showFieldErrors(fieldErrors);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const res = await fetch("/api/cms/home-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        if (json?.errors) showFieldErrors(json.errors, json.error);
        else showToast(json?.error || "The home page couldn't be saved.", "error");
        return;
      }
      setContent(json.data);
      setErrors(NO_ERRORS);
      initialSnapshot.current = JSON.stringify(json.data);
      showToast("Home page saved.");
    } catch {
      showToast("The home page couldn't be saved. Check your connection and try again.", "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const text = (path, label, extra = {}) => (
    <TextField
      id={`home-${path.join(".")}`}
      label={label}
      value={path.reduce((value, key) => value[key], content)}
      onChange={(value) => update(path, value)}
      error={errors[path.join(".")]}
      {...extra}
    />
  );
  const area = (path, label, rows = 3, extra = {}) => (
    <TextAreaField
      id={`home-${path.join(".")}`}
      label={label}
      value={path.reduce((value, key) => value[key], content)}
      onChange={(value) => update(path, value)}
      error={errors[path.join(".")]}
      rows={rows}
      {...extra}
    />
  );
  const image = (path, label) => (
    <ImageField
      id={`home-${path.join(".")}`}
      label={label}
      src={path.reduce((value, key) => value[key], content)}
      error={errors[path.join(".")]}
      onChoose={() => setPicker({ path, title: label })}
    />
  );

  const photoColumn = (key, title) => {
    const photos = content.hero[key];
    return (
      <SectionCard title={title} description="These photos scroll slowly past the headline. Use portrait or square photos.">
        {photos.map((photo, index) => (
          <div key={index} className="space-y-3 rounded-xl border border-slate-200 dark:border-white/10 p-3">
            {image(["hero", key, index, "src"], `Photo ${index + 1}`)}
            {text(["hero", key, index, "alt"], "Description (for screen readers)")}
            <div className="flex justify-end">
              <button
                type="button"
                className={REMOVE_BUTTON}
                disabled={photos.length <= LIMITS.heroPhotos.min}
                onClick={() => removeFrom(["hero", key], photos, index)}
              >
                <Icon name="trash-2" className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>
        ))}
        {errors[`hero.${key}`] && <p className="text-xs text-error">{errors[`hero.${key}`]}</p>}
        <button
          type="button"
          className={ADD_BUTTON}
          disabled={photos.length >= LIMITS.heroPhotos.max}
          onClick={() => addTo(["hero", key], photos, { src: "", alt: "", position: "center" })}
        >
          <Icon name="plus-circle" className="w-4 h-4" />
          Add a photo
        </button>
      </SectionCard>
    );
  };

  return (
    <form onSubmit={handleSave} noValidate className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <Breadcrumbs icon="file-text" items={[{ label: "CMS" }, { label: "Home Page" }]} />
          <h1 className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-white">Home Page</h1>
        </div>
        <button
          type="submit"
          disabled={saving || !dirty}
          className="px-4 h-9 rounded-xl bg-primary-500 dark:bg-accent-500 hover:bg-primary-600 dark:hover:bg-accent-600 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0 w-fit"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
        The text and photos on the storefront home page. Products under <strong>Shop the Highlights</strong> come from the catalog, so edit them under
        Products. Changes go live as soon as you save.
      </p>

      <div className="space-y-6 max-w-4xl">
        <SectionCard title="Hero">
          <div className="grid gap-4 sm:grid-cols-2">
            {text(["hero", "titleLead"], "Headline start", { hint: "For example: A Lifetime of" })}
            {text(["hero", "titleAccent"], "Highlighted word", { hint: "Shown in italics after the start, for example: love." })}
          </div>
          {area(["hero", "title"], "Headline", 2)}
          {area(["hero", "intro"], "Introduction", 5)}
          <div className="grid gap-4 sm:grid-cols-2">
            {text(["hero", "buttonLabel"], "Button text")}
            {text(["hero", "buttonHref"], "Button link", { hint: "A page like /women-wedding-bands, or an https:// address." })}
          </div>
        </SectionCard>

        {photoColumn("photosLeft", "Hero photos: left column (scrolls up)")}
        {photoColumn("photosRight", "Hero photos: right column (scrolls down)")}

        <SectionCard title="Perks line" description="The short promises under the hero.">
          {content.perks.map((perk, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">{text(["perks", index], `Line ${index + 1}`)}</div>
              <button
                type="button"
                className={REMOVE_BUTTON}
                disabled={content.perks.length <= LIMITS.perks.min}
                onClick={() => removeFrom(["perks"], content.perks, index)}
                aria-label={`Remove line ${index + 1}`}
              >
                <Icon name="trash-2" className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {errors.perks && <p className="text-xs text-error">{errors.perks}</p>}
          <button type="button" className={ADD_BUTTON} disabled={content.perks.length >= LIMITS.perks.max} onClick={() => addTo(["perks"], content.perks, "")}>
            <Icon name="plus-circle" className="w-4 h-4" />
            Add a line
          </button>
        </SectionCard>

        <SectionCard title="Explore Our Collections" description="Tiles shown in order. The text appears when a visitor hovers a tile.">
          {content.collections.map((item, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-slate-200 dark:border-white/10 p-3">
              <div className="grid gap-4 sm:grid-cols-2">
                {text(["collections", index, "label"], "Name")}
                {text(["collections", index, "href"], "Link", { hint: "For example /collections/eternity-bands" })}
              </div>
              {image(["collections", index, "src"], "Photo")}
              {area(["collections", index, "text"], "Hover text", 3)}
              <div className="flex justify-end">
                <button
                  type="button"
                  className={REMOVE_BUTTON}
                  disabled={content.collections.length <= LIMITS.collections.min}
                  onClick={() => removeFrom(["collections"], content.collections, index)}
                >
                  <Icon name="trash-2" className="w-3.5 h-3.5" />
                  Remove tile
                </button>
              </div>
            </div>
          ))}
          {errors.collections && <p className="text-xs text-error">{errors.collections}</p>}
          <button
            type="button"
            className={ADD_BUTTON}
            disabled={content.collections.length >= LIMITS.collections.max}
            onClick={() => addTo(["collections"], content.collections, { label: "", href: "", src: "", text: "" })}
          >
            <Icon name="plus-circle" className="w-4 h-4" />
            Add a tile
          </button>
        </SectionCard>

        <SectionCard title="Our Story">
          <div className="grid gap-4 sm:grid-cols-2">
            {text(["story", "heading"], "Heading")}
            {text(["story", "since"], "Side text", { hint: "The tall text beside the photo, for example: Since 2001. Leave empty to hide it." })}
          </div>
          {area(["story", "text"], "Story text", 6)}
          {image(["story", "imageSrc"], "Photo")}
          {text(["story", "imageAlt"], "Photo description (for screen readers)")}
          <div className="grid gap-4 sm:grid-cols-2">
            {text(["story", "buttonLabel"], "Button text")}
            {text(["story", "buttonHref"], "Button link")}
          </div>
        </SectionCard>

        <SectionCard title="Assurances" description="The icons row above the newsletter.">
          {content.assurances.map((item, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-slate-200 dark:border-white/10 p-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor={`home-assurances.${index}.icon`}>Icon</label>
                  <select
                    id={`home-assurances.${index}.icon`}
                    value={item.icon}
                    onChange={(event) => update(["assurances", index, "icon"], event.target.value)}
                    className="field-input"
                  >
                    {ASSURANCE_ICONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors[`assurances.${index}.icon`] && <p className="text-xs text-error mt-1">{errors[`assurances.${index}.icon`]}</p>}
                </div>
                {text(["assurances", index, "title"], "Title")}
              </div>
              {area(["assurances", index, "text"], "Text", 2)}
              <div className="flex justify-end">
                <button
                  type="button"
                  className={REMOVE_BUTTON}
                  disabled={content.assurances.length <= LIMITS.assurances.min}
                  onClick={() => removeFrom(["assurances"], content.assurances, index)}
                >
                  <Icon name="trash-2" className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ))}
          {errors.assurances && <p className="text-xs text-error">{errors.assurances}</p>}
          <button
            type="button"
            className={ADD_BUTTON}
            disabled={content.assurances.length >= LIMITS.assurances.max}
            onClick={() => addTo(["assurances"], content.assurances, { icon: "diamond", title: "", text: "" })}
          >
            <Icon name="plus-circle" className="w-4 h-4" />
            Add an item
          </button>
        </SectionCard>

        <SectionCard title="Newsletter">{text(["newsletterHeading"], "Heading")}</SectionCard>
      </div>

      <MediaSelectModal
        open={Boolean(picker)}
        onClose={() => setPicker(null)}
        onSelectItems={(items) => {
          if (items[0] && picker) update(picker.path, items[0].url);
        }}
        onUploadFiles={uploadImage}
        multiple={false}
        title={picker?.title || "Choose image"}
        confirmLabel="Use this image"
        uploadHint="JPG, PNG, WEBP, or GIF, up to 10MB"
      />

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onDismiss={dismissToast} />
    </form>
  );
}
