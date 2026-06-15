import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, Form, Input, Select, Button, Table, Tabs, 
  Tag, Alert, Modal, Switch, Tooltip, Space, message, Popconfirm 
} from 'antd';
import axios from 'axios';

const { Option } = Select;
const { TabPane } = Tabs;

export default function PushManager() {
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);
  const [audienceLoading, setAudienceLoading] = useState(false);
  
  // Stats counters
  const [audiencePreview, setAudiencePreview] = useState({ userCount: 0, deviceCount: 0 });
  const [history, setHistory] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  // Form instance for broadcast
  const [broadcastForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  const [testForm] = Form.useForm();
  
  // Selection/Target states
  const [selectedTarget, setSelectedTarget] = useState('ALL_USERS');
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Live Preview States
  const [previewTitle, setPreviewTitle] = useState('Weekend Special Offer! 🍕');
  const [previewBody, setPreviewBody] = useState('Get 20% discount on all orders above ₹299. Tap to order now!');
  const [previewDeepLink, setPreviewDeepLink] = useState('OFFERS');
  
  // Confirmation Modal state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingBroadcastData, setPendingBroadcastData] = useState(null);

  // Headers config helper
  const getHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    fetchHistory();
    fetchTemplates();
    handleTargetChange(selectedTarget);
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/push/admin/push/history', getHeaders());
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await axios.get('/api/push/admin/push/templates', getHeaders());
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleTargetChange = async (value) => {
    setSelectedTarget(value);
    setAudienceLoading(true);
    try {
      const res = await axios.get(`/api/push/admin/push/audience-preview?targetType=${value}`, getHeaders());
      setAudiencePreview(res.data);
    } catch (err) {
      message.error('Failed to fetch targeted devices preview count');
    } finally {
      setAudienceLoading(false);
    }
  };

  // Triggers confirmation overlay
  const handleBroadcastSubmit = (values) => {
    setPendingBroadcastData(values);
    setConfirmVisible(true);
  };

  // Execution dispatch call
  const triggerBroadcastPush = async () => {
    setConfirmVisible(false);
    setLoading(true);
    try {
      const payload = {
        title: pendingBroadcastData.title,
        body: pendingBroadcastData.body,
        targetType: selectedTarget,
        deepLink: pendingBroadcastData.deepLink,
        singleUserId: pendingBroadcastData.singleUserId || undefined,
      };

      const res = await axios.post('/api/push/admin/push/broadcast', payload, getHeaders());
      message.success(`Push Broadcast Dispatched! Sent to ${res.data.sentCount} devices successfully.`);
      broadcastForm.resetFields();
      setPreviewTitle('Weekend Special Offer! 🍕');
      setPreviewBody('Get 20% discount on all orders above ₹299. Tap to order now!');
      fetchHistory();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to dispatch broadcast');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPushSubmit = async (values) => {
    setLoading(true);
    try {
      await axios.post('/api/push/admin/push/test-single', values, getHeaders());
      message.success('Test push message successfully queued and dispatched!');
      testForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to send test push message');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (values) => {
    try {
      if (editingTemplate) {
        await axios.put(`/api/push/admin/push/templates/${editingTemplate._id}`, values, getHeaders());
        message.success('Template updated successfully');
      } else {
        await axios.post('/api/push/admin/push/templates', values, getHeaders());
        message.success('Template created successfully');
      }
      setTemplateModalVisible(false);
      templateForm.resetFields();
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await axios.delete(`/api/push/admin/push/templates/${id}`, getHeaders());
      message.success('Template deleted successfully');
      fetchTemplates();
    } catch (err) {
      message.error('Failed to delete template');
    }
  };

  const loadTemplateIntoBroadcast = (tpl) => {
    broadcastForm.setFieldsValue({
      title: tpl.title,
      body: tpl.body,
      deepLink: tpl.deepLink,
    });
    setPreviewTitle(tpl.title);
    setPreviewBody(tpl.body);
    setPreviewDeepLink(tpl.deepLink || 'OFFERS');
    setActiveTab('1');
    message.info(`Loaded template "${tpl.name}" into composer.`);
  };

  const columnsLogs = [
    { title: 'Date', dataIndex: 'createdAt', render: (val) => new Date(val).toLocaleString('en-IN') },
    { title: 'Title', dataIndex: 'title', render: (val) => <span style={{ fontWeight: 600, color: '#1e293b' }}>{val}</span> },
    { title: 'Target', dataIndex: 'targetType', render: (val) => <Tag color="blue">{val}</Tag> },
    { title: 'Sent ✅', dataIndex: 'sentCount', render: (val) => <span style={{ fontWeight: 'bold', color: '#10b981' }}>{val}</span> },
    { title: 'Failed ❌', dataIndex: 'failedCount', render: (val) => <span style={{ color: val > 0 ? '#ef4444' : '#94a3b8' }}>{val}</span> },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      render: (val) => <Tag color={val === 'SENT' ? 'success' : val === 'SIMULATED' ? 'warning' : 'error'}>{val}</Tag> 
    },
  ];

  const columnsTemplates = [
    { title: 'Name', dataIndex: 'name', render: (val) => <Tag color="purple" style={{ fontWeight: 600 }}>{val}</Tag> },
    { title: 'Push Title', dataIndex: 'title', render: (val) => <span style={{ fontWeight: 500 }}>{val}</span> },
    { title: 'Body Text', dataIndex: 'body', ellipsis: true },
    { title: 'Action Deep Link', dataIndex: 'deepLink', render: (val) => val ? <Tag color="cyan">{val}</Tag> : '-' },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" size="small" style={{ borderRadius: 6 }} onClick={() => loadTemplateIntoBroadcast(record)}>Use</Button>
          <Button size="small" style={{ borderRadius: 6 }} onClick={() => {
            setEditingTemplate(record);
            templateForm.setFieldsValue(record);
            setTemplateModalVisible(true);
          }}>Edit</Button>
          <Popconfirm title="Delete template?" onConfirm={() => handleDeleteTemplate(record._id)}>
            <Button type="text" danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="pm-root">
      
      {/* Header Info */}
      <div className="pm-header">
        <div>
          <div className="pm-greeting">📣 Push Campaigns & Alerts</div>
          <div className="pm-subtitle">Compose, target, preview, and broadcast instant push notifications to client mobile devices.</div>
        </div>
        <div className="pm-badge">🚀 Firebase FCM Live</div>
      </div>

      {/* Analytics Info Cards Row */}
      <Row gutter={[16, 16]} className="pm-stats-row">
        <Col xs={24} sm={8}>
          <div className="pm-stat-card" style={{ '--color': '#10b981' }}>
            <div className="pm-stat-icon">👥</div>
            <div className="pm-stat-body">
              <div className="pm-stat-value">{audiencePreview.userCount}</div>
              <div className="pm-stat-label">Targeted Profiles</div>
            </div>
            <div className="pm-stat-glow" style={{ background: '#10b981' }} />
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="pm-stat-card" style={{ '--color': '#0ea5e9' }}>
            <div className="pm-stat-icon">📱</div>
            <div className="pm-stat-body">
              <div className="pm-stat-value">{audiencePreview.deviceCount}</div>
              <div className="pm-stat-label">Registered Tokens</div>
            </div>
            <div className="pm-stat-glow" style={{ background: '#0ea5e9' }} />
          </div>
        </Col>
        <Col xs={24} sm={8}>
          <div className="pm-stat-card" style={{ '--color': '#8b5cf6' }}>
            <div className="pm-stat-icon">📊</div>
            <div className="pm-stat-body">
              <div className="pm-stat-value">{history.length}</div>
              <div className="pm-stat-label">Dispatched Campaigns</div>
            </div>
            <div className="pm-stat-glow" style={{ background: '#8b5cf6' }} />
          </div>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} className="pm-tabs">
        
        {/* Tab 1: Compose and Broadcast */}
        <TabPane tab={<span className="pm-tab-title">📣 Campaign Composer</span>} key="1">
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={14}>
              <Card title={<span className="pm-card-title">✨ Create Campaign Notification</span>} className="pm-main-card">
                <Form 
                  form={broadcastForm} 
                  layout="vertical" 
                  onValuesChange={(changed, all) => {
                    if (all.title !== undefined) setPreviewTitle(all.title || 'Notification Title');
                    if (all.body !== undefined) setPreviewBody(all.body || 'Notification message goes here...');
                    if (all.deepLink !== undefined) setPreviewDeepLink(all.deepLink || 'APP_HOME');
                  }}
                  onFinish={handleBroadcastSubmit}
                >
                  
                  <Form.Item label={<span className="pm-label">Target Segment</span>} name="targetType" initialValue="ALL_USERS">
                    <Select onChange={handleTargetChange} className="pm-select">
                      <Option value="ALL_USERS">All Active Users</Option>
                      <Option value="CUSTOMERS">Customers Only</Option>
                      <Option value="DELIVERY_PARTNERS">Delivery Riders Only</Option>
                      <Option value="ADMINS">Administrators</Option>
                      <Option value="SINGLE_USER">Single Targeted User (Direct ID)</Option>
                    </Select>
                  </Form.Item>

                  {selectedTarget === 'SINGLE_USER' && (
                    <Form.Item label={<span className="pm-label">User MongoDB ID</span>} name="singleUserId" rules={[{ required: true, message: 'Please provide user database ID' }]}>
                      <Input placeholder="Enter 24-character hex ID (e.g. 660f...)" className="pm-input" />
                    </Form.Item>
                  )}

                  <Form.Item label={<span className="pm-label">Notification Title</span>} name="title" initialValue="Weekend Special Offer! 🍕" rules={[{ required: true, message: 'Heading is required' }]}>
                    <Input placeholder="e.g. Delicious hot pizza deals! 🍕" className="pm-input" />
                  </Form.Item>

                  <Form.Item label={<span className="pm-label">Push Message Body</span>} name="body" initialValue="Get 20% discount on all orders above ₹299. Tap to order now!" rules={[{ required: true, message: 'Push text description required' }]}>
                    <Input.TextArea rows={4} placeholder="Type push message details..." className="pm-textarea" />
                  </Form.Item>

                  <Form.Item label={<span className="pm-label">Action Target (Deep Link Destination)</span>} name="deepLink">
                    <Select placeholder="Select screen deep link destination" allowClear className="pm-select">
                      <Option value="GAME">🎮 Puppy Game Hub</Option>
                      <Option value="COUPON">🎟️ My Coupons Page</Option>
                      <Option value="OFFERS">🎁 Special Offers & Deals</Option>
                      <Option value="TRACK">🛵 Order Tracking Screen</Option>
                    </Select>
                  </Form.Item>

                  <Button type="primary" htmlType="submit" loading={loading} className="pm-dispatch-btn">
                    🚀 Dispatch Campaign to {audiencePreview.deviceCount} Devices
                  </Button>
                </Form>
              </Card>
            </Col>
            
            <Col xs={24} lg={10}>
              <Card title={<span className="pm-card-title">📱 Live Device Preview</span>} className="pm-preview-card">
                <div className="pm-phone-preview">
                  <div className="pm-phone-screen">
                    <div className="pm-phone-notch" />
                    
                    {/* Lock Screen Widgets */}
                    <div className="pm-phone-time">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="pm-phone-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                    
                    {/* Live Notification Bubble */}
                    <div className="pm-notification-bubble">
                      <div className="pm-notification-header">
                        <div className="pm-notification-app">
                          <span className="pm-app-icon">🥘</span>
                          <span className="pm-app-name">Chatora Adda</span>
                        </div>
                        <span className="pm-notification-time">now</span>
                      </div>
                      <div className="pm-notification-title">{previewTitle}</div>
                      <div className="pm-notification-body">{previewBody}</div>
                      {previewDeepLink && (
                        <div className="pm-notification-action">
                          🔗 Tap opens: <strong>{previewDeepLink}</strong>
                        </div>
                      )}
                    </div>
                    
                    {/* Swipe to open indicator */}
                    <div className="pm-phone-footer">
                      <div className="pm-home-bar" />
                      <span>Swipe up to open</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: 20 }}>
                  <Alert 
                    message="Instant Delivery Guarantee" 
                    description="Firebase Cloud Messaging will push this immediately to active app sessions and device notification trays. Unsubscribed users will automatically filter out based on preferences."
                    type="success" 
                    showIcon 
                    className="pm-alert"
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* Tab 2: Templates Management */}
        <TabPane tab={<span className="pm-tab-title">📝 Templates Library</span>} key="2">
          <Card 
            title={<span className="pm-card-title">Campaign Templates</span>} 
            extra={<Button type="primary" onClick={() => { setEditingTemplate(null); templateForm.resetFields(); setTemplateModalVisible(true); }} className="pm-add-btn">Create Template</Button>}
            className="pm-main-card"
          >
            <Table dataSource={templates} columns={columnsTemplates} rowKey="_id" pagination={{ pageSize: 8 }} className="pm-table" />
          </Card>
        </TabPane>

        {/* Tab 3: History Logs */}
        <TabPane tab={<span className="pm-tab-title">⏳ Audit Logs</span>} key="3">
          <Card title={<span className="pm-card-title">Campaign Send History</span>} className="pm-main-card">
            <Table dataSource={history} columns={columnsLogs} rowKey="_id" pagination={{ pageSize: 8 }} className="pm-table" />
          </Card>
        </TabPane>

        {/* Tab 4: Direct Test Tool */}
        <TabPane tab={<span className="pm-tab-title">🧪 Diagnostic Dispatch</span>} key="4">
          <Card title={<span className="pm-card-title">Targeted Device Direct Inject</span>} className="pm-main-card">
            <Alert 
              message="Developer / QA Diagnostic Tool" 
              description="Manually dispatch a raw test notification to a specific device registry token to verify notification listener setup without targeting actual live customer segments."
              type="warning" 
              showIcon 
              className="pm-alert-warn"
            />
            
            <Form form={testForm} layout="vertical" onFinish={handleTestPushSubmit} style={{ marginTop: 24 }}>
              <Form.Item label={<span className="pm-label">FCM Target Token</span>} name="token" rules={[{ required: true, message: 'Device Token is required' }]}>
                <Input placeholder="Paste FCM registration token here..." className="pm-input" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label={<span className="pm-label">Test Heading</span>} name="title" initialValue="Chatora Adda Test Alert 🔔" rules={[{ required: true, message: 'Test title is required' }]}>
                    <Input className="pm-input" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<span className="pm-label">Deep Link Screen</span>} name="deepLink">
                    <Select placeholder="Target Screen Action" allowClear className="pm-select">
                      <Option value="GAME">🎮 Puppy Game Hub</Option>
                      <Option value="COUPON">🎟️ My Coupons Page</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label={<span className="pm-label">Test Description Text</span>} name="body" initialValue="Congratulations, if you are reading this your device push configuration is running correctly!" rules={[{ required: true, message: 'Test description is required' }]}>
                <Input.TextArea rows={3} className="pm-textarea" />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={loading} className="pm-dispatch-btn" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>
                ⚡ Dispatch Diagnostic Push
              </Button>
            </Form>
          </Card>
        </TabPane>
      </Tabs>

      {/* Confirmation Step modal for Campaigns */}
      <Modal
        title={<span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Confirm Campaign Broadcast</span>}
        visible={confirmVisible}
        onOk={triggerBroadcastPush}
        onCancel={() => setConfirmVisible(false)}
        okText="Confirm & Dispatch Now"
        cancelText="Cancel"
        className="pm-modal"
      >
        <p style={{ color: '#64748b' }}>You are about to broadcast a push notification immediately to all registered user devices in the selected target segment:</p>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', margin: '16px 0' }}>
          <div style={{ marginBottom: 6 }}><strong>Audience:</strong> {selectedTarget.replace('_', ' ')} ({audiencePreview.userCount} users, {audiencePreview.deviceCount} devices)</div>
          <div style={{ marginBottom: 6 }}><strong>Push Title:</strong> {pendingBroadcastData?.title}</div>
          <div style={{ marginBottom: 6 }}><strong>Body Message:</strong> {pendingBroadcastData?.body}</div>
          {pendingBroadcastData?.deepLink && <div><strong>Target Action:</strong> Link to {pendingBroadcastData?.deepLink}</div>}
        </div>
        <p style={{ color: '#ef4444', fontWeight: '600', fontSize: '13px', margin: 0 }}>⚠️ Warning: This action will trigger a real-time notification to real devices. This cannot be undone.</p>
      </Modal>

      {/* Templates Modal Editor */}
      <Modal
        title={<span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{editingTemplate ? "Edit Template" : "New Push Template"}</span>}
        visible={templateModalVisible}
        onCancel={() => { setTemplateModalVisible(false); setEditingTemplate(null); }}
        footer={null}
        className="pm-modal"
      >
        <Form form={templateForm} layout="vertical" onFinish={handleSaveTemplate}>
          <Form.Item label="Template Code (Internal)" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g. FESTIVE_DEAL" disabled={!!editingTemplate} className="pm-input" />
          </Form.Item>

          <Form.Item label="Push Title" name="title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Festival Feast 🍔" className="pm-input" />
          </Form.Item>

          <Form.Item label="Push Body" name="body" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Festive offer description..." className="pm-textarea" />
          </Form.Item>

          <Form.Item label="Deep Link Action" name="deepLink">
            <Select placeholder="Select screen deep link destination" allowClear className="pm-select">
              <Option value="GAME">🎮 Puppy Game Hub</Option>
              <Option value="COUPON">🎟️ My Coupons Page</Option>
              <Option value="OFFERS">🎁 Special Offers & Deals</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setTemplateModalVisible(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save Template</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Embedded Premium CSS Style rules */}
      <style>{`
        .pm-root {
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Inter', sans-serif;
        }

        .pm-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .pm-greeting {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.5px;
        }

        .pm-subtitle {
          font-size: 14px;
          color: #64748b;
          margin-top: 4px;
        }

        .pm-badge {
          font-size: 12px;
          color: #10b981;
          font-weight: 600;
          padding: 6px 12px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 8px;
          align-self: flex-start;
        }

        /* Stats Row */
        .pm-stats-row {
          margin-bottom: 24px;
        }

        .pm-stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .pm-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }

        .pm-stat-icon {
          font-size: 24px;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          flex-shrink: 0;
        }

        .pm-stat-value {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
        }

        .pm-stat-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
          margin-top: 4px;
        }

        .pm-stat-glow {
          position: absolute;
          top: -30px;
          right: -30px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          opacity: 0.04;
          filter: blur(15px);
          pointer-events: none;
        }

        /* Tabs styling */
        .pm-tabs .ant-tabs-nav {
          margin-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .pm-tab-title {
          font-weight: 600;
          font-size: 14px;
        }

        /* Card and Forms Custom Styles */
        .pm-main-card.ant-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
        }

        .pm-card-title {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
        }

        .pm-label {
          font-weight: 600;
          color: #475569;
          font-size: 13px;
        }

        .pm-input, .pm-textarea, .pm-select .ant-select-selector {
          border-radius: 8px !important;
          border-color: #cbd5e1 !important;
        }

        .pm-input:focus, .pm-textarea:focus {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1) !important;
        }

        .pm-dispatch-btn {
          width: 100%;
          height: 42px !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          background: #10b981 !important;
          border-color: #10b981 !important;
          font-size: 14px !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pm-dispatch-btn:hover {
          background: #059669 !important;
          border-color: #059669 !important;
        }

        /* Live Preview Card */
        .pm-preview-card.ant-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .pm-phone-preview {
          display: flex;
          justify-content: center;
          padding: 8px 0;
        }

        .pm-phone-screen {
          width: 280px;
          height: 440px;
          background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 36px;
          border: 10px solid #1e293b;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #fff;
          overflow: hidden;
        }

        .pm-phone-notch {
          width: 100px;
          height: 16px;
          background: #1e293b;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }

        .pm-phone-time {
          font-size: 32px;
          font-weight: 300;
          margin-top: 24px;
          letter-spacing: -0.5px;
        }

        .pm-phone-date {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.9;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pm-notification-bubble {
          width: 100%;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          border-radius: 16px;
          padding: 12px;
          margin-top: 32px;
          color: #1e293b;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: floatBubble 3s ease-in-out infinite;
          text-align: left;
        }

        @keyframes floatBubble {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .pm-notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .pm-notification-app {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pm-app-icon {
          font-size: 14px;
        }

        .pm-app-name {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
        }

        .pm-notification-time {
          font-size: 10px;
          color: #94a3b8;
        }

        .pm-notification-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 2px;
        }

        .pm-notification-body {
          font-size: 11px;
          color: #334155;
          line-height: 1.35;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }

        .pm-notification-action {
          font-size: 9px;
          color: #0ea5e9;
          margin-top: 8px;
          border-top: 1px solid #f1f5f9;
          padding-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pm-phone-footer {
          position: absolute;
          bottom: 12px;
          font-size: 10px;
          opacity: 0.7;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .pm-home-bar {
          width: 80px;
          height: 4px;
          background: #fff;
          border-radius: 2px;
        }

        .pm-alert {
          border-radius: 8px;
          border: 1px solid #b9f6ca;
        }

        .pm-alert-warn {
          border-radius: 8px;
        }

        .pm-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          font-weight: 600;
        }

        .pm-add-btn {
          background: #10b981 !important;
          border-color: #10b981 !important;
          border-radius: 6px !important;
        }

        .pm-add-btn:hover {
          background: #059669 !important;
          border-color: #059669 !important;
        }
      `}</style>
    </div>
  );
}
