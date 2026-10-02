import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    // Emulator suites only run under `firebase emulators:exec`, which sets FIRESTORE_EMULATOR_HOST.
    exclude: ['**/node_modules/**', '**/dist/**', ...(process.env.FIRESTORE_EMULATOR_HOST ? [] : ['**/emulator-*.test.ts'])],
  },
})
