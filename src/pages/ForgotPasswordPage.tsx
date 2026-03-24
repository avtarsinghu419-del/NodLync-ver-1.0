import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../api/supabaseClient";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password reset link sent. Check your email.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="glass-panel max-w-md w-full px-8 py-6 space-y-6 shadow-xl">
        <div>
          <p className="text-2xl font-semibold">Forgot Password</p>
          <p className="text-sm text-fg-muted">Enter your email to receive a password reset link.</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1">
            <span className="text-sm text-fg-secondary">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-surface px-3 py-2 text-fg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          {error && <p className="text-sm text-rose-400 bg-rose-900/30 border border-rose-800 rounded-md px-3 py-2">{error}</p>}
          {message && <p className="text-sm text-emerald-300 bg-emerald-900/30 border border-emerald-800 rounded-md px-3 py-2">{message}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <p className="text-sm text-fg-muted text-center">
          Back to <Link className="text-primary hover:underline" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
