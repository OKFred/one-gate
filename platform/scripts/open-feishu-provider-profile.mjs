import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const platformRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const profilePath = path.join(platformRoot, 'playwright/.auth/feishu-provider-profile');
const context = await chromium.launchPersistentContext(profilePath, {
  args: ['--remote-debugging-port=9223'],
  channel: 'chrome',
  headless: false,
  viewport: null,
});
const page = context.pages()[0] ?? (await context.newPage());

await page.goto('https://open.feishu.cn/app?lang=en-US');
await page.bringToFront();

console.log(`Feishu provider profile: ${profilePath}`);
console.log('Close the Chrome window to stop this helper.');
