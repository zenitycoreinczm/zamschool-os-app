export function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseQueryState(params: URLSearchParams) {
  return {
    page: parsePositiveInt(params.get("page"), 1),
    pageSize: parsePositiveInt(params.get("pageSize"), 10),
    q: (params.get("q") || "").trim(),
    status: (params.get("status") || "").trim(),
  };
}

export function toQueryString(next: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (next.page && next.page > 1) params.set("page", String(next.page));
  if (next.pageSize && next.pageSize !== 10) params.set("pageSize", String(next.pageSize));
  if (next.q) params.set("q", next.q);
  if (next.status) params.set("status", next.status);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function computeRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}
