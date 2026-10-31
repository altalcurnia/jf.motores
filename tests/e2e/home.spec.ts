import { expect, test } from "@playwright/test";

test.describe("navegador en portugués", () => {
  test.use({ locale: "pt-BR" });
  test("la raíz redirige al idioma del navegador", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/pt$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  });
});

for (const [lang, heading] of [
  ["es", "Motobombas diésel"],
  ["en", "Diesel pump sets"],
  ["pt", "Motobombas a diesel"],
] as const) {
  test(`inicio en ${lang}: título y botón de WhatsApp`, async ({ page }) => {
    await page.goto(`/${lang}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    const wa = page.locator("#hero a.btn.y");
    await expect(wa).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=/);
  });
}

test("el selector de idioma conserva la página", async ({ page }) => {
  await page.goto("/es/motores");
  await page.getByLabel("Idioma").selectOption("en");
  await expect(page).toHaveURL(/\/en\/motores$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Engines");
});

test("los tres catálogos responden", async ({ page }) => {
  for (const c of ["motobombas", "motores", "repuestos"]) {
    const res = await page.goto(`/es/${c}`);
    expect(res?.status()).toBe(200);
  }
});
