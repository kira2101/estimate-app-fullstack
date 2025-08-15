import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Разрешает Vite слушать все сетевые интерфейсы
    port: 5173, // Стандартный порт Vite
    allowedHosts: [
      '2d504e224bd7.ngrok-free.app', // Ваш ngrok-хост
      'localhost', // Для локального тестирования
      '127.0.0.1', // Для локального тестирования
    ],
  },
})
