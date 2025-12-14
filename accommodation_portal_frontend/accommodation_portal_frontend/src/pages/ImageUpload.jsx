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
  
  // State for Govt ID
  const [idType, setIdType] = useState('Aadhar Card');
  const [idNumber, setIdNumber] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  const userEmail = localStorage.getItem('userEmail');
  const jwtToken = localStorage.getItem('jwtToken');

  // 1. Check Login Status on Mount
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

  // 2. Attach Stream to Video Element when Camera Toggles On
  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showCamera]);

  // Cleanup stream when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setError('');
    try {
      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser. Please use Chrome or Safari.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' } // Requests front camera
      });

      streamRef.current = stream;
      setShowCamera(true); // This triggers the useEffect above
      
    } catch (err) {
      console.error("Camera Error:", err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
         setError('Permission denied. Please reset permissions in your browser address bar.');
      } else if (err.name === 'NotFoundError') {
         setError('No camera device found.');
      } else if (err.name === 'NotReadableError') {
         setError('Camera is in use by another app.');
      } else {
         setError(`Camera error: ${err.message}`);
      }
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      if (!blob) {
        setError('Failed to capture image.');
        return;
      }
      if (blob.size > MAX_SIZE_BYTES) {
        setError('Image too large (max 1MB). Try good lighting.');
        return;
      }

      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(blob));

      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      setShowCamera(false);
    }, 'image/jpeg', 0.9);
  };

  const uploadImage = async () => {
    if (!selectedImage) return;

    if (!idNumber || idNumber.length !== 4) {
        setError('Please enter exactly the last 4 digits of your ID');
        return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', selectedImage);
      formData.append('idType', idType);
      formData.append('idNumber', idNumber);

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

    } catch (err) {
      console.error(err);
      setError('Network error. Check your connection.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload-page">
      <div className="upload-container">

        <div className="upload-header">
          <img src="/moodilogo.png" className="moodi-logo" alt="Mood Indigo" />
          <h1>Upload Verification</h1>
          <p className="upload-instruction">
            Upload your photo and ID details for your pass.
          </p>
        </div>

        <div className="upload-content">
          {!imagePreview && !showCamera && (
            <div className="upload-area">
              <div className="upload-icon">📸</div>
              <p className="upload-text">Click below to capture your photo</p>
              
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
              {/* playsInline required for iPhone */}
              <video ref={videoRef} autoPlay playsInline className="camera-video" />
              <canvas ref={canvasRef} hidden />
              <div className="camera-controls">
                <button className="capture-photo-btn" onClick={capturePhoto}>
                  Capture
                </button>
              </div>
            </div>
          )}

          {imagePreview && (
            <div className="preview-area">
              <div className="image-preview-container">
                <img src={imagePreview} className="image-preview" alt="Preview" />
              </div>

              <div className="govt-id-section" style={{ 
                  marginTop: '20px', 
                  textAlign: 'left', 
                  width: '100%',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '15px',
                  borderRadius: '10px'
              }}>
                 
                 <label style={{ display: 'block', color: '#fff', marginBottom: '8px', fontSize:'14px' }}>
                    Select Govt ID Type
                 </label>
                 <select 
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px',
                        marginBottom: '15px',
                        borderRadius: '5px',
                        border: 'none',
                        fontSize: '16px'
                    }}
                 >
                    <option value="Aadhar Card">Aadhar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="College ID">College ID</option>
                    <option value="Passport">Passport</option>
                 </select>

                 <label style={{ display: 'block', color: '#fff', marginBottom: '8px', fontSize:'14px' }}>
                    Last 4 Digits of ID
                 </label>
                 <input 
                   type="text"
                   maxLength="4"
                   placeholder="e.g. 4589"
                   value={idNumber}
                   onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
                   style={{
                     width: '100%',
                     padding: '12px',
                     borderRadius: '5px',
                     border: 'none',
                     fontSize: '18px',
                     letterSpacing: '3px',
                     textAlign: 'center',
                     fontWeight: 'bold'
                   }}
                 />
              </div>

              <div className="preview-actions">
                <button
                  className="submit-btn"
                  onClick={uploadImage}
                  disabled={uploading}
                  style={{ marginTop: '20px', width: '100%' }}
                >
                  <FaCheckCircle className="btn-icon" />
                  {uploading ? 'Uploading…' : 'Submit & Generate Pass'}
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