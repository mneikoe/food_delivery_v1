import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Coupons from './pages/Coupons';
import Offers from './pages/Offers';
import Orders from './pages/Orders';
import DeliveryPartners from './pages/DeliveryPartners';
import AppSettings from './pages/AppSettings';
import './App.css';

const { Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const token = localStorage.getItem('admin_token');

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#10B981',
        },
      }}
    >
      <Router>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Admin Login */}
          <Route path="/admin/login" element={!token ? <Login /> : <Navigate to="/admin" replace />} />
          
          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <Layout style={{ minHeight: '100vh' }}>
                  <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
                  <Layout 
                    className="admin-layout"
                    style={{ 
                      marginLeft: collapsed ? 80 : 250, 
                      transition: 'margin-left 0.2s' 
                    }}
                  >
                    <Content 
                      className="admin-content"
                      style={{ 
                        margin: '24px 16px', 
                        padding: 24, 
                        background: '#fff', 
                        minHeight: 280 
                      }}
                    >
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/categories" element={<Categories />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/coupons" element={<Coupons />} />
                        <Route path="/offers" element={<Offers />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/delivery-partners" element={<DeliveryPartners />} />
                        <Route path="/app-settings" element={<AppSettings />} />
                        <Route path="*" element={<Navigate to="/admin" replace />} />
                      </Routes>
                    </Content>
                  </Layout>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
