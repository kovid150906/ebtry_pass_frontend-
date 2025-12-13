import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate } from 'react-router-dom';

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
      .then(setUser);
  }, [navigate]);

  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <h2>Access Pass</h2>
      <p><b>MI:</b> {user.miNo}</p>
      <p><b>Name:</b> {user.name}</p>
      <p><b>College:</b> {user.college}</p>
      <QRCode value={JSON.stringify(user)} />
    </div>
  );
};

export default AccessPass;
