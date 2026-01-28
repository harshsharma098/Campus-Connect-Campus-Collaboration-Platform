'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'mentor' | 'admin';
  bio?: string;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, role?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user (mock authentication)
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');

      if (storedUser && storedToken) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch (error) {
          // Invalid stored data, clear it
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Mock login - no backend validation
    // Just create a mock user based on email
    const mockUser: User = {
      id: Math.floor(Math.random() * 1000),
      email: email,
      firstName: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      lastName: 'User',
      role: email.includes('mentor') ? 'mentor' : email.includes('admin') ? 'admin' : 'student',
    };

    const mockToken = 'mock-token-' + Date.now();

    setUser(mockUser);
    setToken(mockToken);

    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', mockToken);
    }
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string = 'student'
  ) => {
    // Mock registration - no backend validation
    const mockUser: User = {
      id: Math.floor(Math.random() * 1000),
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: role as 'student' | 'mentor' | 'admin',
    };

    const mockToken = 'mock-token-' + Date.now();

    setUser(mockUser);
    setToken(mockToken);

    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', mockToken);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
