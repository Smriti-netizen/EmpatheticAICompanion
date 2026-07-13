const DEFAULT_API_URL = "http://127.0.0.1:8000";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export const appConfig = {
  apiBaseUrl: trimTrailingSlash(
    import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_URL,
  ),
} as const;
