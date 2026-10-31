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

test("cada pieza del motor tiene su página de repuestos", async ({ page }) => {
  const res = await page.goto("/es/repuestos/radiador");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Repuestos: Radiador");
  await expect(page.locator("a.btn.y")).toHaveAttribute("href", /text=.*radiador/i);
});

test("el inicio incluye el recorrido del motor y sus etiquetas enlazadas", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("#journey .phase")).toHaveCount(4);
  await expect(page.locator("#lbl-pistones")).toHaveAttribute("href", "/en/repuestos/pistones");
});

test("el panel exige iniciar sesión", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin$/);
  await expect(page.getByRole("button", { name: "Enviarme el enlace" })).toBeVisible();
  await page.getByRole("tab", { name: "Contraseña" }).click();
  await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
});

test("cuentas de clientes: registro, entrar y protección de Mi cuenta", async ({ page }) => {
  await page.goto("/es/cuenta");
  await expect(page).toHaveURL(/\/es\/cuenta\/entrar\?next=%2Fes%2Fcuenta$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Entra a tu cuenta");

  await page.getByRole("link", { name: "Créala aquí" }).click();
  await expect(page).toHaveURL(/\/es\/cuenta\/registro$/);
  // Sin autorizar el tratamiento de datos no se puede enviar
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("required", "");
  await expect(page.locator(".acc-check a")).toHaveAttribute("href", "/es/legal/privacidad");

  await page.goto("/en/cuenta/registro");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create your account");
});

test("el encabezado tiene el acceso a la cuenta y la política de datos responde", async ({ page }) => {
  await page.goto("/pt");
  await expect(page.locator("a.acc-nav")).toHaveAttribute("href", "/pt/cuenta/entrar");
  const res = await page.goto("/es/legal/privacidad");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Política de tratamiento de datos personales");
});

test("el motor 3D vuelve a funcionar al regresar al inicio desde otra página", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.text().includes("Motor 3D no disponible")) errors.push(m.text());
  });
  await page.goto("/es");
  await expect(page.locator("#webgl.ready")).toHaveCount(1, { timeout: 15_000 });
  await page.locator('#catalogos a[href="/es/motores"]').click();
  await expect(page).toHaveURL(/\/es\/motores$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.locator("#webgl.ready")).toHaveCount(1, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("entrar y registro ofrecen Google con el aviso de datos", async ({ page }) => {
  for (const path of ["/es/cuenta/entrar", "/es/cuenta/registro"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
    await expect(page.locator(".acc-legal a")).toHaveAttribute("href", "/es/legal/privacidad");
  }
  await page.goto("/admin/login");
  await expect(page.getByRole("button", { name: "Entrar con Google" })).toBeVisible();
});
