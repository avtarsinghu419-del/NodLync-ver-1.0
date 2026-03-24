import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string | null;
}

class RouteErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Route render failure", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-800/40 bg-rose-950/30 px-6 py-5 text-rose-100 space-y-3">
          <h2 className="text-lg font-bold">This page crashed while rendering</h2>
          <p className="text-sm text-rose-200">
            {this.state.message ?? "An unexpected UI error occurred."}
          </p>
          <div className="flex items-center gap-3">
            <Link to="/projects" className="btn-ghost px-4 py-2 text-sm">
              Back to Projects
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary px-4 py-2 text-sm"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
