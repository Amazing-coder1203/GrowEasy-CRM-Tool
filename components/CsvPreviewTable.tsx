"use client";

import React from "react";
import { RawCsvRow } from "@/types/crm";

interface CsvPreviewTableProps {
  rows: RawCsvRow[];
  onConfirm: () => void;
  onBack: () => void;
}

export default function CsvPreviewTable({ rows, onConfirm, onBack }: CsvPreviewTableProps) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-violet-500 dark:text-violet-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            CSV File Preview
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {rows.length} {rows.length === 1 ? "row" : "rows"} detected. Check headers and rows below before importing.
          </p>
        </div>

        <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm rounded-xl transition-all duration-200"
          >
            Upload different file
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            className="group relative px-6 py-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02]"
          >
            Confirm Import
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7-7m7 7H3"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm">
        <div className="overflow-x-auto w-full">
          <div className="max-h-[50vh] overflow-y-auto relative scrollbar-custom">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/80 sticky top-0 backdrop-blur z-20">
                  <th className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-semibold w-12 text-center bg-slate-100/90 dark:bg-slate-900/80">
                    #
                  </th>
                  {headers.map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider font-mono whitespace-nowrap bg-slate-100/90 dark:bg-slate-900/80"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/40">
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors duration-150"
                  >
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-medium text-center bg-slate-50/50 dark:bg-slate-950/20 whitespace-nowrap">
                      {idx + 1}
                    </td>
                    {headers.map((header) => {
                      const val = row[header];
                      const isEmpty = val === undefined || val === null || val.trim() === "";
                      return (
                        <td
                          key={header}
                          className={`px-4 py-3 font-mono whitespace-nowrap max-w-[280px] truncate ${
                            isEmpty ? "text-slate-400 italic font-sans dark:text-slate-600" : "text-slate-700 dark:text-slate-300"
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

      {/* Note about AI usage */}
      <div className="flex items-center gap-2 text-xs text-slate-500 px-2 justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-violet-500/80 flex-shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          Clicking Confirm Import will run AI mapping and validation on {rows.length} records.
        </span>
      </div>
    </div>
  );
}
