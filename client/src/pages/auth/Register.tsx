// Register.tsx
import React, { useEffect } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import './Register.css';

interface RegisterUserData {
    email: string;
    password: string;
    confirmPassword: string;
}

const Register: React.FC = () => {
    const [userData, setUserData] = useState<RegisterUserData>({
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [error, setError] = useState('');
    const { register, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [successMessage, setSuccessMessage] = useState("")

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated] )
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (userData.password !== userData.confirmPassword) {
            setError('Passwords do not match');
            setUserData(prev => ({
                ...prev,
                password: "",
                confirmPassword: ""
            }));
            return;
        }

        try {
            const result = await register({
                email: userData.email,
                password: userData.password
            });

            if (result.success) {
                setSuccessMessage("Account created, Redirecting...")
            } else {
                if (result.status && result.status === 409) {
                    setError('User already exists');
                } else {
                    setError('Something went wrong');
                }
            } 
        } catch (error: any) {
            setError('Something went wrong');
            
            setUserData(prev => ({
                ...prev,
                password: "",
                confirmPassword: ""
            }));
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
        <div className="register-container">
            <div className="register-card">
                <h2>Register</h2>
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
                            autoComplete="new-password"
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={userData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                            required
                        />
                    </div>
                    {error && <div className="error">{error}</div>}
                    {successMessage && <div className="success">{successMessage}</div>}
                    <button type="submit">Register</button>
                    <div className="login-link">
                        Already have an account? <a href="/login">Login here</a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;