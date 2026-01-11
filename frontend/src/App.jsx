import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from './components/ProtectedRoute';
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

            {/* More routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgotpassword" element={<PasswordReset />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App
