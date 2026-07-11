import { describe, it, expect } from "vitest";
import { validateRecord } from "../lib/validate";
import type { CrmRecord } from "../types/crm";

// Helper to create a base mock record with empty required fields
function createMockRecord(overrides: Partial<CrmRecord> = {}): CrmRecord {
  return {
    created_at: "",
    name: "Test Lead",
    email: "test@example.com",
    country_code: "",
    mobile_without_country_code: "",
    company: "",
    city: "",
    state: "",
    country: "",
    lead_owner: "",
    crm_status: "GOOD_LEAD_FOLLOW_UP",
    crm_note: "",
    data_source: "leads_on_demand",
    possession_time: "",
    description: "",
    ...overrides,
  };
}

describe("validateRecord Validation Suite", () => {
  
  describe("CRM Status Validation", () => {
    it("preserves valid CRM status values", () => {
      const record = createMockRecord({ crm_status: "SALE_DONE" });
      const { valid } = validateRecord(record);
      expect(valid).toBe(true);
      expect(record.crm_status).toBe("SALE_DONE");
    });

    it("blanks out invalid CRM status values and generates warnings", () => {
      const record = createMockRecord({ crm_status: "HOT_LEAD" as any });
      const { valid, issues } = validateRecord(record);
      expect(valid).toBe(true);
      expect(record.crm_status).toBe("");
      expect(issues.some(i => i.includes("crm_status"))).toBe(true);
    });
  });

  describe("Data Source Validation", () => {
    it("preserves valid Data Sources", () => {
      const record = createMockRecord({ data_source: "eden_park" });
      const { valid } = validateRecord(record);
      expect(valid).toBe(true);
      expect(record.data_source).toBe("eden_park");
    });

    it("blanks out invalid Data Sources and logs issue", () => {
      const record = createMockRecord({ data_source: "facebook_campaign" as any });
      const { valid, issues } = validateRecord(record);
      expect(valid).toBe(true);
      expect(record.data_source).toBe("");
      expect(issues.some(i => i.includes("data_source"))).toBe(true);
    });
  });

  describe("Date Formats validation", () => {
    it("retains valid dates", () => {
      const record = createMockRecord({ created_at: "2026-04-01T12:00:00.000Z" });
      const { valid } = validateRecord(record);
      expect(valid).toBe(true);
      expect(record.created_at).toBe("2026-04-01T12:00:00.000Z");
    });

    it("blanks out unparseable dates", () => {
      const record = createMockRecord({ created_at: "invalid-date-string" });
      const { valid, issues } = validateRecord(record);
      expect(valid).toBe(true);
      expect(record.created_at).toBe("");
      expect(issues.some(i => i.includes("created_at"))).toBe(true);
    });
  });

  describe("Phone Number Normalization & Country Codes", () => {
    it("infers +91 default for standard 10-digit numbers when country is empty", () => {
      const record = createMockRecord({ mobile_without_country_code: "9812345670", country: "" });
      validateRecord(record);
      expect(record.country_code).toBe("+91");
      expect(record.mobile_without_country_code).toBe("9812345670");
    });

    it("maps +1 for 10-digit numbers when country is USA / US / U.S.A.", () => {
      const record1 = createMockRecord({ mobile_without_country_code: "5718415122", country: "United States" });
      validateRecord(record1);
      expect(record1.country_code).toBe("+1");

      const record2 = createMockRecord({ mobile_without_country_code: "5718415122", country: "U.S.A." });
      validateRecord(record2);
      expect(record2.country_code).toBe("+1");
    });

    it("maps +44 for 10-digit UK numbers", () => {
      const record = createMockRecord({ mobile_without_country_code: "7700900077", country: "UK" });
      validateRecord(record);
      expect(record.country_code).toBe("+44");
    });

    it("correctly parses 12-digit international numbers (e.g. India +91 prefix)", () => {
      const record = createMockRecord({ mobile_without_country_code: "919812345670" });
      validateRecord(record);
      expect(record.country_code).toBe("+91");
      expect(record.mobile_without_country_code).toBe("9812345670");
    });

    it("correctly normalizes 14-digit international number with IDD prefix (e.g. 0091...)", () => {
      const record = createMockRecord({ mobile_without_country_code: "00919812345670" });
      validateRecord(record);
      expect(record.country_code).toBe("+91");
      expect(record.mobile_without_country_code).toBe("9812345670");
    });

    it("handles zeroes leftover prefix by falling back to country mapping (e.g. 009812345670)", () => {
      const record = createMockRecord({ mobile_without_country_code: "009812345670", country: "US" });
      validateRecord(record);
      expect(record.country_code).toBe("+1");
      expect(record.mobile_without_country_code).toBe("9812345670");
    });

    it("leaves country_code blank and retains original string for irregular phone values (<10 digits)", () => {
      const record = createMockRecord({ mobile_without_country_code: "12345", crm_note: "Prior note" });
      validateRecord(record);
      expect(record.country_code).toBe("");
      expect(record.mobile_without_country_code).toBe("12345");
      expect(record.crm_note).toContain("Unclear phone number: 12345");
    });

    it("leaves country_code blank and retains raw value for extremely long digits (>15 digits)", () => {
      const record = createMockRecord({ mobile_without_country_code: "12345678901234567", crm_note: "" });
      validateRecord(record);
      expect(record.country_code).toBe("");
      expect(record.mobile_without_country_code).toBe("12345678901234567");
      expect(record.crm_note).toBe("Unclear phone number: 12345678901234567");
    });
  });

  describe("Lead Exclusion Skip Rules", () => {
    it("excludes (valid = false) rows missing BOTH email and phone", () => {
      const record = createMockRecord({ email: "", mobile_without_country_code: "" });
      const { valid, issues } = validateRecord(record);
      expect(valid).toBe(false);
      expect(issues.some(i => i.includes("both email and phone"))).toBe(true);
    });

    it("allows rows with email but NO phone", () => {
      const record = createMockRecord({ email: "test@example.com", mobile_without_country_code: "" });
      const { valid } = validateRecord(record);
      expect(valid).toBe(true);
    });

    it("allows rows with phone but NO email", () => {
      const record = createMockRecord({ email: "", mobile_without_country_code: "9812345670" });
      const { valid } = validateRecord(record);
      expect(valid).toBe(true);
    });
  });

});
