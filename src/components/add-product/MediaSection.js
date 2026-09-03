"use client";

import { useRef, useState } from "react";
import Icon from "@/components/admin-panel/Icon";

export default function MediaSection({ media, onAddFiles, onRemoveMedia }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFilesPicked(fileList) {
    if (fileList && fileList.length) onAddFiles(fileList);
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
    if (e.dataTransfer.files.length) handleFilesPicked(e.dataTransfer.files);
  }

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Media</h2>

      <div
        tabIndex={0}
        role="button"
        aria-label="Upload images, videos, or 3D models"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`media-dropzone${dragOver ? " drag-over" : ""} border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50 dark:bg-darksurface2/40 hover:border-primary-400 dark:hover:border-accent-500/50`}
      >
        <Icon name="upload-cloud" className="w-10 h-10 text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Drag and drop images, videos, or 3D models
        </p>
        <p className="text-xs text-slate-400 mt-1">
          or <span className="text-primary-600 dark:text-accent-400 font-semibold underline">browse files</span> —
          accepts .jpg, .png, .mp4, .glb, .usdz
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.glb,.usdz"
          className="hidden"
          aria-hidden="true"
          onChange={(e) => {
            handleFilesPicked(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
        {media.map((m, i) => (
          <div
            key={`${m.name}-${i}`}
            className="relative group border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden aspect-square bg-slate-100 dark:bg-darksurface2/60 flex items-center justify-center"
          >
            {m.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob: object URLs from local uploads, not optimizable by next/image
              <img
                src={m.url}
                alt={m.name || ""}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.opacity = 0.15;
                }}
              />
            ) : m.type === "video" ? (
              <>
                <video src={m.url} className="w-full h-full object-cover" muted />
                <span className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center">
                  <Icon name="film" className="w-3.5 h-3.5" />
                </span>
              </>
            ) : (
              <>
                <Icon name="package" className="w-8 h-8 text-slate-400" />
                <span className="absolute bottom-1 left-1 right-1 text-[10px] text-slate-500 dark:text-slate-400 truncate text-center">
                  {m.name || "3D model"}
                </span>
              </>
            )}
            <button
              type="button"
              aria-label="Remove media"
              onClick={() => onRemoveMedia(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/70 text-white text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      {media.length === 0 && (
        <p className="text-xs text-slate-400 mt-3">
          No media yet. Uploaded images, videos, and 3D models will appear here in a grid.
        </p>
      )}
    </section>
  );
}
