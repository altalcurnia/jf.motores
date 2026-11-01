import { expect, test, type Page } from "@playwright/test";

/** El selector de idioma está en el encabezado (escritorio) o dentro del menú lateral (celular). */
async function languageSelect(page: Page) {
  const burger = page.locator(".burger");
  if (await burger.isVisible()) {
    await burger.click();
    return page.locator("#drawer").getByLabel(/Idioma|Language|Idioma/);
  }
  return page.locator(".nav-lang").getByLabel(/Idioma|Language/);
}

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
  await (await languageSelect(page)).selectOption("en");
  await expect(page).toHaveURL(/\/en\/motores$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Engines");
});

test("el selector de idioma conserva los filtros del catálogo", async ({ page }) => {
  await page.goto("/es/repuestos?categoria=tableros&estado=disponible");
  await (await languageSelect(page)).selectOption("pt");
  await expect(page).toHaveURL(/\/pt\/repuestos\?categoria=tableros&estado=disponible$/);
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
  await expect(page.locator(".cat-actions a.btn.y")).toHaveAttribute("href", /text=.*radiador/i);
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

test("catálogo: filtros en la URL y ficha del producto con WhatsApp", async ({ page }) => {
  await page.goto("/es/motobombas");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Vendidos" }).click();
  await expect(page).toHaveURL(/estado=vendido/);
  await page.getByRole("button", { name: "Todos" }).click();
  await expect(page).not.toHaveURL(/estado=/);

  const cards = page.locator("a.pc");
  test.skip((await cards.count()) === 0, "Catálogo vacío en esta base de datos");
  await cards.first().click();
  await expect(page).toHaveURL(/\/es\/motobombas\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".pd-info a.btn.y")).toHaveAttribute("href", /^https:\/\/wa\.me\/.*REF/);
});

test("un producto inexistente muestra la página de no encontrado y no se indexa", async ({ page }) => {
  // Con streaming el código puede quedar en 200; Next marca la página con noindex.
  await page.goto("/es/motores/no-existe-este-motor");
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  await expect(page.locator(".pd-info")).toHaveCount(0);
});

test("menú: Catálogo agrupa las categorías y el menú lateral abre en celular", async ({ page }) => {
  await page.goto("/es");
  const burger = page.locator(".burger");
  if (await burger.isVisible()) {
    await burger.click();
    const drawer = page.locator("#drawer");
    await expect(drawer).toHaveClass(/open/);
    await drawer.getByRole("link", { name: "Soporte técnico" }).click();
    await expect(page).toHaveURL(/\/es\/soporte$/);
    await expect(drawer).not.toHaveClass(/open/);
  } else {
    await page.locator(".cat-menu > button").click();
    await page.locator(".cat-menu-panel").getByRole("menuitem", { name: /Motores/ }).click();
    await expect(page).toHaveURL(/\/es\/motores$/);
  }
});

test("soporte y guías responden en los tres idiomas", async ({ page }) => {
  for (const path of ["/es/soporte", "/en/guias", "/pt/soporte"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("la guía de usuario no se entrega con un enlace inválido", async ({ request }) => {
  const res = await request.get("/api/manual/no-existe");
  expect(res.status()).toBe(404);
});

test("catálogo: pestañas Todo/Motobombas/Motores/Repuestos y título del inicio enlazado", async ({ page }) => {
  await page.goto("/es");
  await page.locator("#catalogos .title-link").click();
  await expect(page).toHaveURL(/\/es\/catalogo$/);
  const tabs = page.locator(".cat-tabs:visible");
  await expect(tabs.locator("a.on")).toHaveText("Todo");
  await tabs.getByRole("link", { name: "Repuestos" }).click();
  await expect(page).toHaveURL(/\/es\/repuestos$/);
  await expect(page.locator(".cat-tabs a.on:visible")).toHaveText("Repuestos");
});
