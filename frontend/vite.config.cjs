// vite.config.cjs
const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig({
  plugins: [
    react()
  ],
  // se você tiver outras configurações, adicione aqui
  server: {
    port: 5173,
    open: true,
  },
  resolve: {
    alias: {
      // Exemplo de alias, ajuste se precisar
      '@': __dirname + '/src',
    },
  },
})
