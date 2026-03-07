"use client";

import { Suspense } from "react";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  Filter,
  Loader2,
  School,
  Search,
  SlidersHorizontal,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import {
  globalSearch,
  type SearchResults,
  type SearchUser,
  type SearchMaterial,
  type SearchGroup,
  getAllUsers,
} from "@/lib/social";

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type Filter = "all" | "users" | "materials" | "groups";

const FILTERS: { key: Filter; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "All", icon: Search },
  { key: "users", label: "Users", icon: Users },
  { key: "materials", label: "Materials", icon: BookOpen },
  { key: "groups", label: "Groups", icon: School },
];

// ─── Avatar circle ────────────────────────────────────────────────────────────

function Avatar({
  src,
  name,
  size = 36,
  colorClass = "from-blue-500 to-indigo-600",
}: {
  src?: string | null;
  name: string;
  size?: number;
  colorClass?: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const px = `${size}px`;
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={{ width: px, height: px }}
        className="rounded-full object-cover shrink-0"
      />
    );
  return (
    <div
      style={{ width: px, height: px }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br ${colorClass} text-xs font-bold text-white`}
    >
      {initials}
    </div>
  );
}

// ─── Result cards ─────────────────────────────────────────────────────────────

function UserCard({ user }: { user: SearchUser }) {
  const name = user.display_name ?? `User ${user.id.slice(0, 6)}`;
  return (
    <Link href={`/users/${user.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="ax-card group flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--ax-surface-2)]"
      >
        <Avatar src={user.avatar_url} name={name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition">
            {name}
          </p>
          <p className="text-xs text-slate-500">
            {user.username ? `@${user.username}` : "View profile"}
          </p>
        </div>
        <UserCircle className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-blue-400 transition" />
      </motion.div>
    </Link>
  );
}

function MaterialCard({ material }: { material: SearchMaterial }) {
  return (
    <a href={material.file_url} target="_blank" rel="noopener noreferrer">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="ax-card group flex items-start gap-4 px-4 py-4 transition hover:bg-[var(--ax-surface-2)]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
          <BookOpen className="h-5 w-5 text-amber-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-200 group-hover:text-amber-400 transition">
            {material.title}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 flex-wrap">
            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-amber-500/80">{material.subject}</span>
            <span>·</span>
            <span>{new Date(material.created_at).toLocaleDateString()}</span>
            {material.downloads_count !== undefined && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {material.downloads_count}
                </span>
              </>
            )}
            {material.views_count !== undefined && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {material.views_count}
                </span>
              </>
            )}
          </div>
          {material.summary && <p className="mt-2 text-xs leading-relaxed text-slate-400 line-clamp-2">{material.summary}</p>}
        </div>
        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 group-hover:text-amber-500 transition" />
      </motion.div>
    </a>
  );
}

function GroupCard({ group }: { group: SearchGroup }) {
  return (
    <Link href="/campus">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="ax-card group flex items-center gap-4 px-4 py-3 transition hover:bg-[var(--ax-surface-2)]"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-inner"
          style={{ backgroundColor: group.avatar_color || "#10b981" }}
        >
          {group.avatar_initials?.slice(0, 2).toUpperCase() || "GR"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition">
            {group.name}
          </p>
          <p className="truncate text-xs text-slate-500">
            {group.member_count} member{group.member_count !== 1 ? "s" : ""}
            {group.description ? ` · ${group.description}` : ""}
          </p>
        </div>
        <School className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-emerald-500 transition" />
      </motion.div>
    </Link>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  count,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  count: number;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <h2 className="text-sm font-bold text-slate-200">{title}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${color} bg-current/10`}
        >
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<"relevance" | "popular" | "newest">("relevance");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Pagination for users when query is empty
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const runSearch = useCallback(async (q: string, flt: Filter) => {
    if (!q.trim()) {
      if (flt === "users" || flt === "all") {
        setLoading(true);
        setSearched(true);
        try {
          const { users, total } = await getAllUsers(1, 8);
          setResults({ users, materials: [], groups: [] });
          setPage(1);
          setTotalUsers(total);
        } catch {
          setResults({ users: [], materials: [], groups: [] });
          setTotalUsers(0);
        } finally {
          setLoading(false);
        }
      } else {
        setResults(null);
        setSearched(false);
        setTotalUsers(0);
      }
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const r = await globalSearch(q);
      setResults(r);
      setTotalUsers(0);
    } catch {
      setResults({ users: [], materials: [], groups: [] });
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger on URL param change (e.g. from header search)
  useEffect(() => {
    if (initialQ) {
      setQuery(initialQ);
      runSearch(initialQ, filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function goToPage(targetPage: number) {
    if (loadingMore || targetPage === page) return;
    setLoadingMore(true);
    try {
      const { users, total } = await getAllUsers(targetPage, 8);
      setResults((prev) => {
        setTotalUsers(total);
        return {
          users,
          materials: prev?.materials ?? [],
          groups: prev?.groups ?? [],
        };
      });
      setPage(targetPage);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }

  function handleChange(val: string) {
    setQuery(val);

    // Auto-swap filter from 'Users' back to 'All' if they start typing a custom query
    const activeFilter = (filter === "users" && val.trim() !== "") ? "all" : filter;
    if (filter === "users" && val.trim() !== "") {
      setFilter("all");
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.replace(`/search?q=${encodeURIComponent(val)}`, { scroll: false });
      runSearch(val, activeFilter);
    }, 350);
  }

  function handleClear() {
    setQuery("");
    setResults(null);
    setSearched(false);
    router.replace("/search", { scroll: false });
    inputRef.current?.focus();
  }

  const total = results
    ? results.users.length + results.materials.length + results.groups.length
    : 0;

  const showUsers = filter === "all" || filter === "users";
  const showMaterials = filter === "all" || filter === "materials";
  const showGroups = filter === "all" || filter === "groups";

  const sortedUsers = [...(results?.users ?? [])];
  const sortedMaterials = [...(results?.materials ?? [])];
  const sortedGroups = [...(results?.groups ?? [])];

  if (sortBy === "popular") {
    // Sort materials by total interactions
    sortedMaterials.sort((a, b) => ((b.downloads_count ?? 0) + (b.views_count ?? 0)) - ((a.downloads_count ?? 0) + (a.views_count ?? 0)));
    // Sort groups by members
    sortedGroups.sort((a, b) => b.member_count - a.member_count);
  } else if (sortBy === "newest") {
    // Sort materials by creation date
    sortedMaterials.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Page header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/dashboard" className="transition hover:text-slate-300">
            Academix
          </Link>
          <span>/</span>
          <span className="text-slate-400">Search</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Search</h1>
        <p className="mt-1 text-sm text-slate-500">
          Find users, study materials, and campus groups.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Sidebar Filters — collapsible on mobile */}
        <div className="w-full md:w-64 shrink-0">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex md:hidden w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors mb-3"
            style={{ border: "1px solid var(--ax-border)", background: "var(--ax-surface-2)", color: "var(--ax-text-primary)" }}
            aria-expanded={filtersOpen}
            aria-label="Toggle filters">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" style={{ color: "var(--ax-text-faint)" }} />
              Filters & Sort
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
              style={{ color: "var(--ax-text-faint)" }} />
          </button>
          <div className={`space-y-6 overflow-hidden transition-all duration-300 ${filtersOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 md:max-h-[500px] md:opacity-100"}`}>
            {/* Content Type Filter */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Content Type
              </h3>
              <div className="flex flex-col gap-1.5">
                {FILTERS.map(({ key, label, icon: Icon }) => {
                  const cnt =
                    key === "all"
                      ? total
                      : key === "users"
                        ? (results?.users.length ?? 0)
                        : key === "materials"
                          ? (results?.materials.length ?? 0)
                          : (results?.groups.length ?? 0);
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setFilter(key);
                        runSearch(query, key);
                      }}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${filter === key
                        ? "bg-blue-600/15 text-blue-400"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{label}</span>
                      {searched && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${filter === key ? "bg-blue-500/20 text-blue-300" : "bg-slate-800 text-slate-500"
                            }`}
                        >
                          {cnt}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Placeholder for future Subject / Sort filters */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Sort By
              </h3>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => setSortBy("relevance")} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${sortBy === "relevance" ? "bg-blue-600/15 text-blue-400" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}>
                  <span className="flex-1 text-left">Relevance</span>
                </button>
                <button onClick={() => setSortBy("popular")} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${sortBy === "popular" ? "bg-amber-600/15 text-amber-400" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}>
                  <span className="flex-1 text-left">Most Popular</span>
                </button>
                <button onClick={() => setSortBy("newest")} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${sortBy === "newest" ? "bg-emerald-600/15 text-emerald-400" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}>
                  <span className="flex-1 text-left">Newest</span>
                </button>
              </div>
            </div>
          </div>{/* /collapsible wrapper */}
        </div>{/* /sidebar */}

        {/* Main Content */}
        <div className="flex-1">
          {/* Search input with typeahead hint */}
          <div className="relative mb-6 z-10">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Search users, materials, groups… (Hint: Try 'math')"
              className="ax-focus-ring relative z-10 h-12 sm:h-14 w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 pl-12 pr-16 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 shadow-inner"
            />
            {/* Keyboard shortcut hint */}
            <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 items-center gap-2">
              {query ? (
                <button
                  onClick={handleClear}
                  className="rounded-full bg-slate-800 p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <div className="hidden items-center gap-1 sm:flex text-slate-500">
                  <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs font-medium">⌘</kbd>
                  <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs font-medium">K</kbd>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-20"
              >
                <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              </motion.div>
            )}

            {!loading && !searched && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-20 text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
                  <Search className="h-6 w-6 text-slate-600" />
                </div>
                <p className="text-base font-semibold text-slate-400">
                  Start searching
                </p>
                <p className="max-w-xs text-sm text-slate-600">
                  Type anything to search across users, study materials, and campus
                  groups.
                </p>
              </motion.div>
            )}

            {!loading && searched && total === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-20 text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
                  <Search className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-base font-semibold text-slate-400">
                  No results found
                </p>
                <p className="text-sm text-slate-600">
                  Try a different search term or filter.
                </p>
              </motion.div>
            )}

            {!loading && results && total > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-7"
              >
                {/* Users */}
                {showUsers && sortedUsers.length > 0 && (
                  <Section
                    title="Users"
                    count={sortedUsers.length}
                    icon={Users}
                    color="text-blue-400"
                  >
                    {sortedUsers.map((u) => (
                      <UserCard key={u.id} user={u} />
                    ))}
                    {totalUsers > 8 && !query.trim() && (
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        {Array.from({ length: Math.ceil(totalUsers / 8) }).map((_, i) => {
                          const pageNum = i + 1;
                          const isActive = pageNum === page;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              disabled={loadingMore}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition ${isActive
                                ? "bg-blue-600 text-white"
                                : "bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                                } ${loadingMore ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              {isActive && loadingMore ? (
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                              ) : (
                                pageNum
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Section>
                )}

                {/* Materials */}
                {showMaterials && sortedMaterials.length > 0 && (
                  <Section
                    title="Study Materials"
                    count={sortedMaterials.length}
                    icon={BookOpen}
                    color="text-amber-400"
                  >
                    {sortedMaterials.map((m) => (
                      <MaterialCard key={m.id} material={m} />
                    ))}
                  </Section>
                )}

                {/* Groups */}
                {showGroups && sortedGroups.length > 0 && (
                  <Section
                    title="Campus Groups"
                    count={sortedGroups.length}
                    icon={School}
                    color="text-emerald-400"
                  >
                    {sortedGroups.map((g) => (
                      <GroupCard key={g.id} group={g} />
                    ))}
                  </Section>
                )}
                {/* Empty for current filter */}
                {((filter === "users" && (results?.users.length ?? 0) === 0) ||
                  (filter === "materials" && (results?.materials.length ?? 0) === 0) ||
                  (filter === "groups" && (results?.groups.length ?? 0) === 0)) && (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <Search className="h-6 w-6 text-slate-600" />
                      <p className="text-sm text-slate-500">
                        No {filter} found for &ldquo;{query}&rdquo;
                      </p>
                    </div>
                  )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div >
  );
}
