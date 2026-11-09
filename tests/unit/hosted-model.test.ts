import { test } from "node:test";
import assert from "node:assert/strict";
import { localModel } from "../../src/lib/enquiry-ai";

test("hosted AI sends its key only to Google, validates completion, and rejects provider failures", async () => {
  const originalFetch = globalThis.fetch;
  const originalProvider = process.env.AI_PROVIDER;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.AI_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "synthetic-unit-test-key";
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(
        new URL(String(url)).hostname,
        "generativelanguage.googleapis.com",
      );
      assert.equal(String(url).includes("synthetic-unit-test-key"), false);
      assert.equal(
        new Headers(init?.headers).get("x-goog-api-key"),
        "synthetic-unit-test-key",
      );
      const body = JSON.parse(String(init?.body));
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      assert.equal(body.generationConfig.responseJsonSchema.$schema, undefined);
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: '{"ready":true}' }] },
          },
        ],
      });
    };
    assert.deepEqual(
      await localModel("test", {}, { $schema: "test", type: "object" }),
      { ready: true },
    );
    for (const response of [
      new Response("quota", { status: 429 }),
      Response.json({
        candidates: [
          { finishReason: "MAX_TOKENS", content: { parts: [{ text: "{}" }] } },
        ],
      }),
      Response.json({
        candidates: [
          { finishReason: "STOP", content: { parts: [{ text: "invalid" }] } },
        ],
      }),
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: "x".repeat(13000) }] },
          },
        ],
      }),
    ]) {
      globalThis.fetch = async () => response;
      await assert.rejects(() => localModel("test", {}, {}));
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
