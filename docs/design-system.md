# Cashline — Design System

Status: aligned with [`project-specifications.md`](project-specifications.md) on 2026-10-13.

## 1. Purpose

This document defines the shared visual language and component contract for Cashline on iOS and Android.

The direction is **modern, minimal, calm and elegant**: warm neutral surfaces, deep teal actions, restrained brass accents, clear financial status colors. Financial records, invoices, forms and amounts must be easy to read before any decoration is considered.

Each platform keeps its native feel — Material 3 on Android, native iOS controls on iOS — on top of shared semantic tokens and a shared component API.

## 2. Design principles

1. **Content first:** amounts, invoice status and cash-flow assumptions are visually stronger than decoration.
2. **Native where it counts:** use platform navigation and controls. Native Liquid Glass appears on iOS 26 and later through platform navigation (for example Expo Router native tabs, documented as beta in recent SDKs; verify against the chosen SDK). Android uses Material 3.
3. **Stable money surfaces:** ledgers, invoice forms, line items, charts and dense summaries use solid surfaces. No translucency behind financial content.
4. **One semantic system:** platform differences never change a component's meaning, state, spacing or API.
5. **Accessible by default:** contrast, dynamic text, touch size, screen-reader labels and reduced-motion settings are part of the system.
6. **No color-only meaning:** income, expenses, expected payments, overdue invoices and warnings also use labels, symbols or other cues.

There is no custom cross-platform glass component in V1. If one is introduced later it needs an ADR with a verified Android implementation and contrast tests.

## 3. Platform visual treatment

| Area                                      | iOS                                                                                        | Android                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------- |
| Navigation / tab bar                      | Native tabs; Liquid Glass on iOS 26+, standard material on earlier versions                | Material 3 navigation bar |
| Controls and sheets                       | Native sheets and controls                                                                 | Material 3 components     |
| Content (ledger, invoices, forms, charts) | Solid `surface`                                                                            | Solid `surface`           |
| Typography                                | SF system font                                                                             | Roboto / system font      |
| Touch target                              | At least 48 × 48 logical units on both platforms (satisfies Apple 44 pt and Android 48 dp) | same                      |

Reduce Transparency, Increased Contrast and Reduce Motion are honored through native components; custom components must also respond to them.

## 4. Color system

The palette is the V1 color system. Use semantic tokens; do not hard-code colors in screens. Follow the OS light/dark appearance by default; an in-app override, if added, must apply to every token.

### Light theme

| Token                    | Color     | Use                                    |
| ------------------------ | --------- | -------------------------------------- |
| `canvas`                 | `#F5F6F2` | App background                         |
| `surface`                | `#FFFFFF` | Content and form surfaces              |
| `surfaceSubtle`          | `#E9EFEB` | Secondary sections                     |
| `textPrimary`            | `#1B2825` | Labels and monetary values             |
| `textSecondary`          | `#56645F` | Supporting text                        |
| `outline`                | `#C7D2CC` | Decorative dividers                    |
| `outlineStrong`          | `#728279` | Interactive boundaries and focus edges |
| `brandPrimary`           | `#176A60` | Primary actions, selected navigation   |
| `onBrandPrimary`         | `#FFFFFF` | Text/icons on primary actions          |
| `brandContainer`         | `#DCEFEA` | Selected/soft brand surfaces           |
| `onBrandContainer`       | `#123B35` | Text/icons on brand containers         |
| `accent`                 | `#8B683A` | Restrained brass emphasis; sparingly   |
| `positive`               | `#146447` | Received income                        |
| `positiveContainer`      | `#E7F4EC` | Positive background                    |
| `warning`                | `#805500` | Due soon, uncertainty, low reserve     |
| `warningContainer`       | `#FFF1CF` | Warning background                     |
| `negative`               | `#A12D36` | Expenses, errors, overdue              |
| `negativeContainer`      | `#FCE9E8` | Negative background                    |
| `informational`          | `#315A85` | Expected/unpaid-payment cues           |
| `informationalContainer` | `#E8F0FB` | Information background                 |

### Dark theme

| Token                    | Color     | Use                                    |
| ------------------------ | --------- | -------------------------------------- |
| `canvas`                 | `#101715` | App background                         |
| `surface`                | `#18221F` | Content and form surfaces              |
| `surfaceSubtle`          | `#202C28` | Secondary sections                     |
| `textPrimary`            | `#F0F5F2` | Labels and monetary values             |
| `textSecondary`          | `#B8C5BF` | Supporting text                        |
| `outline`                | `#42514A` | Decorative dividers                    |
| `outlineStrong`          | `#6B7C73` | Interactive boundaries and focus edges |
| `brandPrimary`           | `#75C5B1` | Primary actions, selected navigation   |
| `onBrandPrimary`         | `#0C2E29` | Text/icons on primary actions          |
| `brandContainer`         | `#1C3C35` | Selected/soft brand surfaces           |
| `onBrandContainer`       | `#C3F0E3` | Text/icons on brand containers         |
| `accent`                 | `#D8BD83` | Restrained brass emphasis              |
| `positive`               | `#7BD6A8` | Received income                        |
| `positiveContainer`      | `#14372A` | Positive background                    |
| `warning`                | `#F0C46B` | Due soon, uncertainty, low reserve     |
| `warningContainer`       | `#3A2B12` | Warning background                     |
| `negative`               | `#F49490` | Expenses, errors, overdue              |
| `negativeContainer`      | `#441F21` | Negative background                    |
| `informational`          | `#A5C8F2` | Expected/unpaid-payment cues           |
| `informationalContainer` | `#1C2B42` | Information background                 |

### Contrast verification (computed 2026-10-13)

All text pairs reach at least 4.5:1 on their base surfaces. Examples: light `textPrimary` on `canvas` 14.05:1, `textSecondary` on `canvas` 5.72:1, `onBrandPrimary` on `brandPrimary` 6.43:1; dark `textSecondary` on `canvas` 10.19:1.

Interactive-boundary tokens (`outlineStrong`) must reach 3:1 against every surface they sit on. The light value was changed from `#7D8D85` (2.99:1 on `surfaceSubtle`) to `#728279` (3.73:1 on `canvas`, 4.05:1 on `surface`, 3.47:1 on `surfaceSubtle`). Dark `outlineStrong` reaches 4.12:1 on `canvas`, 3.69:1 on `surface` and 3.27:1 on `surfaceSubtle`. `outline` is decorative and is never the only indicator of a control.

Recheck contrast after any token or rendering change. Any composited or translucent surface needs a runtime or rendered check.

### Financial data styling

- **Received income:** `positive` plus a `Received` label or `+` sign.
- **Expenses:** `negative` plus an `Expense` label or `−` sign.
- **Unpaid invoices and expected payments:** `informational` plus an `Expected` or `Unpaid` label; never styled as received cash.
- **Overdue invoices:** `negative` plus an `Overdue` label and due-date context.
- **Forecasts and estimates:** neutral styling on `surfaceSubtle` with a visible `Estimate` label and linked assumptions. They do not reuse the `informational` token, so an estimate is never confused with an unpaid invoice.
- **Low reserve:** `warning` styling, text and an icon with a description.

Charts use the same semantic palette, keep readable labels and do not rely on hue alone.

## 5. Typography and layout

- Use the platform system font. Scale: display balance, screen title, section title, body, label, caption.
- The main balance uses tabular figures where supported. Currency symbol, sign and decimal precision remain explicit, and follow the currency's exponent (for example 0 decimals for JPY).
- Support system text scaling; never clip invoice numbers, client names or amounts at large sizes.
- Medium/semibold for titles and values; bold only for the primary balance or high-priority state.
- Support right-to-left layouts: use logical start/end properties, mirror directional icons, and keep numbers and currency symbols correct in mixed-direction text.
- Spacing scale: `4, 8, 12, 16, 24, 32, 40`. Radii: `8` compact controls, `12` fields, `16` cards, `24` sheets.
- Prefer hairline outlines and soft elevation over heavy shadows.
- Minimum touch target `48 × 48`. Use consistent line icons with accessible text labels for financial states.

## 6. Core component API

- `Surface`, `Card`, `SectionHeader` — solid content grouping.
- `Button` / `IconButton` — primary, secondary and quiet.
- `Text` — semantic typography variants, theme-aware colors.
- `TextField` / `AmountField` — exact-money entry that respects the currency's exponent and locale.
- `StatusChip` — states: **draft, issued, sent, partial, paid, overdue, void, received, expected, estimate, warning, error**.
- `TransactionRow` / `InvoiceRow` — compact, readable records.
- `SummaryCard` / `Chart` — balance, outlook, invoice aging, reports.
- `Dialog` / `BottomSheet` / `EmptyState` / `LoadingState` / `ErrorState`.
- `PremiumBadge` / `Paywall` — explain the premium list and the one-time price; never block access to data.

Variants use tokens, not ad hoc colors, shadows or radii.

## 7. Accessibility and verification

- Targets: WCAG 2.2 AA — at least `4.5:1` for ordinary text, `3:1` for large text and meaningful non-text indicators.
- Test light and dark themes, large text, screen readers (VoiceOver and TalkBack), high contrast, reduce transparency and reduce motion.
- Preserve focus visibility and semantic labels on buttons, amount fields, invoice states and charts.
- Verify that translucent native navigation never hides content, validation errors or focus indicators while content scrolls underneath.
- Test on actual iOS and Android builds; Expo Go rendering is not proof of native behavior.
- The target is a consistent hierarchy, palette and interaction model, not identical pixels.

## 8. References

- [Apple Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple: Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- [Expo Router native tabs](https://docs.expo.dev/versions/latest/sdk/router/native-tabs/)
- [Android Material 3](https://developer.android.com/design/ui/mobile)
- [Android accessibility guidance](https://developer.android.com/design/ui/mobile/guides/foundations/accessibility)
- [W3C WCAG 2.2: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C WCAG 2.2: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
