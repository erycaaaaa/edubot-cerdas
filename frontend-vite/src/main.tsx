import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { router } from './routes'
import './styles/globals.css'
import { initializeTheme } from './hooks/useTheme'

initializeTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <>
      <RouterProvider router={router} />
      <SpeedInsights />
    </>
  </React.StrictMode>,
)
