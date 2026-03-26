import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
    <div className="glass-panel max-w-3xl w-full px-8 py-8 shadow-xl text-center">
      
      <h1 className="text-5xl font-bold text-white mb-4">
        Wow. You broke it.
      </h1>

      <p className="text-fg-secondary mb-2">
        This page doesn’t exist. Never did. Probably never will.
      </p>

      <p className="text-fg-secondary mb-6 text-sm opacity-70">
        Either you typed something wrong… or we did. Let’s not point fingers.
      </p>

      <div className="flex flex-col items-center gap-3">
        <Link className="btn-primary px-4 py-2" to="/DashboardPage">
          Go back to home
        </Link>

      
      </div>
      
    </div>
  </div>
);

export default NotFoundPage;

