import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const { accounts, password } = JSON.parse(
  readFileSync(".local/reviewer-accounts.json", "utf8"),
);
const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(20000);
try {
  await page.goto("http://127.0.0.1:3000/sign-in?next=/staff/enquiries");
  await page.getByLabel("Email", { exact: true }).fill(accounts[2].email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in & continue" }).click();
  await page.waitForURL("**/staff/enquiries");
  await page
    .getByRole("heading", { name: "Every conversation, cared for." })
    .waitFor();
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/staff/enquiries",
      "/staff/inventory",
      "/staff/enquiries/10000000-0000-4000-8000-000000000001",
    ]) {
      await page.goto("http://127.0.0.1:3000" + path);
      await page.locator(".loading-line").waitFor({ state: "hidden" });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${path} at ${width}`,
      );
      if (width === 390 || width === 1280)
        await page.screenshot({
          path: `artifacts/browser/review-${width}-${path.split("/").pop()}.png`,
          fullPage: true,
        });
    }
  }
  await page.goto("http://127.0.0.1:3000/staff/enquiries");
  await page
    .getByRole("heading", { name: "Every conversation, cared for." })
    .waitFor();
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").innerText(), "Skip to content");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").innerText(), "Rates & allotment");
  console.log(
    "PASS staff inbox, editor and inventory have no overflow at 360, 390, 768, 1280px; keyboard skip link reaches staff navigation",
  );
} finally {
  await browser.close();
}
