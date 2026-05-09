import {
	getCompanyHeaderName,
	getCompanyId,
	getTenantHeaderName,
	getTenantId,
	resolveApiUrl,
} from "./client";

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
	const fullUrl = resolveApiUrl(url);
	const headers = new Headers(options?.headers);

	if (options?.body !== undefined && options.body !== null && !(options.body instanceof FormData)) {
		headers.set("Content-Type", "application/json");
	}

	const tenantId = getTenantId();
	if (tenantId) {
		headers.set(getTenantHeaderName(), tenantId);
	}

	const companyId = getCompanyId();
	if (companyId) {
		headers.set(getCompanyHeaderName(), companyId);
	}

	try {
		const response = await fetch(fullUrl, {
			...options,
			headers,
			credentials: "include",
		});

		const body = [204, 205, 304].includes(response.status) ? null : await response.text();
		let data: unknown;
		if (body) {
			try {
				data = JSON.parse(body);
			} catch {
				data = { code: "unknown_error", message: response.statusText };
			}
		}

		return {
			data,
			status: response.status,
			headers: response.headers,
		} as T;
	} catch {
		return {
			data: { code: "network_error", message: "Unable to connect to server" },
			status: 0,
			headers: new Headers(),
		} as T;
	}
}
