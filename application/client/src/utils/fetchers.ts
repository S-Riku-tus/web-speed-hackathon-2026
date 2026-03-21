import { gzip } from "pako";

// サーバー側でHTMLに注入されたプリロードデータキャッシュ
const _preloadCache: Record<string, unknown> =
  typeof window !== "undefined"
    ? (((window as unknown as Record<string, unknown>)["__PRELOAD_DATA__"] as Record<string, unknown>) ?? {})
    : {};

function consumePreloaded<T>(url: string): { found: true; data: T } | { found: false } {
  if (url in _preloadCache) {
    const data = _preloadCache[url] as T;
    delete _preloadCache[url];
    return { found: true, data };
  }
  return { found: false };
}

/** jQuery jqXHR の responseJSON に相当（認証エラー表示など既存呼び出し側との互換） */
export class FetchHttpError extends Error {
  readonly status: number;
  readonly responseJSON: unknown;

  constructor(status: number, responseJSON?: unknown) {
    super(`HTTP ${status}`);
    this.name = "FetchHttpError";
    this.status = status;
    this.responseJSON = responseJSON;
  }
}

async function parseJsonOrUndefined(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new FetchHttpError(res.status, await parseJsonOrUndefined(res));
  }
  return res.arrayBuffer();
}

export async function fetchJSON<T>(url: string): Promise<T> {
  const preloaded = consumePreloaded<T>(url);
  if (preloaded.found) {
    if (preloaded.data === null) {
      // null はサーバーサイドで「認証エラー/Not Found」を意味する
      throw Object.assign(new Error("Preload: null response"), { status: 401 });
    }
    return preloaded.data;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new FetchHttpError(res.status, await parseJsonOrUndefined(res));
  }
  return res.json() as Promise<T>;
}

export async function sendFile<T>(url: string, file: File): Promise<T> {
  const res = await fetch(url, {
    body: file,
    headers: {
      "Content-Type": "application/octet-stream",
    },
    method: "POST",
  });
  if (!res.ok) {
    throw new FetchHttpError(res.status, await parseJsonOrUndefined(res));
  }
  return res.json() as Promise<T>;
}

export async function sendJSON<T>(url: string, data: object): Promise<T> {
  const jsonString = JSON.stringify(data);
  const uint8Array = new TextEncoder().encode(jsonString);
  const compressed = gzip(uint8Array);

  const res = await fetch(url, {
    body: compressed,
    headers: {
      "Content-Encoding": "gzip",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!res.ok) {
    throw new FetchHttpError(res.status, await parseJsonOrUndefined(res));
  }
  return res.json() as Promise<T>;
}
