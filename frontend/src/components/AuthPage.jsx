import React, { useState } from 'react';
import { ShieldCheck, LockKeyhole, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { Button, Card } from './ui';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  function handleGoogleLogin() {
    window.location.href = `${API_URL}/auth/google`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      await axios.post(`${API_URL}${endpoint}`, formData);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  return (
    <div className="auth-page-container">
      <Card className="auth-card simple-auth">
        <div className="auth-header-minimal">
          <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p>{isLogin ? 'Sign in to access your portfolio' : 'Join SwitchWise AI to track your investments'}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="name-row">
              <label>
                <span>First Name</span>
                <input 
                  type="text" 
                  name="firstName" 
                  required 
                  placeholder="John" 
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </label>
              <label>
                <span>Last Name</span>
                <input 
                  type="text" 
                  name="lastName" 
                  required 
                  placeholder="Doe" 
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </label>
            </div>
          )}

          <label>
            <span>Email Address</span>
            <input 
              type="email" 
              name="email" 
              required 
              placeholder="name@company.com" 
              value={formData.email}
              onChange={handleChange}
            />
          </label>

          <label>
            <span>Password</span>
            <input 
              type="password" 
              name="password" 
              required 
              placeholder="••••••••" 
              value={formData.password}
              onChange={handleChange}
            />
          </label>

          {error && <div className="auth-error"><AlertCircle size={16} /> {error}</div>}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </Button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button className="google-auth-btn-minimal" onClick={handleGoogleLogin} type="button">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285f4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34a853"/>
            <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.712s.102-1.172.282-1.712V4.956H.957a9.006 9.006 0 0 0 0 8.088l3.007-2.332z" fill="#fbbc05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.956L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#ea4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-footer-minimal">
          {isLogin ? (
            <p>Don't have an account? <button onClick={() => setIsLogin(false)}>Sign Up</button></p>
          ) : (
            <p>Already have an account? <button onClick={() => setIsLogin(true)}>Sign In</button></p>
          )}
        </div>
      </Card>
    </div>
  );
}
