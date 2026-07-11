# Test CSV Answer Key

Use this to check your importer's output against expected behavior. Each file targets specific rules from the assignment spec.

---

## 1. facebook_ads_export.csv — basic mapping + multi-phone + skip rule
- 6 rows in, **5 should import, 1 should be skipped**
- **Deepak Menon** has no email and no phone → must be skipped
- **Neha Kapoor**'s phone field has two numbers (`9876502345, 9876502346`) → first goes to `mobile_without_country_code`, second must appear in `crm_note`
- **Rohit Verma** has phone but no email → should still import (only skip if BOTH missing)
- **Sana Iqbal** has email but no phone → should still import

## 2. google_ads_export.csv — combined location field + date-only format
- All 5 rows should import (each has at least email or phone)
- `Location` column (e.g. `"Bangalore, Karnataka"`) must be split into `city` = Bangalore, `state` = Karnataka
- `Submission Date` is `MM/DD/YYYY` only, no time — must still produce a valid `created_at` that passes `new Date(created_at)`
- `Google Click ID` (junk/irrelevant tracking column) should be ignored, not shoved into `crm_note` as noise — or if included, should be clearly minor, not obscuring real notes

## 3. real_estate_crm_export.csv — the important one: enum mapping discipline
- All 6 rows should import
- `crm_status` — check each mapping:
  - "Hot Lead" → `GOOD_LEAD_FOLLOW_UP`
  - "Not Interested" → `BAD_LEAD`
  - "Deal Closed" → `SALE_DONE`
  - "Follow Up Required" → `GOOD_LEAD_FOLLOW_UP`
  - "Contacted But No Response" → `DID_NOT_CONNECT`
  - "Warm Lead" → `GOOD_LEAD_FOLLOW_UP`
- `data_source` — **this is the key test**:
  - Suresh Kumar: "Meridian Tower Site Visit" → should map to `meridian_tower`
  - Lakshmi Pillai: "Eden Park Referral" → should map to `eden_park`
  - Manoj Tiwari: "Sarjapur Plots Walk-in" → should map to `sarjapur_plots`
  - Geeta Bhatia: "Facebook Campaign" → no match → **must be left blank**
  - Arjun Nambiar: "Newspaper Ad" → no match → **must be left blank**
  - Fatima Sheikh: "Instagram Ad" → no match → **must be left blank**
  - ⚠️ If your AI is hallucinating a `data_source` value for the last 3 rows, that's a real bug to fix — this is exactly the "if none match confidently, leave blank" rule.
- `possession_time` should carry over "Dec 2027", "Ready to Move", "Immediate", etc. as-is (free text, no enum)
- Manoj Tiwari has two phone numbers → second goes to `crm_note`

## 4. manual_messy_spreadsheet.csv — misspelled headers + mixed-format multi-value fields
- 6 rows in, **5 should import, 1 should be skipped**
- **Tarun Oberoi** has no email and no phone → must be skipped
- Header `"Full Nmae"` (typo), `"E-mail ID"`, `"Ph No"` / `"Ph No 2"`, `"Loc"`, `"Date Added"` — all must still map correctly despite non-standard naming
- **Vikram Rathore**'s email field has two emails separated by `/` (`vikram.rathore@gmail.com / vikram.r@work.com`) → first is primary, second goes to `crm_note`
- **Simran Kaur**'s phone field has two numbers separated by the word `"or"` (`9871234561 or 9871234562`) → tests whether your AI parses multi-value fields with non-comma separators
- The anonymous row (blank name, has email) → should still import despite missing name — `name` can be blank or inferred, but the row is NOT skipped since it has an email
- Date formats vary per row: `13-05-2026`, `May 14 2026`, `17/05/2026`, `2026-05-18 09:30:00` — all must produce a valid `created_at`

## 5. sales_report_ambiguous_contact.csv — type detection, not header-name trust
- 5 rows in, **4 should import, 1 should be skipped**
- Single `Contact` column holds **either an email or a phone depending on the row** — your AI must detect the value type from content, not assume based on column position
- Ramesh Iyer / Kavita Desai: `Contact` = email → maps to `email`
- Sunita Joshi / Harish Chandra: `Contact` = phone → maps to `mobile_without_country_code`
- **Nisha Malhotra** has blank `Contact` → no email, no phone → must be skipped
- `Deal Status` values ("New", "In Progress", "Lost", "Won") → map to your 4 allowed enums (Won→SALE_DONE, Lost→BAD_LEAD, New/In Progress→GOOD_LEAD_FOLLOW_UP or DID_NOT_CONNECT depending on your judgment call — no single correct answer here, just check it's one of the 4 allowed values)

---

## Quick sanity checks across all files
1. `Total Imported + Total Skipped` should always equal total input rows.
2. No `crm_status` value should ever appear outside the 4 allowed enums.
3. No `data_source` value should ever appear outside the 5 allowed enums (or blank).
4. Every `created_at` in the output should pass `!isNaN(new Date(created_at))` in JS.
5. Whenever a row had 2 emails or 2 phones in the source, the second value should be findable inside that row's `crm_note` — not silently dropped.
