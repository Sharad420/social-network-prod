import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from './components/ProtectedRoute';
import GuestGuard from './components/GuestGuard';
import Following from "./pages/Following";
import Home from "./pages/Home";
import Login from './pages/Login';
import Logout from './pages/Logout';
import Register from './pages/Register';
import Profile from './pages/Profile';
import PasswordReset from './pages/PasswordReset';

// Used to inject props into React's context system for each page.
import { AuthProvider } from './components/AuthContext';


import './App.css'

function App() {
  return (

    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Public Route - accessible to all */}
            <Route index element={<Home />} />

            {/* Protected Routes - requires auth */}
            <Route 
              path="/following" 
              element={
                <ProtectedRoute>
                  <Following />
                </ProtectedRoute>
                }
            />
            <Route 
              path="/profile/:username" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />


            {/* Guest only routes - can access them only as a guest */}
            <Route 
              path="/login" 
              element={
                <GuestGuard>
                  <Login />
                </GuestGuard>
              } 
            />
            
            <Route 
              path="/register" 
              element={
                <GuestGuard>
                  <Register />
                </GuestGuard>
              } 
            />

            <Route 
              path="/forgotpassword" 
              element={
                <GuestGuard>
                  <PasswordReset />
                </GuestGuard>
              } 
            />

            {/* More routes */}
            <Route path="/logout" element={<Logout />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App
