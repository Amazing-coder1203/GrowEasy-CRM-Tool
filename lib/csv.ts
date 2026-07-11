import Papa from "papaparse";
import type { RawCsvRow } from "@/types/crm";

/**
 * Parse a CSV text string into an array of raw row objects.
 */
export function parseCSV(csvContent: string): RawCsvRow[] {
  if (!csvContent || csvContent.trim() === "") {
    return [];
  }
  const parsed = Papa.parse<RawCsvRow>(csvContent, {
    header: true,
    skipEmptyLines: "greedy",
  });
  return parsed.data || [];
}
