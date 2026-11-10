import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { ROUTES } from './controllers/navigation';
import Navbar from './views/components/Navbar';
import Footer from './views/components/Footer';
import { AuthProvider, useAuth } from './views/components/AuthProvider';
import { CartProvider } from './hooks/useCart';
import { ErrorBoundary } from './views/components/ErrorBoundary';
import { Toaster } from './views/components/Toaster';
import { isAnyAdmin, isEventManager, isScanner, type UserRole } from './models/types';
import Home from './views/pages/Home';

// Each page loads on demand, so a first visit downloads the home page only.
const About = lazy(() => import('./views/pages/About'));
const Programs = lazy(() => import('./views/pages/Programs'));
const Events = lazy(() => import('./views/pages/Events'));
const Traditions = lazy(() => import('./views/pages/Traditions'));
const TicketScanner = lazy(() => import('./views/pages/TicketScanner'));
const Login = lazy(() => import('./views/pages/Login'));
const Register = lazy(() => import('./views/pages/Register'));
const Dashboard = lazy(() => import('./views/pages/Dashboard'));
const Cart = lazy(() => import('./views/pages/Cart'));
const Checkout = lazy(() => import('./views/pages/Checkout'));
const MyTickets = lazy(() => import('./views/pages/MyTickets'));
const AdminEvents = lazy(() => import('./views/admin/AdminEvents'));
const AdminContent = lazy(() => import('./views/admin/AdminContent'));
const Legal = lazy(() => import('./views/pages/Legal'));

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <ScrollToTop />
          <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
            Skip to content
          </a>
          <div className="min-h-screen flex flex-col township-grid font-sans overflow-x-hidden">
            <Navbar />
            <main id="main" tabIndex={-1} className="flex-grow outline-none">
              <ErrorBoundary>
                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    <Route path={ROUTES.HOME} element={<Home />} />
                    <Route path={ROUTES.ABOUT} element={<About />} />
                    <Route path={ROUTES.PROGRAMS} element={<Programs />} />
                    <Route path={ROUTES.EVENTS} element={<Events />} />
                    <Route path={ROUTES.TRADITIONS} element={<Traditions />} />
                    <Route path={ROUTES.LOGIN} element={<Login />} />
                    <Route path={ROUTES.REGISTER} element={<Register />} />
                    <Route path={ROUTES.CART} element={<Cart />} />
                    <Route path={ROUTES.CHECKOUT} element={<Protected><Checkout /></Protected>} />
                    <Route path={ROUTES.MY_TICKETS} element={<Protected><MyTickets /></Protected>} />
                    <Route path={ROUTES.DASHBOARD} element={<Protected allow={isAnyAdmin}><Dashboard /></Protected>} />
                    <Route path={ROUTES.SCANNER} element={<Protected allow={isScanner}><TicketScanner /></Protected>} />
                    <Route path={ROUTES.ADMIN_EVENTS} element={<Protected allow={isEventManager}><AdminEvents /></Protected>} />
                    <Route path={ROUTES.ADMIN_CONTENT} element={<Protected allow={isEventManager}><AdminContent /></Protected>} />
                    <Route path={`${ROUTES.ADMIN_CONTENT}/:section`} element={<Protected allow={isEventManager}><AdminContent /></Protected>} />
                    <Route path={ROUTES.TERMS} element={<Legal doc="terms" />} />
                    <Route path={ROUTES.PRIVACY} element={<Legal doc="privacy" />} />
                    <Route path={ROUTES.COOKIES} element={<Legal doc="cookies" />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
          <Toaster />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

/**
 * Keeps signed-out visitors and the wrong roles out of a page. This is a courtesy
 * for the interface; the data itself is protected by firestore.rules.
 */
function Protected({ children, allow }: { children: ReactNode; allow?: (role: UserRole | null) => boolean }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoading />;
  if (!user) return <Navigate to={ROUTES.LOGIN} state={{ from: location.pathname }} replace />;
  if (allow && !allow(role)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="display text-3xl md:text-5xl mb-4">Staff only</h1>
        <p className="text-bai-black/70 max-w-sm mb-8">Your account does not have access to this page. If you think it should, ask an administrator to update your role.</p>
        <Link to={ROUTES.HOME} className="btn btn-primary">Back to home</Link>
      </div>
    );
  }
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="display text-4xl md:text-6xl mb-4">Page not found</h1>
      <p className="text-bai-black/70 max-w-sm mb-8">That page does not exist or has moved.</p>
      <Link to={ROUTES.HOME} className="btn btn-primary">Back to home</Link>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading">
      <div className="w-10 h-10 border-4 border-bai-red border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
