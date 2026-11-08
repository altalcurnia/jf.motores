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
  // Versión de marca «nueva» (la predeterminada)
  ["es", "Que el agua"],
  ["en", "Don't let water"],
  ["pt", "Que a água"],
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
  await expect(page.locator(".part-row a")).toHaveCount(23);
});

test("el recorrido muestra una tarjeta a la vez y la fila de piezas solo en el despiece", async ({ page }) => {
  test.setTimeout(90_000);
  // Esta prueba revisa tarjetas y botones (no el dibujo 3D): sin WebGL, como en un equipo viejo.
  // Con varias pestañas dibujando el 3D sin tarjeta gráfica a la vez, la página se vuelve muy lenta.
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error firma sobrecargada
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : orig.call(this, type, ...rest);
    };
  });
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
  await expect(page.locator(".jcard.on h2")).toContainText("Prende");
  await at(0.25);
  await expect(page.locator(".jcard.on #bigRpm")).toHaveCount(1, { timeout: 20_000 });
  // Despiece: solo la tarjeta "Por dentro" lo acompaña, con los botones de piezas visibles
  await at(0.5);
  await expect(page.locator(".jcard.on")).toHaveCount(1);
  await expect(page.locator(".jcard-parts.on")).toHaveCount(1);
  await expect(page.locator(".part-row.on")).toHaveCount(1);
  await page.locator(".part-row a", { hasText: "Pistones" }).hover();
  await expect(page.locator("#lbl-pistones")).toHaveClass(/hl/);
  // Clic en una pieza: panel con la información, enlace a su categoría y cierre
  await page.locator(".part-row a", { hasText: "Culata" }).click();
  await expect(page.locator(".part-focus h3")).toContainText("Culata");
  await expect(page.locator(".part-focus a.btn.y")).toHaveAttribute("href", "/es/repuestos/culata");
  await page.locator(".part-focus .pf-close").click();
  await expect(page.locator(".part-focus")).toHaveCount(0);
  // Final: aviso de la app, aún no disponible, con enlace a /app
  await at(0.9);
  await expect(page.locator(".part-row.on")).toHaveCount(0);
  await expect(page.locator(".jcard-app.on .soon-badge")).toBeVisible();
  await expect(page.locator(".jcard-app.on a.app-cta")).toHaveAttribute("href", "/es/app");
  // El teléfono muestra JF Monitor (3 relojes y mando) y el pulgar ya apagó la motobomba
  await expect(page.locator(".mini-remote .mon-row")).toHaveCount(3);
  await expect(page.locator(".mini-remote .mon-power")).toHaveText("Encender");
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
    await page.locator(".nlinks .cat-menu").filter({ hasText: "Catálogo" }).locator("button").click();
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
  // Sobrecalentamiento → el pulgar toca «Apagar» y la motobomba queda apagada
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>(".app-story")!;
    window.scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) * 0.76);
  });
  const power = page.locator(".app-story .mon-power");
  await expect(power).toHaveText("Encender");
  await expect(page.locator(".app-story .scr-chip")).toHaveText("Apagada", { timeout: 8000 });
  // El visitante puede probar el mando: encender y mover el acelerador
  await power.click();
  await expect(power).toHaveText("Apagar");
  await page.locator(".app-story .mon-slider").fill("1500");
  await expect(page.locator(".mon-ctrl-top b")).toHaveText("1.500 rpm");
  await expect(page.locator(".app-try")).toHaveClass(/active/);
});

test("al volver al inicio desde otra página, las secciones aparecen (no quedan ocultas)", async ({ page }) => {
  await page.goto("/es/soporte");
  await page.locator("#nav a[href='/es']").first().click();
  await expect(page).toHaveURL(/\/es$/);
  for (const id of ["catalogos", "contacto"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id} h2, #${id} .big`).first()).toHaveClass(/is-in/);
  }
});

test("correo de soporte: no depende del programa de correo (Gmail, Outlook, app o copiar)", async ({ page }) => {
  await page.goto("/es/soporte");
  await page.locator(".tech-toggle").click();
  await page.locator(".tech-mail").click();
  const menu = page.locator(".tech-card .mail-menu");
  const email = (await menu.locator(".mail-addr").textContent())?.trim() ?? "";
  expect(email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  const gmail = await menu.locator("a", { hasText: "Gmail" }).getAttribute("href");
  const outlook = await menu.locator("a", { hasText: "Outlook" }).getAttribute("href");
  const mailto = await menu.locator("a", { hasText: "app de correo" }).getAttribute("href");
  expect(gmail).not.toBeNull();
  expect(outlook).not.toBeNull();
  expect(mailto).not.toBeNull();
  expect(new URL(gmail!).searchParams.get("to")).toBe(email);
  expect(new URL(outlook!).searchParams.get("to")).toBe(email);
  expect(new URL(mailto!).pathname).toBe(email);
  await expect(menu.locator("button", { hasText: "Copiar" })).toBeVisible();
});

test("menú Soporte del encabezado: Soporte técnico y Guías", async ({ page, isMobile }) => {
  test.skip(isMobile, "en celular el menú está en el cajón lateral");
  await page.goto("/es");
  const menu = page.locator(".nlinks .cat-menu", { hasText: "Soporte" });
  await menu.locator("button").click();
  await expect(menu.locator(".cat-menu-panel a")).toHaveCount(2);
  await menu.locator(".cat-menu-panel a", { hasText: "Guías" }).click();
  await expect(page).toHaveURL(/\/es\/guias$/);
  await expect(page.locator(".guide-subtabs button")).toHaveText(["Guías oficiales", "Nuestras guías", "Videos"]);
});

test("salud del sitio para el monitor de caídas: 200 con la base de datos respondiendo", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toContain("no-store");
  expect(await res.json()).toMatchObject({ ok: true, db: true });
});

test("panel: la página de Tecnologías exige iniciar sesión", async ({ page }) => {
  await page.goto("/admin/tecnologias");
  await expect(page).toHaveURL(/\/admin\/login/);
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
  await page.keyboard.press("Escape");
  const meta = page.locator("#contacto .c-meta");
  await expect(meta).toContainText("Sedes");
  const email = (await meta.locator(".mail-pick > button").textContent())?.trim() ?? "";
  expect(email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  await expect(page.locator("footer")).not.toContainText("No incluyen envío");
  await page.goto("/es/motobombas");
  await expect(page.locator(".price-notice")).toContainText("no incluye el envío");
  await page.goto("/es/soporte");
  await page.locator(".tech-toggle").click();
  await expect(page.locator(".tech-opt.tech-mail")).toContainText(email);
  await expect(page.locator(".tech-opt.tech-wa")).toBeVisible();
  await expect(page.locator(".tech-opt.tech-wa")).toHaveAttribute("href", /^\/api\/wa\?.*s=soporte/);
});

test("el panel de contacto y sedes exige iniciar sesión", async ({ page }) => {
  await page.goto("/admin/empresa");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("el chat con IA exige habilitación y sesión", async ({ request }) => {
  const res = await request.post("/api/asistente", { data: { locale: "es", messages: [{ role: "user", content: "hola" }] } });
  const body = await res.json();
  expect([401, 403]).toContain(res.status());
  expect(body.code).toBe(res.status() === 403 ? "disabled" : "login");
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

test("videos: subpestaña de Guías con reproductores que cargan al tocar (y /videos redirige)", async ({ page }) => {
  await page.goto("/es/videos");
  await expect(page).toHaveURL(/\/es\/guias#videos$/);
  await expect(page.locator(".cat-tabs a[aria-current='page']")).toHaveText("Guías");
  await expect(page.locator(".guide-subtabs button.on")).toHaveText("Videos");
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
  // Por defecto está arriba: se arrastra hacia abajo
  await page.mouse.move(box.x + box.width / 2, box.y + 250, { steps: 8 });
  await page.mouse.up();
  const after = (await fab.boundingBox())!;
  expect(after.y).toBeGreaterThan(box.y + 200);
  await expect(page.locator(".support-menu")).toHaveCount(0);
  await page.reload();
  const again = (await page.locator(".support-fab").boundingBox())!;
  expect(Math.abs(again.y - after.y)).toBeLessThan(4);
});

test("WhatsApp: /api/wa omite bots sin crear cookie de visitante", async ({ request }) => {
  const url = "/api/wa?m=Hola%20REF%20JF-M25&s=ficha&l=es&c=motobomba";
  const bot = await request.get(url, { maxRedirects: 0, headers: { "user-agent": "facebookexternalhit/1.1" } });
  expect(bot.status()).toBe(302);
  expect(bot.headers()["location"]).toMatch(/^https:\/\/wa\.me\/\d+\?text=Hola%20REF%20JF-M25/);
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
  await page.goto("/es/guias#videos");
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

test("sedes: pestañas por sede, mapa con dirección, ancla por ciudad, WhatsApp de asesor y protección del panel", async ({ page }) => {
  const res = await page.goto("/es/sedes");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nuestras sedes");
  const tabs = page.locator(".branch-tabs [role='tab']");
  expect(await tabs.count()).toBeGreaterThanOrEqual(1);
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  const activePanel = page.locator(".branch-panel:visible");
  await expect(activePanel.locator(".branch-map iframe")).toHaveAttribute("src", /google\.com\/maps\?q=.*output=embed/);

  if ((await tabs.count()) > 1) {
    await page.goto("/es/sedes#caucasia");
    await expect(page.locator("#caucasia")).toBeVisible();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await page.goto("/es/sedes#medellin");
  }

  const advisorWa = page.locator(".branch-panel:visible .advisor-card a.advisor-wa");
  if ((await advisorWa.count()) > 0) {
    await expect(advisorWa.first()).toHaveAttribute("href", /^\/api\/wa\?a=[0-9a-f-]{36}&.*s=sedes/);
  } else {
    await expect(page.locator(".branch-panel:visible .branch-no-advisors a.btn.y")).toHaveAttribute("href", /^\/api\/wa\?.*s=sedes/);
  }

  await page.goto("/admin/sedes");
  await expect(page).toHaveURL(/\/admin\/login/);
});
