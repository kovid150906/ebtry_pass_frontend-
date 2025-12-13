import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/ImageUpload.css';
import { FaCamera, FaCheckCircle } from 'react-icons/fa';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const MAX_SIZE_BYTES = 1 * 1024 * 1024;

const ImageUpload = () => {
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  const userEmail = localStorage.getItem('userEmail');
  const jwtToken = localStorage.getItem('jwtToken');

  // 🔥 BACKEND IS SOURCE OF TRUTH
  useEffect(() => {
    if (!userEmail || !jwtToken) {
      navigate('/login');
      return;
    }

    fetch(`${API_BASE}/api/accommodation/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ email: userEmail })
    })
      .then(res => res.json())
      .then(data => {
        if (data.imageUploaded) {
          navigate('/pass', { replace: true });
        }
      })
      .catch(() => {
        localStorage.clear();
        navigate('/login');
      });
  }, [navigate, userEmail, jwtToken]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setShowCamera(true);
    } catch {
      setError('Camera permission denied');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      if (!blob || blob.size > MAX_SIZE_BYTES) {
        setError('Image too large (max 1MB)');
        return;
      }

      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(blob));

      streamRef.current.getTracks().forEach(t => t.stop());
      setShowCamera(false);
    }, 'image/jpeg', 0.9);
  };

  const uploadImage = async () => {
    if (!selectedImage) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', selectedImage);

      const res = await fetch(`${API_BASE}/api/accommodation/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.ok) navigate('/pass');
      else setError(data.error || 'Upload failed');

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
          <p className="upload-instruction">
            Please upload a clear photo for your accommodation pass
          </p>
        </div>

        <div className="upload-content">
          {!imagePreview && !showCamera && (
            <div className="upload-area">
              <div className="upload-icon">📸</div>
              <p className="upload-text">Click below to capture your photo</p>
              <p className="upload-hint">Maximum file size: 1MB</p>

              <div className="upload-buttons">
                <button className="capture-btn" onClick={startCamera}>
                  <FaCamera className="btn-icon" />
                  Take Photo
                </button>
              </div>
            </div>
          )}

          {showCamera && (
            <div className="camera-view">
              <video ref={videoRef} autoPlay className="camera-video" />
              <canvas ref={canvasRef} hidden />
              <div className="camera-controls">
                <button className="capture-photo-btn" onClick={capturePhoto}>
                  Capture Photo
                </button>
              </div>
            </div>
          )}

          {imagePreview && (
            <div className="preview-area">
              <div className="image-preview-container">
                <img src={imagePreview} className="image-preview" alt="Preview" />
              </div>

              <div className="preview-actions">
                <button
                  className="submit-btn"
                  onClick={uploadImage}
                  disabled={uploading}
                >
                  <FaCheckCircle className="btn-icon" />
                  {uploading ? 'Uploading…' : 'Submit Photo'}
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
