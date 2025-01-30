interface DecodedToken {
  sub: string;     // user_id from your Python code
  email: string;   // email from your Python code
  exp: number;     // expiration timestamp
}

// Utility function to decode token
export const decodeToken = (token: string): DecodedToken | null => {
  try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(window.atob(base64));
      
      const result = {
        sub: decoded.sub,
        email: decoded.email,
        exp: decoded.exp
      }
    
      return result ;
  } catch (error) {
      console.error('Error decoding token:', error);
      return null;
  }
}

export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  
  return decoded.exp < currentTime;
}

export const getUserFromToken = (token: string): { id: string, email: string } | null => {
  const decoded = decodeToken(token);
  if (!decoded) return null;
  
  return {
      id: decoded.sub,
      email: decoded.email
  };
}