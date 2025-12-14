import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import { FaDownload, FaCheckCircle } from 'react-icons/fa';
import '../css/AccommodationPass.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const AccessPass = () => {
  const [user, setUser] = useState(null);
  const [passUrl, setPassUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  /* ===========================
      1. FETCH USER DATA
  =========================== */
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
      
      // If pass already exists in DB, just show it (Don't auto-generate again)
      if (data.passImagePath) {
        setPassUrl(`${API_BASE}/passes/${data.passImagePath}`);
      }
    })
    .catch(() => navigate('/login'));
  }, [navigate]);


  /* ===========================
      2. GENERATE & SAVE FUNCTION
  =========================== */
  const generateAndSavePass = useCallback(async (userData) => {
    const passElement = document.querySelector('.pass-card');
    if (!passElement || !userData) return;

    setIsGenerating(true);

    try {
      console.log("🔄 Auto-generating pass...");

      // A. Wait for images to load (Profile + Logo)
      const images = passElement.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));

      // B. Generate Canvas
      const canvas = await html2canvas(passElement, {
        scale: 2,
        useCORS: true, 
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200
      });

      // C. Convert to Blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.9));

      if (!blob) throw new Error("Blob generation failed");

      // D. Upload to Backend
      const formData = new FormData();
      formData.append('pass', blob);

      const res = await fetch(`${API_BASE}/api/accommodation/save-pass`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('jwtToken')}` },
        body: formData
      });

      const data = await res.json();
      if (!data.ok) throw new Error("Server save failed");

      // E. Success Update
      console.log("✅ Pass saved to backend!");
      const fullUrl = `${API_BASE}${data.url}`;
      setPassUrl(fullUrl);
      
      // Update local user state so we don't re-generate
      setUser(prev => ({ ...prev, passImagePath: data.url }));

    } catch (err) {
      console.error("Auto-Generation Error:", err);
    } finally {
      setIsGenerating(false);
    }
  }, []);


  /* ===========================
      3. AUTO-TRIGGER LOGIC
  =========================== */
  useEffect(() => {
    // Only generate if:
    // 1. User data is loaded
    // 2. We don't have a saved pass URL yet
    // 3. We aren't currently generating one
    if (user && !user.passImagePath && !passUrl && !isGenerating) {
        // Small timeout to ensure DOM is rendered
        const timer = setTimeout(() => {
            generateAndSavePass(user);
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [user, passUrl, isGenerating, generateAndSavePass]);


  /* ===========================
      4. MANUAL DOWNLOAD
  =========================== */
  const handleManualDownload = () => {
    if (!passUrl) {
        alert("Pass is being generated, please wait...");
        return;
    }
    const link = document.createElement('a');
    link.href = passUrl; 
    link.download = `Entry_Pass_${user?.miNo || 'Moodi'}.png`;
    link.click();
  };


  /* ===========================
      RENDER
  =========================== */
  if (!user) {
    return <div className="pass-loading"><div className="spinner"></div><p>Loading your entry pass...</p></div>;
  }

  return (
    <div className="accommodation-pass-page">
      <div className="pass-actions no-print">
        <button 
          className="action-btn download-btn" 
          onClick={handleManualDownload}
          disabled={!passUrl || isGenerating}
        >
          {isGenerating ? (
            <span>Generating...</span>
          ) : (
            <>
               <FaDownload className="btn-icon" /> 
               {passUrl ? "Download Pass" : "Preparing..."}
            </>
          )}
        </button>
      </div>

      <div className="pass-container">
        {/* Pass Card */}
        <div className="pass-card front">
          
          <div className="pass-header z-high">
            <img src="/moodilogo.png" className="moodi-logo" alt="Mood Indigo" crossOrigin="anonymous" />
            <div className="header-content"><p className="pass-type">Entry Pass</p></div>
          </div>

          <div className="pass-body">
            <div className="pass-left-col z-low">
              <div className="pass-photo-section">
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
                  <li>I will carry a valid government-issued photo ID (PAN Card, Aadhar, or Passport) at all times while on festival premises.</li>
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
                
                {/* Full ID Number */}
                <div className="info-row">
                    <span className="info-label">{user.govtIdType}</span>
                    <span className="info-value">{user.govtIdNumber}</span>
                </div>
              </div>

              <div className="pass-codes">
                <div className="qr-section z-high">
                  <span className="code-label">QR Code</span>
                  <div className="qr-code-wrapper">
                    {/* Shows saved URL if available, else placeholders */}
                    <QRCode 
                        value={passUrl ? passUrl : `Validating: ${user.miNo}`} 
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