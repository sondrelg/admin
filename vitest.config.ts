import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";
import path from "node:path";

export default defineConfig({
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
