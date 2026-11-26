// Gwiazdka: headless Chrome (ANGLE/Metal) harness. node shot.mjs '<json steps>' [w] [h]
import {createRequire} from 'node:module';
const require = createRequire('/Users/jurek/openclaw/node_modules/');
const {chromium} = require('playwright-core');
const steps = JSON.parse(process.argv[2] || '[]');
const w = +(process.argv[3] || 1280), h = +(process.argv[4] || 720);
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({viewport: {width: w, height: h}, deviceScaleFactor: 1, hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH});
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));
await page.goto('http://localhost:8524/', {waitUntil: 'load'});
for (const s of steps) {
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.eval) { try { const r = await page.evaluate(s.eval); if (r !== undefined) logs.push('[eval] ' + JSON.stringify(r)); } catch (e) { logs.push('[eval error] ' + e.message); } }
  if (s.click) await page.mouse.click(s.click[0], s.click[1]);
  if (s.down) { await page.mouse.move(s.down[0], s.down[1]); await page.mouse.down(); }
  if (s.up) await page.mouse.up();
  if (s.move) await page.mouse.move(s.move[0], s.move[1]);
  if (s.key) await page.keyboard.press(s.key);
  if (s.kdown) await page.keyboard.down(s.kdown);
  if (s.kup) await page.keyboard.up(s.kup);
  if (s.shot) await page.screenshot({path: new URL('shots/' + s.shot, import.meta.url).pathname});
}
console.log(logs.slice(-40).join('\n'));
await browser.close();
