import { useState, useEffect } from 'react';
import { Card, Upload, Button, message, Typography, Space, Divider, Input, Switch, Row, Col, Tabs, Table, Modal, Form, InputNumber, Select, Tag } from 'antd';
import { UploadOutlined, AndroidOutlined, DeleteOutlined, ClockCircleOutlined, PictureOutlined, SaveOutlined, PlusOutlined, EditOutlined, HistoryOutlined, SettingOutlined, TrophyOutlined, GiftOutlined } from '@ant-design/icons';
import { 
  uploadApkInfo, getApkInfo, deleteApkInfo, getOrderWindow, updateOrderWindow, 
  getHeroSlides, updateHeroSlides, uploadHeroImage, getCoinSettings, updateCoinSettings,
  getGamificationSettings, updateGamificationSettings, getRewardTiers, createRewardTier, 
  updateRewardTier, deleteRewardTier, getMissions, createMission, updateMission, 
  deleteMission, getCoinTransactions, getPaymentSettings, updatePaymentSettings
} from '../api/adminApi';

const { Title, Text, Paragraph } = Typography;

const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;

export default function AppSettings() {
  const [uploading, setUploading] = useState(false);
  const [apkInfo, setApkInfo] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [version, setVersion] = useState('1.0.0');



  const [heroSlides, setHeroSlides] = useState([
    { image: '', headline: '', text: '' },
    { image: '', headline: '', text: '' },
    { image: '', headline: '', text: '' },
    { image: '', headline: '', text: '' },
  ]);
  const [heroSlidesSaving, setHeroSlidesSaving] = useState(false);
  const [heroUploadingIndex, setHeroUploadingIndex] = useState(null);

  const [coinsPerRupee, setCoinsPerRupee] = useState(10);
  const [maxPlaysPerDay, setMaxPlaysPerDay] = useState(5);
  const [referrerReward, setReferrerReward] = useState(100);
  const [referredReward, setReferredReward] = useState(50);
  const [deliveryFee, setDeliveryFee] = useState(28);
  const [taxPercent, setTaxPercent] = useState(5);
  const [coinsSaving, setCoinsSaving] = useState(false);


  // Gamification States
  const [gamificationSettings, setGamificationSettings] = useState(null);
  const [rewardTiersList, setRewardTiersList] = useState([]);
  const [missionsList, setMissionsList] = useState([]);
  const [transactionsLedger, setTransactionsLedger] = useState([]);
  const [loadingGamification, setLoadingGamification] = useState(false);
  const [savingGamification, setSavingGamification] = useState(false);

  // Modals state
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [rewardForm] = Form.useForm();

  const [missionModalVisible, setMissionModalVisible] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [missionForm] = Form.useForm();

  useEffect(() => {
    fetchApkInfo();
    fetchOrderWindow();
    fetchPaymentSettings();
    fetchHeroSlides();
    fetchCoinSettings();
    fetchGamificationData();
  }, []);

  const fetchGamificationData = async () => {
    setLoadingGamification(true);
    try {
      const settingsRes = await getGamificationSettings();
      setGamificationSettings(settingsRes.data);
      
      const tiersRes = await getRewardTiers();
      setRewardTiersList(tiersRes.data);
      
      const missionsRes = await getMissions();
      setMissionsList(missionsRes.data);
      
      const transactionsRes = await getCoinTransactions();
      setTransactionsLedger(transactionsRes.data);
    } catch (e) {
      console.error('Failed to load gamification admin dashboard details:', e);
    } finally {
      setLoadingGamification(false);
    }
  };

  // Gamification Administrative Handlers
  const handleGamificationSettingsSave = async (values) => {
    setSavingGamification(true);
    try {
      await updateGamificationSettings(values);
      message.success('Game Economy Settings updated successfully!');
      fetchGamificationData();
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to update game economy settings');
    } finally {
      setSavingGamification(false);
    }
  };

  const handleRewardTierSave = async (values) => {
    try {
      if (editingReward) {
        await updateRewardTier(editingReward._id, values);
        message.success('Reward Tier updated successfully');
      } else {
        await createRewardTier(values);
        message.success('Reward Tier created successfully');
      }
      setRewardModalVisible(false);
      setEditingReward(null);
      rewardForm.resetFields();
      fetchGamificationData();
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to save Reward Tier');
    }
  };

  const handleRewardTierDelete = async (id) => {
    try {
      await deleteRewardTier(id);
      message.success('Reward Tier deleted');
      fetchGamificationData();
    } catch (e) {
      message.error('Failed to delete Reward Tier');
    }
  };

  const handleMissionSave = async (values) => {
    try {
      if (editingMission) {
        await updateMission(editingMission._id, values);
        message.success('Mission template updated');
      } else {
        await createMission(values);
        message.success('Mission template created');
      }
      setMissionModalVisible(false);
      setEditingMission(null);
      missionForm.resetFields();
      fetchGamificationData();
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to save mission');
    }
  };

  const handleMissionDelete = async (id) => {
    try {
      await deleteMission(id);
      message.success('Mission template deleted');
      fetchGamificationData();
    } catch (e) {
      message.error('Failed to delete mission template');
    }
  };

  const fetchHeroSlides = async () => {
    try {
      const res = await getHeroSlides();
      if (res.data && Array.isArray(res.data.slides)) {
        const slides = res.data.slides.slice(0, 4);
        setHeroSlides([
          slides[0] || { image: '', headline: '', text: '' },
          slides[1] || { image: '', headline: '', text: '' },
          slides[2] || { image: '', headline: '', text: '' },
          slides[3] || { image: '', headline: '', text: '' },
        ]);
      }
    } catch (e) {
      console.error('Failed to fetch hero slides:', e);
    }
  };

  const handleHeroSlideChange = (index, field, value) => {
    const next = [...heroSlides];
    next[index] = { ...next[index], [field]: value };
    setHeroSlides(next);
  };

  const handleHeroSlidesSave = async () => {
    setHeroSlidesSaving(true);
    try {
      await updateHeroSlides({ slides: heroSlides });
      message.success('Hero slides saved. App home will show these 4 slides.');
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to save hero slides');
    } finally {
      setHeroSlidesSaving(false);
    }
  };

  const handleHeroImageUpload = async (index, file, onSuccess, onError) => {
    setHeroUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await uploadHeroImage(formData, index);
      const url = res.data?.url;
      if (url) {
        handleHeroSlideChange(index, 'image', url);
        message.success(`Slide ${index + 1} image saved on server.`);
        onSuccess();
      } else {
        throw new Error('No URL returned');
      }
    } catch (e) {
      message.error(e.response?.data?.error || 'Upload failed');
      onError(e);
    } finally {
      setHeroUploadingIndex(null);
    }
  };

  const [orderWindowEnabled, setOrderWindowEnabled] = useState(true);
  const [orderWindowStart, setOrderWindowStart] = useState('00:00');
  const [orderWindowEnd, setOrderWindowEnd] = useState('23:59');
  const [ordersOpen, setOrdersOpen] = useState(true);
  const [codActive, setCodActive] = useState(true);
  const [onlineActive, setOnlineActive] = useState(true);
  const [orderWindowSaving, setOrderWindowSaving] = useState(false);
  const [orderStatusToggling, setOrderStatusToggling] = useState(false);

  const fetchOrderWindow = async () => {
    try {
      const res = await getOrderWindow();
      const d = res.data;
      setOrderWindowEnabled(d.orderWindowEnabled !== false);
      setOrderWindowStart(d.orderWindowStart || '00:00');
      setOrderWindowEnd(d.orderWindowEnd || '23:59');
      setOrdersOpen(d.ordersOpen);
    } catch (e) {
      console.error('Failed to fetch order window:', e);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await getPaymentSettings();
      setCodActive(res.data.codActive !== false);
      setOnlineActive(res.data.onlineActive !== false);
    } catch (e) {
      console.error('Failed to fetch payment settings:', e);
    }
  };

  const fetchCoinSettings = async () => {
    try {
      const res = await getCoinSettings();
      if (res.data) {
        if (res.data.coinsPerRupee) setCoinsPerRupee(res.data.coinsPerRupee);
        if (res.data.maxPlaysPerDay) setMaxPlaysPerDay(res.data.maxPlaysPerDay);
        if (res.data.referrerReward !== undefined) setReferrerReward(res.data.referrerReward);
        if (res.data.referredReward !== undefined) setReferredReward(res.data.referredReward);
        if (res.data.deliveryFee !== undefined) setDeliveryFee(res.data.deliveryFee);
        if (res.data.taxPercent !== undefined) setTaxPercent(res.data.taxPercent);
      }
    } catch (e) {
      console.error('Failed to fetch coin settings:', e);
    }
  };

  const handleCoinSettingsSave = async () => {
    setCoinsSaving(true);
    try {
      await updateCoinSettings({
        coinsPerRupee: Number(coinsPerRupee),
        maxPlaysPerDay: Number(maxPlaysPerDay),
        referrerReward: Number(referrerReward),
        referredReward: Number(referredReward),
        deliveryFee: Number(deliveryFee),
        taxPercent: Number(taxPercent),
      });
      message.success('System pricing & coin settings updated successfully!');
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to update coin settings');
    } finally {
      setCoinsSaving(false);
    }
  };


  const handleOrderWindowToggle = async (enabled) => {
    setOrderStatusToggling(true);
    try {
      const res = await updateOrderWindow({
        orderWindowEnabled: enabled,
        orderWindowStart: orderWindowStart,
        orderWindowEnd: orderWindowEnd,
      });
      setOrderWindowEnabled(res.data.orderWindowEnabled);
      setOrdersOpen(res.data.ordersOpen);
      message.success(enabled ? 'Orders are now accepted' : 'Orders are now closed');
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to update order window');
    } finally {
      setOrderStatusToggling(false);
    }
  };

  const handleOrderWindowTimeSave = async () => {
    if (!TIME_REGEX.test(orderWindowStart) || !TIME_REGEX.test(orderWindowEnd)) {
      message.error('Use 24-hour format for times (e.g. 09:00, 22:00)');
      return;
    }
    setOrderWindowSaving(true);
    try {
      const res = await updateOrderWindow({
        orderWindowEnabled,
        orderWindowStart,
        orderWindowEnd,
      });
      setOrdersOpen(res.data.ordersOpen);
      message.success('Order window times updated (IST)');
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to update');
    } finally {
      setOrderWindowSaving(false);
    }
  };

  const [codToggling, setCodToggling] = useState(false);
  const [onlineToggling, setOnlineToggling] = useState(false);

  const handlePaymentToggle = async (type, enabled) => {
    console.log(`[handlePaymentToggle] type=${type}, enabled=${enabled}, current codActive=${codActive}, current onlineActive=${onlineActive}`);
    if (type === 'cod') {
      setCodToggling(true);
    } else {
      setOnlineToggling(true);
    }
    const newCod = type === 'cod' ? enabled : codActive;
    const newOnline = type === 'online' ? enabled : onlineActive;
    const payload = {
      codActive: newCod,
      onlineActive: newOnline,
    };
    console.log('[handlePaymentToggle] Sending payload to new payment settings API:', payload);
    try {
      const res = await updatePaymentSettings(payload);
      console.log('[handlePaymentToggle] New API response data:', res.data);
      setCodActive(res.data.codActive !== false);
      setOnlineActive(res.data.onlineActive !== false);
      message.success(`${type.toUpperCase()} payment option updated!`);
    } catch (e) {
      console.error('[handlePaymentToggle] New API call failed:', e);
      message.error('Failed to toggle payment method');
    } finally {
      if (type === 'cod') {
        setCodToggling(false);
      } else {
        setOnlineToggling(false);
      }
    }
  };

  const fetchApkInfo = async () => {
    try {
      const response = await getApkInfo();
      if (response.data && response.data.available) {
        setApkInfo(response.data);
        // Set version from existing APK info if available
        if (response.data.version) {
          setVersion(response.data.version);
        }
      }
    } catch (error) {
      console.error('Failed to fetch APK info:', error);
    }
  };

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    try {
      console.log('📱 Uploading APK:', file.name, 'Size:', (file.size / (1024 * 1024)).toFixed(2) + ' MB');
      
      // Create FormData and append the actual file
      const formData = new FormData();
      formData.append('apk', file);
      formData.append('version', version); // Add version to form data
      
      console.log('📤 Sending APK to server with version:', version);
      const response = await uploadApkInfo(formData);
      
      console.log('✅ Upload response:', response.data);
      setApkInfo(response.data);
      
      message.success(`APK uploaded successfully! Size: ${response.data.size}`);
      setFileList([]);
      onSuccess();
    } catch (error) {
      console.error('❌ Upload failed:', error);
      message.error('Failed to upload APK: ' + (error.response?.data?.error || error.message));
      onError(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteApkInfo();
      setApkInfo(null);
      message.success('APK deleted successfully');
    } catch (error) {
      message.error('Failed to delete APK');
    }
  };

  const uploadProps = {
    name: 'apk',
    accept: '.apk',
    customRequest: handleUpload,
    fileList: fileList,
    onChange: ({ fileList }) => setFileList(fileList),
    maxCount: 1,
    beforeUpload: (file) => {
      const isApk = file.name.endsWith('.apk');
      if (!isApk) {
        message.error('You can only upload APK files!');
      }
      return isApk || Upload.LIST_IGNORE;
    },
  };

  return (
    <div className="admin-page" style={{ maxWidth: 960, fontFamily: 'Inter, sans-serif' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#2D4060', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Configuration</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.5px', marginBottom: 4 }}>App Settings</div>
        <div style={{ fontSize: 13, color: '#4B6180' }}>Configure live store parameters, gamification, APK and hero slides</div>
      </div>

      <Card
        title={
          <Space>
            <ClockCircleOutlined style={{ fontSize: 22, color: '#1890ff' }} />
            <span>Order Window</span>
            {ordersOpen != null && (
              <span
                style={{
                  marginLeft: 8,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  background: ordersOpen ? '#f6ffed' : '#fff2f0',
                  color: ordersOpen ? '#52c41a' : '#ff4d4f',
                  border: `1px solid ${ordersOpen ? '#b7eb8f' : '#ffccc7'}`,
                }}
              >
                {ordersOpen ? 'Open' : 'Closed'}
              </span>
            )}
          </Space>
        }
        style={{ marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: 12 }}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Turn orders on/off and set the active operating hours (IST). Users cannot check out outside these times.
        </Paragraph>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Text strong>Accept Orders Status:</Text>
            <Switch
              checked={orderWindowEnabled}
              onChange={handleOrderWindowToggle}
              loading={orderStatusToggling}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
            <Text type="secondary">
              {ordersOpen ? (
                <Text style={{ color: '#52c41a', fontWeight: 600 }}>● Active (Orders open)</Text>
              ) : (
                <Text style={{ color: '#ff4d4f', fontWeight: 600 }}>● Closed (Not accepting orders)</Text>
              )}
            </Text>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Available Payment Channels</Text>
            <Space size="large" wrap>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text>💵 Cash On Delivery (COD):</Text>
                <Switch
                  checked={codActive}
                  onChange={(checked) => handlePaymentToggle('cod', checked)}
                  loading={codToggling}
                  checkedChildren="ACTIVE"
                  unCheckedChildren="DISABLED"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text>💳 Online Payments (Razorpay):</Text>
                <Switch
                  checked={onlineActive}
                  onChange={(checked) => handlePaymentToggle('online', checked)}
                  loading={onlineToggling}
                  checkedChildren="ACTIVE"
                  unCheckedChildren="DISABLED"
                />
              </div>
            </Space>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Daily Operations Time Window (IST, 24h format)</Text>
            <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12, fontSize: 13 }}>
              Orders will automatically be blocked outside these operating parameters. Use 00:00–23:59 for 24/7.
            </Paragraph>
            <Space wrap align="center">
              <Input
                placeholder="Start e.g. 09:00"
                value={orderWindowStart}
                onChange={(e) => setOrderWindowStart(e.target.value)}
                style={{ width: 110 }}
              />
              <span style={{ color: '#999' }}>to</span>
              <Input
                placeholder="End e.g. 22:00"
                value={orderWindowEnd}
                onChange={(e) => setOrderWindowEnd(e.target.value)}
                style={{ width: 110 }}
              />
              <Button type="primary" onClick={handleOrderWindowTimeSave} loading={orderWindowSaving}>
                Save operating window
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      <Card
        title={
          <Space>
            <GiftOutlined style={{ fontSize: 22, color: '#fa8c16' }} />
            <span>Pricing, Coin & Referral Settings</span>
          </Space>
        }
        style={{ marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: 12 }}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Set system-wide pricing constants (delivery charge, tax %) along with referral program rewards.
        </Paragraph>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Delivery Charge (₹):</Text>
              <InputNumber
                min={0}
                value={deliveryFee}
                onChange={setDeliveryFee}
                style={{ width: '100%' }}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>GST / Tax Percentage (%):</Text>
              <InputNumber
                min={0}
                max={100}
                value={taxPercent}
                onChange={setTaxPercent}
                style={{ width: '100%' }}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Coins Per Rupee (₹1 value):</Text>
              <InputNumber
                min={1}
                value={coinsPerRupee}
                onChange={setCoinsPerRupee}
                style={{ width: '100%' }}
              />
            </div>
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 8 }}>
          <Col xs={24} sm={12} md={12}>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Referrer Reward (Coins):</Text>
              <InputNumber
                min={0}
                value={referrerReward}
                onChange={setReferrerReward}
                style={{ width: '100%' }}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={12}>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Referred User Reward (Coins):</Text>
              <InputNumber
                min={0}
                value={referredReward}
                onChange={setReferredReward}
                style={{ width: '100%' }}
              />
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: 12 }}>
          <Button
            type="primary"
            onClick={handleCoinSettingsSave}
            loading={coinsSaving}
            icon={<SaveOutlined />}
          >
            Save Pricing & Referral Settings
          </Button>
        </div>
      </Card>

      <Card
        title={
          <Space>
            <TrophyOutlined style={{ fontSize: 22, color: '#f5222d' }} />
            <span style={{ fontSize: 20 }}>Gamification & Retention Dashboard</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
        styles={{ body: { paddingTop: 8 } }}
        loading={loadingGamification}
      >
        <Tabs defaultActiveKey="1" items={[
          {
            key: '1',
            label: <span><SettingOutlined />Economy Settings</span>,
            children: (
              <Form
                layout="vertical"
                initialValues={gamificationSettings || {}}
                onFinish={handleGamificationSettingsSave}
                style={{ marginTop: 16 }}
              >
                <div style={{ background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <Text strong style={{ color: '#2f54eb' }}>🎯 Number Tap Game Settings</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    These settings control the Number Tap coin-earning game in the mobile app.
                  </Text>
                </div>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Taps Per Session (Attempts)"
                      name="attemptsPerSession"
                      required
                      tooltip="How many number taps a user gets per session"
                    >
                      <InputNumber min={1} max={30} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Coins Per Correct Tap"
                      name="coinsPerCorrect"
                      required
                      tooltip="Coins earned for each correct number tap"
                    >
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Sessions Per Day (Per User)"
                      name="maxSessionsPerDay"
                      required
                      tooltip="How many times a user can play the game per day"
                    >
                      <InputNumber min={1} max={20} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Perfect Session Bonus Coins"
                      name="bonusCoins"
                      required
                      tooltip="Extra coins awarded if the user gets ALL taps correct in a session"
                    >
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Daily Free Check-In Coins"
                      name="dailyRewardAmount"
                      required
                    >
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Weekly Coin Redemption Limit"
                      name="weeklyCoinRedemptionLimit"
                      required
                    >
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Game Active" name="isActive" valuePropName="checked">
                  <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={savingGamification} icon={<SaveOutlined />}>
                    Save Game Settings
                  </Button>
                </Form.Item>
              </Form>
            )
          },
          {
            key: '2',
            label: <span><GiftOutlined />Reward Tiers (Coupons)</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => { setEditingReward(null); rewardForm.resetFields(); setRewardModalVisible(true); }}
                  style={{ marginBottom: 16 }}
                >
                  Add Reward Tier
                </Button>
                <Table 
                  dataSource={rewardTiersList} 
                  rowKey="_id"
                  columns={[
                    { title: 'Title', dataIndex: 'title', key: 'title' },
                    { title: 'Coins Required', dataIndex: 'coinsRequired', key: 'coinsRequired', render: val => `🪙 ${val}` },
                    { title: 'Coupon Value', dataIndex: 'couponValue', key: 'couponValue', render: val => `₹${val}` },
                    { title: 'Weekly Limit', dataIndex: 'weeklyLimit', key: 'weeklyLimit' },
                    { title: 'Monthly Limit', dataIndex: 'monthlyLimit', key: 'monthlyLimit' },
                    { title: 'Active', dataIndex: 'isActive', key: 'isActive', render: val => val ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_, record) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingReward(record); rewardForm.setFieldsValue(record); setRewardModalVisible(true); }} />
                          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleRewardTierDelete(record._id)} />
                        </Space>
                      )
                    }
                  ]} 
                />
              </div>
            )
          },
          {
            key: '3',
            label: <span><HistoryOutlined />Accounting Ledger</span>,
            children: (
              <div style={{ marginTop: 16 }}>
                <Table 
                  dataSource={transactionsLedger} 
                  rowKey="_id"
                  columns={[
                    { title: 'User', dataIndex: 'userId', key: 'user', render: user => user ? `${user.name} (${user.email})` : 'N/A' },
                    { 
                      title: 'Type', 
                      dataIndex: 'type', 
                      key: 'type', 
                      render: type => {
                        const colors = {
                          GAME_REWARD: 'blue',
                          MISSION_REWARD: 'green',
                          STREAK_REWARD: 'orange',
                          DAILY_REWARD: 'purple',
                          COUPON_REDEMPTION: 'red',
                          ADMIN_ADJUSTMENT: 'magenta',
                          REFERRAL_BONUS: 'gold',
                          REFERRAL_SIGNUP_BONUS: 'cyan'
                        };
                        return <Tag color={colors[type] || 'default'}>{type}</Tag>;

                      } 
                    },
                    { 
                      title: 'Coins', 
                      dataIndex: 'coins', 
                      key: 'coins', 
                      render: coins => (
                        <span style={{ color: coins >= 0 ? '#52c41a' : '#f5222d', fontWeight: 'bold' }}>
                          {coins >= 0 ? `+${coins}` : coins}
                        </span>
                      )
                    },
                    { title: 'Source Description', dataIndex: 'source', key: 'source' },
                    { title: 'Timestamp', dataIndex: 'createdAt', key: 'timestamp', render: date => new Date(date).toLocaleString() }
                  ]}
                />
              </div>
            )
          }
        ]} />
      </Card>

      {/* Add/Edit Reward Tier Modal */}
      <Modal
        title={editingReward ? "Edit Reward Tier" : "Add Reward Tier"}
        open={rewardModalVisible}
        onCancel={() => { setRewardModalVisible(false); setEditingReward(null); }}
        footer={null}
      >
        <Form form={rewardForm} layout="vertical" onFinish={handleRewardTierSave}>
          <Form.Item label="Reward Title" name="title" required rules={[{ required: true, message: 'Title is required' }]}>
            <Input placeholder="e.g. ₹10 Off Coupon" />
          </Form.Item>
          <Form.Item label="Coins Required" name="coinsRequired" required rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Coupon Value (₹)" name="couponValue" required rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Weekly User Limit" name="weeklyLimit" required rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Monthly User Limit" name="monthlyLimit" required rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Active Status" name="isActive" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item label="Sort Order" name="sortOrder" initialValue={0}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Save Reward Tier
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add/Edit Mission Modal */}
      <Modal
        title={editingMission ? "Edit Mission Template" : "Add Mission Template"}
        open={missionModalVisible}
        onCancel={() => { setMissionModalVisible(false); setEditingMission(null); }}
        footer={null}
      >
        <Form form={missionForm} layout="vertical" onFinish={handleMissionSave}>
          <Form.Item label="Mission Description/Name" name="name" required rules={[{ required: true, message: 'Description is required' }]}>
            <Input placeholder="e.g. Catch 8 treats in a single game" />
          </Form.Item>
          <Form.Item label="Mission Type" name="type" required rules={[{ required: true }]}>
            <Select options={[
              { value: 'PLAY_GAME', label: 'Play Game counts' },
              { value: 'SCORE_TARGET', label: 'Target High Score' },
              { value: 'COLLECT_GOLDEN_BONE', label: 'Catch Golden Bones' },
              { value: 'COMBO_TARGET', label: 'Achieve Combos' }
            ]} />
          </Form.Item>
          <Form.Item label="Difficulty" name="difficulty" required rules={[{ required: true }]}>
            <Select options={[
              { value: 'EASY', label: 'Easy' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HARD', label: 'Hard' }
            ]} />
          </Form.Item>
          <Form.Item label="Target Amount/Value" name="target" required rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Reward Coins" name="rewardCoins" required rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Active Status" name="isActive" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Save Mission Template
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Card
        title={
          <Space>
            <PictureOutlined style={{ fontSize: 22, color: '#722ed1' }} />
            <span>Home Hero Slides</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
        styles={{ body: { paddingTop: 8 } }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          Upload images (saved on server) or paste image URL. Then add headline and text. Click &quot;Save Hero Slides&quot; to persist. Data is saved in server folder and stays after refresh.
        </Paragraph>
        <Row gutter={[16, 16]}>
          {[0, 1, 2, 3].map((i) => (
            <Col xs={24} md={12} key={i}>
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: 16,
                  background: 'rgba(255,255,255,0.025)',
                  height: '100%',
                }}
              >
                <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block', color: '#F1F5F9' }}>Slide {i + 1}</Text>
                {heroSlides[i]?.image && (
                  <div
                    style={{
                      marginBottom: 12,
                      borderRadius: 8,
                      overflow: 'hidden',
                      height: 100,
                      background: '#eee',
                    }}
                  >
                    <img
                      src={heroSlides[i].image}
                      alt={`Slide ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div style={{ marginBottom: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Image (upload or URL)</Text>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      customRequest={({ file, onSuccess, onError }) => {
                        handleHeroImageUpload(i, file, onSuccess, onError);
                      }}
                    >
                      <Button
                        size="small"
                        icon={<PictureOutlined />}
                        loading={heroUploadingIndex === i}
                      >
                        Upload image
                      </Button>
                    </Upload>
                    <Input
                      placeholder="Or paste image URL"
                      value={heroSlides[i]?.image || ''}
                      onChange={(e) => handleHeroSlideChange(i, 'image', e.target.value)}
                      style={{ flex: 1, minWidth: 140 }}
                      size="small"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Headline</Text>
                  <Input
                    placeholder="e.g. Quick Delivery"
                    value={heroSlides[i]?.headline || ''}
                    onChange={(e) => handleHeroSlideChange(i, 'headline', e.target.value)}
                    style={{ marginTop: 4 }}
                    size="small"
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Short text</Text>
                  <Input
                    placeholder="e.g. Hot food at your door, fast"
                    value={heroSlides[i]?.text || ''}
                    onChange={(e) => handleHeroSlideChange(i, 'text', e.target.value)}
                    style={{ marginTop: 4 }}
                    size="small"
                  />
                </div>
              </div>
            </Col>
          ))}
        </Row>
        <div style={{ marginTop: 16 }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleHeroSlidesSave}
            loading={heroSlidesSaving}
            size="middle"
          >
            Save Hero Slides
          </Button>
        </div>
      </Card>

      <Card title="Download Link" style={{ marginBottom: 24 }}>
        <Paragraph>
          Users can download the APK from the landing page using the "Download App" button.
        </Paragraph>
        {apkInfo && (
          <div>
            <Text type="secondary">Direct Download URL:</Text>
            <br />
            <Text code copyable style={{ fontSize: 12 }}>
              {window.location.origin + apkInfo.url}
            </Text>
          </div>
        )}
      </Card>

      <Card title="Setup Instructions">
        <Paragraph>
          <Text strong>For Production:</Text>
        </Paragraph>
        <ol>
          <li>Build your React Native app using: <Text code>cd client && npx react-native build-android --mode=release</Text></li>
          <li>The APK will be located at: <Text code>client/android/app/build/outputs/apk/release/app-release.apk</Text></li>
          <li>Upload the APK file using the form above</li>
          <li>The APK will be available for download on the landing page</li>
        </ol>
        <Paragraph type="secondary" style={{ marginTop: 16 }}>
          Note: In production, you should implement proper file storage (like AWS S3) and CDN for APK distribution.
        </Paragraph>
      </Card>
    </div>
  );
}
