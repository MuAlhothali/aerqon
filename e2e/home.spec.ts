import { expect, test } from "@playwright/test";

test("shows the AERQON foundation page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Assessment", level: 1 })).toBeVisible();
  await expect(page.locator(".demo-banner")).toContainText("NOT CUSTOMER DATA");
});
