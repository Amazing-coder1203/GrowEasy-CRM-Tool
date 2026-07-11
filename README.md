# GrowEasy CRM Importer

An intelligent, stateless, AI-powered CSV importer for GrowEasy CRM. It leverages Google Gemini to locate and map messy/ambiguous column headers from various advertising exports, sanitizes them, and prepares them dynamically for CRM ingestion.

**🔗 Live App:** [https://grow-easy-crm-tool.vercel.app/](https://grow-easy-crm-tool.vercel.app/)
**📦 Repository:** https://github.com/Amazing-coder1203/GrowEasy-CRM-Tool

---

## 🚀 Key Features

* **AI-Powered Schema Extraction**: Dynamically maps irregular CSV headers (e.g. `Full Name`, `Phone No`, `Campaign Name`) into unified CRM fields using Gemini models.
* **Deterministic Phone & Country Normalization**:
  * Resolves country codes using a comprehensive global lookup map (e.g., mapping `U.S.A.` -> `+1`, `UK` -> `+44`, defaulting to `+91`).
  * Cleans and validates mobile numbers using local regex parsing, falling back to raw preservation and review flags in notes for irregular shapes.
* **Alternate Phone/Email Support**: Automatically separates multi-value rows and groups secondary contacts with a uniform note prefix (e.g. `Alternate Phone: {number}`).
* **Enum-Constrained Enrichment**: `crm_status` and `data_source` are constrained to a fixed set of values both at the AI schema level and re-validated server-side — invalid or hallucinated values are blanked rather than passed through.
* **Sequential Batch Processing**: Chunks files client-side into groups of 25 to protect API rate limits and Vercel's serverless timeout, complete with automated retry/backoff wrappers for quota errors and an automatic model fallback for transient failures.
* **Dashboard View Modes**: Toggle between an interactive, fully searchable/filterable table and raw JSON formats.
* **Flexible Sizing**: Expand and collapse the viewport dynamically next to the view-mode toggle to easily scan 100+ rows.
* **Automated Unit Testing**: 20 Vitest unit tests verifying enum validation, phone/country normalization, date validation, skip-rule logic, and CSV parsing.
* **Containerized Deployment**: Includes a multi-stage Dockerfile for running the app in an isolated container, independent of the Vercel deployment.

---

## 🧠 Architecture

```
Upload (client)
     │  papaparse — client-side CSV parsing, no AI cost yet
     ▼
Preview (client)
     │  user reviews raw rows, confirms import
     ▼
Chunked batch requests (client-driven)
     │  rows split into batches of 25, sent SEQUENTIALLY as
     │  separate POST /api/import calls — not one giant request
     ▼
POST /api/import  (Next.js API route)
     ▼
extractBatch()  (lib/gemini.ts)
     │  ├─ tags rows with index, sends to Gemini with a
     │  │  structured JSON response schema (enum-constrained)
     │  ├─ primary + fallback model (see Tech Stack)
     │  ├─ 429 rate limits handled with dynamic wait, parsed
     │  │  from the API's own suggested retry delay
     │  ├─ 503/transient errors fall back to a secondary model
     │  │  after retries are exhausted
     │  └─ reattaches original row data via index — the AI never
     │     echoes back arbitrary row shapes
     ▼
validateRecord()  (lib/validate.ts)
     │  ├─ re-enforces crm_status / data_source enums server-side
     │  ├─ deterministic phone/country normalization (regex, not AI)
     │  ├─ validates created_at is parseable by new Date()
     │  └─ rejects records with neither email nor phone
     ▼
ImportResult { imported[], skipped[], totalImported, totalSkipped }
     ▼
Results (client) — searchable/filterable table, JSON view, CSV/JSON export
```

### Why this architecture

**Client-driven batching, not one backend call.** Vercel's serverless functions have execution timeouts (10s default on Hobby, configurable up to 60s). A single request processing an entire large CSV through many sequential AI batches would exceed this and fail. Instead, the frontend sends one batch per request, sequentially — each request finishes in seconds regardless of file size, and the progress bar reflects real batch completions rather than a simulated animation. It also isolates failures: if one batch fails, only those rows are marked skipped, not the whole import.

**The AI is not trusted blindly.** Every record returned by Gemini passes through a deterministic validation layer before being accepted. `crm_status` and `data_source` are re-checked against their allowed values server-side — even with a schema-constrained AI response, invalid values are blanked rather than passed through. Phone number formatting was deliberately moved out of the AI's hands and into deterministic regex logic, since number formatting is a rules problem, not a semantic one.

**Model fallback for reliability during grading.** The primary model was chosen for stability over raw capability, since this app only needs reliable structured extraction. A secondary model automatically takes over per-batch if the primary hits a transient error after retries are exhausted, so a brief demand spike on Google's end doesn't take the app down during evaluation.

**Skip rule enforced twice.** The AI is instructed to skip rows with neither email nor phone, and the same rule is independently re-checked in `validateRecord()` as a safety net.

---

## 🛠️ Tech Stack

* **Framework**: Next.js (TypeScript, App Router)
* **Styling**: Tailwind CSS
* **Parsing**: PapaParse (client-side)
* **AI Engine**: `@google/genai` — primary model `gemini-3.1-flash-lite`, with automatic fallback to `gemini-3.5-flash` on transient errors. Uses structured JSON output (`responseSchema`) to enforce field shape and enums at the API level.
* **Testing**: Vitest
* **Deployment**: Vercel (primary/live), with an optional Docker setup for containerized deployment elsewhere

No database — the app is fully stateless. CSVs are parsed and processed in memory per request; nothing is persisted server-side.

---

## ⚙️ Setup Instructions

### 1. Clone & Install
```bash
git clone https://github.com/Amazing-coder1203/GrowEasy-CRM-Tool.git
cd GrowEasy-CRM-Tool
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
Get a free key at [Google AI Studio](https://aistudio.google.com/).

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Running with Docker (optional)

The live graded submission runs on Vercel; this is provided as an additional, isolated way to run the app.

```bash
docker build -t crmtool .
docker run -p 3000:3000 --env-file .env.local crmtool
```
Open [http://localhost:3000](http://localhost:3000). The `GEMINI_API_KEY` is injected at container runtime via `--env-file` and is never baked into the image.

---

## 🧪 Testing

### Automated unit tests
```bash
npm test
```
Runs the Vitest suite (`tests/validate.test.ts`, `tests/csv.test.ts`) covering enum validation, phone/country normalization, date validation, skip-rule logic, and CSV parsing — no live API calls, completes in under a second.

### AI pipeline verification
The extraction pipeline itself was verified against a set of hand-built test CSVs (`test-csvs/`) covering distinct real-world formats — Facebook Ads exports, Google Ads exports, real estate CRM exports with ambiguous status text, manually-created spreadsheets with inconsistent headers, and files with deliberately ambiguous single-column contact fields. Each file has a documented expected output (`test-csvs/ANSWER_KEY.md`) that the pipeline's actual output was checked against line-by-line, including positive enum mapping (e.g. "Deal Closed" → `SALE_DONE`), correct blanking of unmatched `data_source` values, and correct skip behavior for rows missing both email and phone.

---

## 📐 Project Structure

```
├── app/
│   ├── api/import/route.ts   # Batch receiver endpoint
│   ├── globals.css           # Styling rules
│   └── page.tsx              # Upload, preview, and results state machine
├── components/
│   ├── UploadZone.tsx        # Drag-and-drop CSV parser component
│   ├── CsvPreviewTable.tsx   # Sticky-header CSV layout
│   └── ImportResultsView.tsx # Dashboard with search, filter, and layout toggles
├── lib/
│   ├── csv.ts                # Papaparse handler
│   ├── gemini.ts             # AI extraction, batching, retry/fallback logic
│   ├── prompt.ts             # System prompt specification
│   └── validate.ts           # Post-AI validation & phone/country normalization
├── test-csvs/                # Hand-built test fixtures + answer key
├── tests/
│   ├── csv.test.ts           # CSV parsing unit tests
│   └── validate.test.ts      # validateRecord validation suite
├── Dockerfile                # Multi-stage build for containerized deployment
└── .dockerignore
```

---

## 📝 Design Trade-offs

* **Pagination instead of virtualization** for large result tables — simpler solution to the same rendering-performance problem.
* **Client parses and sends JSON, rather than raw file upload to the backend** — the API accepts `{ rows: RawCsvRow[] }` rather than a multipart file upload, to support client-driven batching (see Architecture) and avoid re-parsing CSV server-side.