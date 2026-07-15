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
import PaymentDashboard from './pages/PaymentDashboard';
import UserProtectedRoute from './components/UserProtectedRoute';
import './App.css';

const { Content } = Layout;

const customerTheme = {
  token: {
    colorPrimary: '#f97316',
    colorBgBase: '#020617',
    colorBgContainer: '#111827',
    colorBorder: '#1f2937',
    colorText: '#f8fafc',
    colorTextDescription: '#cbd5e1',
    colorTextHeading: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
    borderRadiusLG: 16,
    borderRadius: 12,
    borderRadiusSM: 8,
  },
  components: {
    Card: {
      colorBgContainer: 'rgba(17, 24, 39, 0.6)',
      borderColor: '#1f2937',
      borderRadiusLG: 16,
    },
    Button: {
      borderRadius: 10,
      controlHeight: 40,
      fontFamily: "'Inter', sans-serif",
      fontWeight: 600,
    },
    Input: {
      colorBgContainer: '#0b0f19',
      colorBorder: '#1f2937',
      colorText: '#f8fafc',
      colorTextPlaceholder: '#94a3b8',
    },
    Segmented: {
      itemSelectedBg: '#f97316',
      itemSelectedColor: '#ffffff',
      colorBgLayout: 'rgba(255, 255, 255, 0.03)',
    },
    Drawer: {
      colorBgContainer: '#111827',
      colorText: '#f8fafc',
    },
    Modal: {
      colorBgContainer: '#111827',
      colorText: '#f8fafc',
    }
  }
};

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const token = localStorage.getItem('admin_token');
  const userToken = localStorage.getItem('user_token');

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#10B981',
          colorPrimaryHover: '#059669',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          borderRadius: 8,
          borderRadiusLG: 12,
          colorBgLayout: '#f8fafc',
          colorBgContainer: '#ffffff',
          colorBorderSecondary: '#f1f5f9',
          colorText: '#0f172a',
          colorTextDescription: '#64748b',
          boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        },
        components: {
          Card: {
            borderRadiusLG: 12,
            colorBorderSecondary: '#f1f5f9',
            boxShadowTertiary: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
          },
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#0f172a',
            headerBorderRadius: 8,
            rowHoverBg: '#f1f5f9',
          },
          Button: {
            controlHeight: 38,
            fontWeight: 600,
          },
          Input: {
            controlHeight: 38,
          },
          Select: {
            controlHeight: 38,
          }
        },
      }}
    >
      <Router>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<ConfigProvider theme={customerTheme}><LandingPage /></ConfigProvider>} />
          <Route path="/privacypolicy" element={<ConfigProvider theme={customerTheme}><PrivacyPolicy /></ConfigProvider>} />
          
          {/* Admin Login */}
          <Route path="/admin/login" element={!token ? <Login /> : <Navigate to="/admin" replace />} />
          
          {/* Customer Routes with Unified Theme */}
          <Route
            path="/user/login"
            element={
              <ConfigProvider theme={customerTheme}>
                {!userToken ? <UserLogin /> : <Navigate to="/user/app" replace />}
              </ConfigProvider>
            }
          />
          <Route
            path="/user/app"
            element={
              <ConfigProvider theme={customerTheme}>
                <UserProtectedRoute>
                  <UserApp />
                </UserProtectedRoute>
              </ConfigProvider>
            }
          />
          <Route
            path="/user/food/:foodId"
            element={
              <ConfigProvider theme={customerTheme}>
                <UserProtectedRoute>
                  <UserFoodDetails />
                </UserProtectedRoute>
              </ConfigProvider>
            }
          />
          <Route
            path="/user/categories"
            element={
              <ConfigProvider theme={customerTheme}>
                <UserProtectedRoute>
                  <UserCategoriesPage />
                </UserProtectedRoute>
              </ConfigProvider>
            }
          />
          <Route
            path="/user/items"
            element={
              <ConfigProvider theme={customerTheme}>
                <UserProtectedRoute>
                  <UserAllItemsPage />
                </UserProtectedRoute>
              </ConfigProvider>
            }
          />
          <Route
            path="/user/category/:categoryId/items"
            element={
              <ConfigProvider theme={customerTheme}>
                <UserProtectedRoute>
                  <UserCategoryItemsPage />
                </UserProtectedRoute>
              </ConfigProvider>
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
                        <Route path="/payments" element={<PaymentDashboard />} />
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
