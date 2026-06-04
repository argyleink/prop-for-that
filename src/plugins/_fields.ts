/** Shared form-field discovery for the `field-state` and `form-state` plugins. */

export type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/** Data-bearing form controls (buttons/hidden inputs don't carry user state). */
export const FIELD_SELECTOR =
  'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]), textarea, select'

/** Every field a binding covers: the element itself if it's a field, else all fields inside it. */
export const fieldsOf = (el: Element): FieldElement[] =>
  el.matches(FIELD_SELECTOR)
    ? [el as FieldElement]
    : Array.from(el.querySelectorAll<FieldElement>(FIELD_SELECTOR))
