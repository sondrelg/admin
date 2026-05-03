import { BASE_URL } from "./client";
import type { CreateClientConfig } from "./generated/client.gen";

export const createClientConfig: CreateClientConfig = (config) => ({
	...config,
	baseUrl: BASE_URL,
	credentials: "include",
});
