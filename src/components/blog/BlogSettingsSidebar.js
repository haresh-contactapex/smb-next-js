"use client";

import { useCallback, useState } from "react";
import Icon from "@/components/admin-panel/Icon";
import MediaSelectModal from "@/components/media/MediaSelectModal";
import { altTextFor, uploadLibraryImage } from "@/components/media/helpers";
import CmsVersionHistory from "@/components/cms/CmsVersionHistory";
import {
  BLOG_AUTHOR_MAX,
  BLOG_CATEGORY_MAX,
  BLOG_IMAGE_ALT_MAX,
  BLOG_STATUSES,
  BLOG_TAGS_MAX_COUNT,
  blogCategoryPath,
  blogPostPath,
  categorySlugFor,
  formatBlogDate,
  parseTags,
  todayIso,
} from "@/lib/blogRules";
import { displayStatus, formatDateTime } from "./helpers";

const LABEL = "block text-[12px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5";
const CARD = "bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6";
const BUTTON =
  "h-9 rounded-xl border border-slate-200 dark:border-white/10 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const helpClass = (error) => `text-[11px] mt-1.5 ${error ? "text-error" : "text-slate-400"}`;

// Publishing, the post's category, author, tags and featured picture and, when
// editing, its history.
export default function BlogSettingsSidebar({
  isEdit,
  post,
  status,
  statusError,
  canPublish,
  publishedOn,
  publishedOnError,
  category,
  categoryError,
  categories,
  author,
  authorError,
  tags,
  tagsError,
  featuredImageUrl,
  featuredImageUrlError,
  featuredImageAlt,
  featuredImageAltError,
  onStatusChange,
  onPublishedOnChange,
  onCategoryChange,
  onAuthorChange,
  onTagsChange,
  onFeaturedImageSelect,
  onFeaturedImageRemove,
  onFeaturedImageAltChange,
  revisions,
  revisionsLoading,
  revisionsError,
  restoringId,
  onOpenRevisions,
  onRestoreRevision,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  // The post form has no save-time upload step, so a file from the computer is
  // uploaded to the library right away and chosen as the featured image.
  async function uploadFeaturedImage(files) {
    const item = await uploadLibraryImage(files[0], "cms");
    onFeaturedImageSelect({ url: item.url, alt: altTextFor(item) });
  }

  const today = todayIso();
  const scheduled = status === "published" && publishedOn && publishedOn > today;
  const categorySlug = categorySlugFor(category);
  const tagCount = parseTags(tags).length;
  const savedStatus = post ? displayStatus(post, today) : null;

  let statusHelp;
  if (!canPublish) statusHelp = "Only staff with the Publish permission can publish or unpublish posts.";
  else if (status === "draft") statusHelp = "Draft posts are only visible here. Visitors get a not-found page.";
  else if (scheduled) statusHelp = `Scheduled: the post goes live on ${formatBlogDate(publishedOn)}.`;
  else statusHelp = "Published posts are live on the storefront from their date.";

  return (
    <>
      <section className={CARD}>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Publishing</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="blog-status" className={LABEL}>
              Status
            </label>
            <div className="relative">
              <select
                id="blog-status"
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                disabled={!canPublish}
                aria-invalid={Boolean(statusError)}
                aria-describedby="blog-status-help"
                className="field-input appearance-none pr-8 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {BLOG_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none">
                <Icon name="chevron-down" className="w-4 h-4" />
              </span>
            </div>
            <p id="blog-status-help" className={helpClass(statusError)}>
              {statusError || statusHelp}
            </p>
          </div>

          <div>
            <label htmlFor="blog-published-on" className={LABEL}>
              Publish date
            </label>
            <input
              id="blog-published-on"
              type="date"
              min="2000-01-01"
              max="2100-12-31"
              value={publishedOn}
              onChange={(e) => onPublishedOnChange(e.target.value)}
              aria-invalid={Boolean(publishedOnError)}
              aria-describedby="blog-published-on-help"
              className="field-input h-10 dark:[color-scheme:dark]"
            />
            <p id="blog-published-on-help" className={helpClass(publishedOnError)}>
              {publishedOnError ||
                "Leave blank to use today's date when the post is published. A published post dated in the future goes live on that date."}
            </p>
          </div>
        </div>

        {isEdit && post && (
          <dl className="mt-5 space-y-1 border-t border-slate-100 pt-4 text-xs dark:border-white/5">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Last saved</dt>
              <dd className="text-right text-slate-600 dark:text-slate-300">
                {formatDateTime(post.updatedAt)}
                {post.updatedByName && <span className="block text-[11px] text-slate-400">by {post.updatedByName}</span>}
              </dd>
            </div>
            {savedStatus === "scheduled" && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Goes live</dt>
                <dd className="text-right text-slate-600 dark:text-slate-300">{formatBlogDate(post.publishedOn)}</dd>
              </div>
            )}
            {savedStatus === "published" && (
              <div className="pt-2">
                <a
                  href={blogPostPath(post.categorySlug, post.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-primary-600 hover:underline dark:text-accent-400"
                >
                  <Icon name="eye" className="w-3.5 h-3.5" />
                  View on storefront
                </a>
              </div>
            )}
          </dl>
        )}
      </section>

      <section className={CARD}>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Post details</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="blog-category" className={LABEL}>
              Category
            </label>
            <input
              id="blog-category"
              type="text"
              list="blog-category-list"
              autoComplete="off"
              value={category}
              maxLength={BLOG_CATEGORY_MAX}
              onChange={(e) => onCategoryChange(e.target.value)}
              placeholder="e.g. Classic Bands"
              aria-invalid={Boolean(categoryError)}
              aria-describedby="blog-category-help"
              className="field-input h-10"
            />
            <datalist id="blog-category-list">
              {categories.map((option) => (
                <option key={option.slug} value={option.name} />
              ))}
            </datalist>
            <p id="blog-category-help" className={helpClass(categoryError)}>
              {categoryError ||
                `Pick an existing category or type a new one. It is part of the post's address${categorySlug ? `: ${blogCategoryPath(categorySlug)}/` : "."}`}
            </p>
          </div>

          <div>
            <label htmlFor="blog-author" className={LABEL}>
              Author
            </label>
            <input
              id="blog-author"
              type="text"
              value={author}
              maxLength={BLOG_AUTHOR_MAX}
              onChange={(e) => onAuthorChange(e.target.value)}
              placeholder="e.g. Shop My Band Team"
              aria-invalid={Boolean(authorError)}
              aria-describedby="blog-author-help"
              className="field-input h-10"
            />
            <p id="blog-author-help" className={helpClass(authorError)}>
              {authorError || "Shown with the post on the storefront."}
            </p>
          </div>

          <div>
            <label htmlFor="blog-tags" className={LABEL}>
              Tags
            </label>
            <input
              id="blog-tags"
              type="text"
              value={tags}
              onChange={(e) => onTagsChange(e.target.value)}
              placeholder="e.g. gold, engagement, care"
              aria-invalid={Boolean(tagsError)}
              aria-describedby="blog-tags-help"
              className="field-input h-10"
            />
            <p id="blog-tags-help" className={helpClass(tagsError)}>
              {tagsError || `Separate tags with commas (${tagCount} of ${BLOG_TAGS_MAX_COUNT}).`}
            </p>
          </div>
        </div>
      </section>

      <section className={CARD}>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Featured image</h3>

        {featuredImageUrl ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-darksurface2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={featuredImageUrl} alt="" className="aspect-video w-full object-cover" />
          </div>
        ) : (
          <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-slate-300 text-slate-400 dark:border-white/15">
            <span className="flex flex-col items-center gap-1.5 text-xs">
              <Icon name="image" className="w-6 h-6" />
              No image chosen
            </span>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button id="blog-featured-image-choose" type="button" onClick={() => setPickerOpen(true)} className={BUTTON}>
            {featuredImageUrl ? "Change image" : "Choose image"}
          </button>
          {featuredImageUrl && (
            <button type="button" onClick={onFeaturedImageRemove} className={BUTTON}>
              Remove
            </button>
          )}
        </div>
        {featuredImageUrlError ? (
          <p role="alert" className="text-[11px] text-error mt-1.5">
            {featuredImageUrlError}
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 mt-1.5">Shown on the blog listing and above the post.</p>
        )}

        {(featuredImageUrl || featuredImageAlt) && (
          <div className="mt-4">
            <label htmlFor="blog-featured-image-alt" className={LABEL}>
              Image description
            </label>
            <input
              id="blog-featured-image-alt"
              type="text"
              value={featuredImageAlt}
              maxLength={BLOG_IMAGE_ALT_MAX}
              onChange={(e) => onFeaturedImageAltChange(e.target.value)}
              placeholder="Describe the picture"
              aria-invalid={Boolean(featuredImageAltError)}
              aria-describedby="blog-featured-image-alt-help"
              className="field-input h-10"
            />
            <p id="blog-featured-image-alt-help" className={helpClass(featuredImageAltError)}>
              {featuredImageAltError || "Alt text for people who can't see the picture and for search engines."}
            </p>
          </div>
        )}

        <MediaSelectModal
          open={pickerOpen}
          onClose={closePicker}
          onSelectItems={(items) => items[0] && onFeaturedImageSelect({ url: items[0].url, alt: altTextFor(items[0]) })}
          onUploadFiles={uploadFeaturedImage}
          selectedUrls={featuredImageUrl ? [featuredImageUrl] : []}
          multiple={false}
          title="Featured image"
          confirmLabel="Use as featured image"
          uploadHint="JPG, PNG, WEBP, or GIF, up to 10MB"
        />
      </section>

      {isEdit && (
        <CmsVersionHistory
          revisions={revisions}
          revisionsLoading={revisionsLoading}
          revisionsError={revisionsError}
          restoringId={restoringId}
          onOpen={onOpenRevisions}
          onRestore={onRestoreRevision}
          noun="post"
        />
      )}
    </>
  );
}
