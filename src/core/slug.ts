/**
 * Lowercase a string and collapse every run of non-alphanumerics into a single
 * dash — the shared convention for turning a name discovered at runtime (a
 * `<meta>` name, a UA-CH platform) into a safe custom-property name fragment.
 */
export const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
