import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',                                   // relativní cesty k souborům: web funguje v kořeni domény i v podsložce (Vercel, GitHub Pages, jakýkoli statický hosting)
  plugins: [react()],
  build: {
    assetsDir: '',                      // plochý výstup: všechno vedle index.html, bez podsložek – hotový web přežije i nahrávací nástroj, který poškozuje vnořené cesty
    chunkSizeWarningLimit: 4000,        // svět (provincie, státy, hranice) je jeden velký JSON v balíčku
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.{js,jsx}'],
    setupFiles: ['test/setup.js'],
    testTimeout: 30000,
  },
});
