"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, BookMarked, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LibraryHeader() {
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="border-b border-zinc-200 bg-white px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Title row */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-200">
            <BookMarked className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 sm:text-2xl">
              Academic Library
            </h1>
            <p className="text-xs text-zinc-500">
              Notes · Research Papers · Authors
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 backdrop-blur-sm transition focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/15">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, papers, and authors…"
              className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setQuery("")}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setFilterOpen((f) => !f)}
            aria-label="Toggle filters"
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              filterOpen
                ? "border-blue-500/50 bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Filter drawer */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex flex-wrap gap-2 pt-1">
                {[
                  {
                    label: "Subject",
                    opts: [
                      "All",
                      "Physics",
                      "Mathematics",
                      "Computer Science",
                      "Chemistry",
                      "Biology",
                    ],
                  },
                  {
                    label: "Type",
                    opts: [
                      "All Types",
                      "Lecture Notes",
                      "Research Paper",
                      "Formula Sheet",
                      "Past Paper",
                    ],
                  },
                  {
                    label: "Sort by",
                    opts: [
                      "Most Relevant",
                      "Highest Rated",
                      "Most Downloaded",
                      "Newest",
                    ],
                  },
                ].map(({ label, opts }) => (
                  <div key={label} className="relative">
                    <select
                      className="appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-3 pr-7 text-xs text-zinc-700 transition focus:border-blue-500/50 focus:outline-none"
                      defaultValue={opts[0]}
                    >
                      {opts.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                      ▾
                    </span>
                  </div>
                ))}

                <button
                  onClick={() => setFilterOpen(false)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
