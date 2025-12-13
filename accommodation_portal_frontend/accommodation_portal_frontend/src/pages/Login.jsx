import { useState } from 'react';
import { auth, provider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import EmailLogin from '../components/EmailLogin';
import '../css/Login.css';
import { FcGoogle } from 'react-icons/fc';
import { MdEmail } from 'react-icons/md';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useEmailLogin, setUseEmailLogin] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    localStorage.clear();

    try {
      setLoading(true);

      const result = await signInWithPopup(auth, provider);
      const email = result?.user?.email;
      if (!email) throw new Error('No email');

      const firebaseToken = await result.user.getIdToken();

      const verifyRes = await fetch('https://edith.moodi.org/api/miauth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: firebaseToken })
      });

      const verifyData = await verifyRes.json();
      if (!verifyData?.token) throw new Error('Verification failed');

      localStorage.setItem('userEmail', email);
      localStorage.setItem('jwtToken', verifyData.token);

      const checkRes = await fetch(`${API_BASE}/api/accommodation/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const checkData = await checkRes.json();
      if (checkData.token) localStorage.setItem('jwtToken', checkData.token);

      setLoading(false);
      navigate(checkData.imageUploaded ? '/pass' : '/upload', { replace: true });

    } catch (err) {
      console.error(err);
      setLoading(false);
      setError(
        'You are not registered for Mood Indigo. Please register on https://moodi.org/'
      );
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-header">
          <img src="/moodilogo.png" alt="Mood Indigo" className="moodi-logo" />
          <div className="login-subtitle">Accommodation Portal</div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-message">Signing you in…</p>
          </div>
        ) : (
          <>
            <div className="login-buttons">
              <button
                className={`login-btn google-btn ${!useEmailLogin ? 'active' : ''}`}
                onClick={() => setUseEmailLogin(false)}
              >
                <FcGoogle />
                Google Login
              </button>

              <button
                className={`login-btn email-btn ${useEmailLogin ? 'active' : ''}`}
                onClick={() => setUseEmailLogin(true)}
              >
                <MdEmail />
                Email Login
              </button>
            </div>

            <div className="login-method">
              {!useEmailLogin ? (
                <button className="submit-btn" onClick={handleGoogleLogin}>
                  Sign in with Google
                </button>
              ) : (
                <EmailLogin />
              )}
            </div>

            {error && <div className="error-message">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
