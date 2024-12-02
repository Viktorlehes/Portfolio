import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import './Login.css';

const Login = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state?.from?.pathname as string) || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(pin);
    
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Invalid PIN');
      setPin('');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Enter PIN</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            maxLength={4}
            autoFocus
          />
          {error && <div className="error">{error}</div>}
          <button type="submit">Enter</button>
        </form>
      </div>
    </div>
  );
};

export default Login;