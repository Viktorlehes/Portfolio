import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import { useEffect } from 'react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, validateSession } = useAuth();
  
  const location = useLocation();

  useEffect(() => {
    validateSession()  
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};