import React, { useState } from 'react';
import { Link, Outlet } from "react-router-dom";
import { Toaster } from 'sonner';
import { Alert, AlertDescription} from "@/components/ui/alert";
import { useAuth } from './AuthContext';


export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  
  const { user, isAuthenticated } = useAuth();

  return (
    <>
      {!isAuthenticated && (
        <Alert className="flex justify-between items-center bg-blue-50 border-blue-200 text-blue-800 rounded-none">
        <AlertDescription>
            🚀 Login or register to like, comment, and create posts!
        </AlertDescription>
        </Alert>
      )}
      {/* Full-width Navbar - NO container constraints */}
      <header className="bg-gray-50 shadow-sm border-b border-gray-200 w-full">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 w-full">
          {/* Brand (left edge) */}
          <div className="text-xl font-bold text-blue-600">
            <Link to="/">The Warp</Link>
          </div>

          {/* Desktop Nav (right side with proper spacing) */}
          <nav className="hidden md:flex items-center space-x-6 text-base font-medium">
            {isAuthenticated && (
              <Link 
                to={`/profile/${user.username}`} 
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                {user.username}
              </Link>
            )}
            
            <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors">
              All Posts
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link to="/following" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Following
                </Link>
                <Link to="/logout" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Log Out
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Log In
                </Link>
                <Link to="/register" className="text-gray-700 hover:text-blue-600 transition-colors">
                  Register
                </Link>
              </>
            )}
          </nav>

          {/* Hamburger (mobile only) */}
          <div className="md:hidden">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md text-gray-500 hover:bg-white-100 hover:text-black-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {menuOpen && (
          <div className="md:hidden bg-gray-50 border-t border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-3 space-y-1 text-base font-medium">
              {isAuthenticated && (
                <Link 
                  to={`/profile/${user.username}`} 
                  className="block text-blue-600 font-semibold hover:text-blue-700 py-2 px-3 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {user.username}
                </Link>
              )}
              <Link 
                to="/" 
                className="block text-gray-700 hover:text-blue-600 py-2 px-3 rounded-md hover:bg-gray-100 transition-colors"
              >
                All Posts
              </Link>
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/following" 
                    className="block text-gray-700 hover:text-blue-600 py-2 px-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Following
                  </Link>
                  <Link 
                    to="/logout" 
                    className="block text-gray-700 hover:text-blue-600 py-2 px-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Log Out
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="block text-gray-700 hover:text-blue-600 py-2 px-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link 
                    to="/register" 
                    className="block text-gray-700 hover:text-blue-600 py-2 px-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="min-h-screen bg-white text-gray-900">
        <main className="px-4 sm:px-6 lg:px-8 py-4">
          <Outlet />
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster richColors position="top-center" />
    </>
  );
}
