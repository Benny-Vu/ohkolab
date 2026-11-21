// Lead report screenshots for the learn wave. Run from the repo root with
// the dev server up on 5173. Deleted after the shots are taken.
import { chromium } from "playwright";

const base = "http://localhost:5173";
const out = "C:/Users/Alkun/AppData/Local/Temp/ohkolab-shots/learn/lead";
const langs = ["en", "ja"];

async function freshContext(browser, { width, lang }) {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 640 : 800 },
  });
  await context.addInitScript(
    ([l]) => {
      localStorage.setItem("ohkolab:locale", l);
      localStorage.setItem("ohkolab:theme", "dark");
    },
    [lang],
  );
  return context;
}

const browser = await chromium.launch();
for (const lang of langs) {
  for (const [width, tag] of [
    [360, "360"],
    [1280, "1280"],
  ]) {
    const context = await freshContext(browser, { width, lang });
    const page = await context.newPage();

    await page.goto(base + "/learn");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/hub-${tag}-${lang}.png` });

    await page.goto(base + "/learn/damage-rolls");
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: `${out}/guide-damage-rolls-${tag}-${lang}.png`,
    });

    await page.goto(base + "/learn/vocabulary");
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/vocabulary-${tag}-${lang}.png` });

    await page.goto(base + "/learn/types");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/types-${tag}-${lang}.png` });

    await context.close();
  }
}
await browser.close();
console.log("done");
