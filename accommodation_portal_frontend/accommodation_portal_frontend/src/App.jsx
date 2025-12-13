import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import ImageUpload from './pages/ImageUpload';
import AccessPass from './pages/AccessPass';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/upload" element={<ImageUpload />} />
        <Route path="/pass" element={<AccessPass />} />
      </Routes>
    </Router>
  );
}

export default App;
