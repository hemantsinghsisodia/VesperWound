/** Avoid DOM mutations and style invalidation when presentation state is unchanged.
 * Read the real property: multiple HUD owners may write the same element.
 */
export function writeChanged<T extends object, K extends keyof T>(object: T, key: K, value: T[K]): void {
  if (object[key] !== value) object[key] = value;
}
