"use client";

import React, { useState, useEffect } from "react";
import { CrmRecord, SkippedRow } from "@/types/crm";
import Papa from "papaparse";
import JSZip from "jszip";

interface ImportResultsViewProps {
  imported: CrmRecord[];
  skipped: SkippedRow[];
  onNewImport: () => void;
}

const columns: { key: keyof CrmRecord; label: string }[] = [
  { key: "created_at", label: "Created At" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "country_code", label: "Country Code" },
  { key: "mobile_without_country_code", label: "Mobile" },
  { key: "crm_status", label: "CRM Status" },
  { key: "data_source", label: "Data Source" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "company", label: "Company" },
  { key: "lead_owner", label: "Lead Owner" },
  { key: "possession_time", label: "Possession Time" },
  { key: "crm_note", label: "Notes" },
  { key: "description", label: "Description" },
];

export default function ImportResultsView({ imported, skipped, onNewImport }: ImportResultsViewProps) {
  const [viewMode, setViewMode] = useState<"csv" | "json">("csv");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");

  // Expand & Pagination State
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sourceFilter, isExpanded, pageSize]);

  const exportFields: (keyof CrmRecord)[] = [
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
  ];

  const prepareCsvData = () => {
    return imported.map(record => {
      const row: any = {};
      exportFields.forEach(field => {
        let val = record[field] ?? "";
        if (typeof val === "string") {
          // Escape newlines as literal '\n' characters so each record fits on a single line
          val = val.replace(/\r?\n/g, "\\n");
        }
        row[field] = val;
      });
      return row;
    });
  };

  const downloadCsv = () => {
    const csvData = prepareCsvData();
    const csvContent = Papa.unparse(csvData, { columns: exportFields });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "groweasy_imported_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJson = () => {
    const jsonContent = JSON.stringify(imported, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "groweasy_imported_leads.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadBothZip = async () => {
    const zip = new JSZip();
    const csvData = prepareCsvData();
    const csvContent = Papa.unparse(csvData, { columns: exportFields });
    const jsonContent = JSON.stringify(imported, null, 2);
    
    zip.file("groweasy_imported_leads.csv", csvContent);
    zip.file("groweasy_imported_leads.json", jsonContent);
    
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "groweasy_imported_leads.zip");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMainDownload = () => {
    if (viewMode === "csv") {
      downloadCsv();
    } else {
      downloadJson();
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(imported, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter imported records
  const filteredImported = imported.filter((record) => {
    // 1. Search bar
    if (searchTerm.trim() !== "") {
      const search = searchTerm.toLowerCase();
      const matchSearch = Object.entries(record).some(([key, val]) => {
        if (key === "index") return false;
        return String(val ?? "").toLowerCase().includes(search);
      });
      if (!matchSearch) return false;
    }

    // 2. Status Filter
    if (statusFilter !== "ALL") {
      const expectedStatus = statusFilter === "BLANK" ? "" : statusFilter;
      if (record.crm_status !== expectedStatus) return false;
    }

    // 3. Source Filter
    if (sourceFilter !== "ALL") {
      const expectedSource = sourceFilter === "BLANK" ? "" : sourceFilter;
      if (record.data_source !== expectedSource) return false;
    }

    return true;
  });

  // Calculate pages
  const activePageSize = isExpanded ? filteredImported.length || 1 : pageSize;
  const totalPages = Math.ceil(filteredImported.length / activePageSize) || 1;
  
  // Safe page index check
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedImported = filteredImported.slice(
    (safeCurrentPage - 1) * activePageSize,
    safeCurrentPage * activePageSize
  );

  // Dynamic filter values
  const uniqueStatuses = Array.from(new Set(imported.map((r) => r.crm_status).filter(Boolean)));
  const uniqueSources = Array.from(new Set(imported.map((r) => r.data_source).filter(Boolean)));

  // Collect all unique keys present across all skipped raw rows for dynamic headers
  const skippedCsvHeaders = Array.from(
    new Set(skipped.flatMap((item) => Object.keys(item.row)))
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Import Results</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            CSV import process completed. See summary and details below.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewImport}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-200 hover:scale-[1.02]"
        >
          Start a New Import
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Imported Card */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl backdrop-blur-sm flex items-center justify-between shadow-sm">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500" />
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Imported Records
            </p>
            <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
              {imported.length}
            </p>
          </div>
          <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Skipped Card */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl backdrop-blur-sm flex items-center justify-between shadow-sm">
          <div className="absolute top-0 left-0 w-2 h-full bg-amber-500" />
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Skipped Records
            </p>
            <p className="text-4xl font-extrabold text-amber-600 dark:text-amber-500 mt-2 font-mono">
              {skipped.length}
            </p>
          </div>
          <div className="p-3 bg-amber-100 dark:bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Results Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Imported Data</h3>
          
          {imported.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Expand/Collapse Toggle Button (only when CSV mode is active) */}
              {viewMode === "csv" && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white font-semibold text-xs rounded-xl shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-violet-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
                      </svg>
                      Collapse View
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-violet-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                      Expand Table ({filteredImported.length})
                    </>
                  )}
                </button>
              )}

              {/* Segmented View Mode Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-900/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setViewMode("csv")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    viewMode === "csv"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-105 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  CSV Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("json")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    viewMode === "json"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-105 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  JSON View
                </button>
              </div>

              {/* Split Download Dropdown */}
              <div className="relative inline-flex rounded-xl shadow-md shadow-violet-500/5 z-20">
                {/* Main download action button */}
                <button
                  type="button"
                  onClick={handleMainDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-750 text-white text-xs font-semibold rounded-l-xl transition-colors border-r border-violet-700/50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  Download {viewMode === "csv" ? "CSV" : "JSON"}
                </button>
                {/* Dropdown toggle button */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="px-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-750 text-white rounded-r-xl transition-colors focus:outline-none flex items-center justify-center"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <>
                    {/* Click-away backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        type="button"
                        onClick={() => { downloadCsv(); setDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download CSV (.csv)
                      </button>
                      <button
                        type="button"
                        onClick={() => { downloadJson(); setDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                        Download JSON (.json)
                      </button>
                      <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                      <button
                        type="button"
                        onClick={() => { downloadBothZip(); setDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-violet-650 dark:text-violet-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-semibold transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Download Both (.zip)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Search and Filters Bar */}
        {imported.length > 0 && viewMode === "csv" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/40 dark:bg-slate-900/20 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl backdrop-blur-sm shadow-sm transition-all duration-300">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search leads..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-white dark:bg-slate-900/60 border border-slate-205 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-grow py-2 px-3 text-xs bg-white dark:bg-slate-900/60 border border-slate-205 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-150 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-colors cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
                <option value="BLANK">(Blank/Unmapped)</option>
              </select>
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Source:</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="flex-grow py-2 px-3 text-xs bg-white dark:bg-slate-900/60 border border-slate-205 dark:border-slate-800 rounded-xl text-slate-850 dark:text-slate-150 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-colors cursor-pointer"
              >
                <option value="ALL">All Sources</option>
                {uniqueSources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
                <option value="BLANK">(Blank/Unmapped)</option>
              </select>
            </div>
          </div>
        )}

        {imported.length === 0 ? (
          <div className="border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/10 p-12 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 border border-slate-200 dark:border-slate-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25m-2.25-2.25l-2.25 2.25m2.25-2.25l2.25-2.25M3.75 7.5L5.621 3.75h12.758L20.25 7.5m-16.5 0h16.5"
                />
              </svg>
            </div>
            <h4 className="text-slate-700 dark:text-slate-300 font-semibold">No records were imported</h4>
            <p className="text-slate-500 text-xs mt-1 max-w-sm">
              All rows failed mapping validation checks. Review skipped records below to diagnose issues.
            </p>
          </div>
        ) : filteredImported.length === 0 && viewMode === "csv" ? (
          <div className="border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/10 p-12 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-3 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
            </svg>
            <h4 className="text-slate-700 dark:text-slate-300 font-semibold text-sm">No matches found</h4>
            <p className="text-slate-500 text-xs mt-1 max-w-sm">
              Your search term or active filters didn't return any records. Try adjusting them.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setSourceFilter("ALL");
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all duration-200"
            >
              Clear Filters
            </button>
          </div>
        ) : viewMode === "csv" ? (
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm relative">
              <div className="overflow-x-auto w-full">
                <div className={`scrollbar-custom transition-all duration-350 ${isExpanded ? "max-h-none" : "max-h-[45vh] overflow-y-auto"}`}>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/80 sticky top-0 backdrop-blur z-10">
                        <th className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-semibold w-12 text-center bg-slate-100/90 dark:bg-slate-900/80">
                          #
                        </th>
                        {columns.map((col) => (
                          <th
                            key={col.key}
                            className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider whitespace-nowrap bg-slate-100/90 dark:bg-slate-900/80"
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/40">
                      {paginatedImported.map((record, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-55 dark:hover:bg-slate-800/20 transition-colors duration-150"
                        >
                          <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-medium text-center bg-slate-50/50 dark:bg-slate-950/20 whitespace-nowrap">
                            {(safeCurrentPage - 1) * activePageSize + idx + 1}
                          </td>
                          {columns.map((col) => {
                            const val = record[col.key];
                            const isNoteOrDesc = col.key === "crm_note" || col.key === "description";
                            const isEmpty = val === undefined || val === null || String(val).trim() === "";
                            
                            return (
                              <td
                                key={col.key}
                                className={`px-4 py-3 whitespace-nowrap truncate max-w-[280px] font-mono ${
                                  isEmpty ? "text-slate-400 italic font-sans dark:text-slate-600" : "text-slate-700 dark:text-slate-300"
                                }`}
                                title={String(val || "")}
                              >
                                {isEmpty ? "—" : String(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            {/* Pagination controls footer */}
            {!isExpanded && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800/80 text-xs select-none">
                <div className="text-slate-500 dark:text-slate-400 font-medium">
                  Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{(safeCurrentPage - 1) * activePageSize + 1}</span> to <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(safeCurrentPage * activePageSize, filteredImported.length)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredImported.length}</span> leads
                </div>

                <div className="flex items-center gap-2">
                  {/* Rows per page selector */}
                  <div className="flex items-center gap-1.5 mr-2">
                    <span className="text-slate-400 dark:text-slate-500 text-xxs uppercase tracking-wider font-semibold">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="py-1 px-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg text-slate-750 dark:text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Prev page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                  </button>

                  {/* Page indexes */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      if (totalPages > 5 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - safeCurrentPage) > 1) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return <span key={pageNum} className="px-1 text-slate-400 select-none">...</span>;
                        }
                        return null;
                      }
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all duration-150 ${
                            safeCurrentPage === pageNum
                              ? "bg-violet-600 text-white shadow-md shadow-violet-500/10"
                              : "text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
      ) : (
          /* JSON View */
          <div className="border border-slate-200 dark:border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-sm relative group">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-850 bg-slate-900/60 backdrop-blur">
              <span className="text-xs font-semibold text-slate-400 font-mono">imported_leads.json</span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-250 hover:bg-slate-800 text-xs font-semibold transition-all duration-200"
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-emerald-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span className="text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.588M5.25 7.875A2.25 2.25 0 0 1 7.5 5.625h9a2.25 2.25 0 0 1 2.25 2.25v8.625A2.25 2.25 0 0 1 16.5 18.75h-9a2.25 2.25 0 0 1-2.25-2.25V7.875Z" />
                    </svg>
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-auto text-xs font-mono text-slate-300 max-h-[45vh] scrollbar-custom bg-slate-950/30">
              <code>{JSON.stringify(imported, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Collapsible Skipped Section */}
      {skipped.length > 0 && (
        <div className="space-y-3">
          <details className="group border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/10 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm">
            <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 select-none text-slate-850 dark:text-slate-300 transition-colors duration-150">
              <div className="flex items-center gap-3">
                <span className="p-1.5 bg-amber-100 dark:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </span>
                <span className="font-semibold text-sm">
                  Skipped Records ({skipped.length} rows) — click to expand
                </span>
              </div>
              <span className="text-slate-450 dark:text-slate-500 group-open:rotate-180 transition-transform duration-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </span>
            </summary>
            
            <div className="border-t border-slate-200 dark:border-slate-800 p-5 bg-slate-50/30 dark:bg-slate-950/40">
              <div className="overflow-x-auto w-full border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/10">
                <div className="max-h-[40vh] overflow-y-auto relative scrollbar-custom">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 sticky top-0 backdrop-blur z-20">
                        <th className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold w-12 text-center bg-slate-100/90 dark:bg-slate-900/90">
                          #
                        </th>
                        <th className="px-4 py-3 text-rose-600 dark:text-rose-400 font-bold bg-slate-100/90 dark:bg-slate-900/90 whitespace-nowrap min-w-[200px]">
                          SKIP REASON
                        </th>
                        {skippedCsvHeaders.map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider font-mono whitespace-nowrap bg-slate-100/90 dark:bg-slate-900/90"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/40">
                      {skipped.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors duration-150"
                        >
                          <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-medium text-center bg-slate-50/50 dark:bg-slate-950/20 whitespace-nowrap">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-semibold whitespace-normal max-w-sm">
                            {item.reason}
                          </td>
                          {skippedCsvHeaders.map((header) => {
                            const val = item.row[header];
                            const isEmpty = val === undefined || val === null || val.trim() === "";
                            return (
                              <td
                                key={header}
                                className={`px-4 py-3 font-mono whitespace-nowrap max-w-[250px] truncate ${
                                  isEmpty ? "text-slate-400 italic font-sans dark:text-slate-600" : "text-slate-600 dark:text-slate-400"
                                }`}
                                title={val || ""}
                              >
                                {isEmpty ? "empty" : val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
