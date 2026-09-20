"use client";

import { useRef, useState } from "react";
import Icon from "@/components/admin-panel/Icon";

export default function MediaUploaderDropzone({ onFilesPicked, uploading, error }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function pick(fileList) {
    if (fileList && fileList.length) onFilesPicked(fileList);
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }
  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files.length) pick(e.dataTransfer.files);
  }

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <div
        tabIndex={0}
        role="button"
        aria-label="Upload images to the media library"
        onClick={() => !uploading && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`media-dropzone${dragOver ? " drag-over" : ""} border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors bg-slate-50 dark:bg-darksurface2/40 hover:border-primary-400 dark:hover:border-accent-500/50${
          uploading ? " opacity-60 cursor-wait" : " cursor-pointer"
        }${error ? " border-red-400" : " border-slate-200 dark:border-white/10"}`}
      >
        <Icon name="upload-cloud" className="w-10 h-10 text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {uploading ? "Uploading…" : "Drag and drop images to upload"}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          or <span className="text-primary-600 dark:text-accent-400 font-semibold underline">browse files</span> —
          JPEG, PNG, WEBP, or GIF, up to 10MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          aria-hidden="true"
          disabled={uploading}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-xs mt-3 text-error">{error}</p>}
    </section>
  );
}
