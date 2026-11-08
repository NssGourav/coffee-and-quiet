import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { accounts, password } = JSON.parse(
  readFileSync(".local/reviewer-accounts.json", "utf8"),
);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(30000);
try {
  await page.goto(
    "http://127.0.0.1:3000/sign-in?next=/staff/enquiries/10000000-0000-4000-8000-000000000001",
  );
  await page.getByLabel("Email", { exact: true }).fill(accounts[2].email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in & continue" }).click();
  await page
    .getByRole("heading", { name: "One enquiry. A personal reply." })
    .waitFor();
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/staff/enquiries/") &&
      r.request().method() === "POST",
    { timeout: 380000 },
  );
  await page.getByRole("button", { name: "Classify & draft with AI" }).click();
  const result = await (await response).json();
  assert.equal(result.ok, true);
  assert.equal(result.manual, process.argv.includes("--expect-unavailable"));
  await page
    .getByRole("button", { name: "Classify & draft with AI" })
    .waitFor({ state: "visible" });
  if (result.manual) {
    await page
      .getByText(
        "AI unavailable or its answer failed validation. Review manually or retry.",
      )
      .waitFor();
    console.log(
      "PASS real unavailable-model request preserves enquiry and exposes manual retry",
    );
  } else {
    await page.getByText("Feb 2027", { exact: false }).last().waitFor();
    await expect(page.getByLabel("Reply", { exact: true })).toHaveValue(
      /.{20,}/,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Approve & simulate send" })
        .isEnabled(),
      false,
    );
    console.log(
      "PASS real local AI classification, date extraction, saved draft and approval gate in browser",
    );
  }
  await page
    .getByRole("heading", { name: "One enquiry. A personal reply." })
    .click();
  await page.screenshot({
    path: `artifacts/browser/ai-${result.manual ? "failure" : "success"}-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `artifacts/browser/ai-${result.manual ? "failure" : "success"}-mobile.png`,
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
} finally {
  await browser.close();
}
