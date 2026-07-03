import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Wave-Link crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-900 flex items-center justify-center p-4">
          <div className="max-w-lg bg-blue-900/40 backdrop-blur-sm border border-red-700 rounded-xl p-8 text-center">
            <AlertTriangle className="text-red-400 mx-auto mb-4" size={48} />
            <h1 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-300 mb-6">
              Wave-Link hit an unexpected error and couldn't continue. Your
              data is safe — reloading the page should fix this.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
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
