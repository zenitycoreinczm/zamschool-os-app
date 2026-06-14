"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";

import { adminApiJson } from "@/lib/admin-browser-api";
import { ws } from "@/lib/workspace-design";
import {
  filterWorkspacePageItems,
  groupWorkspaceSearchResults,
  mergeWorkspaceSearchResults,
  WORKSPACE_SEARCH_DEBOUNCE_MS,
  WORKSPACE_SEARCH_MIN_QUERY,
  type WorkspaceSearchResult,
} from "@/lib/workspace-search";

type WorkspaceGlobalSearchProps = {
  pageItems: WorkspaceSearchResult[];
  placeholder?: string;
  className?: string;
};

export function WorkspaceGlobalSearch({
  pageItems,
  placeholder = "Search pages, people, classes, and more",
  className,
}: WorkspaceGlobalSearchProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState<WorkspaceSearchResult[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, WORKSPACE_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const query = debouncedQuery;
    if (query.length < WORKSPACE_SEARCH_MIN_QUERY) {
      // Reset search state synchronously when query is too short
      setRemoteResults([]); // eslint-disable-line react-hooks/set-state-in-effect
      setRemoteError(null); // eslint-disable-line react-hooks/set-state-in-effect
      setLoadingRemote(false); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoadingRemote(true);
    setRemoteError(null);

    void adminApiJson<{ data?: WorkspaceSearchResult[] }>(
      `/api/account/workspace-search?q=${encodeURIComponent(query)}`
    )
      .then((payload) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setRemoteResults(Array.isArray(payload?.data) ? payload.data : []);
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setRemoteResults([]);
        setRemoteError(error instanceof Error ? error.message : "Search failed");
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setLoadingRemote(false);
        }
      });
  }, [debouncedQuery]);

  const localPageMatches = useMemo(
    () => filterWorkspacePageItems(pageItems, searchQuery),
    [pageItems, searchQuery]
  );

  const mergedResults = useMemo(
    () => mergeWorkspaceSearchResults(localPageMatches, remoteResults, searchQuery),
    [localPageMatches, remoteResults, searchQuery]
  );

  const groupedResults = useMemo(() => groupWorkspaceSearchResults(mergedResults), [mergedResults]);

  const showDropdown = searchOpen && (searchQuery.trim().length > 0 || mergedResults.length > 0);

  const handleSelect = (href: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    setDebouncedQuery("");
    setRemoteResults([]);
    router.push(href);
  };

  return (
    <div
      ref={searchRef}
      className={className || `relative min-w-0 flex-1 max-w-[360px] ${ws.headerActions}`}
    >
      <div className="flex items-center gap-2 rounded-full border border-workspace-border bg-white px-3 py-2 shadow-workspace-xs transition-shadow focus-within:shadow-workspace-focus">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={searchQuery}
          placeholder={placeholder}
          onFocus={() => setSearchOpen(true)}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setSearchOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && mergedResults[0]) {
              handleSelect(mergedResults[0].href);
            }
            if (event.key === "Escape") {
              setSearchOpen(false);
            }
          }}
          className="w-full bg-transparent text-sm text-slate-600 outline-none"
          aria-label="Workspace search"
          aria-expanded={showDropdown}
          aria-controls="workspace-search-results"
          role="combobox"
          autoComplete="off"
        />
        {loadingRemote ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-300" /> : null}
      </div>

      {showDropdown ? (
        <div
          id="workspace-search-results"
          className={`absolute inset-x-0 top-full mt-2 overflow-hidden rounded-workspace-xl border border-workspace-border bg-white shadow-workspace-lg ${ws.popover}`}
        >
          <div className="border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Search results
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2">
            {remoteError ? (
              <div className="rounded-2xl px-3 py-3 text-sm text-amber-700">{remoteError}</div>
            ) : null}

            {mergedResults.length === 0 ? (
              <div className="rounded-2xl px-3 py-6 text-center text-sm text-slate-500">
                {debouncedQuery.length >= WORKSPACE_SEARCH_MIN_QUERY && loadingRemote
                  ? "Searching workspace…"
                  : debouncedQuery.length >= WORKSPACE_SEARCH_MIN_QUERY
                    ? "No matches found."
                    : "Type at least 2 characters to search people and records."}
              </div>
            ) : (
              groupedResults.map((group) => (
                <div key={group.kind} className="pb-1">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={`${item.kind}-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className="flex w-full items-start justify-between rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-400">{item.hint}</p>
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.12em] text-slate-300">Open</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}