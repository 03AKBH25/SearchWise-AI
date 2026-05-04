import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  AlertTriangle, 
  Award, 
  Sparkles, 
  ArrowRight,
  ChevronLeft,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import { Button, Card } from './ui';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const STEPS = [
  {
    id: 'goal',
    title: 'What is your primary investment goal?',
    icon: Target,
    options: [
      { id: 'Wealth creation', label: 'Wealth creation', description: 'Long-term capital growth' },
      { id: 'Retirement', label: 'Retirement', description: 'Building a corpus for post-work life' },
      { id: 'Passive income', label: 'Passive income', description: 'Regular dividends or returns' },
      { id: 'Short-term goal', label: 'Short-term goal', description: 'Vacation, wedding, or down payment' }
    ]
  },
  {
    id: 'horizon',
    title: 'What is your investment horizon?',
    icon: Calendar,
    options: [
      { id: '< 3 years', label: '< 3 years', description: 'Short term' },
      { id: '3-5 years', label: '3-5 years', description: 'Short to medium term' },
      { id: '5-10 years', label: '5-10 years', description: 'Medium to long term' },
      { id: '10+ years', label: '10+ years', description: 'Long term' }
    ]
  },
  {
    id: 'risk',
    title: 'How do you describe your risk tolerance?',
    icon: AlertTriangle,
    options: [
      { id: 'Low', label: 'Low', description: 'I prefer stability over high returns' },
      { id: 'Medium', label: 'Medium', description: 'Balanced approach to risk and return' },
      { id: 'High', label: 'High', description: 'Comfortable with volatility for higher gains' }
    ]
  },
  {
    id: 'experience',
    title: 'What is your experience with investing?',
    icon: Award,
    options: [
      { id: 'Beginner', label: 'Beginner', description: 'Just starting out' },
      { id: 'Intermediate', label: 'Intermediate', description: 'Have some knowledge and experience' },
      { id: 'Advanced', label: 'Advanced', description: 'Experienced investor' }
    ]
  },
  {
    id: 'preference',
    title: 'What is your investment preference?',
    icon: Sparkles,
    options: [
      { id: 'Low cost', label: 'Low cost', description: 'Priority on low expense ratios' },
      { id: 'High returns', label: 'High returns', description: 'Priority on performance history' },
      { id: 'Balanced', label: 'Balanced', description: 'Mix of low cost and good returns' }
    ]
  }
];

const LOADING_MESSAGES = [
  'Understanding your investment style…',
  'Personalizing recommendations…',
  'Preparing your dashboard…'
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);

  useEffect(() => {
    if (isFinalizing) {
      const interval = setInterval(() => {
        setLoadingMessageIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 600);
      return () => clearInterval(interval);
    }
  }, [isFinalizing]);

  const step = STEPS[currentStep];
  const Icon = step.icon;

  async function handleOptionSelect(optionId) {
    const updatedResponses = { ...responses, [step.id]: optionId };
    setResponses(updatedResponses);

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finalizeOnboarding(updatedResponses);
    }
  }

  async function finalizeOnboarding(finalResponses = responses) {
    setIsFinalizing(true);
    
    // Ensure all fields have values (for skip/defaults)
    const data = {
      goal: finalResponses.goal || 'Wealth creation',
      horizon: finalResponses.horizon || '5-10 years',
      risk: finalResponses.risk || 'Medium',
      experience: finalResponses.experience || 'Intermediate',
      preference: finalResponses.preference || 'Balanced'
    };

    try {
      await axios.patch(`${API_URL}/auth/onboarding`, { preferences: data }, { withCredentials: true });
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      console.error('Onboarding failed', error);
      setIsFinalizing(false);
    }
  }

  if (isFinalizing) {
    return (
      <div className="onboarding-loading-screen">
        <div className="onboarding-loader-box">
          <div className="loader-ring">
            <Loader2 className="animate-spin" size={48} />
          </div>
          <h2>{LOADING_MESSAGES[loadingMessageIdx]}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-progress-bar">
        <div 
          className="onboarding-progress-fill" 
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} 
        />
      </div>

      <div className="onboarding-header">
        <div className="step-counter">Step {currentStep + 1} of {STEPS.length}</div>
        <button className="skip-btn" onClick={() => finalizeOnboarding()}>Skip</button>
      </div>

      <div className="onboarding-content landing-reveal">
        <div className="step-icon-circle">
          <Icon size={32} />
        </div>
        <h1>{step.title}</h1>

        <div className="options-grid">
          {step.options.map((option) => (
            <button 
              key={option.id} 
              className={`option-card ${responses[step.id] === option.id ? 'active' : ''}`}
              onClick={() => handleOptionSelect(option.id)}
            >
              <div className="option-check">
                <CheckCircle2 size={18} />
              </div>
              <div className="option-info">
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </div>
              <ArrowRight className="option-arrow" size={18} />
            </button>
          ))}
        </div>
      </div>

      {currentStep > 0 && (
        <button className="back-btn" onClick={() => setCurrentStep(currentStep - 1)}>
          <ChevronLeft size={18} /> Back
        </button>
      )}
    </div>
  );
}
