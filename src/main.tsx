import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from '@/app/App.tsx'
import { useAppStore } from '@/features/store/appStore'
import './index.css'

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
}
void useAppStore.getState().hydrate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
