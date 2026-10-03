import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const apiProxy = {
  "/api": {
    target: "http://localhost:8080",
    changeOrigin: true,
    secure: false,
  },
};

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: ["favicon.svg", "apple-touch-icon.png"],

      manifest: {
        id: "/",
        name: "Collabry",
        short_name: "Collabry",
        description: "Every brand deal. One clean inbox.",

        /* Installed app seedha dashboard pe khulega, landing pe nahi.
           Apna sahi route rakho (/inbox ya /dashboard). */
        start_url: "/dashboard",
        scope: "/",

        display: "standalone",
        orientation: "any",
        background_color: "#0f0b1e",
        theme_color: "#0f0b1e",
        categories: ["productivity", "business"],

        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        /* API aur socket kabhi service worker se nahi guzarne chahiye,
           warna purani mails dikhengi */
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],

  server: {
    port: 5173,
    proxy: apiProxy,
  },

  /* npm run preview bhi 5173 pe chale, taaki CORS / CLIENT_URL na toote */
  preview: {
    port: 5173,
    proxy: apiProxy,
  },
});