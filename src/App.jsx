import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import { ToastContainer } from './components/ui';

import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Purchases  from './pages/Purchases';
import Inventory  from './pages/Inventory';
import Sales      from './pages/Sales';
import Customers  from './pages/Customers';
import Payments   from './pages/Payments';
import Debtors    from './pages/Debtors';
import Expenses   from './pages/Expenses';
import Users             from './pages/Users';
import CustomerStatement from './pages/CustomerStatement';
import MailRecipients    from './pages/MailRecipients';
import FarmSetup        from './pages/FarmSetup';

const PAGE_TITLES = {
  '/':          'Dashboard',
  '/purchases': 'Egg Purchases',
  '/inventory': 'Inventory',
  '/sales':     'Sales & Distribution',
  '/customers': 'Customers',
  '/payments':  'Payments',
  '/debtors':   'Debtors',
  '/expenses':  'Expenses',
  '/users':     'User Management',
  '/statement':        'Customer Statement',
  '/mail-recipients':  'Mail Recipients',
  '/farm-setup':       'Farm Setup',
};

function Topbar({ onMenuOpen }) {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'EggTrack';
  const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Hamburger — mobile only */}
        <button
          className="hamburger-btn"
          onClick={onMenuOpen}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>
        <h2>{title}</h2>
      </div>
      <span className="topbar-date">{now}</span>
    </header>
  );
}

function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar  = useCallback(() => setSidebarOpen(true),  []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="layout">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="main">
        <Topbar onMenuOpen={openSidebar} />
        <div className="page-content">{children}</div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route path="/" element={
            <ProtectedRoute><AppShell><Dashboard /></AppShell></ProtectedRoute>
          } />
          <Route path="/purchases" element={
            <ProtectedRoute><AppShell><Purchases /></AppShell></ProtectedRoute>
          } />
          <Route path="/inventory" element={
            <ProtectedRoute><AppShell><Inventory /></AppShell></ProtectedRoute>
          } />
          <Route path="/sales" element={
            <ProtectedRoute><AppShell><Sales /></AppShell></ProtectedRoute>
          } />
          <Route path="/customers" element={
            <ProtectedRoute><AppShell><Customers /></AppShell></ProtectedRoute>
          } />
          <Route path="/payments" element={
            <ProtectedRoute><AppShell><Payments /></AppShell></ProtectedRoute>
          } />
          <Route path="/debtors" element={
            <ProtectedRoute><AppShell><Debtors /></AppShell></ProtectedRoute>
          } />
          <Route path="/expenses" element={
            <ProtectedRoute><AppShell><Expenses /></AppShell></ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute><AppShell><Users /></AppShell></ProtectedRoute>
          } />
          <Route path="/statement" element={
            <ProtectedRoute><AppShell><CustomerStatement /></AppShell></ProtectedRoute>
          } />
          <Route path="/mail-recipients" element={
            <ProtectedRoute><AppShell><MailRecipients /></AppShell></ProtectedRoute>
          } />
          <Route path="/farm-setup" element={
            <ProtectedRoute><AppShell><FarmSetup /></AppShell></ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
