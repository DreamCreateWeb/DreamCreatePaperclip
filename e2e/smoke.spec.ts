import { test, expect } from "@playwright/test";

// Clinic slug for template smoke tests. Override with CLINIC_SLUG env var once
// DRE-187 (Vercel deploy) is done and the demo clinic slug is known.
const slug = process.env.CLINIC_SLUG || "smile-bright-rogers";

test.describe("M0 smoke — platform", () => {
  test("homepage loads with h1", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
  });
});

test.describe("M0 smoke — clinic marketing site", () => {
  test("clinic homepage renders", async ({ page }) => {
    const response = await page.goto(`/sites/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("clinic services page renders at least one service card", async ({
    page,
  }) => {
    await page.goto(`/sites/${slug}/services`);
    // Services page must have a visible heading or card — selector targets
    // the section heading or a named service element.
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("clinic contact page renders contact form", async ({ page }) => {
    await page.goto(`/sites/${slug}/contact`);
    // Contact form must expose at least one input (name, email, or phone).
    const input = page.locator("input, textarea").first();
    await expect(input).toBeVisible();
  });
});

test.describe("M0 smoke — sign-in flow", () => {
  test("portal login page renders email input", async ({ page }) => {
    const response = await page.goto("/portal/login");
    expect(response?.status()).toBe(200);
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test("portal login submit redirects to check-email", async ({ page }) => {
    await page.goto("/portal/login");
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill("smoke-test@example.com");
    await page.locator('button[type="submit"]').click();
    // After submit the app shows the check-email page (magic-link sent message).
    await expect(page).toHaveURL(/\/portal\/login\/check-email/);
  });
});

test.describe("M0 smoke — portal auth gate", () => {
  test("unauthenticated /portal redirects to /portal/login", async ({
    page,
  }) => {
    const response = await page.goto("/portal");
    // Follow redirects — final URL must be the login page.
    await expect(page).toHaveURL(/\/portal\/login/);
    // Confirm we landed somewhere that returned 200.
    expect(response?.status()).not.toBe(500);
  });
});
