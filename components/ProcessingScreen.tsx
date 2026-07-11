"use client";

import React from "react";

interface ProcessingScreenProps {
  current: number;
  total: number;
  error: string | null;
}

export default function ProcessingScreen({ current, total, error }: ProcessingScreenProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center py-12 px-6">
      {/* Glow Effect Backing */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-violet-600/10 dark:bg-violet-600/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Circular Progress Ring */}
      <div className="relative flex items-center justify-center mb-8">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
          {/* Background track */}
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            strokeWidth="6"
            className="stroke-slate-200 dark:stroke-slate-800"
          />
          {/* Progress arc */}
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className="stroke-violet-500"
            style={{
              strokeDasharray: `${2 * Math.PI * 40}`,
              strokeDashoffset: `${2 * Math.PI * 40 * (1 - percentage / 100)}`,
              transition: "stroke-dashoffset 0.6s ease-out",
            }}
          />
        </svg>
        <div className="absolute font-semibold text-sm text-slate-700 dark:text-slate-300 font-mono">
          {percentage}%
        </div>
      </div>

      {/* Status Titles */}
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Importing CRM Records</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm text-center max-w-sm mb-8 leading-relaxed">
        AI is parsing, mapping, and validating your CSV data. Please keep this browser window open.
      </p>

      {/* Progress Bar container */}
      <div className="w-full space-y-3">
        <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Processing batch {current} of {total}</span>
          <span className="font-mono">{current}/{total} batches</span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-3 bg-slate-200/60 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800 rounded-full overflow-hidden p-[2px]">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500 ease-out shadow-lg shadow-violet-500/20"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Non-blocking error alerts */}
      {error && (
        <div className="mt-8 w-full p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-700 dark:text-amber-400 animate-pulse">
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
            <p className="font-semibold text-sm">Processing Alert</p>
            <p className="text-xs text-amber-600 dark:text-amber-400/90 mt-0.5">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
