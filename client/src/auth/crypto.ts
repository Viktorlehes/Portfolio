import CryptoJS from 'crypto-js';

export const encryptPin = (pin: string): string => {
  const secretKey = import.meta.env.VITE_PIN_SECRET_KEY;
  return CryptoJS.AES.encrypt(pin, secretKey).toString();
};

export const decryptPin = (encryptedPin: string): string => {
  const secretKey = import.meta.env.VITE_PIN_SECRET_KEY;
  const bytes = CryptoJS.AES.decrypt(encryptedPin, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Generate a secure session token
export const generateSessionToken = (timestamp: number): string => {
  const secretKey = import.meta.env.VITE_PIN_SECRET_KEY;
  const data = `${timestamp}-${crypto.randomUUID()}`;
  return CryptoJS.AES.encrypt(data, secretKey).toString();
};

export const validateSessionToken = (token: string): boolean => {
  try {
    const secretKey = import.meta.env.VITE_PIN_SECRET_KEY;
    
    const decrypted = CryptoJS.AES.decrypt(token, secretKey).toString(CryptoJS.enc.Utf8);
    const [timestamp] = decrypted.split('-');
    
    // Token is valid for 24 hours
    const expirationTime = parseInt(timestamp) + (24 * 60 * 60 * 1000);
    return Date.now() < expirationTime;
  } catch {
    return false;
  }
};