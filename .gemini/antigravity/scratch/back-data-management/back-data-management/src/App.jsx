import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { YearProvider } from './context/YearContext';
import Navbar from './components/layout/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Categories from './pages/Categories';
import UserManagement from './pages/UserManagement';
import UserProfile from './pages/UserProfile';
import DataInput from './pages/DataInput';
import Status from './pages/Status';
import Budget from './pages/Budget';
import Statistics from './pages/Statistics';

// Protected Route Component
const ProtectedLayout = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-16"> {/* Add padding-top equal to navbar height */}
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <YearProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/input" element={<DataInput />} />
              <Route path="/status" element={<Status />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/stats" element={<Statistics />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/admin" element={<UserManagement />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </YearProvider>
  );
}
