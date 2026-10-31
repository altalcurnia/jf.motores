// Genera public/demo/*.jpg a partir de dataset.mjs (node scripts/demo/render.mjs)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { products } from "./dataset.mjs";
import { renderArt } from "./art.mjs";

mkdirSync("public/demo", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
for (const p of products) {
  const jobs = [[p.art, `${p.slug}.jpg`]];
  if (p.extraArt) jobs.push([p.extraArt, `${p.slug}-2.jpg`]);
  for (const [spec, file] of jobs) {
    await page.setContent(`<html><body style="margin:0">${renderArt(spec, p.ref)}</body></html>`);
    await page.screenshot({ path: `public/demo/${file}`, type: "jpeg", quality: 82 });
  }
}
await browser.close();
console.log("ok", products.length);
