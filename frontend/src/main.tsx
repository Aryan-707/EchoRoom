
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
// import { Toaster } from "@/components/ui/sonner.tsx"
import AuthContext from './context/AuthContext.tsx'
import { Toaster } from 'sonner';
import { SocketProvider } from './context/SocketContext.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
  
  <AuthContext>
    <SocketProvider>
    <App />
    </SocketProvider>
  </AuthContext>
 
  <Toaster />
    </BrowserRouter>
 
)
