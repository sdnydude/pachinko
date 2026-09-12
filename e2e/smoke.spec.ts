import { test, expect } from '@playwright/test';
const machines = ['raijin', 'big-wave', 'hana-fan'] as const;
const sizes = { phone: { width: 390, height: 844 }, tablet: { width: 820, height: 1180 }, desktop: { width: 1440, height: 900 } } as const;

for (const m of machines) for (const [name, vp] of Object.entries(sizes)) {
  test(`${m} at ${name} loads, shoots, no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.setViewportSize(vp);
    await page.goto(`/?m=${m}&seed=7`);
    const canvas = page.locator('.pk-canvas');
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(500);
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up();
    await page.waitForTimeout(300);
    const bank = await page.locator('[data-f=bank]').textContent();
    expect(Number(bank)).toBeLessThan(100);
    await page.screenshot({ path: `test-results/${m}-${name}.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

test('reset restores the bank to 100', async ({ page }) => {
  await page.goto('/?m=raijin&seed=7');
  await page.waitForTimeout(500);
  const box = (await page.locator('.pk-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(200); await page.mouse.up();
  await expect(page.locator('[data-f=bank]')).toHaveText('0099');
  await page.locator('[data-a=reset]').click();
  await expect(page.locator('[data-f=bank]')).toHaveText('0100');
});

test('mute persists across reload', async ({ page }) => {
  await page.goto('/?m=raijin&seed=7');
  await page.keyboard.press('m');
  await page.waitForFunction(() => (localStorage.getItem('pachinko.save.v1') ?? '').includes('"mute":true'));
  await page.reload();
  await expect(page.locator('[data-a=mute]')).toHaveAttribute('aria-pressed', 'true');
});

test('re-selecting the current tab (click, then Space on it) does not re-create the game', async ({ page }) => {
  await page.goto('/?m=raijin&seed=7');
  await page.waitForTimeout(500);
  await page.keyboard.press('Backquote');                 // debug overlay: "balls N"
  const box = (await page.locator('.pk-canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(200); await page.mouse.up();
  await expect(page.locator('[data-f=bank]')).toHaveText('0099');
  await expect(page.locator('.pk-debug')).toContainText('balls 1');
  const tab = page.locator('.pk-tabs button[aria-selected=true]');
  await expect(tab).toHaveAttribute('data-id', 'raijin');
  await tab.click();
  await page.keyboard.press('Space');                     // focus is still on the tab: activates the button, not the dial
  await page.waitForTimeout(150);
  await expect(page.locator('.pk-debug')).toContainText('balls 1');   // a new Game would have dropped the ball in flight
  await expect(page.locator('[data-f=bank]')).toHaveText('0099');     // and Space on the tab fired nothing
  await expect(page.locator('.pk-root')).toHaveAttribute('data-machine', 'raijin');
});
