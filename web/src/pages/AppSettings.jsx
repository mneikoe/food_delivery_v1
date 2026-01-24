import { useState, useEffect } from 'react';
import { Card, Upload, Button, message, Typography, Space, Divider } from 'antd';
import { UploadOutlined, AndroidOutlined, DeleteOutlined } from '@ant-design/icons';
import { uploadApkInfo, getApkInfo, deleteApkInfo } from '../api/adminApi';

const { Title, Text, Paragraph } = Typography;

export default function AppSettings() {
  const [uploading, setUploading] = useState(false);
  const [apkInfo, setApkInfo] = useState(null);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    fetchApkInfo();
  }, []);

  const fetchApkInfo = async () => {
    try {
      const response = await getApkInfo();
      if (response.data && response.data.available) {
        setApkInfo(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch APK info:', error);
    }
  };

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    try {
      const apkData = {
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        url: '/app-release.apk' // In production, upload to S3 and get URL
      };
      
      await uploadApkInfo(apkData);
      setApkInfo({ ...apkData, uploadDate: new Date().toISOString(), available: true });
      
      message.success('APK uploaded successfully!');
      setFileList([]);
      onSuccess();
    } catch (error) {
      message.error('Failed to upload APK');
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
            <Text strong>Android APK Management</Text>
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
              </ul>
            </Paragraph>
          </div>
        )}
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
              {window.location.origin + '/app-release.apk'}
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
