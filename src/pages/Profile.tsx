import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';
import { Save, X } from 'lucide-react';
import { Alert as AlertType } from '../components/Alert';

interface UserProfile {
  fullName: string;
  address: string;
  email: string;
  phone: string;
  id: string;
}

interface ProfileProps {
  onAlert?: (message: string, type: AlertType['type']) => void;
}

const Profile: React.FC<ProfileProps> = ({ onAlert }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    fullName: '',
    address: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Fetch user data from public.users table
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (dbError) throw dbError;

      setProfile({
        id: userData.id,
        fullName: userData.full_name || '',
        address: userData.address || '',
        email: userData.email || '',
        phone: userData.phone || '',
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');
      
      // Update auth user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        email: profile.email,
        data: {
          ...user.user_metadata,
          full_name: profile.fullName,
          address: profile.address,
          phone: profile.phone,
        }
      });
      
      if (updateError) throw updateError;

      // Update users table
      const { error: dbError } = await supabase
        .from('users')
        .update({
          full_name: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          address: profile.address
        })
        .eq('auth_id', user.id);

      if (dbError) throw dbError;

      // Check if phone number is empty and show notification
      if (!profile.phone.trim()) {
        onAlert?.('Please add your phone number to complete your profile', 'warning');
      }

      setIsEditing(false);
      await fetchUserProfile(); // Refresh the profile data
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-sm">
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            {isEditing ? (
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            ) : (
              <div className="mt-2 text-gray-900 dark:text-white font-medium">{profile.fullName}</div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
            {isEditing ? (
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            ) : (
              <div className="mt-2 text-gray-900 dark:text-white">{profile.address || 'Not provided'}</div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            {isEditing ? (
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            ) : (
              <div className="mt-2 text-gray-900 dark:text-white">{profile.email}</div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
            {isEditing ? (
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="Enter phone number"
              />
            ) : (
              <div className="mt-2 text-gray-900 dark:text-white">{profile.phone || 'Not provided'}</div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          {isEditing ? (
            <div className="flex space-x-4">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSave}
                disabled={loading}
                icon={<Save className="w-4 h-4" />}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsEditing(false);
                  fetchUserProfile(); // Reset to original values
                }}
                icon={<X className="w-4 h-4" />}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
