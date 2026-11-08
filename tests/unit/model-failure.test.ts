import { test } from "node:test";
import assert from "node:assert/strict";
import { localModel } from "../../src/lib/enquiry-ai";
test("model transport rejects unavailable, malformed and oversized replies", async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [
      new Response("down", { status: 503 }),
      Response.json({ message: { content: "not JSON" } }),
      Response.json({ message: { content: "x".repeat(13000) } }),
    ]) {
      globalThis.fetch = async () => response;
      await assert.rejects(() => localModel("test", {}, {}));
    }
  } finally {
    globalThis.fetch = original;
  }
});
