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

  useEffect(() => {
    if (!userEmail || !jwtToken) navigate('/login');
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
        </div>

        {!imagePreview && !showCamera && (
          <button className="capture-btn" onClick={startCamera}>
            <FaCamera /> Click Photo
          </button>
        )}

        {showCamera && (
          <div className="camera-view">
            <video ref={videoRef} autoPlay className="camera-video" />
            <canvas ref={canvasRef} hidden />
            <button className="capture-photo-btn" onClick={capturePhoto}>
              Capture
            </button>
          </div>
        )}

        {imagePreview && (
          <div className="preview-area">
            <img src={imagePreview} className="image-preview" alt="Preview" />
            <button
              className="submit-btn"
              onClick={uploadImage}
              disabled={uploading}
            >
              <FaCheckCircle />
              {uploading ? 'Uploading…' : 'Submit Photo'}
            </button>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default ImageUpload;
