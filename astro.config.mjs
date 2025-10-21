// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()], 
      assetsInclude: ['**/*.glb'],
  },
    site: 'https://jacksonlevine.github.io',
    base: '/cpt',
});
