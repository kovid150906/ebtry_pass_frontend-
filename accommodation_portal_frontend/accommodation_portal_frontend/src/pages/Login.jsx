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

      // 1. Google auth
      const result = await signInWithPopup(auth, provider);
      const email = result?.user?.email;
      if (!email) throw new Error('No email from Google');

      const firebaseToken = await result.user.getIdToken();

      // 2. Edith verify (auth only)
      const verifyRes = await fetch(
        'https://edith.moodi.org/api/miauth/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: firebaseToken })
        }
      );

      const verifyData = await verifyRes.json();
      if (!verifyData?.token) {
        throw new Error('Not registered');
      }

      // 3. Save minimal auth state
      localStorage.setItem('userEmail', email);
      localStorage.setItem('jwtToken', verifyData.token);

      // 4. Backend bootstrap
      const checkRes = await fetch(
        `${API_BASE}/api/accommodation/check`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        }
      );

      if (!checkRes.ok) throw new Error('Backend check failed');

      const checkData = await checkRes.json();

      // overwrite token with backend JWT (IMPORTANT)
      if (checkData.token) {
        localStorage.setItem('jwtToken', checkData.token);
      }

      setLoading(false);

      // 5. Navigate ONCE
      if (checkData.imageUploaded) {
        navigate('/pass', { replace: true });
      } else {
        navigate('/upload', { replace: true });
      }

    } catch (err) {
      console.error('LOGIN ERROR:', err);
      setLoading(false);
      setError(
        'You are not registered for Mood Indigo. Please register on https://moodi.org/'
      );
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/moodilogo.png" alt="Mood Indigo" className="login-logo" />

        <h2 className="login-title">Access Pass Portal</h2>

        {loading ? (
          <div className="login-loading">
            <div className="spinner"></div>
            <p>Signing you in…</p>
          </div>
        ) : (
          <>
            <button className="google-login-btn" onClick={handleGoogleLogin}>
              <FcGoogle size={22} />
              <span>Sign in with Google</span>
            </button>

            {error && (
              <div className="login-error">
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
