"use client";

import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { RawCsvRow } from "@/types/crm";

interface UploadZoneProps {
  onFileReady: (rows: RawCsvRow[]) => void;
}

type DragState = "idle" | "dragging" | "success";

export default function UploadZone({ onFileReady }: UploadZoneProps) {
  const [dragState, setDragState] = useState<DragState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragState("dragging");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragState("idle");
  };

  const processFile = (file: File) => {
    setError(null);
    setRowCount(null);

    // Validate type
    const isCsv = file.name.endsWith(".csv") || file.type === "text/csv";
    if (!isCsv) {
      setError("Only CSV files (.csv) are accepted.");
      setDragState("idle");
      return;
    }

    if (file.size === 0) {
      setError("The selected file is empty.");
      setDragState("idle");
      return;
    }

    setDragState("success");

    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          console.warn("PapaParse warnings/errors:", results.errors);
        }

        const data = results.data;
        if (!data || data.length === 0) {
          setError("No rows could be parsed from this CSV file.");
          setDragState("idle");
          return;
        }

        setRowCount(data.length);
        // Delay slightly for visual feedback before transitioning
        setTimeout(() => {
          onFileReady(data);
        }, 800);
      },
      error: (parseError) => {
        setError(`Failed to parse CSV file: ${parseError.message}`);
        setDragState("idle");
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed rounded-2xl p-8 transition-all duration-300 backdrop-blur-sm cursor-pointer ${
          dragState === "dragging"
            ? "border-violet-500 bg-violet-50/50 dark:bg-violet-500/10 scale-[1.01]"
            : dragState === "success"
            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10"
            : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
        }`}
        onClick={triggerFileSelect}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />

        <div className="flex flex-col items-center text-center">
          {dragState === "success" ? (
            <>
              {/* Success State */}
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 animate-bounce">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-8 h-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                File loaded successfully!
              </h3>
              {rowCount !== null && (
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  {rowCount} {rowCount === 1 ? "row" : "rows"} detected
                </p>
              )}
            </>
          ) : (
            <>
              {/* Idle or Dragging State */}
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
                  dragState === "dragging"
                    ? "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={`w-8 h-8 ${dragState === "dragging" ? "animate-pulse" : ""}`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">
                {dragState === "dragging"
                  ? "Drop your CSV file here"
                  : "Drag and drop your CRM CSV file"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Only .csv files are supported. Maximum size 10MB.
              </p>

              <button
                type="button"
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-200 hover:scale-[1.02]"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileSelect();
                }}
              >
                Browse Files
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-600 dark:text-rose-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 mt-0.5 flex-shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <div>
            <p className="font-semibold text-sm">Upload Error</p>
            <p className="text-xs text-rose-500 dark:text-rose-400/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
