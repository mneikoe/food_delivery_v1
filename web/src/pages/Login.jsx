import { useState } from 'react';
import { Form, Input, Button, Card, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { sendOtp, login } from '../api/adminApi';
import { useNavigate } from 'react-router-dom';

export default function Login() {
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
      await sendOtp(email);
      message.success('OTP sent to your email');
      setStep('otp');
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (values) => {
    setLoading(true);
    try {
      const response = await login(email, values.otp);
      if (response.token) {
        message.success('Login successful');
        navigate('/admin');
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card style={{ width: 400 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Admin Login</h1>
        {step === 'email' ? (
          <Form onFinish={handleSendOtp} layout="vertical">
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Send OTP
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form onFinish={handleVerifyOtp} layout="vertical">
            <Form.Item
              label="OTP"
              name="otp"
              rules={[{ required: true, message: 'Please enter OTP' }]}
            >
              <Input
                prefix={<LockOutlined />}
                placeholder="Enter OTP"
                maxLength={6}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button onClick={() => setStep('email')}>Back</Button>
                <Button type="primary" htmlType="submit" block loading={loading}>
                  Verify OTP
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
}
