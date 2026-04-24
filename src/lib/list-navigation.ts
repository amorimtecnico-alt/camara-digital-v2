export type SearchParamValue = string | string[] | undefined;
export type SearchParamsRecord = Record<string, SearchParamValue>;

function getPathnameAndQuery(path: string) {
  const [pathname, query = ""] = path.split("?");
  return { pathname: pathname ?? "", query };
}

export function getSearchParam(searchParams: SearchParamsRecord, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getTrimmedSearchParam(searchParams: SearchParamsRecord, key: string) {
  const value = getSearchParam(searchParams, key)?.trim();
  return value ? value : undefined;
}

export function buildPathWithParams(pathname: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function appendStatusMessage(path: string, type: "error" | "success", message: string) {
  const { pathname, query } = getPathnameAndQuery(path);
  const searchParams = new URLSearchParams(query);

  searchParams.delete(type === "error" ? "success" : "error");
  searchParams.set(type, message);

  const nextQuery = searchParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function resolveReturnTo(
  value: FormDataEntryValue | string | null | undefined,
  fallbackPath: string,
) {
  const parsed = typeof value === "string" ? value.trim() : "";

  if (!parsed.startsWith("/") || parsed.startsWith("//")) {
    return fallbackPath;
  }

  return parsed;
}
