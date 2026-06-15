import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
import Sidebar from './components/Sidebar';
import AdminHeader from './components/AdminHeader';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import UserLogin from './pages/UserLogin';
import UserApp from './pages/UserApp';
import UserFoodDetails from './pages/UserFoodDetails';
import UserCategoriesPage from './pages/UserCategoriesPage';
import UserAllItemsPage from './pages/UserAllItemsPage';
import UserCategoryItemsPage from './pages/UserCategoryItemsPage';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Coupons from './pages/Coupons';
import Offers from './pages/Offers';
import Orders from './pages/Orders';
import DeliveryPartners from './pages/DeliveryPartners';
import PushManager from './pages/PushManager';
import AppSettings from './pages/AppSettings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import UserProtectedRoute from './components/UserProtectedRoute';
import './App.css';

const { Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const token = localStorage.getItem('admin_token');
  const userToken = localStorage.getItem('user_token');

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#10B981',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          borderRadiusLG: 12,
          boxShadowSecondary: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)',
        },
        components: {
          Card: {
            borderRadiusLG: 12,
          },
        },
      }}
    >
      <Router>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacypolicy" element={<PrivacyPolicy />} />
          
          {/* Admin Login */}
          <Route path="/admin/login" element={!token ? <Login /> : <Navigate to="/admin" replace />} />
          <Route
            path="/user/login"
            element={!userToken ? <UserLogin /> : <Navigate to="/user/app" replace />}
          />
          <Route
            path="/user/app"
            element={
              <UserProtectedRoute>
                <UserApp />
              </UserProtectedRoute>
            }
          />
          <Route
            path="/user/food/:foodId"
            element={
              <UserProtectedRoute>
                <UserFoodDetails />
              </UserProtectedRoute>
            }
          />
          <Route
            path="/user/categories"
            element={
              <UserProtectedRoute>
                <UserCategoriesPage />
              </UserProtectedRoute>
            }
          />
          <Route
            path="/user/items"
            element={
              <UserProtectedRoute>
                <UserAllItemsPage />
              </UserProtectedRoute>
            }
          />
          <Route
            path="/user/category/:categoryId/items"
            element={
              <UserProtectedRoute>
                <UserCategoryItemsPage />
              </UserProtectedRoute>
            }
          />
          <Route path="/user" element={<Navigate to={userToken ? '/user/app' : '/user/login'} replace />} />
          
          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <Layout className="admin-shell">
                  <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
                  <Layout
                    className="admin-layout admin-main-col"
                    style={{
                      marginLeft: collapsed ? 80 : 250,
                      transition: 'margin-left 0.2s',
                    }}
                  >
                    <AdminHeader />
                    <Content className="admin-scroll">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/categories" element={<Categories />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/coupons" element={<Coupons />} />
                        <Route path="/offers" element={<Offers />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/delivery-partners" element={<DeliveryPartners />} />
                        <Route path="/push-manager" element={<PushManager />} />
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
