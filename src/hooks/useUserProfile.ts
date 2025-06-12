import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useUserProfile() {
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('auth_id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          setUserName(data.full_name || 'User');
          setUserAvatar(data.avatar_url || '');
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, []);

  return { userName, userAvatar, setUserAvatar };
} 