export const BASE_URL = import.meta.env.VITE_API_URL ?? "";

const TENANT_HEADER = "X-Tenant-ID";
const COMPANY_HEADER = "X-Company-ID";
const IDEMPOTENCY_HEADER = "Idempotency-Key";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let currentTenantId: string | null = null;
let currentCompanyId: string | null = null;

export function setTenantId(id: string | null) {
	currentTenantId = id;
}

export function getTenantId(): string | null {
	return currentTenantId;
}

export function setCompanyId(id: string | null) {
	currentCompanyId = id;
}

export function getCompanyId(): string | null {
	return currentCompanyId;
}

export function resolveApiUrl(url: string): string {
	return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

export function shouldAttachIdempotencyKey(method: string, body: BodyInit | null): boolean {
	return MUTATING_METHODS.has(method.toUpperCase()) && body !== null;
}

export function getTenantHeaderName(): string {
	return TENANT_HEADER;
}

export function getCompanyHeaderName(): string {
	return COMPANY_HEADER;
}

export function getIdempotencyHeaderName(): string {
	return IDEMPOTENCY_HEADER;
}

export function generateUuidV4(): string {
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
