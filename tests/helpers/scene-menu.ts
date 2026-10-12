import type { Page } from '@playwright/test';
import { Matrix4, Vector3 } from 'three';

/** Exercise real pause-menu controls, including previews that live outside it. */
export async function clickSceneTool(page: Page, selector: string): Promise<void> {
  if (!await page.locator(selector).isVisible()) await page.locator('#settings-open').click();
  await page.locator(selector).click();
}

/** Project against the actual rendered camera, not a stale test-only offset. */
export async function projectGround(page: Page, point: { x: number; y: number; z: number }): Promise<{ x: number; y: number }> {
  const data = await page.locator('canvas').getAttribute('data-camera-projection');
  if (!data) throw new Error('Camera observation unavailable');
  const c = JSON.parse(data) as { projection: number[]; inverseWorld: number[] };
  const matrix = new Matrix4().fromArray(c.projection).multiply(new Matrix4().fromArray(c.inverseWorld));
  const projected = new Vector3(point.x, point.y, point.z).applyMatrix4(matrix);
  const viewport = page.viewportSize()!;
  return { x: (projected.x + 1) * viewport.width / 2, y: (1 - projected.y) * viewport.height / 2 };
}
