"use client";

import React, { useState, useEffect } from "react";
import UploadZone from "@/components/UploadZone";
import CsvPreviewTable from "@/components/CsvPreviewTable";
import ProcessingScreen from "@/components/ProcessingScreen";
import ImportResultsView from "@/components/ImportResultsView";
import { RawCsvRow, CrmRecord, SkippedRow } from "@/types/crm";

type AppState = "upload" | "preview" | "processing" | "results";

const CHUNK_SIZE = 25;

export default function Home() {
  const [appState, setAppState] = useState<AppState>("upload");
  const [rawRows, setRawRows] = useState<RawCsvRow[]>([]);
  const [importedRecords, setImportedRecords] = useState<CrmRecord[]>([]);
  const [skippedRows, setSkippedRows] = useState<SkippedRow[]>([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchError, setBatchError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load initial theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  // Synchronize theme with the HTML element and localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [theme]);

  const handleFileReady = (rows: RawCsvRow[]) => {
    setRawRows(rows);
    setAppState("preview");
  };

  const handleBackToUpload = () => {
    setRawRows([]);
    setAppState("upload");
  };

  const handleNewImport = () => {
    setRawRows([]);
    setImportedRecords([]);
    setSkippedRows([]);
    setBatchProgress({ current: 0, total: 0 });
    setBatchError(null);
    setAppState("upload");
  };

  const runImport = async () => {
    setAppState("processing");
    setBatchError(null);
    
    // Chunk rows
    const chunks: RawCsvRow[][] = [];
    for (let i = 0; i < rawRows.length; i += CHUNK_SIZE) {
      chunks.push(rawRows.slice(i, i + CHUNK_SIZE));
    }

    const totalBatches = chunks.length;
    setBatchProgress({ current: 0, total: totalBatches });

    const accumulatedImported: CrmRecord[] = [];
    const accumulatedSkipped: SkippedRow[] = [];

    for (let idx = 0; idx < totalBatches; idx++) {
      const currentBatchNum = idx + 1;
      setBatchProgress({ current: currentBatchNum, total: totalBatches });
      const chunk = chunks[idx];

      try {
        const response = await fetch("/api/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rows: chunk }),
        });

        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        // Accumulate records and skipped items
        if (data.imported && Array.isArray(data.imported)) {
          accumulatedImported.push(...data.imported);
        }
        if (data.skipped && Array.isArray(data.skipped)) {
          accumulatedSkipped.push(...data.skipped);
        }
      } catch (error: any) {
        console.error(`[runImport] Error in batch ${currentBatchNum}:`, error);
        
        const message = error.message || String(error);
        setBatchError(`Batch ${currentBatchNum} failed: ${message}. Continuing remaining batches...`);

        // Mark the entire chunk as skipped
        const batchSkipped: SkippedRow[] = chunk.map((row) => ({
          row,
          reason: `Batch processing request failed: ${message}`,
        }));
        accumulatedSkipped.push(...batchSkipped);
      }

      // Add a slight inter-batch delay to match backend recommendations 
      // (1000ms is standard for the API)
      if (currentBatchNum < totalBatches) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    setImportedRecords(accumulatedImported);
    setSkippedRows(accumulatedSkipped);
    setAppState("results");
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 font-sans">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/[0.03] dark:bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/[0.03] dark:bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Header / Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-violet-500/10 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <img
                src="/logo.png"
                alt="GrowEasy Logo"
                className="w-full h-full object-contain p-1.5"
              />
            </div>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-100 tracking-tight text-lg">
                GrowEasy
              </span>
              <span className="text-violet-600 dark:text-violet-400 font-medium ml-1 text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-400/10 border border-violet-200 dark:border-violet-400/20">
                CRM Importer
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors duration-200 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              aria-label="Toggle Theme"
            >
              {theme === "light" ? (
                // Moon Icon for switching to dark mode
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                  />
                </svg>
              ) : (
                // Sun Icon for switching to light mode
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v2.25m0 13.5V21m8.955-8.955h-2.25M4.045 12h-2.25m15.823-7.823l-1.59 1.59M5.232 18.768l-1.59 1.59m13.882 0l-1.59-1.59M6.822 6.822l-1.59-1.59M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z"
                  />
                </svg>
              )}
            </button>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Powered by Gemini AI Pipeline
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center py-12 px-6">
        {appState === "upload" && (
          <UploadZone onFileReady={handleFileReady} />
        )}
        
        {appState === "preview" && (
          <CsvPreviewTable
            rows={rawRows}
            onConfirm={runImport}
            onBack={handleBackToUpload}
          />
        )}
        
        {appState === "processing" && (
          <ProcessingScreen
            current={batchProgress.current}
            total={batchProgress.total}
            error={batchError}
          />
        )}
        
        {appState === "results" && (
          <ImportResultsView
            imported={importedRecords}
            skipped={skippedRows}
            onNewImport={handleNewImport}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} GrowEasy CRM Importer. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer">Privacy Policy</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
            <span className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
