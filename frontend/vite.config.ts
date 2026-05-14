import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/readings': 'http://127.0.0.1:3000',
	   //'/readings': 'http://192.168.1.X:3000', // IP komputera w sieci lokalnej przy 0.0.0.0
    }
  }
})

//zamienic na 0.0.0.0