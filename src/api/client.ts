export const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const TENANT_HEADER = "X-Tenant-ID";
const IDEMPOTENCY_HEADER = "Idempotency-Key";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let currentTenantId: string | null = null;
export function setTenantId(id: string | null) {
	currentTenantId = id;
}

export function getTenantId(): string | null {
	return currentTenantId;
}

function generateUuidV4(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	const bytes = new Uint8Array(16);
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < bytes.length; i += 1) {
			bytes[i] = Math.floor(Math.random() * 256);
		}
	}

	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
	return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

export function resolveApiUrl(url: string): string {
	return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 100;

function shouldRetry(status: number, method: string, hasIdempotencyKey: boolean): boolean {
	if (status === 0) return true;
	if (status >= 500 && status < 600) return true;
	if (status === 429) return true;
	if (status >= 400 && status < 500) return false;

	const isIdempotent = ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"].includes(method);
	const isSafePost = method === "POST" && hasIdempotencyKey;

	return isIdempotent || isSafePost;
}

function calculateRetryDelay(attempt: number, retryAfterMs?: number): number {
	if (retryAfterMs) return retryAfterMs;
	const baseDelay = INITIAL_RETRY_DELAY_MS * 2 ** attempt;
	const jitter = baseDelay * 0.25 * Math.random();
	return baseDelay + jitter;
}

function parseRetryAfter(retryAfter: string | null | undefined): number | undefined {
	if (!retryAfter) return undefined;
	const seconds = Number.parseInt(retryAfter, 10);
	if (!Number.isNaN(seconds)) return seconds * 1000;
	const date = new Date(retryAfter);
	if (!Number.isNaN(date.getTime())) return Math.max(0, date.getTime() - Date.now());
	return undefined;
}

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
	const fullUrl = resolveApiUrl(url);
	const headers = new Headers(options?.headers);
	// Let the browser set Content-Type for FormData (includes multipart boundary)
	if (!(options?.body instanceof FormData)) {
		headers.set("Content-Type", "application/json");
	}

	if (currentTenantId) {
		headers.set(TENANT_HEADER, currentTenantId);
	}

	const method = (options?.method ?? "GET").toUpperCase();
	if (MUTATING_METHODS.has(method) && !headers.has(IDEMPOTENCY_HEADER)) {
		headers.set(IDEMPOTENCY_HEADER, generateUuidV4());
	}

	const hasIdempotencyKey = headers.has(IDEMPOTENCY_HEADER);

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

		let response: Response | null = null;
		let status = 0;
		let isTimeout = false;
		let isNetworkError = false;

		try {
			response = await fetch(fullUrl, {
				...options,
				headers,
				credentials: "include",
				signal: controller.signal,
			});
			status = response.status;
		} catch (error) {
			clearTimeout(timeoutId);
			if (error instanceof Error && error.name === "AbortError") {
				isTimeout = true;
				status = 0;
			} else {
				isNetworkError = true;
				status = 0;
			}
		} finally {
			clearTimeout(timeoutId);
		}

		const isLastAttempt = attempt === MAX_RETRIES;
		const canRetry = shouldRetry(status, method, hasIdempotencyKey);

		if (!canRetry || isLastAttempt || response?.ok) {
			if (isTimeout) {
				return {
					data: {
						code: "timeout",
						message: "Request timed out. Is the server running?",
					},
					status: 0,
					headers: new Headers(),
				} as T;
			}

			if (isNetworkError) {
				return {
					data: {
						code: "network_error",
						message: "Unable to connect to server",
					},
					status: 0,
					headers: new Headers(),
				} as T;
			}

			if (!response) {
				return {
					data: { code: "unknown_error", message: "No response received" },
					status: 0,
					headers: new Headers(),
				} as T;
			}

			if (response.status === 204) {
				return {
					data: undefined,
					status: response.status,
					headers: response.headers,
				} as T;
			}

			const data = await response.json().catch(() => ({
				code: "unknown_error",
				message: response.statusText,
			}));

			return {
				data,
				status: response.status,
				headers: response.headers,
			} as T;
		}

		const retryAfterHeader = response?.headers.get("Retry-After");
		const retryAfterMs = parseRetryAfter(retryAfterHeader);
		const delay = calculateRetryDelay(attempt, retryAfterMs);

		await sleep(delay);
	}

	return {
		data: { code: "unknown_error", message: "Max retries exceeded" },
		status: 0,
		headers: new Headers(),
	} as T;
}
