import { ReactNode } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ROUTES } from './controllers/navigation';
import Navbar from './views/components/Navbar';
import Footer from './views/components/Footer';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider } from './views/components/AuthProvider';

import { ErrorBoundary } from './views/components/ErrorBoundary';

// Pages
import Home from './views/pages/Home';
import About from './views/pages/About';
import Programs from './views/pages/Programs';
import Events from './views/pages/Events';
import Traditions from './views/pages/Traditions';
import Donate from './views/pages/Donate';
import TicketScanner from './views/pages/TicketScanner';
import Login from './views/pages/Login';
import Register from './views/pages/Register';
import Dashboard from './views/pages/Dashboard';
import Cart from './views/pages/Cart';
import Checkout from './views/pages/Checkout';
import MyTickets from './views/pages/MyTickets';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col township-grid font-sans overflow-x-hidden selection:bg-bai-red selection:text-white">
          <Navbar />
          <main className="flex-grow">
            <ErrorBoundary>
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
            </ErrorBoundary>
          </main>
          <Footer />
        </div>
      </Router>
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
