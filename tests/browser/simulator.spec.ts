import { test, expect } from "@playwright/test";
test("full simulator workflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.stack || e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Jaringan distribusi air/ }),
  ).toBeVisible();
  await expect(page.locator('canvas[data-ready="true"]')).toBeVisible();
  await expect(page.locator(".scene-label")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Uji deteksi kebocoran", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.locator('[data-component-id="PIPE-02"]').click();
  await expect(
    page.getByRole("heading", { name: "Pipa utama", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Fokus komponen", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset kamera", exact: true }).click();
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Canvas missing");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.wheel(0, 100);
  await page.mouse.move(500, 400);
  await page.mouse.down();
  await page.mouse.move(560, 420, { steps: 5 });
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Jalankan Simulasi", exact: true })
    .click();
  await page.getByRole("switch", { name: "Aktifkan Kebocoran" }).click();
  await expect(page.getByRole("switch")).toBeChecked();
  await page.getByRole("slider", { name: "Tingkat Kebocoran" }).fill("85");
  await expect(page.locator(".leak-label")).toContainText("85%");
  await page.waitForTimeout(1300);
  await expect(page.locator(".metric.alert .metric-value")).not.toHaveText(
    "0,0L",
  );
  await expect(page.locator(".recharts-area-curve")).toBeVisible();
  await page
    .getByRole("button", { name: "Riwayat Kejadian", exact: true })
    .click();
  await expect(page.locator(".events")).toContainText(
    "Kebocoran diaktifkan pada pipa utama",
  );
  await expect(page.locator(".events")).toContainText("85%");
  await page.screenshot({ path: "test-results/leak.png", fullPage: true });
  await page
    .getByRole("slider", { name: "Bukaan Katup", exact: true })
    .fill("0");
  await expect(
    page.locator(".sensor-reading").filter({ hasText: "Debit tersalurkan" }),
  ).toContainText("0,0");
  await page
    .getByRole("slider", { name: "Atur Pompa", exact: true })
    .fill("20");
  await page.getByRole("button", { name: "Jeda", exact: true }).click();
  const time = await page.locator(".clock").textContent();
  await page.waitForTimeout(500);
  expect(await page.locator(".clock").textContent()).toBe(time);
  await page
    .getByRole("button", { name: "Reset Simulasi", exact: true })
    .click();
  await expect(page.getByRole("switch")).not.toBeChecked();
  await expect(
    page.getByRole("slider", { name: "Atur Pompa", exact: true }),
  ).toHaveValue("80");
  expect(errors).toEqual([]);
});
test("mobile controls without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "Buka kontrol" }).click();
  await page.locator('[data-component-id="VALVE-01"]').click();
  await expect(
    page.getByRole("heading", { name: "Katup pengatur", exact: true }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "Posisi Katup" }).fill("30");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test("all scenario presets alter the model and assets are served", async ({
  page,
  request,
}) => {
  for (const name of ["tank", "pump", "pipes"]) {
    const response = await request.get(`/models/${name}.glb`);
    expect(response.ok()).toBe(true);
    expect((await response.body()).subarray(0, 4).toString()).toBe("glTF");
  }
  await page.goto("/");
  const scenario = page.getByLabel("Skenario");
  await scenario.selectOption("small");
  await expect(page.getByRole("switch")).toBeChecked();
  await expect(
    page.getByRole("slider", { name: "Tingkat Kebocoran" }),
  ).toHaveValue("25");
  await scenario.selectOption("major");
  await expect(
    page.getByRole("slider", { name: "Tingkat Kebocoran" }),
  ).toHaveValue("85");
  await scenario.selectOption("demand");
  await expect(
    page.getByRole("slider", { name: "Beban Konsumsi" }),
  ).toHaveValue("160");
  await scenario.selectOption("normal");
  const normalPressure = await page
    .locator(".metric-value")
    .first()
    .textContent();
  await scenario.selectOption("pump");
  await expect(page.locator(".metric-value").first()).not.toHaveText(
    normalPressure!,
  );
  await scenario.selectOption("sensor");
  await expect(page.locator(".metric-note").first()).toContainText("terganggu");
  await expect(
    page.getByRole("button", { name: "Uji deteksi kebocoran", exact: true }),
  ).toBeVisible();
});

test("readable typography and plain component names with optional technical details", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".scene-label.selected")).toHaveText("Pipa utama");
  await expect(page.locator('[data-component-id="PUMP-01"]')).toContainText(
    "Pompa air",
  );
  await expect(
    page.getByRole("heading", { name: "Pipa utama", exact: true }),
  ).toBeVisible();
  const font = await page
    .locator("body")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font).toMatch(/geist/i);
  await expect(page.locator(".technical-details code")).toBeHidden();
  await page.getByText("Informasi teknis", { exact: true }).click();
  await expect(page.locator(".technical-details code")).toHaveText("PIPE-02");
  await page.locator('[data-component-id="TANK-01"]').click();
  await expect(
    page.getByRole("heading", { name: "Tangki utama", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Isi tangki", exact: true }),
  ).toBeVisible();
});
