import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { i18nPromise } from './i18n';

// Components
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AssetsPage from './pages/AssetsPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import AdminSecurityDashboard from './pages/AdminSecurityDashboard';
import TranslationManagementPage from './pages/TranslationManagementPage';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main App Component
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { i18n } = useTranslation();

  // Set language from user preferences
  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.preferred_language && user.preferred_language !== i18n.language) {
        i18n.changeLanguage(user.preferred_language);
      }
    }
  }, [i18n]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
          } 
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets"
          element={
            <ProtectedRoute>
              <Layout>
                <AssetsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <Layout>
                <AdminPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requireAdmin>
              <Layout>
                <AdminDashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <Layout>
                <UserManagementPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/security"
          element={
            <ProtectedRoute requireAdmin>
              <Layout>
                <AdminSecurityDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/translations"
          element={
            <ProtectedRoute requireAdmin>
              <Layout>
                <TranslationManagementPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route 
          path="/" 
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
          } 
        />
        
        {/* Catch all route */}
        <Route 
          path="*" 
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
          } 
        />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    i18nPromise.then(() => {
      setI18nReady(true);
    }).catch((error) => {
      console.error('Failed to initialize i18n:', error);
      setI18nReady(true); // Still render the app even if i18n fails
    });
  }, []);

  if (!i18nReady) {
    return <LoadingSpinner />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;