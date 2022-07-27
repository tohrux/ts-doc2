import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import prismjs from 'vite-plugin-prismjs'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    prismjs({
      languages: 'all',
      plugins: ['line-numbers'], //配置显示行号插件
      theme: 'okaidia', //主题名称
      css: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  base: './',
  server: {
    open: true,
    cors: true,
    port: 4869,
  },
  build: {
    outDir: resolve(process.cwd(), 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1024,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          prettier: ['prettier'],
        },
      },
    },
  },
})
