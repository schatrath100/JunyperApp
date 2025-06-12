import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { Save, X, AlertTriangle, Clock, Camera, Upload, Lock } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import { Skeleton } from '../components/ui/skeleton';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';

interface UserProfile {
  id: string;
  auth_id: string;
  full_name: string;
  address: string;
  email: string;
  phone: string;
  updated_at: string;
  avatar_url?: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchUserProfile = async () => {
    try {
      console.log('Starting to fetch user profile...');
      setLoading(true);
      
      // First, get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Auth user data:', user);
      console.log('Auth user error:', userError);
      
      if (userError) {
        throw userError;
      }
      
      if (!user) {
        console.log('No user found in auth');
        throw new Error('No user found');
      }

      console.log('Fetching profile for user ID:', user.id);
      // Then, get the user's profile from the users table
      const { data, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      console.log('Profile data:', data);
      console.log('Profile error:', profileError);

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      if (!data) {
        console.log('No profile found, creating new profile...');
        // If no profile exists, create one
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert([
            {
              auth_id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              email: user.email,
            }
          ])
          .select()
          .single();

        console.log('New profile created:', newProfile);
        console.log('Create profile error:', createError);

        if (createError) {
          throw createError;
        }

        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      toast({
        title: "Error",
        description: "Failed to load profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Profile component mounted');
    fetchUserProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          updated_at: new Date().toISOString()
        })
        .eq('auth_id', profile.auth_id);

      if (error) throw error;

      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully.",
        variant: "default",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file || !profile) return;

      // Validate file
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('File size must be less than 5MB');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPEG, PNG, and GIF files are allowed');
      }

      console.log('Starting avatar upload process...');
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      // First, try to remove the incorrectly named file
      const incorrectPath = `${user.id}/avatar.ong`;
      console.log('Attempting to remove incorrect file:', incorrectPath);
      
      const { error: removeError } = await supabase.storage
        .from('avatars')
        .remove([incorrectPath]);

      if (removeError) {
        console.log('Error removing incorrect file (this is okay if file does not exist):', removeError);
      } else {
        console.log('Successfully removed incorrect file');
      }

      // Now check for any other existing avatar files
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (listError) {
        console.error('Error listing existing files:', listError);
      } else if (existingFiles && existingFiles.length > 0) {
        console.log('Found existing files:', existingFiles);
        // Delete all existing avatar files
        for (const existingFile of existingFiles) {
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${existingFile.name}`]);
          
          if (deleteError) {
            console.error('Error deleting existing file:', deleteError);
          } else {
            console.log('Successfully deleted existing file:', existingFile.name);
          }
        }
      }

      // Upload new avatar with correct extension
      const filePath = `${user.id}/avatar.png`;
      console.log('Uploading new avatar to:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          cacheControl: '3600',
          contentType: 'image/png'
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }
      console.log('Upload successful:', uploadData);

      // Get the public URL
      console.log('Getting public URL...');
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      console.log('Generated public URL:', publicUrl);
      console.log('URL components:', {
        bucket: 'avatars',
        path: filePath,
        fullUrl: publicUrl
      });

      // Test URL accessibility
      try {
        const response = await fetch(publicUrl, { method: 'HEAD' });
        console.log('URL accessibility test:', {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
      } catch (err) {
        console.error('URL accessibility test failed:', err);
      }

      // Update the user's profile in the users table
      console.log('Updating user profile with new avatar URL...');
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('auth_id', user.id)
        .select();

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }
      console.log('Profile updated successfully:', updateData);

      setProfile({ ...profile, avatar_url: publicUrl });
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
        variant: "default",
      });
    } catch (err) {
      console.error('Error in handleFileChange:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setPasswordError(null);
      setPasswordSuccess(null);
      
      // Validate inputs
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError('All fields are required');
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }

      if (newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters');
        return;
      }

      // First, verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        setPasswordError('Current password is incorrect');
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      setPasswordSuccess('Your password has been successfully updated. You will need to use this new password for your next login.');

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
        variant: "default",
      });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading && !profile) {
    console.log('Rendering loading state');
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-8 space-y-8">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    console.log('No profile data');
    return null;
  }

  console.log('Rendering profile with data:', profile);
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Profile Settings</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Manage your personal information and preferences</p>
        </div>
        {profile.updated_at && (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-full">
            <Clock className="w-4 h-4 mr-1.5" />
            Last updated {new Date(profile.updated_at).toLocaleString()}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-8 space-y-8">
          <div className="flex items-center space-x-6">
            <div 
              className={cn(
                "relative w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center cursor-pointer group shadow-lg",
                isEditing && "hover:opacity-90"
              )}
              onClick={handleAvatarClick}
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full rounded-2xl object-cover"
                  onError={(e) => {
                    console.error('Error loading avatar image:', e);
                    const img = e.target as HTMLImageElement;
                    console.log('Failed image URL:', img.src);
                    img.src = ''; // Clear the src on error
                  }}
                  onLoad={() => {
                    console.log('Avatar image loaded successfully');
                  }}
                />
              ) : (
                <span className="text-4xl font-semibold text-white">
                  {profile.full_name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl transition-opacity",
                isEditing ? "opacity-0 group-hover:opacity-100" : "hidden"
              )}>
                <div className="flex flex-col items-center">
                  <Camera className="w-6 h-6 text-white mb-1" />
                  <span className="text-xs text-white font-medium">Change Photo</span>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleFileChange}
                disabled={!isEditing}
              />
            </div>
            <div>
              <h2 className="text-2xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">{profile.full_name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{profile.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                ) : (
                  <div className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
                    {profile.full_name}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <div className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
                  {profile.email}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                ) : (
                  <div className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
                    {profile.phone}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                {isEditing ? (
                  <Input
                    id="address"
                    value={profile.address || ''}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Enter your address"
                    className="rounded-xl"
                  />
                ) : (
                  <div className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
                    {profile.address || 'No address provided'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="px-6 rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                Edit Profile
              </Button>
            )}
          </div>

          {/* Password Change Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Password</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update your password to keep your account secure</p>
              </div>
              {!isChangingPassword && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(true);
                    setPasswordSuccess(null);
                  }}
                  className="flex items-center bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 rounded-xl"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              )}
            </div>

            {passwordSuccess && (
              <div className="p-4 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700 rounded-xl text-green-700 dark:text-green-400 mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{passwordSuccess}</span>
                </div>
              </div>
            )}

            {isChangingPassword && (
              <div className="space-y-4">
                {passwordError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    {passwordError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      className="rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError(null);
                      setPasswordSuccess(null);
                    }}
                    className="rounded-xl"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={loading}
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Update Password
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
