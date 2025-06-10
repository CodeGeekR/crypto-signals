import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://cryptosenales.com',
  output: 'server',
  adapter: netlify(),
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
  ],
  // 🚀 Optimizaciones SEO adicionales
  compressHTML: true,
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const extType = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `images/[name]-[hash][extname]`;
            }
            if (/css/i.test(extType)) {
              return `styles/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
    },
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },
});