import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', e => errors.push(String(e.message)));
await page.goto('http://localhost:4000/TwilightGame/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise(r => setTimeout(r, 12000));
await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Play')?.click());
await new Promise(r => setTimeout(r, 2000));
await page.evaluate(() => { const m = window.cutsceneManager; if (m?.getState().isPlaying) m.endCutscene(); });
await new Promise(r => setTimeout(r, 2500));

// F4 -> DevTools -> give debug items (includes potions, which have actions)
await page.keyboard.press('F4');
await new Promise(r => setTimeout(r, 1200));
const panel = await page.evaluate(() => ({
  devtools: !!document.querySelector('[class*="devtools"]'),
  buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean).slice(0, 25),
}));
console.log('after F4:', JSON.stringify(panel));
await page.evaluate(() => {
  const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Gameplay');
  tab?.click();
});
await new Promise(r => setTimeout(r, 800));
const gave = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent?.includes('Give All Debug Items'));
  if (!b) return false;
  b.click(); return true;
});
console.log('gave debug items:', gave);
await new Promise(r => setTimeout(r, 1200));
await page.keyboard.press('F4');
await new Promise(r => setTimeout(r, 1200));

const menu = () => page.evaluate(() => {
  const col = document.querySelector('div[style*="flex-direction: column"][style*="position: fixed"]');
  if (!col) return null;
  return Array.from(col.querySelectorAll('button')).map(b => b.textContent.trim());
});

const slots = await page.evaluate(() => {
  const bar = Array.from(document.querySelectorAll('div')).find(d => d.style.background === 'rgba(0, 0, 0, 0.3)');
  return Array.from(bar.querySelectorAll('button')).map((b, i) => {
    const r = b.getBoundingClientRect();
    const img = b.querySelector('img');
    return { i, alt: img?.alt || b.textContent.trim(), disabled: b.disabled,
             x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) };
  });
});
console.log('hotbar:', JSON.stringify(slots.map(s => s.alt)));

for (const s of slots.filter(s => !s.disabled)) {
  await page.mouse.click(s.x, s.y, { button: 'right' });
  await new Promise(r => setTimeout(r, 450));
  const m = await menu();
  if (m) console.log(`  slot ${s.i} (${s.alt}) -> ${JSON.stringify(m)}`);
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 250));
}
console.log('errors:', errors.length ? errors.slice(0,3) : 'none');
await browser.close();
