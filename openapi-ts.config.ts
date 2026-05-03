import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
	input: "../backend/openapi.json",
	output: {
		path: "src/api/generated",
	},
	parser: {
		filters: {
			tags: {
				include: ["admin"],
			},
		},
	},
	plugins: [
		{
			name: "@hey-api/typescript",
		},
		{
			name: "@hey-api/sdk",
		},
		{
			name: "@hey-api/client-fetch",
			runtimeConfigPath: "./src/api/hey-api.ts",
		},
	],
});
