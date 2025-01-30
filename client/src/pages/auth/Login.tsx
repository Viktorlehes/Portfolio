import React, { useEffect } from 'react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import './Login.css';

interface LoginUserData {
  email: string
  password: string
}

const Login: React.FC = () => {
  const [userData, setUserData] = useState<LoginUserData>({
      email: "timo.j.lehes@icloud.com",
      password: "",
  });
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state?.from?.pathname as string) || '/';

  useEffect(() => {
    if (isAuthenticated) {
        navigate(from, { replace: true });  
    }
  }) 

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const result = await login(userData);
      if (result.success) {
          navigate(from, { replace: true });
      } else {
          setError(result.error || 'Something went wrong');
          setUserData({
            email: userData.email,
            password: "",
          });
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setUserData(prev => ({
          ...prev,
          [name]: value
      }));
  };

  return (
      <div className="login-container">
          <div className="login-card">
              <h2>Login</h2>
              <form onSubmit={handleSubmit}>
                  <div className="input-group">
                      <label htmlFor="email">Email</label>
                      <input
                          type="email"
                          id="email"
                          name="email"
                          value={userData.email}
                          onChange={handleChange}
                          placeholder="Enter your email"
                          autoComplete="email"
                          required
                          autoFocus
                      />
                  </div>
                  <div className="input-group">
                      <label htmlFor="password">Password</label>
                      <input
                          type="password"
                          id="password"
                          name="password"
                          value={userData.password}
                          onChange={handleChange}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          required
                      />
                  </div>
                  {error && <div className="error">{error}</div>}
                  <button type="submit">Login</button>
              </form>
              <div className="login-link">
                Dont have an account? <a href="/register">Register here</a>
            </div>
          </div>
      </div>
  );
};

export default Login;