

import  { useContext, useEffect, useState } from 'react'

import { Routes, Route, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import { useUserStore } from './store/slices/auth-slice'
import axios from 'axios'
import { authDataContext } from './context/AuthContext'

function App() {
  const { serverUrl } = useContext(authDataContext)!
  const { userInfo, setUserInfo } = useUserStore()
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const getUserData = async () => {
      console.log("Checking user authentication...")
      try {
        const response = await axios.get(`${serverUrl}/api/auth/userinfo`, { withCredentials: true })
        
        // console.log("Auth response:", response.data)
        
        if (response.status === 200 && response.data._id) {
          console.log("User authenticated, setting user data")
          setUserInfo(response.data)
        } else {
          console.log("No valid user data")
          setUserInfo(undefined)
        }
      } catch (error) {
        console.log("Auth check failed:", error)
        setUserInfo(undefined)
      } finally {
        setLoading(false)
        setAuthChecked(true)
      }
    }

    // Only run auth check once when app loads
    if (!authChecked) {
      getUserData()
    }
  }, [serverUrl, setUserInfo, authChecked]) // Removed userInfo from dependencies

  // Separate effect to log userInfo changes
  useEffect(() => {
    if (authChecked) {
      console.log("UserInfo updated:", )
    }
  }, [userInfo, authChecked])

  // Show loading while checking auth
  if (loading || !authChecked) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-2">
      
        <p className="text-lg">Waking up the server…</p>
        <p className="text-lg"> This app is hosted on Render’s free tier, which sleeps after inactivity,
  so the first request may take a moment.</p>
        <p>Once it’s ready, everything will load instantly 🚀</p>
      </div>
    )
  }

  // console.log("Rendering routes with userInfo:", userInfo)

  return (
    <Routes>
      <Route 
        path="/auth" 
        element={userInfo ? <Navigate to="/chat" replace /> : <Auth />} 
      />
      <Route 
        path="/chat" 
        element={userInfo ? <Chat /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="/profile" 
        element={userInfo ? <Profile /> : <Navigate to="/auth" replace />} 
      />
      <Route 
        path="*" 
        element={<Navigate to={userInfo ? "/chat" : "/auth"} replace />} 
      />
    </Routes>
  )
}

export default App
