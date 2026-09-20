import { sql } from "./db";

function toMediaItem(row) {
  return {
    id: row.id,
    fileName: row.file_name,
    url: row.url,
    mimeType: row.mime_type || null,
    sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
    altText: row.alt_text || "",
    createdAt: row.created_at,
  };
}

export async function listMedia() {
  const rows = await sql`
    SELECT id, file_name, url, mime_type, size_bytes, alt_text, created_at
    FROM media
    ORDER BY created_at DESC
  `;
  return rows.map(toMediaItem);
}

export async function getMediaById(id) {
  const [row] = await sql`SELECT * FROM media WHERE id = ${id}`;
  return row ? toMediaItem(row) : null;
}

export async function createMedia({ fileName, url, mimeType, sizeBytes, altText }) {
  const [created] = await sql`
    INSERT INTO media (file_name, url, mime_type, size_bytes, alt_text)
    VALUES (${fileName}, ${url}, ${mimeType || null}, ${sizeBytes ?? null}, ${altText || null})
    RETURNING id, file_name, url, mime_type, size_bytes, alt_text, created_at
  `;
  return toMediaItem(created);
}

export async function deleteMedia(id) {
  const [deleted] = await sql`DELETE FROM media WHERE id = ${id} RETURNING url`;
  return deleted ? deleted.url : null;
}
