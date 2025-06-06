import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { utcToZonedTime } from 'date-fns-tz';

interface GreetingProps {
  name: string;
}

const Greeting: React.FC<GreetingProps> = ({ name }) => {
  const [timeZone, setTimeZone] = useState<string>('US/Eastern');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    const fetchTimeZone = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('accounting_settings')
          .select('time_zone, company_legal_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setTimeZone(data.time_zone || 'US/Eastern');
          setCompanyName(data.company_legal_name || '');
        }
      } catch (err) {
        console.error('Error fetching timezone:', err);
      }
    };

    fetchTimeZone();
  }, []);

  useEffect(() => {
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const zonedTime = utcToZonedTime(currentTime, timeZone);
    const hour = zonedTime.getHours();

    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getGreeting()}, {name}!</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1">Here's your financial overview for {companyName}</p>
    </div>
  );
};

export default Greeting;