"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MediaUploaderDropzone from "./MediaUploaderDropzone";
import MediaGrid from "./MediaGrid";
import MediaDetailsModal from "./MediaDetailsModal";
import DeleteOverlay from "@/components/admin-panel/DeleteOverlay";
import { Can } from "@/components/providers/StaffPermissionsProvider";

export default function MediaLibrary({ initialItems }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selected, setSelected] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

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
      setSelected(null);
      router.refresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setDeletingItem(null);
    }
  }

  return (
    <div className="space-y-5">
      <Can permission="media.create">
        <MediaUploaderDropzone onFilesPicked={handleUpload} uploading={uploading} error={uploadError} />
      </Can>
      <MediaGrid items={items} onSelect={setSelected} deletingId={deletingItem?.id} />
      <MediaDetailsModal
        item={selected}
        deleting={selected != null && deletingItem?.id === selected.id}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
      />
      <DeleteOverlay
        active={deletingItem != null}
        title="Deleting file…"
        itemLabel={deletingItem?.fileName || ""}
      />
    </div>
  );
}
