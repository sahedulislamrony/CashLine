# Cashline — market analysis (freelancer-first personal finance + invoice apps)

Data pulled on 2026-10-13.

**How the data was gathered**

- **iOS:** Apple's public iTunes Search API, US storefront, run via script. Ratings and counts are US-only.
- **Android:** parsed from the Play Store listing pages. Install counts are Google's rounded bands (e.g. "10M+"); ratings are global.
- **Pricing and features:** web search. Many sources are vendor blogs and disagree with each other. Treat prices as indicative and check the live store before deciding.
- **User complaints:** I could not retrieve Reddit or direct review text. The "what users dislike" section is inference from store ratings and secondary sources, not first-hand review mining.

**Product decisions applied** (from the owner; see `memory.md`)

- Product name: Cashline.
- Free + one-time premium purchase; no subscription.
- Fully open-source code (Apache-2.0).
- No client/invoice caps on the free tier. No custom invoice templates.

---

## 1. Landscape in six segments

| Segment                              | Representative apps                                                                                              | How they make money                                                                                          | Relevance                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **A. Bank-sync budgeting**           | Monarch, YNAB, Copilot, Rocket Money, EveryDollar, PocketGuard                                                   | Subscriptions (YNAB ~$14.99/mo or $109/yr; Monarch ~$100/yr; Copilot ~$13/mo or $95/yr), US bank aggregation | Different product (accounts, bank linking, US-centric). Bank linking is a V1 non-goal. Not our fight. |
| **B. Manual expense trackers**       | Money Manager (Realbyte), Wallet (BudgetBakers), Monefy, Money Lover, Expense Manager, Bluecoins, Toshl, Spendee | Freemium: ads + premium (subscription or lifetime)                                                           | Closest on daily tracking. Biggest installed base worldwide.                                          |
| **C. Open-source / privacy-first**   | Cashew, Ivy Wallet, Actual Budget, Firefly III                                                                   | Donations; Cashew also sells a premium tier                                                                  | Our direct philosophical peers. None handles invoices.                                                |
| **D. Invoice makers**                | Invoice Simple, Invoice Fly, Square Invoices, Invoice2go, Bookipi, Zoho Invoice, Joist                           | Subscriptions gated by invoice-per-month caps                                                                | Huge installs. None tracks personal spending or cash outlook.                                         |
| **E. Freelancer/SMB suites**         | QuickBooks, FreshBooks, Wave, HoneyBook, Hurdlr, Stride, Everlance                                               | Subscriptions; tax, mileage, accounting                                                                      | Business accounting and tax; heavy, cloud-based, US-oriented.                                         |
| **F. Freelancer cash-flow forecast** | On stores: tiny apps only. Web/desktop: Cushion, Float, Cash Flow Frog, Balance Pro (mobile claims)              | Subscriptions                                                                                                | **Almost empty on the mobile stores.**                                                                |

## 2. Store data

### 2.1 Personal finance (segments A–C)

| App                               | iOS rating (US count)           | Play installs | Play rating (count) | Notes                                       |
| --------------------------------- | ------------------------------- | ------------- | ------------------- | ------------------------------------------- |
| Rocket Money                      | 4.47 (398,715)                  | 10M+          | 4.52 (140,360)      | Bill/subscription management, bank sync     |
| Money Manager (Realbyte)          | 4.81 (19,492)                   | 10M+          | 4.63 (466,622)      | Manual, ads + premium, long-standing        |
| Wallet (BudgetBakers)             | 4.56 (5,913)                    | 10M+          | 4.62 (387,336)      | Multi-currency; bank sync paid              |
| Monefy                            | 4.72 (6,749)                    | 10M+          | 3.99 (194,609)      | Quick-entry UI; lower Play rating           |
| Money Lover                       | 4.61 (2,271)                    | 5M+           | 4.11 (208,159)      |                                             |
| Expense Manager                   | not checked                     | 5M+           | 4.34 (63,354)       | No in-app purchase flag                     |
| Monarch                           | 4.89 (113,757)                  | not found     | —                   | US households; no Android ID found          |
| EveryDollar                       | 4.73 (84,139)                   | 1M+           | 4.27 (15,497)       | Ramsey ecosystem                            |
| YNAB                              | 4.79 (61,865)                   | 1M+           | 4.63 (25,357)       | Zero-based method; no free tier after trial |
| Copilot                           | 4.75 (30,625)                   | n/a           | —                   | Apple platforms                             |
| Spendee                           | 4.61 (6,258)                    | 1M+           | 4.02 (63,694)       |                                             |
| Bluecoins                         | 3.75 (77, separate iOS listing) | 1M+           | 4.29 (40,910)       | Android strength                            |
| Toshl                             | not checked                     | 1M+           | 4.14 (31,659)       |                                             |
| Goodbudget                        | 4.63 (13,497)                   | 1M+           | 3.20 (19,241)       | Envelope method; poor Play rating           |
| PocketGuard                       | 4.58 (7,676)                    | 100K+         | 4.44 (2,936)        |                                             |
| **Cashew** (open source, GPL-3.0) | 4.93 (527)                      | 500K+         | 4.80 (27,812)       | Flutter; offline-first; optional cloud sync |
| **Ivy Wallet**                    | not found                       | 100K+         | 4.83 (13,771)       | Android only; free, no IAP flag             |

### 2.2 Invoicing (segments D–E)

| App                                         | iOS rating (US count)                         | Play installs | Play rating (count) |
| ------------------------------------------- | --------------------------------------------- | ------------- | ------------------- |
| QuickBooks                                  | 4.74 (271,415)                                | 5M+           | 4.71 (89,120)       |
| Invoice Simple                              | 4.87 (122,808)                                | 5M+           | 4.83 (172,013)      |
| Invoice Fly                                 | 4.75 (109,353)                                | 1M+           | 4.71 (138,808)      |
| Square Invoices                             | 4.83 (93,176)                                 | not checked   | —                   |
| Invoice2go                                  | 4.85 (55,970)                                 | not found     | —                   |
| GetPaid / "Invoice Maker ▸ Estimate"        | 4.83 (36,705)                                 | not checked   | —                   |
| Bookipi                                     | 4.89 (16,491)                                 | 1M+           | 4.58 (66,128)       |
| Zoho Invoice                                | 4.87 (17,849)                                 | 1M+           | 4.78 (32,571)       |
| Joist                                       | 4.75 (14,311)                                 | not found     | —                   |
| FreshBooks                                  | 4.70 (10,976)                                 | not found     | —                   |
| Wave                                        | 4.37 (6,660)                                  | not checked   | —                   |
| QuickBooks Self-Employed (Play)             | —                                             | 5M+           | **3.43 (33,355)**   |
| Invoice Ninja (open source)                 | 4.60 (177)                                    | 50K+          | 4.67 (622)          |
| Hurdlr / Stride / Everlance (tax & mileage) | 4.74 (21,076) / 4.84 (97,993) / 4.83 (52,768) | not checked   | —                   |

### 2.3 Freelancer cash-flow tools on the stores

| App                            | iOS       | Play          |
| ------------------------------ | --------- | ------------- |
| Money Forecast: CashFlow       | 4.33 (76) | —             |
| Kualto – Forecast Budgeting    | 4.58 (69) | —             |
| Nevo Money: Cash Flow Forecast | 5.00 (3)  | —             |
| Bill Budget Calendar Forecast  | 4.11 (18) | —             |
| Freelancer Money: Cashflow     | —         | 100+ installs |
| Cashflow – Easy                | —         | 100+ installs |
| Freelancer Income Tracker      | —         | 5+ installs   |

Each has fewer than 100 reviews or fewer than 100 installs. No established mobile app owns "what cash do I have vs. what is expected" for freelancers.

## 3. Pricing patterns

| Pattern                            | Examples (indicative, verify live)                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Premium subscription, no free tier | YNAB, Monarch, Copilot                                                                                                                                                   |
| Free + usage cap                   | Invoice Simple free = 3 invoices/month (Plus 10, Premium unlimited); Invoice2go cheapest paid tier ~2 invoices/month; FreshBooks caps clients (e.g. 5 on its entry plan) |
| Free core, paid add-ons            | Wave (free core, card processing 2.9% + $0.60), Zoho Invoice (free)                                                                                                      |
| Freemium with lifetime option      | Wallet (lifetime reported at ~$49.99 by one source, conflicting others), Cashew (reported ~$19–20 one-time, unverified)                                                  |
| Open source, self-host             | Firefly III (AGPL-3.0), Actual Budget (MIT), Invoice Ninja (self-host free; cloud ~$10–14/mo)                                                                            |

Takeaways:

1. Invoice-count caps are the industry norm. Your decision to have no caps is a real differentiator, not a given.
2. A one-time price exists in the market but is the minority; most budget leaders charge $95–110+/yr. Subscription fatigue is a stated 2026 theme in press, but that evidence is secondary and promotional.
3. Cashew shows an open-source budget app can reach 500K+ installs and 4.8 stars, which is evidence that the OSS plus optional premium route is viable on mobile.

## 4. Feature table stakes

Present in most segment B apps and expected by users. Check each against the V1 docs.

| Feature                                               | In V1 docs?                                                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Categories / subcategories, notes, search             | Yes                                                                                                                     |
| Budgets, recurring transactions, charts/reports       | Yes                                                                                                                     |
| Multi-currency                                        | Partial (single main currency; per-currency model proposed)                                                             |
| PIN / biometric lock                                  | Yes                                                                                                                     |
| Backup / restore                                      | Yes                                                                                                                     |
| **CSV import and export**                             | **No (restore only).** Switching cost is the main barrier when users already have data in another app or a spreadsheet. |
| **Home-screen widget / quick-add**                    | **No.** Speed of entry is how Monefy-style apps win.                                                                    |
| Receipts / attachments                                | Entity exists; no feature                                                                                               |
| Reminders for bills and due dates                     | Partial (invoice due dates)                                                                                             |
| **Localization (language, number/date formats, RTL)** | **No requirement.** The leaders are global.                                                                             |
| Bank sync                                             | Non-goal (correct: segment A, regulatory and cost heavy)                                                                |
| Tax / VAT lines on invoices                           | No (only free-form lines proposed)                                                                                      |

## 5. Gap analysis

What nobody on the stores does together:

> personal expenses **+** freelancer invoices **+** "received vs. expected" cash outlook **+** planned-purchase estimate, in one **offline, no-account** app with **no invoice caps**.

Closest neighbours and why they fall short:

- **Invoice apps (D)** know what clients owe but not what the user spends or has in cash; most throttle free use by invoice count.
- **Expense trackers (B)** know spending but not invoices or expected income.
- **Cashew / Ivy Wallet (C)** are open source and well rated but have no invoices or expected-income concept; Cashew's sync uses Firebase.
- **Suites (E)** cover it but are cloud-based, accounting-centric, subscription-priced, and strongest in the US.
- **Forecast tools (F)** are mostly web/desktop, so there is no mobile leader.

This is a hypothesis, not proven demand. The project docs already require testing it with real freelancers; the store data shows the niche is empty, which can also mean there is little demand.

## 6. Risks the data points to

1. **Invoice apps are entrenched** (100K+ ratings each). Compete on the combined cash outlook, not on invoice templates (you chose not to build custom templates).
2. **Generic invoices vs. local compliance.** Users in tax-heavy regions need tax/VAT lines, seller IDs and sequential numbering. Competitors handle these. Keep the manual tax line in the model.
3. **Manual entry fatigue** without bank sync. Segment B shows manual tracking works at scale (10M+ installs), so it is acceptable if entry is fast.
4. **Play ratings drop for ad-heavy or aggressively monetized apps** (Monefy 3.99, Spendee 4.02, Goodbudget 3.20, QuickBooks Self-Employed 3.43). A no-ads, no-cap, one-time-premium stance protects the rating.
5. **No-account recovery.** Lost recovery phrase means lost data. Competitors recover via accounts. Needs clear onboarding copy and tested backup.
6. **Thin evidence of user pain.** Reddit/review mining was not possible; run the validation gate after Phase 5 (see `development.md`) before investing in later phases.

## 7. Implications for the plan

1. **Premium list (adopted as D-04/D-05 in `memory.md`):**
   - Automatic scheduled backup to a chosen folder.
   - Multi-device sync (self-hosted relay or user-chosen storage).
   - Advanced reports.
     Keep free: ledger, unlimited clients and invoices, cash-flow outlook, manual backup/restore, and CSV export.
2. **Add to V1 scope:** CSV import and export, a quick-add shortcut/widget, localization, and a manual tax line on invoices.
3. **Positioning:** "Your freelance cash, offline. See what you have, what's owed, and what a purchase leaves you with." Lead with the cash outlook; invoices are the input.
4. **Price test:** the market's one-time reference points reported here are roughly $20 (Cashew, unverified) to $50 (Wallet, conflicting sources; a desktop budget app at $49.99). Test a one-time price in that band before fixing it.
5. **Validate before building more:** interview solo freelancers and compare against the apps above on one question: "Do you currently combine an expense app, an invoice app and a spreadsheet to answer 'what can I spend?'"

## 8. Unverified or incomplete

- Monarch, Invoice2go, Joist, FreshBooks and Square Invoices were not matched to Play listings.
- Some Play IDs were guessed; a wrong or 404 ID was reported as "not found", not as "not on Android".
- Ivy Wallet's license and Actual Budget's mobile status were not confirmed from primary sources.
- Pricing comes from comparison blogs with conflicting numbers; re-check before using any price in a decision.
- Cashew's current premium price and structure were not confirmed (the search returned nothing about it).
