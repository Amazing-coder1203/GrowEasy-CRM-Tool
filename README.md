# GrowEasy CRM Importer

An intelligent, stateless, AI-powered CSV importer for GrowEasy CRM. It leverages Google Gemini to locate and map messy/ambiguous column headers from various advertising exports, sanitizes them, and prepares them dynamically for CRM ingestion.

---

## 🚀 Key Features

* **AI-Powered Schema Extraction**: Dynamically maps irregular CSV headers (e.g. `Full Name`, `Phone No`, `Campaign Name`) into unified CRM fields using Gemini models.
* **Deterministic Phone & Country Normalization**: 
  * Resolves country codes using a comprehensive global lookup map (e.g., mapping `U.S.A.` -> `+1`, `UK` -> `+44`, defaulting to `+91`).
  * Cleans and validates mobile numbers using local regex parsing, falling back to raw preservation and review flags in notes for irregular shapes.
* **Alternate Phone Support**: Automatically separates multi-number rows and groups secondary contacts with a uniform `Alternate Phone: {number}` note prefix.
* **Sequential Batch Processing**: Chunks files client-side into groups of 25 to protect API boundaries, complete with automated retry/backoff wrappers for quota errors.
* **Dashboard View Modes**: Toggle between an interactive, fully searchable/filterable table and raw JSON formats.
* **Flexible Sizing**: Expand and collapse the viewport dynamically next to the viewmode toggle to easily scan 100+ rows.
* **Automated Unit Testing**: Includes 20 automated Vitest unit tests verifying state maps, exclusions, dates, and prefix stripping.

---

## 🛠️ Tech Stack

* **Framework**: Next.js 15 (TypeScript, App Router)
* **Styling**: Tailwind CSS
* **Parsing**: PapaParse (Client-side)
* **AI Engine**: `@google/genai` (Gemini 2.1 Flash Lite)
* **Testing**: Vitest

---

## ⚙️ Setup Instructions

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/Amazing-coder1203/GrowEasy-CRM-Tool.git
cd GrowEasy-CRM-Tool

# Install dependencies
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🧪 Running Automated Tests

Run the Vitest test suite to verify validation rules and CSV parsing logics:
```bash
npm test
```

---

## 📐 Project Structure

```
├── app/
│   ├── api/import/route.ts   # Sequential batch receiver endpoint
│   ├── globals.css           # Styling rules
│   └── page.tsx              # Upload, preview, and results state machine
├── components/
│   ├── UploadZone.tsx        # Drag-and-drop CSV parser component
│   ├── CsvPreviewTable.tsx   # Sticky-header CSV layout
│   └── ImportResultsView.tsx # Dashboard with search, filter, and layout toggles
├── lib/
│   ├── csv.ts                # Papaparse handler
│   ├── gemini.ts             # SDK rate limiter & backoff calls
│   ├── prompt.ts             # System prompt specifications
│   └── validate.ts           # Post-AI validation & phone parsing logic
└── tests/
    ├── csv.test.ts           # CSV parse unit tests
    └── validate.test.ts      # validateRecord validation suite
```
