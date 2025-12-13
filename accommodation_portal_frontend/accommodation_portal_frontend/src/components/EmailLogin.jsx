// src/components/EmailLogin.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Login.css';
import ReCAPTCHA from 'react-google-recaptcha';

const RECAPTCHA_SITE_KEY = '6Le7Q84rAAAAAOTGayF1e_-9mViDrmuPiNTbHE9E';
const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const EmailLogin = () => {
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const sendOtp = async () => {
    setError('');
    if (!email) return setError('Please enter your email');
    if (!captchaToken) return setError('Please complete the CAPTCHA');

    setLoading(true);
    setLoadingMessage('Sending OTP...');

    try {
      const res = await fetch('https://edith.moodi.org/api/miauth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaToken })
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || 'Failed to send OTP');
        return;
      }

      setOtpSent(true);
      setTimer(60);
      setCaptchaToken('');
      alert('OTP sent to your email');

    } catch (err) {
      setLoading(false);
      setError('Network error. Try again.');
    }
  };

  const verifyOtp = async () => {
    setError('');
    if (!otp) return setError('Please enter the OTP');

    setLoading(true);
    setLoadingMessage('Verifying OTP...');

    try {
      // 1️⃣ Verify with Edith
      const res = await fetch('https://edith.moodi.org/api/miauth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await res.json();

      // ❌ NOT REGISTERED
      if (!res.ok || !data.verified || !data.token) {
        setLoading(false);

        const goRegister = window.confirm(
          'You are not registered for Mood Indigo.\n\nClick OK to register now.'
        );

        if (goRegister) {
          window.location.href = 'https://moodi.org/';
        }

        return;
      }

      // ✅ VERIFIED
      localStorage.setItem('jwtToken', data.token);
      localStorage.setItem('userEmail', email);

      // 2️⃣ Sync with backend
      const accessRes = await fetch(`${API_BASE}/api/accommodation/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.token}`
        },
        body: JSON.stringify({
          email: data.email || email,
          name: data.name || '',
          miNo: data.miNo || '',
          college: data.college || '',
          gender: data.gender || '',
          phone: data.phone || ''
        })
      });

      const accessData = await accessRes.json();
      setLoading(false);

      if (accessData.token) {
        localStorage.setItem('jwtToken', accessData.token);
      }

      localStorage.setItem('userName', accessData.name || '');
      localStorage.setItem('miNo', accessData.miNo || '');
      localStorage.setItem('college', accessData.college || '');
      localStorage.setItem('gender', accessData.gender || '');
      localStorage.setItem('phone', accessData.phone || '');

      if (accessData.imageUploaded) {
        navigate('/pass');
      } else {
        navigate('/upload');
      }

    } catch (err) {
      console.error(err);
      setLoading(false);
      setError('Verification failed. Try again.');
    }
  };

  return (
    <div className="email-login">
      {!otpSent && !loading ? (
        <div className="input-group">
          <label>Email Address</label>
          <input
            type="email"
            className="email-input"
            placeholder="Enter your registered email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <div className="recaptcha-container">
            <ReCAPTCHA
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={token => setCaptchaToken(token)}
              onExpired={() => setCaptchaToken('')}
            />
          </div>

          <button
            className="send-otp-btn"
            onClick={sendOtp}
            disabled={!captchaToken || !email}
          >
            Send OTP
          </button>
        </div>
      ) : loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-message">{loadingMessage}</p>
        </div>
      ) : (
        <div className="otp-section">
          <div className="success-message">
            OTP sent to <strong>{email}</strong>
          </div>

          {timer > 0 && (
            <div className="otp-timer">
              Resend OTP in {timer} seconds
            </div>
          )}

          <div className="input-group">
            <label>Enter OTP</label>
            <input
              type="text"
              className="otp-input"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
            />
          </div>

          <button
            className="verify-otp-btn"
            onClick={verifyOtp}
            disabled={!otp || loading}
          >
            Verify OTP
          </button>

          <button
            className="send-otp-btn"
            onClick={sendOtp}
            disabled={timer > 0}
            style={{ marginTop: '10px' }}
          >
            {timer > 0 ? `Resend OTP (${timer}s)` : 'Resend OTP'}
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default EmailLogin;
