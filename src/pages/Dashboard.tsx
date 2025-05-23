import React, { useState, useEffect } from 'react';
import Greeting from '../components/Greeting';
import BalanceCard from '../components/BalanceCard';
import RecentActivity from '../components/RecentActivity';
import MetricsSection from '../components/MetricsSection';
import { supabase } from '../lib/supabase';

const Dashboard: React.FC = () => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fullName = user.user_metadata.full_name;
        setUserName(fullName || 'User');
      }
    };

    getUser();
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <Greeting name={userName} />  
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div>
          <BalanceCard balance={93300} />
        </div>
        <div className="lg:col-span-2">
          <MetricsSection />
        </div>
      </div>
      
      <div className="max-w-sm">
        <RecentActivity />
      </div>
    </div>
  );
};

export default Dashboard;