import { ReactNode, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROUTES } from './controllers/navigation';
import Navbar from './views/components/Navbar';
import Footer from './views/components/Footer';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider } from './views/components/AuthProvider';

import { ErrorBoundary } from './views/components/ErrorBoundary';

// Pages
const Home = lazy(() => import('./views/pages/Home'));
const About = lazy(() => import('./views/pages/About'));
const Programs = lazy(() => import('./views/pages/Programs'));
const Events = lazy(() => import('./views/pages/Events'));
const Traditions = lazy(() => import('./views/pages/Traditions'));
const Donate = lazy(() => import('./views/pages/Donate'));
const TicketScanner = lazy(() => import('./views/pages/TicketScanner'));
const Login = lazy(() => import('./views/pages/Login'));
const Register = lazy(() => import('./views/pages/Register'));
const Dashboard = lazy(() => import('./views/pages/Dashboard'));
const Cart = lazy(() => import('./views/pages/Cart'));
const Checkout = lazy(() => import('./views/pages/Checkout'));
const MyTickets = lazy(() => import('./views/pages/MyTickets'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col township-grid font-sans overflow-x-hidden selection:bg-bai-red selection:text-white">
          <Navbar />
          <main className="flex-grow">
            <ErrorBoundary>
              <Suspense fallback={<div className="h-[70vh] flex items-center justify-center"><div className="w-12 h-12 border-4 border-bai-red border-t-transparent rounded-full animate-spin" /></div>}>
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path={ROUTES.HOME} element={<PageWrapper><Home /></PageWrapper>} />
                    <Route path={ROUTES.ABOUT} element={<PageWrapper><About /></PageWrapper>} />
                    <Route path={ROUTES.PROGRAMS} element={<PageWrapper><Programs /></PageWrapper>} />
                    <Route path={ROUTES.EVENTS} element={<PageWrapper><Events /></PageWrapper>} />
                    <Route path={ROUTES.TRADITIONS} element={<PageWrapper><Traditions /></PageWrapper>} />
                    <Route path={ROUTES.DONATE} element={<PageWrapper><Donate /></PageWrapper>} />
                    <Route path={ROUTES.SCANNER} element={<PageWrapper><TicketScanner /></PageWrapper>} />
                    <Route path={ROUTES.LOGIN} element={<PageWrapper><Login /></PageWrapper>} />
                    <Route path={ROUTES.REGISTER} element={<PageWrapper><Register /></PageWrapper>} />
                    <Route path={ROUTES.DASHBOARD} element={<PageWrapper><Dashboard /></PageWrapper>} />
                    <Route path={ROUTES.CART} element={<PageWrapper><Cart /></PageWrapper>} />
                    <Route path={ROUTES.CHECKOUT} element={<PageWrapper><Checkout /></PageWrapper>} />
                    <Route path={ROUTES.MY_TICKETS} element={<PageWrapper><MyTickets /></PageWrapper>} />
                  </Routes>
                </AnimatePresence>
              </Suspense>
            </ErrorBoundary>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
