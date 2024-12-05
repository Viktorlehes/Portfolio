import React, { createContext, useContext, useRef } from 'react';

// Create context with a default value
const ActiveFetchesContext = createContext<React.MutableRefObject<Set<string>> | null>(null);

// Provider component
export const ActiveFetchesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const activeFetchesRef = useRef(new Set<string>());
  
  return (
    <ActiveFetchesContext.Provider value={activeFetchesRef}>
      {children}
    </ActiveFetchesContext.Provider>
  );
};

// Custom hook to use active fetches
export const useActiveFetches = () => {
  const context = useContext(ActiveFetchesContext);
  
  if (!context) {
    throw new Error('useActiveFetches must be used within an ActiveFetchesProvider');
  }
  
  return context;
};

// Utility function to check if a fetch is active
export const isEndpointFetching = (activeFetches: Set<string>, endpoint: string): boolean => {
  return activeFetches.has(endpoint);
};