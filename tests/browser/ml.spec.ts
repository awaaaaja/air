import { test, expect } from "@playwright/test";
test("real ONNX WASM matches all six exported Python samples", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Uji deteksi kebocoran", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Siap", { exact: true })).toBeVisible({
    timeout: 45000,
  });
  await dialog
    .getByRole("button", { name: "Analisis data", exact: true })
    .click();
  await expect(
    dialog.getByRole("region", { name: "Hasil inferensi" }),
  ).toContainText("Normal");
  await expect(dialog.getByTestId("probability-leak")).toHaveText("23.452%");
  await dialog.getByLabel("Contoh data sensor").selectOption("3");
  await expect(
    dialog.getByRole("region", { name: "Hasil inferensi" }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Analisis data", exact: true })
    .click();
  await expect(
    dialog.getByRole("region", { name: "Hasil inferensi" }),
  ).toContainText("Kebocoran terdeteksi");
  await expect(
    dialog.getByRole("region", { name: "Hasil inferensi" }),
  ).toContainText("Hasil ini bukan pembacaan jaringan 3D.");
  await dialog.getByRole("button", { name: "Uji 6 sampel" }).click();
  await expect(dialog.getByTestId("parity-results")).toContainText(
    "6 dari 6 sampel sesuai",
  );
  await page.screenshot({
    path: "test-results/ml-results.png",
    fullPage: true,
  });
  const validInput = await page.request.get("/ml/example_sensor_window.json");
  await dialog.getByLabel("Unggah data sensor JSON").setInputFiles({
    name: "sensor-window.json",
    mimeType: "application/json",
    buffer: await validInput.body(),
  });
  await expect(
    dialog.getByRole("region", { name: "Hasil inferensi" }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Analisis data", exact: true })
    .click();
  await expect(dialog.getByTestId("probability-leak")).toHaveText("23.452%");
  await expect(
    dialog.getByRole("region", { name: "Hasil inferensi" }),
  ).toContainText("sensor-window.json");
  await dialog.getByLabel("Unggah data sensor JSON").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ pressureUnit: "bar", flowUnit: "L/min", rows: [] }),
    ),
  });
  await expect(dialog.getByRole("alert")).toContainText("Satuan input");
  await dialog.getByRole("button", { name: "Tutup pengujian model" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("missing model reports error without affecting simulation", async ({
  page,
}) => {
  await page.route("**/ml/leaksense_model.onnx", (r) =>
    r.fulfill({ status: 404, body: "missing" }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Uji deteksi kebocoran", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Model tidak tersedia",
  );
  await page.getByRole("button", { name: "Tutup pengujian model" }).click();
  await page
    .getByRole("button", { name: "Jalankan Simulasi", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Jeda", exact: true }),
  ).toBeVisible();
});
