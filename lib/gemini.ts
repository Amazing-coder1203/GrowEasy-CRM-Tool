import { GoogleGenAI, Type } from "@google/genai";
import { systemPrompt } from "./prompt";
import { validateRecord } from "./validate";
import type { RawCsvRow, CrmRecord, SkippedRow, ImportResult } from "@/types/crm";

// Initialize the GoogleGenAI client lazily to avoid import hoisting issues (e.g. when loading env vars)
let aiClient: GoogleGenAI | null = null;

// Expose the global count of 429 retries
export let global429RetriesCount = 0;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ExtractionResult {
  records: any[];
  skipped: any[];
}

/**
 * Helper to call a specific Gemini model with retry/backoff and rate-limit handling.
 */
async function runModelExtraction(
  model: string,
  taggedRows: any[],
  rows: RawCsvRow[],
  batchIndex: number
): Promise<ExtractionResult> {
  const ai = getAI();
  let attempts = 0;
  const maxRetries = 3; // 3 standard retries with exponential backoff
  let delayMs = 1000;
  let batch429Waits = 0;
  const max429Waits = 5; // Hard cap on 429-triggered retries per batch

  while (attempts <= maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: JSON.stringify(taggedRows),
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              records: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    index: { type: Type.INTEGER },
                    created_at: { type: Type.STRING },
                    name: { type: Type.STRING },
                    email: { type: Type.STRING },
                    country_code: { type: Type.STRING },
                    mobile_without_country_code: { type: Type.STRING },
                    company: { type: Type.STRING },
                    city: { type: Type.STRING },
                    state: { type: Type.STRING },
                    country: { type: Type.STRING },
                    lead_owner: { type: Type.STRING },
                    crm_status: { type: Type.STRING },
                    crm_note: { type: Type.STRING },
                    data_source: { type: Type.STRING },
                    possession_time: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: [
                    "index",
                    "created_at",
                    "name",
                    "email",
                    "country_code",
                    "mobile_without_country_code",
                    "company",
                    "city",
                    "state",
                    "country",
                    "lead_owner",
                    "crm_status",
                    "crm_note",
                    "data_source",
                    "possession_time",
                    "description"
                  ]
                }
              },
              skipped: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    index: { type: Type.INTEGER },
                    reason: { type: Type.STRING }
                  },
                  required: ["index", "reason"]
                }
              }
            },
            required: ["records", "skipped"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Gemini response text is empty");
      }

      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.records) || !Array.isArray(parsed.skipped)) {
        throw new Error("Parsed JSON structure does not match expected format");
      }

      return parsed;
    } catch (error: any) {
      attempts++;
      const errorMessage = error.message || String(error);
      console.error(
        `[runModelExtraction] Batch ${batchIndex} - Model ${model} Attempt ${attempts} failed. Error:`,
        errorMessage
      );

      // Check for 429 Rate Limit / Resource Exhausted error
      const is429 =
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        error.status === 429 ||
        error.status === "RESOURCE_EXHAUSTED";

      if (is429) {
        batch429Waits++;
        global429RetriesCount++;
        
        if (batch429Waits > max429Waits) {
          throw new Error(`Rate limit cap of ${max429Waits} 429 waits reached`);
        }

        // Find if there's a retryDelay mentioned in the error message
        let waitMs = 15000;
        const match = errorMessage.match(/retryDelay":"(\d+)s"/);
        if (match && match[1]) {
          const seconds = parseInt(match[1], 10);
          waitMs = (seconds + 2) * 1000;
        } else {
          const secMatch = errorMessage.match(/retry in ([\d\.]+)s/);
          if (secMatch && secMatch[1]) {
            const seconds = Math.ceil(parseFloat(secMatch[1]));
            waitMs = (seconds + 2) * 1000;
          }
        }

        console.warn(`[runModelExtraction] Batch ${batchIndex} - Quota exceeded on ${model} (429 count: ${batch429Waits}/${max429Waits}). Waiting ${waitMs / 1000} seconds before retry...`);
        await delay(waitMs);
        // Decrease attempts so rate limits don't consume our main retry quota prematurely
        attempts = Math.max(0, attempts - 1);
      } else {
        if (attempts > maxRetries) {
          throw error; // Propagate general errors after retries are exhausted to trigger fallback
        }
        // Ordinary error, use exponential backoff
        await delay(delayMs);
        delayMs *= 2;
      }
    }
  }

  throw new Error(`Failed to extract via model ${model} after max retries`);
}

/**
 * Send a batch of raw CSV rows to Gemini and receive structured records and skipped items.
 */
export async function extractBatch(rows: RawCsvRow[], batchIndex = 1): Promise<{
  records: CrmRecord[];
  skipped: SkippedRow[];
}> {
  if (rows.length === 0) {
    return { records: [], skipped: [] };
  }

  // Tag each row with its original index
  const taggedRows = rows.map((fields, index) => ({ index, fields }));
  
  let parsed: ExtractionResult | null = null;
  let usedModel = "gemini-3.1-flash-lite";

  // Try Primary Model (gemini-3.1-flash-lite)
  try {
    parsed = await runModelExtraction("gemini-3.1-flash-lite", taggedRows, rows, batchIndex);
    console.log(`[extractBatch] batch ${batchIndex} served by gemini-3.1-flash-lite`);
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    const is429 =
      errorMessage.includes("429") ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorMessage.includes("rate limit") ||
      error.status === 429 ||
      error.status === "RESOURCE_EXHAUSTED";

    // 429 rate limit failure on primary should propagate and fail (no fallback)
    if (is429) {
      console.error(`[extractBatch] batch ${batchIndex} failed due to rate limits on primary model. Propagating rate limit failure.`);
      return {
        records: [],
        skipped: rows.map((row) => ({
          row,
          reason: "AI processing failed: primary model rate-limit cap reached"
        }))
      };
    }

    // For transient server errors (like 503, 500, etc.), fall back to gemini-3.5-flash
    console.warn(`[extractBatch] batch ${batchIndex} primary model (gemini-3.1-flash-lite) failed with transient error: ${errorMessage}. Falling back to gemini-3.5-flash...`);
    
    try {
      usedModel = "gemini-3.5-flash";
      parsed = await runModelExtraction("gemini-3.5-flash", taggedRows, rows, batchIndex);
      console.log(`[extractBatch] batch ${batchIndex} fell back to and served by gemini-3.5-flash`);
    } catch (fallbackError: any) {
      console.error(`[extractBatch] batch ${batchIndex} fallback model (gemini-3.5-flash) also failed:`, fallbackError.message || fallbackError);
      return {
        records: [],
        skipped: rows.map((row) => ({
          row,
          reason: "AI processing failed: both primary and fallback models failed"
        }))
      };
    }
  }

  if (!parsed) {
    return {
      records: [],
      skipped: rows.map((row) => ({
        row,
        reason: "AI processing failed after retries"
      }))
    };
  }

  const finalRecords: CrmRecord[] = [];
  const finalSkipped: SkippedRow[] = [];
  const returnedIndices = new Set<number>();

  // Process successfully returned records
  for (const record of parsed.records) {
    if (record && typeof record.index === "number") {
      returnedIndices.add(record.index);
      finalRecords.push(record as CrmRecord);
    }
  }

  // Process skipped records returned by AI
  for (const skipItem of parsed.skipped) {
    if (skipItem && typeof skipItem.index === "number") {
      returnedIndices.add(skipItem.index);
      const originalRow = rows[skipItem.index];
      if (originalRow) {
        finalSkipped.push({
          row: originalRow,
          reason: skipItem.reason || "Skipped by AI extraction"
        });
      }
    }
  }

  // Check if any row index is missing from both records and skipped
  for (let i = 0; i < rows.length; i++) {
    if (!returnedIndices.has(i)) {
      finalSkipped.push({
        row: rows[i],
        reason: "missing from AI response"
      });
    }
  }

  return { records: finalRecords, skipped: finalSkipped };
}

/**
 * Chunk rows into batches and process sequentially with delay.
 */
export async function extractAll(rows: RawCsvRow[], batchSize = 25): Promise<ImportResult> {
  // Reset the global 429 counter for this run
  global429RetriesCount = 0;

  const imported: CrmRecord[] = [];
  const skipped: SkippedRow[] = [];

  // Split rows into batches of size batchSize
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize) + 1;
    
    // Process batch
    const { records, skipped: batchSkipped } = await extractBatch(chunk, batchIndex);
    
    // Add skipped rows from the batch
    skipped.push(...batchSkipped);

    // Validate records post-AI
    for (const record of records) {
      const originalIndex = (record as any).index;
      const originalRow = chunk[originalIndex] || {};

      // Run validation (which also sanitizes the record in place)
      const { valid, issues } = validateRecord(record);

      if (valid) {
        // Strip the index property before saving
        const { index, ...cleanRecord } = record as any;
        imported.push(cleanRecord as CrmRecord);
      } else {
        skipped.push({
          row: originalRow,
          reason: `Post-AI validation failed: ${issues.join("; ")}`
        });
      }
    }

    // Add inter-batch delay to respect the free-tier rate limit.
    // With batchSize=25 and 10 RPM, one batch per ~6s is recommended.
    // We use a conservative 1000ms minimum delay.
    if (i + batchSize < rows.length) {
      await delay(1000);
    }
  }

  console.log(`[extractAll] Run complete. Total 429 waits triggered: ${global429RetriesCount}`);

  return {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length
  };
}
