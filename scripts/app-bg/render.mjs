// Genera public/app/mina-*.webp a partir de scene.html (node scripts/app-bg/render.mjs)
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const here = fileURLToPath(new URL(".", import.meta.url));
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("file://" + here + "scene.html");
for (const [name, W, H] of [["mina-ancha", 2400, 1350], ["mina-alta", 1080, 1920]]) {
  const url = await p.evaluate(([W, H]) => window.draw(W, H, 7), [W, H]);
  writeFileSync(new URL(`../../public/app/${name}.webp`, import.meta.url), Buffer.from(url.split(",")[1], "base64"));
  console.log(name);
}
await b.close();
