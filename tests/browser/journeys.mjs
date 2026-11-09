import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
const { accounts, password } = JSON.parse(
  readFileSync(".local/reviewer-accounts.json", "utf8"),
);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
mkdirSync("artifacts/browser", { recursive: true });
async function login(i, next = "/") {
  await page.goto(
    "http://127.0.0.1:3000/sign-in?next=" + encodeURIComponent(next),
  );
  await page.getByLabel("Email", { exact: true }).fill(accounts[i].email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in & continue" }).click();
  await page.waitForURL("**" + next);
}
async function snap(name) {
  await page.locator(".loading-line").waitFor({ state: "hidden" });
  await page.screenshot({
    path: `artifacts/browser/${name}.png`,
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    `${name}: horizontal overflow`,
  );
}
try {
  await page.goto("http://127.0.0.1:3000");
  await snap("home-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await snap("home-mobile");
  await login(0);
  await page
    .getByRole("link", { name: "View Estate Room", exact: true })
    .click();
  await snap("room-mobile");
  await page.getByRole("link", { name: "Choose this stay" }).click();
  await page.getByLabel("Guest name").fill("Synthetic Browser Guest");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await page.waitForURL("**/bookings/*");
  await page
    .getByRole("heading", { name: "Your quiet escape is confirmed." })
    .waitFor();
  await snap("confirmation-mobile");
  await page.reload();
  await page
    .getByRole("heading", { name: "Your quiet escape is confirmed." })
    .waitFor();
  console.log(
    "PASS mobile guest booking, simulated payment and persisted confirmation",
  );
  await page.goto("http://127.0.0.1:3000/enquire");
  await page
    .getByLabel("Your enquiry")
    .fill(
      "Synthetic browser wedding enquiry: February 2027, 250 guests, two nights.",
    );
  await page.getByRole("button", { name: "Send enquiry", exact: true }).click();
  await page.getByRole("button", { name: "Enquiry saved" }).waitFor();
  await snap("enquiry-saved-mobile");
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(2, "/staff/enquiries");
  await snap("inbox-mobile");
  await page.setViewportSize({ width: 1280, height: 900 });
  await snap("inbox-desktop");
  await page
    .locator("a.enquiry-card")
    .filter({ hasText: "Synthetic browser wedding enquiry" })
    .first()
    .click();
  await page.getByLabel("Route to").selectOption("wedding");
  await page.getByRole("button", { name: "Save correction & routing" }).click();
  await page
    .getByText("Staff corrected the enquiry. Generate a fresh draft.")
    .waitFor();
  await page
    .getByLabel("Reply", { exact: true })
    .fill(
      "Thank you for considering our resort. Please share the exact dates and accommodation requirements for your celebration.",
    );
  await page.getByLabel("I reviewed the reply and checked its facts").check();
  await page.getByRole("button", { name: "Approve & save reply" }).click();
  await page.getByRole("heading", { name: "Saved reply" }).waitFor();
  await snap("staff-approved-reply");
  console.log(
    "PASS guest enquiry, staff rerouting, reviewed simulated send and immutable saved reply",
  );
  await page.goto("http://127.0.0.1:3000/staff/inventory");
  const rate = page.getByRole("spinbutton", { name: /Base rate/ }).first();
  const value = await rate.inputValue();
  await rate.fill(value);
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await page.getByText("Saved", { exact: true }).waitFor();
  await snap("inventory-desktop");
  console.log("PASS staff inventory browser save");
  assert.deepEqual(errors, [], "No browser runtime errors");
} finally {
  await browser.close();
}
