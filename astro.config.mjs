import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
  ],
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      cssCodeSplit: false,
    },
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },
});