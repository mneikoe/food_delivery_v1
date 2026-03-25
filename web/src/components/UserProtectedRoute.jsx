import { Navigate } from 'react-router-dom';

export default function UserProtectedRoute({ children }) {
  const token = localStorage.getItem('user_token');
  const role = localStorage.getItem('user_role');

  if (!token) {
    return <Navigate to="/user/login" replace />;
  }

  if (role && role !== 'USER' && role !== 'CUSTOMER') {
    return <Navigate to="/" replace />;
  }

  return children;
}
