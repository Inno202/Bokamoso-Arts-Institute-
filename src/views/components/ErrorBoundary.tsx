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
      const isChunkLoadError = this.state.error?.name === 'ChunkLoadError' || this.state.error?.message.includes('Failed to fetch dynamically imported module');
      
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-bai-bone">
          <h2 className="text-3xl md:text-5xl font-display font-black uppercase text-bai-black mb-4 tracking-tighter">
            {isChunkLoadError ? 'Update Available' : 'Something went wrong'}
          </h2>
          <p className="text-bai-black/60 text-lg md:text-xl font-serif italic mb-8 max-w-md mx-auto">
            {isChunkLoadError
              ? 'A new version of the application is available. Please refresh the page to load the latest content.'
              : 'There was an error loading this page. This might be due to a network issue or missing content.'}
          </p>
          {this.state.error && !isChunkLoadError && (
            <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-8 max-w-2xl text-left overflow-auto">
              <p className="font-mono text-sm">{this.state.error.toString()}</p>
              <pre className="mt-2 text-xs">{this.state.error.stack}</pre>
            </div>
          )}
          <button 
            onClick={() => { 
              const url = new URL(window.location.href);
              url.searchParams.set('t', Date.now().toString());
              window.location.replace(url.toString());
            }} 
            className="bg-bai-black text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition shadow-xl"
          >
            {isChunkLoadError ? 'Reload Page' : 'Reload Page'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
