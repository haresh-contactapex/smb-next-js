// Splits a SQL script into statements on `;`, dropping comments.
//
// A single pass tracks what the cursor is inside, so a `;` or `--` inside a
// single-quoted string ('' is an escaped quote), a quoted identifier, or a
// $tag$ ... $tag$ body is kept as data instead of ending the statement or
// starting a comment.
export function splitStatements(source) {
  const statements = [];
  let current = "";
  let i = 0;

  const push = () => {
    const trimmed = current.trim();
    if (trimmed) statements.push(trimmed);
    current = "";
  };

  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (char === "-" && next === "-") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      current += " ";
      continue;
    }

    if (char === "'" || char === '"') {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === char) {
          if (source[j + 1] === char) {
            j += 2;
            continue;
          }
          break;
        }
        j += 1;
      }
      current += source.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    if (char === "$") {
      const tag = /^\$[A-Za-z_]*\$/.exec(source.slice(i, i + 64))?.[0];
      if (tag) {
        const end = source.indexOf(tag, i + tag.length);
        const stop = end === -1 ? source.length : end + tag.length;
        current += source.slice(i, stop);
        i = stop;
        continue;
      }
    }

    if (char === ";") {
      push();
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  push();
  return statements;
}
