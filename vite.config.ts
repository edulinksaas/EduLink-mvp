import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite는 기본적으로 SPA 라우팅을 지원하므로 historyApiFallback 설정이 필요 없습니다.
  // server.historyApiFallback은 Vite의 유효한 옵션이 아닙니다.
  // React Router의 BrowserRouter를 사용하는 경우, Vite가 자동으로 처리합니다.
})
