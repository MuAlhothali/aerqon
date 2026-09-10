import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.goto("/"); });
test("A: priority → SG-001 → evidence/action → verified recheck", async ({ page }) => {
  await page.getByRole("button", { name: /sg-demo-admin/ }).click();
  await expect(page.getByRole("heading", { name: "Unrestricted SSH ingress", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Confidence rationale" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recommended action" })).toBeVisible();
  await page.getByText("Exact provenance", { exact: true }).click();
  await expect(page.locator("pre").filter({ hasText: '"sourceId": "northstar-security-hub"' })).toBeVisible();
  await page.getByRole("button", { name: "Review recheck" }).click();
  const row = page.locator(".comparison").filter({ hasText: "sg-demo-admin" });
  await expect(row.locator('[data-status="PASS"]')).toBeVisible();
  await expect(row.locator('[data-status="RESOLVED"]')).toBeVisible();
  await row.getByText("Compare evidence", { exact: true }).click();
  await expect(row).toContainText("10.0.0.0/8"); await expect(row).toContainText("0.0.0.0/0");
});
test("B: failed RDS remains open; partial S3 remains in progress", async ({ page }) => {
  await page.locator("nav").getByRole("button", { name: "Recheck", exact: true }).click();
  const rds = page.locator(".comparison").filter({ hasText: "RDS-002" });
  await expect(rds.locator('[data-status="FAIL"]')).toHaveCount(2);
  await expect(rds.locator('[data-status="OPEN"]')).toBeVisible();
  const s3 = page.locator(".comparison").filter({ hasText: "S3-001" });
  await expect(s3.locator('[data-status="PARTIAL_EVIDENCE"]')).toBeVisible();
  await expect(s3.locator('[data-status="IN_PROGRESS"]')).toBeVisible();
  await expect(s3.locator('[data-status="UNABLE_TO_VERIFY"]')).toBeVisible();
});
test("C: original import is distinct from AERQON enrichment", async ({ page }) => {
  await page.getByRole("button", { name: /sg-demo-admin/ }).click();
  await expect(page.getByRole("heading", { name: "AERQON operational enrichment" })).toBeVisible();
  await page.locator("summary").filter({ hasText: "SYNTHETIC_SECURITY_HUB" }).click();
  await expect(page.locator("pre").filter({ hasText: '"Compliance"' })).toContainText('"PASS"');
  await expect(page.locator(".decision-panel").locator('[data-status="FAIL"]')).toBeVisible();
});
test("D: evidence package contains classifications, limitations and matching outcomes", async ({ page }) => {
  await page.getByRole("button", { name: "Evidence Package", exact: false }).click();
  const report = page.getByRole("article");
  await expect(report).toContainText("DEMO DATA"); await expect(report).toContainText("NOT CUSTOMER DATA");
  await expect(report).toContainText("Limitations & remaining unknowns");
  await expect(report.locator('[data-status="RESOLVED"]')).toHaveCount(1);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sidebar")).toBeHidden(); await expect(report).toBeVisible();
  await expect(report.locator(".report-identity > div").first()).toBeVisible();
});
test("E: Arabic RTL and English LTR persist across reload without hydration errors", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.getByLabel("Language").selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "التقييم", level: 1 })).toBeVisible();
  await page.reload(); await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await page.getByLabel("Language").selectOption("en"); await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  expect(errors).toEqual([]);
});
test("F: light, dark and system themes preserve visible statuses", async ({ page }) => {
  for (const theme of ["light", "dark", "system"]) {
    await page.getByLabel("Theme", { exact: true }).selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator('.verified-outcome [data-status="VERIFIED_RESOLVED"]')).toBeVisible();
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
});
test("narrow English and Arabic layouts contain overflow within tables/navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const language of ["en", "ar"]) {
    await page.getByLabel("Language").selectOption(language);
    for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) {
      await page.locator("nav button").nth(index).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.locator("nav button").nth(2).click();
    await expect(page.locator(".action-row").first().locator(".meta").first()).toBeVisible();
    await page.locator(".action-row .table-link").first().click();
    await expect(page.locator(".operational-record")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
test("Action Plan separates verified outcomes; evidence explorer traces baseline and recheck observations", async ({ page }) => {
  await page.locator("nav").getByRole("button", { name: "Action Plan" }).click();
  await expect(page.locator(".action-row")).toHaveCount(5);
  await expect(page.locator(".action-list")).not.toContainText("sg-demo-admin");
  await expect(page.locator(".action-list")).toContainText("northstar-demo-legacy-db");
  await page.locator(".completed-actions summary").click();
  await expect(page.locator('.completed-actions [data-status="RESOLVED"]')).toBeVisible();
  await page.locator("nav").getByRole("button", { name: "Evidence", exact: true }).click();
  await page.getByRole("searchbox").fill("sg-demo-admin");
  await page.getByLabel("Source", { exact: true }).selectOption("northstar-security-hub");
  const inspector = page.locator(".evidence-inspector");
  await expect(inspector).toContainText("0.0.0.0/0");
  await inspector.getByText("Exact provenance", { exact: true }).click();
  await expect(inspector).toContainText("northstar-security-hub");
  await page.getByRole("button", { name: "Current evidence", exact: true }).click();
  await expect(inspector).toContainText("2026-09-10");
  await expect(inspector).toContainText("10.0.0.0/8");
  await expect(inspector).toContainText("northstar-direct");
});
test("keyboard navigation, finding filters and explicit coverage", async ({ page }) => {
  await page.keyboard.press("Tab"); await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.locator("nav").getByRole("button", { name: /Findings/ }).click();
  await page.getByRole("searchbox").fill("legacy-db"); await expect(page.getByRole("row")).toHaveCount(2);
  await page.locator("nav").getByRole("button", { name: "Coverage", exact: true }).click();
  await expect(page.locator('tbody [data-status="NOT_EVALUATED"]')).toHaveCount(1);
  await expect(page.locator('tbody [data-status="ACCESS_DENIED"]')).toHaveCount(1);
});
