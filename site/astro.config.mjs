// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import expressiveCode from 'astro-expressive-code';

// https://astro.build/config
export default defineConfig({
  integrations: [
    expressiveCode()
  ],
  server: {
    host: '0.0.0.0',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
