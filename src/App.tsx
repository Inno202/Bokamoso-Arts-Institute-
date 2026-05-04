/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROUTES } from './controllers/navigation';
import Navbar from './views/components/Navbar';
import Footer from './views/components/Footer';
import Home from './views/pages/Home';
import About from './views/pages/About';
import Programs from './views/pages/Programs';
import Tour from './views/pages/Tour';
import Traditions from './views/pages/Traditions';
import Donate from './views/pages/Donate';
import TicketScanner from './views/pages/TicketScanner';
import Login from './views/pages/Login';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider } from './views/components/AuthProvider';
import DemoRoleSwitcher from './views/components/DemoRoleSwitcher';

import Dashboard from './views/pages/Dashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col township-grid font-sans overflow-x-hidden">
          <Navbar />
          <main className="flex-grow">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path={ROUTES.HOME} element={<PageWrapper><Home /></PageWrapper>} />
                <Route path={ROUTES.ABOUT} element={<PageWrapper><About /></PageWrapper>} />
                <Route path={ROUTES.PROGRAMS} element={<PageWrapper><Programs /></PageWrapper>} />
                <Route path={ROUTES.TOUR} element={<PageWrapper><Tour /></PageWrapper>} />
                <Route path={ROUTES.TRADITIONS} element={<PageWrapper><Traditions /></PageWrapper>} />
                <Route path={ROUTES.DONATE} element={<PageWrapper><Donate /></PageWrapper>} />
                <Route path={ROUTES.SCANNER} element={<PageWrapper><TicketScanner /></PageWrapper>} />
                <Route path={ROUTES.LOGIN} element={<PageWrapper><Login /></PageWrapper>} />
                <Route path={ROUTES.DASHBOARD} element={<PageWrapper><Dashboard /></PageWrapper>} />
              </Routes>
            </AnimatePresence>
          </main>
          <Footer />
          <DemoRoleSwitcher />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
