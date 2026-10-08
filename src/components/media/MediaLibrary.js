"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MediaUploaderDropzone from "./MediaUploaderDropzone";
import MediaGrid from "./MediaGrid";
import MediaDetailsModal from "./MediaDetailsModal";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import { Can, useCan } from "@/components/providers/StaffPermissionsProvider";
import { confirmBulkDelete, requestBulkDelete, useBulkSelection } from "@/components/admin-panel/BulkSelection";

export default function MediaLibrary({ initialItems }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selected, setSelected] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const canDelete = useCan()("media.delete");
  const selection = useBulkSelection();
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletedNotice, setDeletedNotice] = useState("");

  async function handleUpload(fileList) {
    setUploadError("");
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/media", { method: "POST", body: formData });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || `Failed to upload ${file.name}`);
        setItems((prev) => [json.data, ...prev]);
      }
      router.refresh();
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.fileName}"? This can't be undone.`)) return;
    setDeletingItem(item);
    try {
      const res = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete media");
      setItems((prev) => prev.filter((m) => m.id !== item.id));
      selection.remove([item.id]);
      setSelected(null);
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setDeletingItem(null);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selection.ids];
    if (ids.length === 0 || bulkDeleting) return;
    if (!confirmBulkDelete(ids.length, "file", "files", "Anything still using them will show a broken image.")) return;
    setBulkDeleting(true);
    setDeletedNotice("");
    try {
      const { deleted } = await requestBulkDelete("/api/media", ids, "Failed to delete files");
      const removed = new Set(ids);
      setItems((prev) => prev.filter((m) => !removed.has(m.id)));
      selection.clear();
      setDeletedNotice(`${deleted} file${deleted === 1 ? "" : "s"} removed.`);
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Can permission="media.create">
        <MediaUploaderDropzone onFilesPicked={handleUpload} uploading={uploading} error={uploadError} />
      </Can>
      {deletedNotice && (
        <p role="status" className="text-sm font-semibold text-success">
          {deletedNotice}
        </p>
      )}
      <MediaGrid
        items={items}
        onSelect={setSelected}
        deletingId={deletingItem?.id}
        selection={canDelete ? selection : null}
        onBulkDelete={handleBulkDelete}
        bulkDeleting={bulkDeleting}
      />
      <MediaDetailsModal
        item={selected}
        deleting={selected != null && deletingItem?.id === selected.id}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
      />
      <DeleteOverlay
        active={deletingItem != null || bulkDeleting}
        title={bulkDeleting ? "Deleting files…" : "Deleting file…"}
        itemLabel={bulkDeleting ? `${selection.size} selected` : deletingItem?.fileName || ""}
      />
    </div>
  );
}
