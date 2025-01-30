import React, { createContext, useContext, useState, useEffect } from 'react';
import { isTokenExpired, getUserFromToken } from './crypto';
import { RateLimiter } from './rateLimit';
import { api } from '../utils/api';

interface AuthContextType {
  isAuthenticated: boolean
  validateSession: () => void;
  login: (userData: LoginUserData) => Promise<{ success: boolean; error?: string, status?: number }>;
  register: (userData: LoginUserData) => Promise<{ success: boolean; error?: string, status?: number }>; 
  getUserData: () => UserData | null;
  logout: () => void;
}

export interface DecodedToken {
  sub: string;  // user id
  email: string;
  exp: number;
  iat: number;
}

interface UserData {
  id: string;
  email: string;
}

interface LoginUserData {
  email: string
  password: string
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check for existing valid session during initial state setup
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const sessionToken = sessionStorage.getItem('sessionToken');
    if (!sessionToken) return false;
    return isTokenExpired(sessionToken);
  });

  const validateSession = () => {
    const sessionToken = sessionStorage.getItem('sessionToken');
    if (!sessionToken) {
      setIsAuthenticated(false);
      return;
    }

    const isExpired = isTokenExpired(sessionToken);
    if (isExpired) {
      sessionStorage.removeItem('sessionToken');
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }
  };

  useEffect(() => {
    const interval = setInterval(validateSession, 10000); // Every minute
    return () => clearInterval(interval);
  }, []);

  const register = async (userData: LoginUserData) => {
    try {
      const response = await api.post("/users/register", userData)      

      if (!response.error && response.access_token) {
        sessionStorage.setItem('sessionToken', response.access_token)
        setIsAuthenticated(true)
        return {success: true}
      } else if (response.error && response.status) {
        return {
          success: false,
          error: response.error,
          status: response.status
        }
      }
    } catch (error) {
      return {
        success: false,
        error: (error instanceof Error ? error.message : "An unknown error occurred")
      }
    }
    return {
      success: false,
      error: "Something went wrong"
    }
  }

  const login = async (userData: LoginUserData) => {
    const rateLimit = RateLimiter.attempt();
    
    if (!rateLimit.allowed) {
      return { 
        success: false, 
        error: `Too many attempts. Try again in ${rateLimit.remainingTime} seconds.` 
      };
    }

    try {
      
      const response = await api.post("/users/login", userData)

      if (response.access_token) {
        sessionStorage.setItem('sessionToken', response.access_token);
        setIsAuthenticated(true);
        RateLimiter.reset();
        return { success: true };
      }

      const remainingAttempts = RateLimiter.getRemainingAttempts();

      return { 
        success: false, 
        error: `Invalid Email or Password. ${remainingAttempts} attempts remaining.` 
      };
    } catch (error) {
      console.error('Invalid Email or Password:', error);
      return { 
        success: false, 
        error: 'Invalid Email or Password.' 
      };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('sessionToken');
    setIsAuthenticated(false);
  };

  const getUserData = () => {
    const sessionToken = sessionStorage.getItem('sessionToken');
    if (!sessionToken) {
      return null
    }

    const userData = getUserFromToken(sessionToken)
    
    if (userData) {
      return userData
    } else {
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, validateSession, login, register, getUserData, logout }}>
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