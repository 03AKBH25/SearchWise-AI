import React from 'react';
import { ShieldCheck, Sparkles, LockKeyhole, ArrowRight } from 'lucide-react';
import { Button, Card } from './ui';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function AuthPage() {
  function handleGoogleLogin() {
    window.location.href = `${API_URL}/auth/google`;
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card-wrap">
        <Card className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <span>SW</span>
              SwitchWise AI
            </div>
            <h1>Secure Investment Intelligence</h1>
            <p>Sign in to save your portfolio analysis, track expense leaks, and get personalized advice from your AI Copilot.</p>
          </div>

          <div className="auth-actions">
            <button className="google-auth-btn" onClick={handleGoogleLogin}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="Google" />
              Continue with Google
            </button>
            
            <div className="auth-divider">
              <span>Secure OAuth 2.0</span>
            </div>

            <p className="auth-disclaimer">
              By continuing, you agree to our Terms of Service and Privacy Policy. We never share your financial data with third parties.
            </p>
          </div>

          <div className="auth-features">
            <div className="auth-feature">
              <ShieldCheck size={18} />
              <span>Bank-grade security</span>
            </div>
            <div className="auth-feature">
              <LockKeyhole size={18} />
              <span>Read-only access</span>
            </div>
            <div className="auth-feature">
              <Sparkles size={18} />
              <span>AI-powered insights</span>
            </div>
          </div>
        </Card>

        <div className="auth-sidebar">
          <div className="testimonial-card">
            <div className="quote-icon">“</div>
            <p>SwitchWise detected ₹1.4L in hidden expense drag I didn't even know existed. Moving to Direct plans was the best decision I made this year.</p>
            <div className="testimonial-user">
              <div className="avatar">A</div>
              <div>
                <strong>Aniket Kumar</strong>
                <span>Retail Investor</span>
              </div>
            </div>
          </div>
          
          <div className="auth-benefits">
            <h3>Why create an account?</h3>
            <ul>
              <li><ArrowRight size={14} /> Monitor portfolio health 24/7</li>
              <li><ArrowRight size={14} /> Unlimited Copilot queries</li>
              <li><ArrowRight size={14} /> Real-time NAV updates</li>
              <li><ArrowRight size={14} /> Custom watchlist alerts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
