import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "PLAWZA — A Digital Plaza for Everyone",
        short_name: "PLAWZA",
        description: "An open digital plaza where people discover places, businesses, products, services, and connect across Zambia.",
        theme_color: "#0B2D6B",
        background_color: "#0B2D6B",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        // Precache only the lightweight app shell & icons; lazy route chunks are cached on-demand via runtimeCaching so first load never downloads the whole app
        globPatterns: ["index.html", "favicon.svg", "icons/*.png"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(?:js|css)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "plawza-hashed-assets",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/(auth|rest|rpc)\/.*$/,
            handler: "NetworkOnly"
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-storage-images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    target: "es2022",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, "/");
          if (norm.includes("node_modules")) {
            if (
              norm.includes("/react/") ||
              norm.includes("/react-dom/") ||
              norm.includes("/react-router") ||
              norm.includes("/scheduler/")
            ) {
              return "vendor-react";
            }
            if (norm.includes("@supabase")) {
              return "vendor-supabase";
            }
            if (
              norm.includes("lucide-react") ||
              norm.includes("sonner") ||
              norm.includes("zustand")
            ) {
              return "vendor-ui";
            }
          }
          return undefined;
        }
      }
    }
  }
});
