import { useState } from 'react';
import { auth, provider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import '../css/Login.css';
import { FcGoogle } from 'react-icons/fc';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    localStorage.clear();

    try {
      setLoading(true);
      console.log('[LOGIN] Starting Google popup');

      // 1️⃣ Google sign-in (popup)
      const result = await signInWithPopup(auth, provider);

      if (!result || !result.user) {
        throw new Error('Google sign-in returned no user');
      }

      const email = result.user.email;
      console.log('[LOGIN] Firebase user email:', email);

      if (!email) {
        throw new Error('No email returned from Google');
      }

      // 2️⃣ Firebase ID token
      const firebaseToken = await result.user.getIdToken();
      console.log('[LOGIN] Firebase token obtained');

      // 3️⃣ Edith verify (AUTH ONLY)
      console.log('[LOGIN] Calling Edith /verify');
      const verifyRes = await fetch(
        'https://edith.moodi.org/api/miauth/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: firebaseToken })
        }
      );

      if (!verifyRes.ok) {
        throw new Error('Edith verify request failed');
      }

      const verifyData = await verifyRes.json();
      console.log('[LOGIN] Edith verify response:', verifyData);

      // 🔴 Edith contract: token === registered
      if (!verifyData || !verifyData.token) {
        throw new Error('User not registered with Mood Indigo');
      }

      // Save minimal identity
      localStorage.setItem('userEmail', email);

      // 4️⃣ Backend access-pass check (THIS creates / updates DB row)
      console.log('[LOGIN] Calling backend /check');
      const checkRes = await fetch(
        `${API_BASE}/api/accommodation/check`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        }
      );

      if (!checkRes.ok) {
        throw new Error('Backend /check failed');
      }

      const checkData = await checkRes.json();
      console.log('[LOGIN] Backend /check response:', checkData);

      if (!checkData.token) {
        throw new Error('Backend did not return JWT');
      }

      // Backend JWT is now source of truth
      localStorage.setItem('jwtToken', checkData.token);

      setLoading(false);

      // 5️⃣ Navigate
      if (checkData.imageUploaded) {
        navigate('/pass');
      } else {
        navigate('/upload');
      }

    } catch (err) {
      console.error('❌ LOGIN FAILED:', err);
      setLoading(false);
      setError(
        'You are not registered for Mood Indigo. Please register on https://moodi.org/'
      );
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Access Pass Portal</h2>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Signing you in…</p>
          </div>
        ) : (
          <>
            <button className="submit-btn" onClick={handleGoogleLogin}>
              <FcGoogle style={{ marginRight: 8 }} />
              Sign in with Google
            </button>

            {error && (
              <div className="error-message">
                <p>{error}</p>
                <a
                  href="https://moodi.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  👉 Register here
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
