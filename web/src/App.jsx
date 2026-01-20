import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Coupons from './pages/Coupons';
import Offers from './pages/Offers';
import Orders from './pages/Orders';
import DeliveryPartners from './pages/DeliveryPartners';
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
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" replace />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout style={{ minHeight: '100vh' }}>
                  <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
                  <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'margin-left 0.2s' }}>
                    <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/categories" element={<Categories />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/coupons" element={<Coupons />} />
                        <Route path="/offers" element={<Offers />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/delivery-partners" element={<DeliveryPartners />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Content>
                  </Layout>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
