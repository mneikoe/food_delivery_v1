import { useState } from 'react';
import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { sendUserOtp, verifyUserOtp } from '../api/userApi';

export default function UserLogin() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    if (!email) {
      message.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await sendUserOtp(email);
      message.success('OTP sent to your email');
      setStep('otp');
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async ({ otp }) => {
    setLoading(true);
    try {
      const result = await verifyUserOtp(email, otp);
      if (result?.token) {
        message.success('Login successful');
        navigate('/user/app', { replace: true });
      } else {
        message.error('Login failed');
      }
    } catch (error) {
      message.error(error.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #10B981 0%, #2E7D32 100%)',
        padding: 16,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 420, borderRadius: 16 }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>
          User Login
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
          Login with OTP and start ordering.
        </Typography.Paragraph>

        {step === 'email' ? (
          <Form onFinish={handleSendOtp} layout="vertical">
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, type: 'email', message: 'Enter valid email' }]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Send OTP
            </Button>
          </Form>
        ) : (
          <Form onFinish={handleVerifyOtp} layout="vertical">
            <Form.Item
              label="OTP"
              name="otp"
              rules={[{ required: true, message: 'Enter OTP' }]}
            >
              <Input prefix={<LockOutlined />} placeholder="6-digit OTP" maxLength={6} />
            </Form.Item>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Button onClick={() => setStep('email')}>Back</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Verify & Login
              </Button>
            </Space>
          </Form>
        )}
      </Card>
    </div>
  );
}
