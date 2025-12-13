import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FaDownload } from 'react-icons/fa';
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

    fetch(`${API_BASE}/api/accommodation/get?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setUser)
      .catch(() => navigate('/login'));
  }, [navigate]);

  // 🔥 FIXED DOWNLOAD HANDLER (DESKTOP LAYOUT ALWAYS)
  const handleDownload = async () => {
    const pass = document.querySelector('.pass-card');
    if (!pass || !user) return;

    // Save original styles
    const originalWidth = pass.style.width;
    const originalTransform = pass.style.transform;
    const originalPosition = pass.style.position;

    // Force desktop layout
    pass.style.width = '1024px';
    pass.style.transform = 'scale(1)';
    pass.style.position = 'relative';

    // Wait for reflow
    await new Promise(resolve => setTimeout(resolve, 120));

    const canvas = await html2canvas(pass, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      windowWidth: 1200
    });

    // Restore original styles
    pass.style.width = originalWidth;
    pass.style.transform = originalTransform;
    pass.style.position = originalPosition;

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`Entry_Pass_${user.miNo}.pdf`);
  };

  if (!user) {
    return (
      <div className="pass-loading">
        <div className="spinner"></div>
        <p>Loading your entry pass…</p>
      </div>
    );
  }

  // ✅ FULL QR PAYLOAD
  const qrPayload = JSON.stringify({
    name: user.name,
    miNo: user.miNo,
    email: user.email,
    college: user.college,
    gender: user.gender,
    phone: user.phone,
    type: 'entry_pass'
  });

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
            <img src="/moodilogo.png" className="moodi-logo" alt="Mood Indigo" />
            <div className="header-content">
              <p className="pass-type">Entry Pass</p>
            </div>
          </div>

          <div className="pass-body">

            {/* LEFT COLUMN */}
            <div className="pass-left-col z-low">
              <div className="pass-photo-section">
                <div className="pass-photo-placeholder" />
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
              </div>

              <div className="pass-codes">
                <div className="qr-section z-high">
                  <span className="code-label">QR Code</span>
                  <div className="qr-code-wrapper">
                    <QRCode value={qrPayload} size={260} />
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
