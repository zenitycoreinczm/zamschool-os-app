"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseQueryState, toQueryString } from "./list-query-state";

type ListPatch = Partial<{ page: number; pageSize: number; q: string; status: string }>;

export function useListQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsed = parseQueryState(searchParams);

  const updateQuery = (patch: ListPatch) => {
    const next = { ...parsed, ...patch };
    router.push(`${pathname}${toQueryString(next)}`);
  };

  return {
    ...parsed,
    updateQuery,
  };
}
