import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <h1>Page not found</h1>
        <p>The page you requested does not exist.</p>
        <Link to="/" className="primary-btn">Go home</Link>
      </div>
    </div>
  );
}