import React, { createContext, useContext, useState, useEffect } from 'react';
import { encryptPin, decryptPin, generateSessionToken, validateSessionToken } from './crypto';
import { RateLimiter } from './rateLimit';
import { AUTH_CONFIG } from './config';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check for existing valid session during initial state setup
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const sessionToken = sessionStorage.getItem('sessionToken');
    if (!sessionToken) return false;
    return validateSessionToken(sessionToken);
  });

  // Validate session token on mount and after any changes
  useEffect(() => {
    const validateSession = () => {
      const sessionToken = sessionStorage.getItem('sessionToken');
      if (!sessionToken) {
        setIsAuthenticated(false);
        return;
      }

      const isValid = validateSessionToken(sessionToken);
      if (!isValid) {
        sessionStorage.removeItem('sessionToken');
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    };

    // Periodically check token validity
    const interval = setInterval(validateSession, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  const login = async (pin: string) => {
    const rateLimit = RateLimiter.attempt();
    
    if (!rateLimit.allowed) {
      return { 
        success: false, 
        error: `Too many attempts. Try again in ${rateLimit.remainingTime} seconds.` 
      };
    }

    try {
      const decryptedCorrectPin = decryptPin(AUTH_CONFIG.ENCRYPTED_PIN);
      const isValid = pin === decryptedCorrectPin;

      if (isValid) {
        // Generate and store secure session token
        const sessionToken = generateSessionToken(Date.now());
        sessionStorage.setItem('sessionToken', sessionToken);
        setIsAuthenticated(true);
        RateLimiter.reset();
        return { success: true };
      }

      const remainingAttempts = RateLimiter.getRemainingAttempts();
      return { 
        success: false, 
        error: `Invalid PIN. ${remainingAttempts} attempts remaining.` 
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return { 
        success: false, 
        error: 'Authentication error occurred.' 
      };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('sessionToken');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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