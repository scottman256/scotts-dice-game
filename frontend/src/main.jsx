import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { createBackendClient } from './api/backendClient'
import { createFirebaseAuthService } from './auth/firebaseAuth'
import './index.css'

const authService = createFirebaseAuthService({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

const backendClient = createBackendClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App authService={authService} backendClient={backendClient} />
  </React.StrictMode>
)
