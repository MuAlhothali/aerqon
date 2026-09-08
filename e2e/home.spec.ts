import { expect, test } from "@playwright/test";

test("shows the AERQON foundation page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /cloud security evidence, made actionable/i })).toBeVisible();
});
