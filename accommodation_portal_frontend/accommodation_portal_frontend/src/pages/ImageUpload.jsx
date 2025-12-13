import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/ImageUpload.css';
import { auth } from '../firebase';
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

  const userName = localStorage.getItem('userName');
  const userEmail = localStorage.getItem('userEmail');

  /* =========================
     AUTH TOKEN (BACKEND ONLY)
  ========================== */
  const getTokenForUpload = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;
    return token;
  };

  /* =========================
     LOGIN GUARD
  ========================== */
  useEffect(() => {
    if (!userName || !userEmail) {
      localStorage.clear();
      navigate('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     CHECK IF IMAGE ALREADY UPLOADED
  ========================== */
  useEffect(() => {
    let cancelled = false;

    const checkUploadStatus = async () => {
      if (!userEmail) {
        setCheckingStatus(false);
        return;
      }

      try {
        const token = await getTokenForUpload();
        if (!token) {
          localStorage.clear();
          navigate('/login');
          return;
        }

        const url = `${API_BASE}/api/accommodation/check`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ email: userEmail })
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.clear();
          navigate('/login');
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.imageUploaded) {
            navigate('/pass');
            return;
          }
        }
      } catch (err) {
        console.error('Upload-status check error:', err);
      } finally {
        if (!cancelled) setCheckingStatus(false);
      }
    };

    checkUploadStatus();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, navigate, userEmail]);

  /* =========================
     CAMERA CLEANUP
  ========================== */
  useEffect(() => {
    return () => stopActiveStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopActiveStream = () => {
    const stream = activeStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(t => {
        try {
          t.stop();
        } catch {}
      });
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

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
     FILE VALIDATION
  ========================== */
  const validateFile = (file) => {
    if (!file) return 'No file selected';
    if (!file.type.startsWith('image/')) return 'Please select an image file';
    if (file.size > MAX_SIZE_BYTES) return 'Image size must be under 1MB';
    return null;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }

    setSelectedImage(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  /* =========================
     CAMERA CAPTURE
  ========================== */
  const handleCameraCapture = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      activeStreamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      if (cameraInputRef.current) cameraInputRef.current.click();
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) return setError('Capture failed');

      if (blob.size > MAX_SIZE_BYTES) {
        return setError('Captured image exceeds 1MB');
      }

      const file = new File([blob], `camera-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        stopActiveStream();
      };
      reader.readAsDataURL(file);
    }, 'image/jpeg', 0.85);
  };

  const handleFileUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  /* =========================
     IMAGE UPLOAD
  ========================== */
  const handleUpload = async () => {
    if (!selectedImage) return setError('Please select an image');

    const err = validateFile(selectedImage);
    if (err) return setError(err);

    const token = await getTokenForUpload();
    if (!token) {
      localStorage.clear();
      navigate('/login');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', selectedImage);

      const res = await fetch(`${API_BASE}/api/accommodation/upload-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate('/login');
        return;
      }

      const data = await res.json();
      if (res.ok && data.ok) {
        navigate('/pass');
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="image-upload-page">
      <div className="upload-container">
        <div className="upload-header">
          <img src="/moodilogo.png" className="moodi-logo" alt="Mood Indigo" />
          <h1>Upload Your Photo</h1>
          <p className="user-greeting">
            Welcome, <strong>{userName}</strong>!
          </p>
          <p className="upload-instruction">
            Please upload a clear photo for your access pass
          </p>
        </div>

        <div className="upload-content">
          {showCamera ? (
            <div className="camera-view">
              <video ref={videoRef} autoPlay playsInline className="camera-video" />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="camera-controls">
                <button className="capture-photo-btn" onClick={capturePhoto}>
                  <FaCamera className="btn-icon" />
                  Capture Photo
                </button>
                <button className="close-camera-btn" onClick={stopActiveStream}>
                  Close Camera
                </button>
              </div>
            </div>
          ) : !imagePreview ? (
            <div className="upload-area">
              <div className="upload-icon">📸</div>
              <p>Capture or upload your photo</p>
              <p className="upload-hint">Max size: 1MB</p>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileSelect}
                hidden
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                hidden
              />

              <div className="upload-buttons">
                <button className="capture-btn" onClick={handleCameraCapture}>
                  <FaCamera className="btn-icon" />
                  Take Photo
                </button>

                <button className="upload-btn" onClick={handleFileUpload}>
                  <FaUpload className="btn-icon" />
                  Choose from Device
                </button>
              </div>
            </div>
          ) : (
            <div className="preview-area">
              <div className="image-preview-container">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="image-preview"
                />
                {uploading && (
                  <div className="upload-overlay">
                    <div className="spinner" />
                    <p>Uploading your photo...</p>
                  </div>
                )}
              </div>

              <div className="preview-actions">
                <button
                  className="submit-btn"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  <FaCheckCircle className="btn-icon" />
                  {uploading ? 'Uploading...' : 'Submit Photo'}
                </button>
                <button
                  className="reset-btn"
                  onClick={handleReset}
                  disabled={uploading}
                >
                  Retake Photo
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
