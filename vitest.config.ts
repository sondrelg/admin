import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

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
			"~": `${import.meta.dirname}/src`,
		},
		conditions: ["development", "browser"],
	},
});
