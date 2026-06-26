# Audit: UX, copy, i18n & accessibility

You are auditing the **whole product's user-facing surface** — only if it has a UI. Explore the
user-facing strings, components, error/empty states, and markup.

Look for:
- **Copy quality** — error messages that leak internal detail or don't help the user; inconsistent
  tone; missing empty / loading / error states.
- **Internationalization** — hardcoded user-facing strings, locale-unaware date/number/currency
  formatting, concatenated translations, missing RTL or pluralization, encoding assumptions.
- **Accessibility** — non-semantic interactive elements, missing labels/alt text, keyboard traps,
  ARIA misuse, contrast or visual-only signals.

**If the project has no user-facing UI, return `[]`.** Use the relevant `"area"` (`ux` / `i18n` /
`a11y`); severity = user impact; start each `suggestion` with `[effort: …]`.
