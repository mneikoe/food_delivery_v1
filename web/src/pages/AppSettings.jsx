import { useState, useEffect } from 'react';
import { Card, Upload, Button, message, Typography, Space, Divider, Input, Switch } from 'antd';
import { UploadOutlined, AndroidOutlined, DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { uploadApkInfo, getApkInfo, deleteApkInfo, getOrderWindow, updateOrderWindow } from '../api/adminApi';

const { Title, Text, Paragraph } = Typography;

const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;

export default function AppSettings() {
  const [uploading, setUploading] = useState(false);
  const [apkInfo, setApkInfo] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [version, setVersion] = useState('1.0.0');

  const [orderWindowEnabled, setOrderWindowEnabled] = useState(true);
  const [orderWindowStart, setOrderWindowStart] = useState('00:00');
  const [orderWindowEnd, setOrderWindowEnd] = useState('23:59');
  const [ordersOpen, setOrdersOpen] = useState(true);
  const [orderWindowSaving, setOrderWindowSaving] = useState(false);

  useEffect(() => {
    fetchApkInfo();
    fetchOrderWindow();
  }, []);

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

  const handleOrderWindowToggle = async (enabled) => {
    setOrderWindowSaving(true);
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
      setOrderWindowSaving(false);
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
    <div>
      <Title level={2}>App Settings</Title>
      <Paragraph>Manage your mobile application APK file</Paragraph>

      <Card 
        title={
          <Space>
            <AndroidOutlined style={{ fontSize: 24, color: '#3DDC84' }} />
            <Text strong>Android APK Management For Admin</Text>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {apkInfo ? (
          <div>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Current APK File:</Text>
                <Title level={4} style={{ margin: '8px 0' }}>{apkInfo.name}</Title>
              </div>
              
              <div>
                <Space size="large">
                  <div>
                    <Text type="secondary">File Size:</Text>
                    <br />
                    <Text strong>{apkInfo.size}</Text>
                  </div>
                  {apkInfo.version && (
                    <>
                      <Divider type="vertical" style={{ height: 40 }} />
                      <div>
                        <Text type="secondary">Version:</Text>
                        <br />
                        <Text strong>{apkInfo.version}</Text>
                      </div>
                    </>
                  )}
                  <Divider type="vertical" style={{ height: 40 }} />
                  <div>
                    <Text type="secondary">Upload Date:</Text>
                    <br />
                    <Text strong>{new Date(apkInfo.uploadDate).toLocaleDateString()}</Text>
                  </div>
                  <Divider type="vertical" style={{ height: 40 }} />
                  <div>
                    <Text type="secondary">Status:</Text>
                    <br />
                    <Text strong style={{ color: '#52c41a' }}>Active</Text>
                  </div>
                </Space>
              </div>

              <Divider />

              <Space>
                <Button 
                  type="primary" 
                  icon={<UploadOutlined />}
                  onClick={() => setApkInfo(null)}
                >
                  Upload New Version
                </Button>
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                >
                  Delete APK
                </Button>
              </Space>
            </Space>
          </div>
        ) : (
          <div>
            <Paragraph>
              Upload your Android APK file here. Users will be able to download this APK from the landing page.
            </Paragraph>
            
            <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
              <div>
                <Text strong>App Version:</Text>
                <br />
                <Input
                  placeholder="e.g., 1.0.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  style={{ marginTop: 8, maxWidth: 200 }}
                />
                <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                  Version format: X.Y.Z (e.g., 1.0.0, 1.0.1, 1.1.0)
                </Text>
              </div>
            </Space>
            
            <Upload {...uploadProps}>
              <Button 
                icon={<UploadOutlined />} 
                loading={uploading}
                size="large"
              >
                {uploading ? 'Uploading...' : 'Select APK File'}
              </Button>
            </Upload>
            <Paragraph type="secondary" style={{ marginTop: 16 }}>
              <ul style={{ paddingLeft: 20 }}>
                <li>Only .apk files are accepted</li>
                <li>Maximum file size: 100MB</li>
                <li>Make sure the APK is signed and tested before uploading</li>
                <li>Version number is required for update notifications</li>
              </ul>
            </Paragraph>
          </div>
        )}
      </Card>

      <Card
        title={
          <Space>
            <ClockCircleOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Text strong>Order Window</Text>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Paragraph>
          Turn order acceptance on or off. When off, users cannot place new orders. You can also set a time window (IST) so orders are only accepted during certain hours.
        </Paragraph>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Text>Accept orders:</Text>
            <Switch
              checked={orderWindowEnabled}
              onChange={handleOrderWindowToggle}
              loading={orderWindowSaving}
              checkedChildren="ON"
              unCheckedChildren="OFF"
            />
            <Text type="secondary">
              {ordersOpen ? (
                <Text style={{ color: '#52c41a' }}>Orders are currently open</Text>
              ) : (
                <Text style={{ color: '#ff4d4f' }}>Orders are currently closed</Text>
              )}
            </Text>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div>
            <Text strong>Time window (IST, 24-hour format)</Text>
            <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 8 }}>
              Only accept orders between these times. Leave 00:00–23:59 for all day when orders are ON.
            </Paragraph>
            <Space wrap>
              <Input
                placeholder="Start e.g. 09:00"
                value={orderWindowStart}
                onChange={(e) => setOrderWindowStart(e.target.value)}
                style={{ width: 120 }}
              />
              <span>to</span>
              <Input
                placeholder="End e.g. 22:00"
                value={orderWindowEnd}
                onChange={(e) => setOrderWindowEnd(e.target.value)}
                style={{ width: 120 }}
              />
              <Button type="primary" onClick={handleOrderWindowTimeSave} loading={orderWindowSaving}>
                Save times
              </Button>
            </Space>
          </div>
        </Space>
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
