import React from 'react';
import { useAuth } from '../components/AuthProvider';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../../controllers/navigation';
import { Shield, TrendingUp, Users, PieChart, Info, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bai-bone flex items-center justify-center">
         <div className="w-12 h-12 border-4 border-bai-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return <Navigate to={ROUTES.LOGIN} />;
  }

  if (role === 'USER') {
    return (
      <div className="min-h-[70vh] bg-bai-bone flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield size={64} className="mx-auto text-bai-red" />
          <h2 className="text-3xl font-display font-bold">Access Denied</h2>
          <p className="text-bai-charcoal">Regular users do not have access to the dashboard.</p>
        </div>
      </div>
    );
  }

  // Define role specific widgets
  const renderWidgets = () => {
    if (role === 'SUPER_ADMIN' || role === 'CEO') {
      return (
        <>
          <Widget title="Financial Overview" icon={<DollarSign size={24} />} value="ZAR 124,500" />
          <Widget title="Total Users" icon={<Users size={24} />} value="1,245" />
          <Widget title="Tour Ticket Sales" icon={<PieChart size={24} />} value="850 Tickets" />
          <Widget title="Growth" icon={<TrendingUp size={24} />} value="+14% YoY" />
        </>
      );
    }
    if (role === 'FINANCE_MANAGER') {
       return (
        <>
          <Widget title="Gross Revenue" icon={<DollarSign size={24} />} value="ZAR 124,500" />
          <Widget title="Pending Invoices" icon={<PieChart size={24} />} value="12" />
          <Widget title="Expense Reports" icon={<TrendingUp size={24} />} value="ZAR 12,000" />
        </>
       )
    }
    if (role === 'PUBLIC_RELATIONS') {
       return (
        <>
          <Widget title="Press Inquiries" icon={<Info size={24} />} value="4 New" />
          <Widget title="Social Engagement" icon={<TrendingUp size={24} />} value="+22%" />
          <div className="col-span-full mt-8">
             <h3 className="text-xl font-display font-bold uppercase mb-4 border-b pb-2">Content Management (CRUD)</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm hover:border-bai-blue cursor-pointer">
                   <h4 className="font-bold">Edit 'About Us'</h4>
                   <p className="text-sm text-gray-500">Update story, timeline, and leadership details.</p>
                </div>
                <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm hover:border-bai-blue cursor-pointer">
                   <h4 className="font-bold">Manage Tickets & Tours</h4>
                   <p className="text-sm text-gray-500">Create new events, edit ticketing info.</p>
                </div>
             </div>
          </div>
        </>
       )
    }
    return null;
  }

  return (
    <div className="min-h-[80vh] bg-bai-bone p-8 pt-20">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-display font-black text-bai-charcoal uppercase tracking-tighter">
            Internal Dashboard
          </h1>
          <p className="text-lg text-bai-charcoal/70 mt-2">
            Welcome back. Logged in as <strong className="text-bai-red">{role}</strong>
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderWidgets()}
        </div>
      </div>
    </div>
  );
}

function Widget({ title, icon, value }: { title: string, icon: React.ReactNode, value: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs">{title}</h3>
        <div className="text-bai-blue">{icon}</div>
      </div>
      <div className="text-3xl font-display font-black text-bai-charcoal truncate">{value}</div>
    </div>
  );
}
