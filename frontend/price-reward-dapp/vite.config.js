// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'   // NEW: Tailwind v4+ plugin

export default defineConfig({
  plugins: [react(), tailwindcss()],   // Tailwind now integrated cleanly
})