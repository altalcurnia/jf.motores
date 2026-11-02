import { expect, test, type Page } from "@playwright/test";

// El aviso de cookies se prueba aparte; en el resto de pruebas ya hay decisión tomada
test.beforeEach(async ({ page }, info) => {
  if (!info.title.includes("aviso de cookies")) await page.addInitScript(() => localStorage.setItem("jf-consent", "necessary"));
});

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
    await expect(wa).toHaveAttribute("href", /^\/api\/wa\?m=.+&s=inicio/);
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
  await expect(page.locator(".cat-actions a.btn.y")).toHaveAttribute("href", /^\/api\/wa\?m=.*radiador.*&s=repuestos.*&k=radiador/i);
});

test("el inicio incluye el recorrido del motor y sus etiquetas enlazadas", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("#journey .jcard")).toHaveCount(5);
  await expect(page.locator("#lbl-pistones")).toHaveAttribute("href", "/en/repuestos/pistones");
  await expect(page.locator(".part-row a")).toHaveCount(5);
});

test("el recorrido muestra una tarjeta a la vez y la fila de piezas solo en el despiece", async ({ page }) => {
  await page.goto("/es");
  const journey = page.locator("#journey");
  const at = async (p: number) => {
    await journey.evaluate((el, p) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + (el.getBoundingClientRect().height - window.innerHeight) * p);
    }, p);
  };
  // Desde el primer tramo ya se ve la tarjeta de encendido
  await at(0.05);
  await expect(page.locator(".jcard.on")).toHaveCount(1);
  await expect(page.locator(".jcard.on h2")).toContainText("Arranca");
  await at(0.25);
  await expect(page.locator(".jcard.on #bigRpm")).toHaveCount(1);
  // Despiece: solo la tarjeta "Por dentro" lo acompaña, con los botones de piezas visibles
  await at(0.5);
  await expect(page.locator(".jcard.on")).toHaveCount(1);
  await expect(page.locator(".jcard-parts.on")).toHaveCount(1);
  await expect(page.locator(".part-row.on")).toHaveCount(1);
  await page.locator(".part-row a", { hasText: "Pistones" }).hover();
  await expect(page.locator("#lbl-pistones")).toHaveClass(/hl/);
  // Final: aviso de la app, aún no disponible, con enlace a /app
  await at(0.9);
  await expect(page.locator(".part-row.on")).toHaveCount(0);
  await expect(page.locator(".jcard-app.on .soon-badge")).toBeVisible();
  await expect(page.locator(".jcard-app.on a.app-cta")).toHaveAttribute("href", "/es/app");
  await expect(page.locator(".mini-remote .mr-btn.pressed")).toHaveCount(1);
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
  await expect(page).toHaveURL(/\/es\/cuenta\/registro(\?next=%2Fes%2Fcuenta)?$/);
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
  await expect(page.locator(".pd-info a.btn.y")).toHaveAttribute("href", /^\/api\/wa\?m=.*REF.*&s=ficha.*&p=[0-9a-f-]{36}/);
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

test("la página de la app (en construcción) responde y anima con el scroll", async ({ page }) => {
  const res = await page.goto("/es/app");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("JF Monitor");
  const story = page.locator(".app-story");
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>(".app-story")!;
    window.scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) * 0.6);
  });
  await expect(story).toHaveClass(/s-alert/);
});

test("'Quiero enterarme' lleva al formulario y pide iniciar sesión", async ({ page }) => {
  await page.goto("/es/app");
  await page.locator(".app-hero-cta a").click();
  await expect(page).toHaveURL(/\/es\/app\/registro$/);
  await expect(page.locator(".wl-login a.btn.y")).toHaveAttribute("href", /\/es\/cuenta\/entrar\?next=%2Fes%2Fapp%2Fregistro/);
});

test("botón flotante de WhatsApp, contacto con sedes y correo, y aviso de envío en el catálogo", async ({ page }) => {
  await page.goto("/es");
  // Botón Soporte: abre WhatsApp (y el chat con IA solo si está encendido en el panel)
  await page.locator(".support-fab").click();
  const wa = page.locator(".support-menu a.support-opt.sopt-wa");
  await expect(wa).toBeVisible();
  await expect(wa).toHaveAttribute("href", /^\/api\/wa\?m=.*p%C3%A1gina\+web.*&s=flotante/);
  await expect(page.locator(".support-opt.sopt-ai")).toHaveCount(0);
  await page.keyboard.press("Escape");
  const meta = page.locator("#contacto .c-meta");
  await expect(meta).toContainText("Sedes");
  await expect(meta.locator('a[href^="mailto:"]')).toHaveCount(1);
  await expect(page.locator("footer")).not.toContainText("No incluyen envío");
  await page.goto("/es/motobombas");
  await expect(page.locator(".price-notice")).toContainText("no incluye el envío");
  await page.goto("/es/soporte");
  await page.locator(".tech-toggle").click();
  await expect(page.locator('.tech-opt.tech-mail[href^="mailto:"]')).toHaveCount(1);
  await expect(page.locator(".tech-opt.tech-wa")).toBeVisible();
  await expect(page.locator(".tech-opt.tech-wa")).toHaveAttribute("href", /^\/api\/wa\?.*s=soporte/);
});

test("el panel de contacto y sedes exige iniciar sesión", async ({ page }) => {
  await page.goto("/admin/empresa");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("el chat con IA responde 'apagado' si no está encendido", async ({ request }) => {
  const res = await request.post("/api/asistente", { data: { locale: "es", messages: [{ role: "user", content: "hola" }] } });
  expect(res.status()).toBe(403);
  expect((await res.json()).code).toBe("disabled");
});

test("el webhook de Telegram rechaza llamadas sin la firma secreta", async ({ request }) => {
  const res = await request.post("/api/telegram", { data: { message: { chat: { id: 1 }, text: "hola" } } });
  expect(res.status()).toBe(403);
});

test("guías: biblioteca técnica con documentos que piden iniciar sesión", async ({ page, request }) => {
  await page.goto("/es/guias");
  await expect(page.locator("#biblioteca h2")).toBeVisible();
  expect(await page.locator("#biblioteca .library-card").count()).toBeGreaterThanOrEqual(10);
  const res = await request.get("/api/biblioteca/msha-toolbox?lang=es", { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toContain("/es/cuenta/entrar?next=");
  const missing = await request.get("/api/biblioteca/no-existe", { maxRedirects: 0 });
  expect(missing.status()).toBe(404);
});

test("videos: página con reproductores que cargan al tocar", async ({ page }) => {
  await page.goto("/es/videos");
  await expect(page.locator(".cat-tabs a[aria-current='page']")).toContainText("Videos");
  expect(await page.locator(".video-card").count()).toBe(8);
  await expect(page.locator(".video-frame iframe")).toHaveCount(0);
  await page.locator("button.video-thumb").first().click();
  await expect(page.locator(".video-frame iframe")).toHaveCount(1);
});

test("guías: subpestañas oficiales (por defecto) y nuestras guías, también desde un ancla", async ({ page }) => {
  await page.goto("/es/guias");
  await expect(page.locator(".guide-subtabs button.on")).toHaveText("Guías oficiales");
  await expect(page.locator("#biblioteca")).toBeVisible();
  await expect(page.locator("#mantenimiento")).toBeHidden();
  await expect(page.locator(".guide-toc")).toHaveCount(0);
  await page.locator(".guide-subtabs button", { hasText: "Nuestras guías" }).click();
  await expect(page.locator("#mantenimiento")).toBeVisible();
  await expect(page.locator("#biblioteca")).toBeHidden();
  await page.goto("/es/guias#pedir-repuesto");
  await expect(page.locator("#pedir-repuesto")).toBeVisible();
});

test("inicio: la imagen de beneficios usa la del panel o la predeterminada", async ({ page }) => {
  await page.goto("/es");
  const src = await page.locator(".b-visual img").getAttribute("src");
  expect(src).toMatch(/motobomba-isometrica\.jpg|\/storage\/v1\/object\/public\/catalogo\/sitio\//);
});

test("repuestos: estados En stock / Sin stock en lugar de Disponible / Vendido", async ({ page }) => {
  await page.goto("/es/repuestos");
  const seg = page.locator(".cf-seg");
  await expect(seg).toContainText("En stock");
  await expect(seg).toContainText("Sin stock");
  await expect(seg).not.toContainText("Vendidos");
  await expect(page.locator(".pc-status").first()).toHaveText(/En stock|Sin stock/);
  await page.goto("/es/motobombas");
  await expect(page.locator(".cf-seg")).toContainText("Vendidos");
});

test("soporte: opción de tickets pide iniciar sesión y la API exige sesión", async ({ page, request }) => {
  await page.goto("/es/soporte");
  await page.locator(".support-fab").click();
  await page.locator(".support-opt.sopt-tk").click();
  await expect(page.locator(".tk-panel")).toBeVisible();
  await expect(page.locator(".tk-panel .ai-login")).toContainText("Inicia sesión");
  const unread = await request.get("/api/tickets/unread");
  expect((await unread.json()).login).toBe(false);
  const res = await request.post("/api/tickets", { data: { subject: "Prueba", body: "hola" } });
  expect(res.status()).toBe(401);
});

test("soporte: el botón flotante se arrastra arriba y abajo y recuerda la posición", async ({ page }) => {
  await page.goto("/es/soporte");
  const fab = page.locator(".support-fab");
  const box = (await fab.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 150, { steps: 8 });
  await page.mouse.up();
  const after = (await fab.boundingBox())!;
  expect(after.y).toBeLessThan(box.y - 100);
  await expect(page.locator(".support-menu")).toHaveCount(0);
  await page.reload();
  const again = (await page.locator(".support-fab").boundingBox())!;
  expect(Math.abs(again.y - after.y)).toBeLessThan(4);
});

test("WhatsApp: /api/wa registra el lead y redirige a wa.me con el mensaje (y sin lead para bots)", async ({ request }) => {
  const url = "/api/wa?m=Hola%20REF%20JF-M25&s=ficha&l=es&c=motobomba";
  const res = await request.get(url, { maxRedirects: 0, headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile" } });
  expect(res.status()).toBe(302);
  const loc = res.headers()["location"];
  expect(loc).toMatch(/^https:\/\/wa\.me\/\d+\?text=Hola%20REF%20JF-M25/);
  expect(res.headers()["set-cookie"] ?? "").toContain("jf_vid=");
  const bot = await request.get(url, { maxRedirects: 0, headers: { "user-agent": "facebookexternalhit/1.1" } });
  expect(bot.status()).toBe(302);
  expect(bot.headers()["set-cookie"] ?? "").not.toContain("jf_vid=");
});

test("aviso de cookies: aparece, se acepta y se puede reabrir desde el pie", async ({ page }) => {
  await page.goto("/es/soporte");
  const banner = page.locator(".consent");
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Solo necesarias" }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".consent")).toHaveCount(0);
  await page.locator("footer .consent-link").click();
  await expect(page.locator(".consent")).toBeVisible();
});

test("panel: leads y asesores exigen iniciar sesión", async ({ page }) => {
  await page.goto("/admin/leads");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin/asesores");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("política de contenido (CSP): las páginas principales no tienen bloqueos", async ({ page }) => {
  const blocked: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to (load|execute|connect|frame)/i.test(m.text())) blocked.push(m.text());
  });
  const res = await page.goto("/es");
  expect(res?.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(800);
  await page.goto("/es/videos");
  await page.locator("button.video-thumb").first().click();
  await expect(page.locator(".video-frame iframe")).toHaveCount(1);
  await page.goto("/es/soporte");
  await page.locator(".support-fab").click();
  await page.locator(".support-opt.sopt-tk").click();
  await expect(page.locator(".tk-panel")).toBeVisible();
  await page.goto("/es/legal/terminos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Términos y condiciones");
  expect(blocked).toEqual([]);
});

test("términos: secciones de ley, enlace a la SIC y pie con términos", async ({ page }) => {
  await page.goto("/es/legal/terminos");
  await expect(page.locator(".legal-section")).toHaveCount(10);
  await expect(page.locator(".legal-page")).toContainText("5 días hábiles");
  await expect(page.locator('.legal-links a[href="https://www.sic.gov.co"]')).toHaveCount(1);
  await expect(page.locator(`footer a[href="/es/legal/terminos"]`)).toHaveCount(1);
});
