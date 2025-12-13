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

      // Google auth
      const result = await signInWithPopup(auth, provider);
      const email = result?.user?.email;
      if (!email) throw new Error('No email');

      const firebaseToken = await result.user.getIdToken();

      // Edith verify
      const verifyRes = await fetch('https://edith.moodi.org/api/miauth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: firebaseToken })
      });

      const verifyData = await verifyRes.json();
      if (!verifyData?.token) throw new Error('Not registered');

      localStorage.setItem('userEmail', email);
      localStorage.setItem('jwtToken', verifyData.token);

      // Backend sync
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
      <div className="login-card">
        <img src="/moodilogo.png" className="login-logo" alt="Mood Indigo" />
        <h2 className="login-title">Access Pass Portal</h2>

        {loading ? (
          <div className="login-loading">
            <div className="spinner" />
            <p>Signing you in…</p>
          </div>
        ) : (
          <>
            <div className="login-buttons">
              <button
                className={`google-login-btn ${!useEmailLogin ? 'active' : ''}`}
                onClick={() => setUseEmailLogin(false)}
              >
                <FcGoogle size={22} /> Google Login
              </button>

              <button
                className={`google-login-btn ${useEmailLogin ? 'active' : ''}`}
                onClick={() => setUseEmailLogin(true)}
              >
                <MdEmail size={22} /> Email Login
              </button>
            </div>

            {!useEmailLogin ? (
              <button className="google-login-btn" onClick={handleGoogleLogin}>
                <FcGoogle size={22} />
                <span>Sign in with Google</span>
              </button>
            ) : (
              <EmailLogin />
            )}

            {error && (
              <div className="login-error">
                <p>{error}</p>
                <a href="https://moodi.org/" target="_blank" rel="noreferrer">
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
