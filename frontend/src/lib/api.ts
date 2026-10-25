// API client for the Elysian backend.
//
// Auth travels as HTTP-only cookies (access: 15 min, path=/; refresh: 7 days,
// path=/api/auth), so every request sends credentials. A 401 triggers exactly
// one refresh round-trip against the path-scoped cookie, then the original
// request is replayed. All responses use the backend envelope
// { success, message, data } and are unwrapped here, so callers receive `data`
// directly or a thrown ApiError.

export const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly code?: string,
        readonly details?: Array<{ path: string; message: string }>,
    ) {
        super(message);
        this.name = "ApiError";
    }

    /** Field-level validation errors keyed by path, for form display. */
    get fieldErrors(): Record<string, string> {
        const map: Record<string, string> = {};
        for (const d of this.details ?? []) {
            if (d.path && !map[d.path]) map[d.path] = d.message;
        }
        return map;
    }
}

type Envelope<T> = {
    success: boolean;
    message: string;
    data: T;
    code?: string;
    details?: Array<{ path: string; message: string }>;
};

interface RequestOptions extends Omit<RequestInit, "body"> {
    body?: unknown;
    /** Skip the automatic refresh-and-retry (used by auth calls themselves). */
    noRetry?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

const attemptRefresh = async (): Promise<boolean> => {
    // Single-flight: parallel 401s share one refresh round-trip.
    if (!refreshInFlight) {
        refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: "{}",
        })
            .then((r) => r.ok)
            .catch(() => false)
            .finally(() => {
                // Release the latch after this wave settles so a later
                // expiry can refresh again.
                setTimeout(() => {
                    refreshInFlight = null;
                }, 0);
            });
    }
    return refreshInFlight;
};

export async function apiFetch<T = unknown>(
    path: string,
    options: RequestOptions = {},
): Promise<T> {
    const { body, noRetry, headers, ...rest } = options;

    const request = () =>
        fetch(`${API_BASE}${path}`, {
            ...rest,
            credentials: "include",
            headers: {
                ...(body !== undefined && !(body instanceof FormData)
                    ? { "content-type": "application/json" }
                    : {}),
                ...headers,
            },
            body:
                body === undefined
                    ? undefined
                    : body instanceof FormData
                      ? body
                      : JSON.stringify(body),
        });

    let response = await request();

    if (response.status === 401 && !noRetry) {
        const refreshed = await attemptRefresh();
        if (refreshed) response = await request();
    }

    let payload: Envelope<T> | null = null;
    try {
        payload = (await response.json()) as Envelope<T>;
    } catch {
        // Non-JSON body (proxy error page, network hiccup).
    }

    if (!response.ok || !payload?.success) {
        throw new ApiError(
            payload?.message ?? `Request failed (${response.status})`,
            response.status,
            payload?.code,
            payload?.details,
        );
    }

    return payload.data as T;
}

/** Convenience verbs. Paths never include the leading `/api` prefix. */
export const api = {
    get: <T>(path: string, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: "GET" }),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        apiFetch<T>(path, { ...options, method: "POST", body }),
    patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        apiFetch<T>(path, { ...options, method: "PATCH", body }),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
        apiFetch<T>(path, { ...options, method: "PUT", body }),
    delete: <T>(path: string, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: "DELETE" }),
};

/** Build a query string from a params object, dropping empty values. */
export const qs = (params: Record<string, string | number | boolean | undefined | null>): string => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === "") continue;
        search.set(key, String(value));
    }
    const out = search.toString();
    return out ? `?${out}` : "";
};
