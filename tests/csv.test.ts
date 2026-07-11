import { describe, it, expect } from "vitest";
import { parseCSV } from "../lib/csv";

describe("parseCSV CSV Parser Suite", () => {
  it("parses standard CSV correctly", () => {
    const csvContent = `Name,Email,Phone
Amit Sharma,amit@example.com,9876501234
Neha Kapoor,neha@example.com,9876502345`;

    const result = parseCSV(csvContent);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      Name: "Amit Sharma",
      Email: "amit@example.com",
      Phone: "9876501234",
    });
    expect(result[1]).toEqual({
      Name: "Neha Kapoor",
      Email: "neha@example.com",
      Phone: "9876502345",
    });
  });

  it("handles empty file or empty input string", () => {
    const emptyResult1 = parseCSV("");
    const emptyResult2 = parseCSV("   \n  \n ");
    expect(emptyResult1).toEqual([]);
    expect(emptyResult2).toEqual([]);
  });

  it("handles a CSV with only headers and no data rows", () => {
    const csvContent = `Name,Email,Phone\n\n`;
    const result = parseCSV(csvContent);
    // PapaParse with header: true returns an empty array when there are only headers
    expect(result).toEqual([]);
  });
});
