import test from "node:test";
import assert from "node:assert/strict";
import { failureFrom, readJsonBody } from "@/lib/api";

const post = (body, headers = {}) => new Request("http://localhost/api", { method: "POST", body, headers });

test("readJsonBody parses a body under the limit", async () => {
  const result = await readJsonBody(post(JSON.stringify({ a: 1 })), { maxBytes: 100 });
  assert.deepEqual(result, { payload: { a: 1 } });
});

test("readJsonBody answers 400 for invalid JSON and for an empty body", async () => {
  for (const body of ["{nope", ""]) {
    const { response } = await readJsonBody(post(body), { maxBytes: 100 });
    assert.equal(response.status, 400);
  }
});

test("readJsonBody refuses a declared oversize body without reading it", async () => {
  const { response } = await readJsonBody(post("{}", { "content-length": "5000" }), { maxBytes: 100, tooLongMessage: "Too long." });
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error, "Too long.");
});

test("readJsonBody stops reading a chunked oversize body at the limit", async () => {
  let pulled = 0;
  const stream = new ReadableStream({
    pull(controller) {
      pulled += 1;
      controller.enqueue(new TextEncoder().encode("x".repeat(1000)));
      if (pulled >= 1000) controller.close();
    },
  });
  const request = new Request("http://localhost/api", { method: "POST", body: stream, duplex: "half" });
  const { response } = await readJsonBody(request, { maxBytes: 5000 });
  assert.equal(response.status, 413);
  assert.ok(pulled < 20, `read ${pulled} chunks of a 1000-chunk body`);
});

test("failureFrom keeps a known error's status and hides anything else", async (t) => {
  t.mock.method(console, "error", () => {});
  class KnownError extends Error {
    status = 422;
  }
  const known = failureFrom(new KnownError("Fix this."), { KnownError, fallbackMessage: "Generic.", label: "Test" });
  assert.equal(known.status, 422);
  assert.equal((await known.json()).error, "Fix this.");

  const unknown = failureFrom(new Error("db password is hunter2"), { KnownError, fallbackMessage: "Generic.", label: "Test" });
  assert.equal(unknown.status, 500);
  assert.equal((await unknown.json()).error, "Generic.");
});
