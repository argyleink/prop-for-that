/**
 * Resolve the working element for a container-aware element source: the bound
 * element itself if it matches `selector`, otherwise the first descendant that
 * does. Lets you bind to a wrapper and write the source's props on the wrapper,
 * so sibling elements can read them (custom properties inherit downward only).
 */
export function resolveTarget<T extends Element>(
  el: Element,
  selector: string,
): T | null {
  return (el.matches(selector) ? el : el.querySelector(selector)) as T | null
}
