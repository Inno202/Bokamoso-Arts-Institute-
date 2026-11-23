import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../services/loggerService';
import { errorLog } from '../../controllers/errorLogController';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const RELOAD_FLAG = 'bai_chunk_reload';

const isChunkLoadError = (error?: Error) =>
  !!error && (error.name === 'ChunkLoadError'
    || /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(error.message));

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught component error:', error, errorInfo);
    // A missing file after a release reloads by itself below; anything else is a real fault.
    if (!isChunkLoadError(error)) errorLog.report('page', error);
    // After a new deploy, an open tab may ask for a page file that no longer exists.
    // Reload once to pick up the new version; the flag prevents a reload loop.
    if (isChunkLoadError(error)) {
      // Reload at most once a minute, so a real outage cannot cause a reload loop,
      // but a later release in the same browser session still reloads by itself.
      try {
        const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
          window.location.reload();
        }
      } catch { /* sessionStorage unavailable: fall through to the message */ }
    }
  }

  public render() {
    if (!this.state.hasError) return this.props.children;
    const stale = isChunkLoadError(this.state.error);

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-bai-bone" role="alert">
        <h2 className="text-3xl md:text-5xl font-serif font-semibold text-bai-black mb-4">
          {stale ? 'Update available' : 'This page hit a problem'}
        </h2>
        <p className="text-bai-black/70 text-lg font-serif mb-8 max-w-md mx-auto">
          {stale
            ? 'A newer version of the site is ready. Reload to get it.'
            : 'Something went wrong while showing this page. Reloading usually fixes it; if not, check your connection and try again shortly.'}
        </p>
        {import.meta.env.DEV && this.state.error && (
          <pre className="bg-red-100 text-red-900 p-4 rounded-lg mb-8 max-w-2xl text-left overflow-auto text-xs">{this.state.error.stack || String(this.state.error)}</pre>
        )}
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          Reload page
        </button>
      </div>
    );
  }
}
