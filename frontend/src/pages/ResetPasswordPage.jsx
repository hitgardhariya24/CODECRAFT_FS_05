import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    await resetPassword(token, password);
    navigate('/');
  };

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <h1>Reset password</h1>
        <form className="auth-form" onSubmit={submit}>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" />
          <button className="primary-btn" type="submit">Update password</button>
        </form>
      </div>
    </div>
  );
}