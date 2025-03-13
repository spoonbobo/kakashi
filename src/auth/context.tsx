"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import jwt from 'jsonwebtoken';

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    id: string;
    username: string;
    token: string;
  } | null;
  login: (userData: { id: string; username: string; token: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ id: string; username: string; token: string } | null>(null);

  useEffect(() => {
    // Check if we have a stored token in localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = (userData: { id: string; username: string; token: string }) => {
    setIsAuthenticated(true);
    setUser(userData);
    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    // Remove user data from localStorage
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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