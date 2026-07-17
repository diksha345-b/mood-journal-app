import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // lets `npm run dev` hit the same /api/analyze path the deployed app uses
      "/api": "http://localhost:3000",
    },
  },
});
