import { unzipSync } from "fflate";

// Turns an uploaded Word file (.docx or legacy .doc) into plain text lines.
// Everything happens in memory: the upload is never written to disk, and
// nothing in it is executed (macros, embedded objects and images are ignored).

// Kept under Vercel's ~4.5 MB request-body cap, so an oversized upload is
// refused here with a clear message instead of failing at the platform.
export const MAX_IMPORT_FILE_BYTES = 4 * 1024 * 1024;
export const FILE_TOO_LARGE_MESSAGE = `The file is larger than the ${MAX_IMPORT_FILE_BYTES / (1024 * 1024)} MB limit.`;
// A .docx is a zip. Only word/document.xml is unpacked, and never past this
// size, so a small "zip bomb" upload can't exhaust memory.
const MAX_DOCUMENT_XML_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".docx", ".doc"];

// Thrown for problems with the upload itself; `status` becomes the HTTP status
// (400 unreadable/invalid, 413 too large, 415 wrong type).
export class ReviewImportError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function startsWith(bytes, signature) {
  return signature.every((byte, i) => bytes[i] === byte);
}

// The file's real format, from its first bytes — a renamed PDF or image is
// rejected even if it is called "reviews.docx".
export function detectWordFormat(bytes) {
  if (startsWith(bytes, ZIP_SIGNATURE)) return "docx";
  if (startsWith(bytes, OLE_SIGNATURE)) return "doc";
  return null;
}

export function hasAllowedExtension(fileName) {
  const name = String(fileName || "").toLowerCase();
  return ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

const XML_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity) => {
    if (entity[0] !== "#") return XML_ENTITIES[entity.toLowerCase()];
    const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

// Paragraphs, table cells/rows and runs of text, in document order. Table rows
// come out as one line of tab-separated cells — the same shape word-extractor
// gives for a legacy .doc, so one parser handles both.
const TOKEN =
  /<(\/?)w:(tbl|tr|tc|p)\b[^>]*?(\/?)>|<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\s*\/>|<w:(?:br|cr)\b[^>]*\/>|<w:noBreakHyphen\s*\/>/g;

export function documentXmlToLines(xml) {
  const out = [];
  const tables = []; // innermost table last: { rows: string[], cells: string[]|null, paragraphs: string[]|null }
  let paragraph = null;

  const emitParagraph = () => {
    const text = paragraph;
    paragraph = null;
    const table = tables[tables.length - 1];
    if (table?.paragraphs) table.paragraphs.push(text);
    else out.push(...text.split("\n"));
  };

  for (const match of xml.matchAll(TOKEN)) {
    const [token, closing, tag, selfClosing, runText] = match;

    if (tag) {
      const closes = closing === "/";
      if (tag === "p") {
        if (closes) {
          if (paragraph !== null) emitParagraph();
        } else if (selfClosing) {
          paragraph = "";
          emitParagraph();
        } else {
          paragraph = "";
        }
      } else if (tag === "tbl") {
        if (!closes) tables.push({ rows: [], cells: null, paragraphs: null });
        else {
          const table = tables.pop();
          const parent = tables[tables.length - 1];
          // A nested table folds into its parent cell as one paragraph.
          if (parent?.paragraphs) parent.paragraphs.push(table.rows.join(" "));
          else out.push(...table.rows);
        }
      } else if (tag === "tr") {
        const table = tables[tables.length - 1];
        if (!table) continue;
        if (!closes) table.cells = [];
        else {
          table.rows.push((table.cells || []).join("\t"));
          table.cells = null;
        }
      } else if (tag === "tc") {
        const table = tables[tables.length - 1];
        if (!table) continue;
        if (!closes) table.paragraphs = [];
        else {
          table.cells?.push(table.paragraphs.join(" ").trim());
          table.paragraphs = null;
        }
      }
      continue;
    }

    if (paragraph === null) continue;
    if (runText !== undefined) paragraph += decodeXml(runText);
    else if (token.startsWith("<w:tab")) paragraph += "\t";
    else if (token.startsWith("<w:noBreakHyphen")) paragraph += "-";
    else paragraph += "\n"; // <w:br/> / <w:cr/>
  }

  return out;
}

function extractDocxLines(bytes) {
  let files;
  try {
    files = unzipSync(bytes, {
      filter: (file) => file.name === "word/document.xml" && file.originalSize <= MAX_DOCUMENT_XML_BYTES,
    });
  } catch {
    throw new ReviewImportError("This file couldn't be read as a Word document. It may be corrupted or password-protected.");
  }
  const xml = files["word/document.xml"];
  if (!xml) {
    throw new ReviewImportError(
      "This isn't a readable Word document (word/document.xml is missing or too large)."
    );
  }
  return documentXmlToLines(new TextDecoder("utf-8").decode(xml));
}

async function extractDocLines(bytes) {
  let body;
  try {
    const { default: WordExtractor } = await import("word-extractor");
    const document = await new WordExtractor().extract(Buffer.from(bytes));
    body = document.getBody();
  } catch {
    throw new ReviewImportError("This .doc file couldn't be read. It may be corrupted or password-protected.");
  }
  return String(body).split(/\r\n|\r|\n/);
}

/**
 * Validates an upload and returns its text lines.
 * @param {Uint8Array} bytes
 * @param {string} fileName
 */
export async function extractReviewLines(bytes, fileName) {
  if (!hasAllowedExtension(fileName)) {
    throw new ReviewImportError("Only Word files (.docx or .doc) can be imported.", 415);
  }
  if (bytes.length === 0) throw new ReviewImportError("The file is empty.");
  if (bytes.length > MAX_IMPORT_FILE_BYTES) {
    throw new ReviewImportError(FILE_TOO_LARGE_MESSAGE, 413);
  }

  const format = detectWordFormat(bytes);
  if (!format) {
    throw new ReviewImportError("This doesn't look like a Word document. Upload a .docx or .doc file.", 415);
  }
  return format === "docx" ? extractDocxLines(bytes) : extractDocLines(bytes);
}
