import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-bai-bone">
          <h2 className="text-3xl md:text-5xl font-display font-black uppercase text-bai-black mb-4 tracking-tighter">Something went wrong</h2>
          <p className="text-bai-black/60 text-lg md:text-xl font-serif italic mb-8 max-w-md mx-auto">There was an error loading this page. This might be due to a network issue or missing content.</p>
          {this.state.error && (
            <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-8 max-w-2xl text-left overflow-auto">
              <p className="font-mono text-sm">{this.state.error.toString()}</p>
              <pre className="mt-2 text-xs">{this.state.error.stack}</pre>
            </div>
          )}
          <button onClick={() => { window.location.hash = '#/'; window.location.reload(); }} className="bg-bai-red text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-red-700 transition">
            Go Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
