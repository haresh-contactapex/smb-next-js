// Client-side checks that give instant feedback. The server repeats every one
// of them (see src/lib/reviewImportFile.js) — these are a convenience, not a gate.
// Keep MAX_FILE_BYTES in sync with MAX_IMPORT_FILE_BYTES there.

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const ACCEPT_ATTRIBUTE =
  ".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";

export function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Returns an error message, or "" when the file is acceptable.
export function validateFile(file) {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".docx") && !name.endsWith(".doc")) {
    return `${file.name}: only Word files (.docx or .doc) can be imported.`;
  }
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than the 4 MB limit.`;
  return "";
}

// The layout the importer understands, shown on the page as a worked example.
export const FORMAT_EXAMPLE = `Product Details
Product Name    Twisted Women's Wedding Band     (optional table: the product
SKU             MBR-RS5100                        name and SKU are checked against
Review Count    4                                 the product you select)

Customer Reviews
★★★★★  5/5            <- every review starts with a rating line
Onica P.              <- the reviewer's display name
The rose gold band is unique and eye-catching. Love it.   <- the review text

★★★★½  4.5/5
Hiana L.
The diamonds look great and the fit is perfect.`;
