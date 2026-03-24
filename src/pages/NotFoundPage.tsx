import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
    <div className="glass-panel max-w-3xl w-full px-8 py-8 shadow-xl text-center">
      <h1 className="text-5xl font-bold text-white mb-4">404</h1>
      <p className="text-fg-secondary mb-6">Page not found. The path may not exist or the page was moved.</p>
      <div className="flex flex-col items-center gap-3">
        <Link className="btn-primary px-4 py-2" to="/login">Go to Login</Link>
        <Link className="btn-secondary px-4 py-2" to="/projects">Go to Projects</Link>
      </div>
    </div>
  </div>
);

export default NotFoundPage;
