"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    id: string;
    username: string;
    token: string;
    tokenCreatedAt: number;
  } | null;
  login: (userData: { id: string; username: string; token: string }) => void;
  logout: () => void;
  authChecked: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ id: string; username: string; token: string; tokenCreatedAt: number } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if the stored token is valid on initial load
  useEffect(() => {
    const checkAuth = () => {
      // Check if we have a stored token in localStorage
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);

          // Check if token exists and when it was created
          if (userData.token && userData.tokenCreatedAt) {
            // Check token expiration
            const tokenAge = Date.now() - userData.tokenCreatedAt;
            const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

            if (tokenAge < TOKEN_EXPIRY) {
              setIsAuthenticated(true);
              setUser(userData);
            } else {
              // Token is too old
              console.log('Token expired. Please log in again.');
              localStorage.removeItem('user');
            }
          }
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.removeItem('user');
        }
      }

      setAuthChecked(true);
    };

    checkAuth();
  }, []);

  const login = (userData: { id: string; username: string; token: string }) => {
    // Include token creation timestamp
    const enhancedUserData = {
      ...userData,
      tokenCreatedAt: Date.now()
    };

    setIsAuthenticated(true);
    setUser(enhancedUserData);

    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(enhancedUserData));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    // Remove user data from localStorage
    localStorage.removeItem('user');
  };

  console.log('AuthProvider isAuthenticated:', isAuthenticated);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      login,
      logout,
      authChecked
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};