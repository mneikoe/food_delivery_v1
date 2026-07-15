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
          colorPrimary: '#FACC15',
          colorPrimaryHover: '#EAB308',
          colorPrimaryActive: '#CA8A04',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          borderRadius: 6,
          borderRadiusLG: 10,
          borderRadiusSM: 4,
          /* Deep navy base — no white bleeding */
          colorBgBase:        '#080F1E',
          colorBgLayout:      '#0D1B2E',
          colorBgContainer:   '#112036',
          colorBgElevated:    '#172845',
          colorBgSpotlight:   '#080F1E',
          colorBorder:        '#1E3352',
          colorBorderSecondary: 'rgba(255,255,255,0.06)',
          colorSplit:         'rgba(255,255,255,0.06)',
          colorText:          '#F1F5F9',
          colorTextBase:      '#F1F5F9',
          colorTextSecondary: '#94A3B8',
          colorTextDescription: '#94A3B8',
          colorTextDisabled:  '#4B6180',
          colorTextHeading:   '#F1F5F9',
          colorTextPlaceholder: '#4B6180',
          colorFill:          'rgba(255,255,255,0.04)',
          colorFillSecondary: 'rgba(255,255,255,0.06)',
          colorFillTertiary:  'rgba(255,255,255,0.03)',
          colorFillQuaternary: 'rgba(255,255,255,0.02)',
          boxShadow:          '0 4px 16px rgba(0,0,0,0.4)',
          boxShadowSecondary: '0 8px 32px rgba(0,0,0,0.5)',
        },
        components: {
          Layout: {
            bodyBg:     '#0D1B2E',
            headerBg:   '#080F1E',
            siderBg:    '#080F1E',
            triggerBg:  '#080F1E',
            triggerColor: '#94A3B8',
          },
          Card: {
            colorBgContainer:   '#112036',
            colorBorderSecondary: 'rgba(255,255,255,0.06)',
            borderRadiusLG:     14,
            boxShadow:          '0 2px 12px rgba(0,0,0,0.3)',
            paddingLG:          20,
          },
          Table: {
            headerBg:           'rgba(255,255,255,0.03)',
            headerColor:        '#4B6180',
            headerSortActiveBg: 'rgba(255,255,255,0.04)',
            bodySortBg:         'transparent',
            rowHoverBg:         'rgba(255,255,255,0.025)',
            rowSelectedBg:      'rgba(250,204,21,0.08)',
            colorBgContainer:   '#112036',
            colorText:          '#94A3B8',
            colorBorderSecondary: 'rgba(255,255,255,0.05)',
            borderColor:        'rgba(255,255,255,0.05)',
            cellPaddingBlock:   14,
            cellPaddingInline:  16,
            headerBorderRadius: 0,
          },
          Button: {
            controlHeight:    36,
            fontWeight:       600,
            colorBgContainer: 'rgba(255,255,255,0.04)',
            defaultBorderColor: '#1E3352',
            defaultColor:     '#94A3B8',
          },
          Input: {
            controlHeight:    38,
            colorBgContainer: '#112036',
            colorBorder:      '#1E3352',
            colorText:        '#F1F5F9',
            colorTextPlaceholder: '#4B6180',
            activeBorderColor: '#FACC15',
            activeShadow:     '0 0 0 2px rgba(250,204,21,0.12)',
          },
          InputNumber: {
            colorBgContainer: '#112036',
            colorBorder:      '#1E3352',
            colorText:        '#F1F5F9',
          },
          Select: {
            controlHeight:        38,
            colorBgContainer:     '#112036',
            colorBorder:          '#1E3352',
            colorText:            '#F1F5F9',
            optionSelectedBg:     'rgba(250,204,21,0.1)',
            optionSelectedColor:  '#FACC15',
            optionActiveBg:       'rgba(255,255,255,0.04)',
            colorBgElevated:      '#0D1B2E',
          },
          DatePicker: {
            colorBgContainer: '#112036',
            colorBorder:      '#1E3352',
            colorText:        '#F1F5F9',
            colorBgElevated:  '#0D1B2E',
          },
          Modal: {
            contentBg:        '#0D1B2E',
            headerBg:         '#080F1E',
            colorBgContainer: '#0D1B2E',
            colorText:        '#F1F5F9',
            colorTextHeading: '#F1F5F9',
            borderRadiusLG:   16,
            titleFontSize:    15,
            titleLineHeight:  1.4,
          },
          Drawer: {
            colorBgContainer: '#0D1B2E',
            colorText:        '#F1F5F9',
            colorTextHeading: '#F1F5F9',
            colorBorder:      '#1E3352',
          },
          Descriptions: {
            colorBgContainer:   'transparent',
            colorText:          '#F1F5F9',
            colorTextSecondary: '#4B6180',
            colorBorderSecondary: 'rgba(255,255,255,0.06)',
            labelBg:            'rgba(255,255,255,0.03)',
          },
          Form: {
            labelColor: '#94A3B8',
          },
          Tag: {
            borderRadiusSM: 100,
          },
          Switch: {
            colorPrimary: '#FACC15',
            handleBg: '#080F1E',
          },
          Pagination: {
            colorBgContainer: '#112036',
            colorBorder:      '#1E3352',
          },
          Tabs: {
            inkBarColor:            '#FACC15',
            itemActiveColor:        '#FACC15',
            itemSelectedColor:      '#FACC15',
            itemColor:              '#4B6180',
            itemHoverColor:         '#94A3B8',
            cardBg:                 'transparent',
          },
          Statistic: {
            titleFontSize: 11,
          },
          Divider: {
            colorSplit: 'rgba(255,255,255,0.06)',
          },
          Spin: {
            colorPrimary: '#FACC15',
          },
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
