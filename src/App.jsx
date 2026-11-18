import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FeedbackPage from './pages/FeedbackPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Halaman Publik */}
        <Route path="/" element={<FeedbackPage />} />

        {/* Halaman Login Admin */}
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboard Admin Terproteksi */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirect rute tak dikenal ke halaman utama */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}