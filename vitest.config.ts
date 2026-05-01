import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";
import path from "node:path";

export default defineConfig({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- vite version mismatch between vitest and vite-plugin-solid
	// @ts-expect-error vite version mismatch
	plugins: [solidPlugin()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		passWithNoTests: true,
	},
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "./src"),
		},
		conditions: ["development", "browser"],
	},
});
