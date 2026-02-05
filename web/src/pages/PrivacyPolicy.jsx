import { Typography, Card, Divider } from 'antd';
import { Link } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import './PrivacyPolicy.css';

const { Title, Paragraph, Text } = Typography;

export default function PrivacyPolicy() {
  return (
    <div className="privacy-policy-page">
      <div className="privacy-policy-container">
        <Link to="/" className="privacy-back-link">
          <ArrowLeftOutlined /> Back to Home
        </Link>

        <Title level={1} className="privacy-main-title">Privacy Policy</Title>
        <Text type="secondary" className="privacy-last-updated">Last updated: February 2025</Text>

        <Card className="privacy-card">
          <Paragraph className="privacy-intro">
            Chatora Adda (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Chatora Adda mobile application and related services. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our app and services. Please read it carefully.
          </Paragraph>

          <Divider />

          <Title level={3}>1. Information We Collect</Title>
          <Paragraph>
            We may collect information that you provide directly to us, including:
          </Paragraph>
          <ul>
            <li><strong>Account information:</strong> Name, phone number, email address (if provided).</li>
            <li><strong>Delivery information:</strong> Delivery address, location data (with your permission) for accurate delivery and service area verification.</li>
            <li><strong>Order information:</strong> Items ordered, payment method, and order history.</li>
            <li><strong>Device information:</strong> Device type, operating system, and unique identifiers when necessary for app functionality and updates.</li>
          </ul>

          <Title level={3}>2. How We Use Your Information</Title>
          <Paragraph>We use the information we collect to:</Paragraph>
          <ul>
            <li>Process and fulfil your orders and deliver food to your address.</li>
            <li>Communicate with you about orders, offers, and support.</li>
            <li>Improve our app, services, and user experience.</li>
            <li>Comply with applicable laws and protect our rights and safety.</li>
          </ul>

          <Title level={3}>3. Sharing of Information</Title>
          <Paragraph>
            We may share your information with delivery partners and service providers who assist in fulfilling orders. We do not sell your personal information to third parties for marketing. We may disclose information if required by law or to protect our rights and users&apos; safety.
          </Paragraph>

          <Title level={3}>4. Data Security</Title>
          <Paragraph>
            We implement reasonable technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. No method of transmission over the internet or electronic storage is 100% secure; we strive to use acceptable industry practices.
          </Paragraph>

          <Title level={3}>5. Data Retention</Title>
          <Paragraph>
            We retain your information for as long as your account is active or as needed to provide services, comply with legal obligations, resolve disputes, and enforce our agreements.
          </Paragraph>

          <Title level={3}>6. Your Rights</Title>
          <Paragraph>
            Depending on applicable law, you may have the right to access, correct, or delete your personal data, or to object to or restrict certain processing. You can update profile and address details within the app. For other requests, contact us using the details below.
          </Paragraph>

          <Title level={3}>7. Children&apos;s Privacy</Title>
          <Paragraph>
            Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected such information, please contact us so we can delete it.
          </Paragraph>

          <Title level={3}>8. Changes to This Policy</Title>
          <Paragraph>
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy in the app or on our website and updating the &quot;Last updated&quot; date. Your continued use of our services after changes constitutes acceptance of the updated policy.
          </Paragraph>

          <Title level={3}>9. Contact Us</Title>
          <Paragraph>
            If you have questions about this Privacy Policy or our data practices, please contact us at:
          </Paragraph>
          <Paragraph>
            <Text strong>Email:</Text> contact@chatoraadda.in<br />
            <Text strong>Website:</Text> https://www.chatoraadda.in
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}
