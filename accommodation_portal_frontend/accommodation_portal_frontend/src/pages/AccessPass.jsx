import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { FaDownload } from 'react-icons/fa';
import '../css/AccommodationPass.css';

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const AccessPass = () => {
  const [user, setUser] = useState(null);
  const [passUrl, setPassUrl] = useState(null);
  const navigate = useNavigate();

  /* ===========================
      FETCH USER DATA
  =========================== */
  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    const token = localStorage.getItem('jwtToken');

    if (!email || !token) {
      navigate('/login');
      return;
    }

    fetch(
      `${API_BASE}/api/accommodation/get?email=${encodeURIComponent(email)}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
      .then(res => res.json())
      .then(data => {
        // 🔥 CRITICAL FIX: If backend says image NOT uploaded, force redirect
        // This solves the "Black Photo" bug
        if (data.imageUploaded === false) {
           navigate('/upload', { replace: true });
           return;
        }

        setUser(data);
        if (data.passImagePath) {
          setPassUrl(`${API_BASE}/passes/${data.passImagePath}`);
        }
      })
      .catch(() => navigate('/login'));
  }, [navigate]);

  /* ===========================
      GENERATE + SAVE PASS
  =========================== */
  const handleDownload = async () => {
    const pass = document.querySelector('.pass-card');
    if (!pass || !user) return;

    // Force consistent width for generation
    const originalWidth = pass.style.width;
    pass.style.width = '1024px';
    await new Promise(r => setTimeout(r, 120));

    const canvas = await html2canvas(pass, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth: 1200
    });

    pass.style.width = originalWidth;

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/png', 0.9)
    );

    if (!blob) {
      alert('Failed to generate pass image');
      return;
    }

    // upload to backend
    const formData = new FormData();
    formData.append('pass', blob);

    const res = await fetch(
      `${API_BASE}/api/accommodation/save-pass`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('jwtToken')}`
        },
        body: formData
      }
    );

    const data = await res.json();

    if (!data.ok || !data.url) {
      alert('Failed to save pass');
      return;
    }

    // activate QR
    const fullUrl = `${API_BASE}${data.url}`;
    setPassUrl(fullUrl);

    // download locally
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `Entry_Pass_${user.miNo}.png`;
    link.click();
  };

  /* ===========================
      LOADING STATE
  =========================== */
  if (!user) {
    return (
      <div className="pass-loading">
        <div className="spinner"></div>
        <p>Loading your entry pass…</p>
      </div>
    );
  }

  /* ===========================
      RENDER
  =========================== */
  return (
    <div className="accommodation-pass-page">

      {/* ACTION BAR */}
      <div className="pass-actions no-print">
        <button className="action-btn download-btn" onClick={handleDownload}>
          <FaDownload className="btn-icon" />
          Download Pass
        </button>
      </div>

      <div className="pass-container">
        <div className="pass-card front">

          {/* HEADER */}
          <div className="pass-header z-high">
            <img
              src="/moodilogo.png"
              className="moodi-logo"
              alt="Mood Indigo"
            />
            <div className="header-content">
              <p className="pass-type">Entry Pass</p>
            </div>
          </div>

          <div className="pass-body">

            {/* LEFT COLUMN */}
            <div className="pass-left-col z-low">
              <div className="pass-photo-section">
                <img 
                  src={`${API_BASE}/api/accommodation/get-image?email=${encodeURIComponent(user.email)}`} 
                  alt="Participant"
                  className="pass-photo"
                  onError={(e) => {e.target.style.display='none'}}
                />
              </div>

              <div className="declarations z-high">
                <h3 className="decl-title">Declarations</h3>
                <ol className="decl-list">
                  <li>Carry a valid government-issued ID.</li>
                  <li>Follow campus and festival rules.</li>
                  <li>This pass is non-transferable.</li>
                </ol>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="pass-right-col">
              <div className="pass-info z-low">
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
                
                {/* 🔥 NEW: Govt ID Row */}
                <div className="info-row">
                  <span className="info-label">{user.govtIdType}</span>
                  <span className="info-value">xxxx {user.govtIdLast4}</span>
                </div>
              </div>

              <div className="pass-codes">
                <div className="qr-section z-high">
                  <span className="code-label">QR Code</span>
                  <div className="qr-code-wrapper">
                    <QRCode
                      value={
                        passUrl
                          ? passUrl
                          : 'Download the pass to activate QR'
                      }
                      size={260}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="pass-footer" />
        </div>
      </div>
    </div>
  );
};

export default AccessPass;