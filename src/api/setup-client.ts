import {
	generateUuidV4,
	getCompanyHeaderName,
	getCompanyId,
	getIdempotencyHeaderName,
	getTenantHeaderName,
	getTenantId,
	shouldAttachIdempotencyKey,
} from "./client";
import { client } from "./generated/client.gen";

let initialized = false;

export function setupApiClient() {
	if (initialized) return;
	initialized = true;

	client.interceptors.request.use((request) => {
		const headers = new Headers(request.headers);

		const tenantId = getTenantId();
		if (tenantId) {
			headers.set(getTenantHeaderName(), tenantId);
		}

		const companyId = getCompanyId();
		if (companyId) {
			headers.set(getCompanyHeaderName(), companyId);
		}

		if (
			shouldAttachIdempotencyKey(request.method, request.body) &&
			!headers.has(getIdempotencyHeaderName())
		) {
			headers.set(getIdempotencyHeaderName(), generateUuidV4());
		}

		return new Request(request, { headers });
	});
}
