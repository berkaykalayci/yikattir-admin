import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { AdminLayout } from './layouts/AdminLayout.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { UsersPage } from './pages/Users.jsx';
import { BusinessesPage } from './pages/Businesses.jsx';
import { AppointmentsPage } from './pages/Appointments.jsx';
import { ReviewsPage } from './pages/Reviews.jsx';
import { SettingsPage } from './pages/Settings.jsx';
import { LoginPage } from './pages/Login.jsx';
import { ApprovalsPage } from './pages/Approvals.jsx';

function App() {
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setToken(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        
        <Route 
          path="/" 
          element={token ? <AdminLayout onLogout={handleLogout} /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="businesses" element={<BusinessesPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
