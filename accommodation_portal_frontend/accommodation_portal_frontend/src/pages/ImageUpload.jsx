import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/ImageUpload.css';
import { FaCamera, FaUpload, FaCheckCircle } from 'react-icons/fa';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

const ImageUpload = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [showCamera, setShowCamera] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const activeStreamRef = useRef(null);
  const navigate = useNavigate();

  // ✅ ONLY THESE TWO MATTER
  const userEmail = localStorage.getItem('userEmail');
  const jwtToken = localStorage.getItem('jwtToken');

  /* =========================
     LOGIN GUARD (FIXED)
  ========================== */
  useEffect(() => {
    if (!userEmail || !jwtToken) {
      localStorage.clear();
      navigate('/login');
      return;
    }
    setCheckingStatus(false);
  }, [navigate, userEmail, jwtToken]);

  /* =========================
     CHECK IF IMAGE ALREADY UPLOADED
  ========================== */
  useEffect(() => {
    let cancelled = false;

    const checkUploadStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/accommodation/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });

        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.imageUploaded) {
            navigate('/pass');
          }
        }
      } catch (err) {
        console.error('Upload status check failed:', err);
      } finally {
        if (!cancelled) setCheckingStatus(false);
      }
    };

    if (userEmail) checkUploadStatus();
    return () => { cancelled = true; };
  }, [API_BASE, navigate, userEmail]);

  /* =========================
     CAMERA CLEANUP
  ========================== */
  useEffect(() => {
    return () => {
      const stream = activeStreamRef.current;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  if (checkingStatus) {
    return (
      <div className="image-upload-page">
        <div className="upload-container">
          <div className="loading-container">
            <div className="spinner" />
            <p>Checking your upload status...</p>
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     FILE HANDLERS (UNCHANGED)
  ========================== */
  const validateFile = (file) => {
    if (!file) return 'No file selected';
    if (!file.type.startsWith('image/')) return 'Invalid image file';
    if (file.size > MAX_SIZE_BYTES) return 'Image must be under 1MB';
    return null;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateFile(file);
    if (err) return setError(err);

    setSelectedImage(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedImage) return setError('Please select an image');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', selectedImage);

      const res = await fetch(`${API_BASE}/api/accommodation/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        navigate('/pass');
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload-page">
      <div className="upload-container">
        <div className="upload-header">
          <img src="/moodilogo.png" className="moodi-logo" alt="Mood Indigo" />
          <h1>Upload Your Photo</h1>
          <p className="user-greeting">
            Welcome!
          </p>
          <p className="upload-instruction">
            Please upload a clear photo for your access pass
          </p>
        </div>

        <div className="upload-content">
          {!imagePreview ? (
            <div className="upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                hidden
              />
              <button className="upload-btn" onClick={() => fileInputRef.current.click()}>
                <FaUpload className="btn-icon" /> Choose Photo
              </button>
            </div>
          ) : (
            <div className="preview-area">
              <img src={imagePreview} className="image-preview" alt="Preview" />
              <button className="submit-btn" onClick={handleUpload} disabled={uploading}>
                <FaCheckCircle className="btn-icon" />
                {uploading ? 'Uploading…' : 'Submit Photo'}
              </button>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
