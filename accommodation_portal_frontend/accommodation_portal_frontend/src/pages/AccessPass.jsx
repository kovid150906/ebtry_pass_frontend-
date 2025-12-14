import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { FaDownload } from 'react-icons/fa';
import '../css/AccommodationPass.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const AccessPass = () => {
  const [user, setUser] = useState(null);
  const [passUrl, setPassUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    const token = localStorage.getItem('jwtToken');

    if (!email || !token) {
      navigate('/login');
      return;
    }

    fetch(`${API_BASE}/api/accommodation/get?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      // If backend says image NOT uploaded, force redirect to upload page
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

  const handleDownload = async () => {
    const pass = document.querySelector('.pass-card');
    if (!pass || !user) return;

    try {
      // 1. Wait for images to fully load
      const images = pass.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));

      // 2. Generate Canvas
      // 'useCORS: true' allows capturing the image from your backend
      const canvas = await html2canvas(pass, {
        scale: 2,
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });

      // 3. Convert to Blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.9));

      if (!blob) {
        alert("Failed to generate pass image.");
        return;
      }

      // 4. Upload to Backend
      const formData = new FormData();
      formData.append('pass', blob);

      const res = await fetch(`${API_BASE}/api/accommodation/save-pass`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('jwtToken')}` },
        body: formData
      });

      const data = await res.json();

      if (!data.ok) {
        alert('Server failed to save pass.');
        return;
      }

      // 5. Success
      const fullUrl = `${API_BASE}${data.url}`;
      setPassUrl(fullUrl);

      // Download locally
      const link = document.createElement('a');
      link.href = fullUrl; 
      link.download = `Entry_Pass_${user.miNo}.png`;
      link.click();

    } catch (err) {
      console.error("Generation Error:", err);
      alert("Error generating pass.");
    }
  };

  if (!user) return <div className="pass-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="accommodation-pass-page">
      <div className="pass-actions no-print">
        <button className="action-btn download-btn" onClick={handleDownload}>
          <FaDownload className="btn-icon" /> Download Pass
        </button>
      </div>

      <div className="pass-container">
        <div className="pass-card front">
          <div className="pass-header z-high">
            {/* Added crossOrigin here too just in case */}
            <img src="/moodilogo.png" className="moodi-logo" alt="Mood Indigo" crossOrigin="anonymous" />
            <div className="header-content"><p className="pass-type">Entry Pass</p></div>
          </div>

          <div className="pass-body">
            <div className="pass-left-col z-low">
              <div className="pass-photo-section">
                {/* 🔥 CRITICAL FIX: crossOrigin="anonymous" 
                    This tells the browser "It's okay to use this image in a canvas"
                */}
                <img 
                  src={`${API_BASE}/api/accommodation/get-image?email=${encodeURIComponent(user.email)}`} 
                  alt="Participant"
                  className="pass-photo"
                  crossOrigin="anonymous" 
                  onError={(e) => {e.target.style.display='none'}}
                />
              </div>
              <div className="declarations z-high">
                <h3 className="decl-title">Declarations</h3>
                <ol className="decl-list">
                  <li>I will carry a valid government-issued photo ID (pan card, Aadhar, or passport) at all times while on festival premises.</li>
                  <li>I will comply with accommodation rules, check-in/check-out times and follow staff instructions for safety and conduct.</li>
                  <li>I confirm that the information provided is accurate. I accept responsibility for any violations arising from incorrect information.</li>
                  <li>We will abide by the rules and regulations set forth by IIT Bombay.</li>
                </ol>
              </div>
            </div>

            <div className="pass-right-col">
              <div className="pass-info z-low">
                <div className="info-row"><span className="info-label">Name</span><span className="info-value">{user.name}</span></div>
                <div className="info-row"><span className="info-label">MI Number</span><span className="info-value highlight">{user.miNo}</span></div>
                <div className="info-row"><span className="info-label">College</span><span className="info-value">{user.college}</span></div>
                
                {/* 🔥 UPDATED: Displays the FULL ID Number now */}
                <div className="info-row">
                    <span className="info-label">{user.govtIdType}</span>
                    <span className="info-value">{user.govtIdNumber}</span>
                </div>
              
              </div>
              <div className="pass-codes">
                <div className="qr-section z-high">
                  <span className="code-label">QR Code</span>
                  <div className="qr-code-wrapper">
                    <QRCode value={passUrl ? passUrl : 'Active after download'} size={260} />
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