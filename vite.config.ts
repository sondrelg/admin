import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import devtools from "solid-devtools/vite";

export default defineConfig({
  plugins: [tailwindcss(), devtools(), solid()],
  resolve: {
    alias: {
      "~": `${import.meta.dirname}/src`,
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8085",
        changeOrigin: true,
      },
    },
  },
});
