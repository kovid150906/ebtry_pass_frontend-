import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';
import '../css/AccommodationPass.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const AccessPass = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    const token = localStorage.getItem('jwtToken');

    if (!email || !token) {
      navigate('/login');
      return;
    }

    fetch(`${API_BASE}/api/accommodation/get?email=${email}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setUser)
      .catch(() => navigate('/login'));
  }, [navigate]);

  if (!user) return <div className="pass-loading">Loading…</div>;

  return (
    <div className="accommodation-pass-page">
      <div className="pass-container">
        <div className="pass-card">
          <div className="pass-header">
            <img src="/moodilogo.png" className="moodi-logo" alt="Mood Indigo" />
            <p className="pass-type">Accommodation Pass</p>
          </div>

          <div className="pass-body">
            <div className="pass-left-col">
              <div className="pass-info">
                <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value">{user.name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">MI Number</span>
                  <span className="info-value highlight">{user.miNo}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">College</span>
                  <span className="info-value">{user.college}</span>
                </div>
              </div>
            </div>

            <div className="pass-right-col">
              <div className="qr-code-wrapper">
                <QRCode value={user.miNo} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessPass;
