import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  dismissed: boolean;
  metadata: Record<string, any>;
  related_table?: string;
  related_id?: string;
  created_at: string;
  read_at?: string;
  dismissed_at?: string;
  status: 'unread' | 'read' | 'dismissed';
}

export interface CreateNotificationParams {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, any>;
  related_table?: string;
  related_id?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications from Supabase
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[useNotifications] Fetching notifications...');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Try fetching directly from notifications table first
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[useNotifications] Error fetching from notifications table:', fetchError);
        throw fetchError;
      }

      console.log('[useNotifications] Fetched notifications:', data);
      
      // Add status field manually since we're not using the view
      const notificationsWithStatus = (data || []).map(notification => ({
        ...notification,
        status: notification.read ? 'read' : 'unread'
      })) as Notification[];
      
      setNotifications(notificationsWithStatus);
    } catch (err) {
      console.error('[useNotifications] Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new notification
  const createNotification = useCallback(async (params: CreateNotificationParams) => {
    try {
      console.log('[useNotifications] Creating notification:', params);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('[useNotifications] User authenticated:', user.id);

      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: user.id,
        p_title: params.title,
        p_message: params.message,
        p_type: params.type || 'info',
        p_metadata: params.metadata || {},
        p_related_table: params.related_table || null,
        p_related_id: params.related_id || null
      });

      if (error) {
        console.error('[useNotifications] Error calling create_notification RPC:', error);
        throw error;
      }

      console.log('[useNotifications] Notification created successfully:', data);

      // Refresh notifications to include the new one
      await fetchNotifications();

      return data;
    } catch (err) {
      console.error('[useNotifications] Error creating notification:', err);
      throw err;
    }
  }, [fetchNotifications]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds?: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('mark_notifications_read', {
        p_user_id: user.id,
        p_notification_ids: notificationIds || null
      });

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(notification => {
          if (!notificationIds || notificationIds.includes(notification.id)) {
            return {
              ...notification,
              read: true,
              read_at: new Date().toISOString(),
              status: 'read' as const
            };
          }
          return notification;
        })
      );
    } catch (err) {
      console.error('Error marking notifications as read:', err);
      throw err;
    }
  }, []);

  // Dismiss notifications
  const dismiss = useCallback(async (notificationIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('dismiss_notifications', {
        p_user_id: user.id,
        p_notification_ids: notificationIds
      });

      if (error) throw error;

      // Remove dismissed notifications from local state
      setNotifications(prev => 
        prev.filter(notification => !notificationIds.includes(notification.id))
      );
    } catch (err) {
      console.error('Error dismissing notifications:', err);
      throw err;
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[useNotifications] No user found for realtime subscription');
        return;
      }

      console.log('[useNotifications] Setting up realtime subscription for user:', user.id);

      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[useNotifications] New notification received via realtime:', payload);
            // Add new notification to the list
            const newNotification = {
              ...payload.new,
              status: payload.new.read ? 'read' : 'unread'
            } as Notification;
            
            setNotifications(prev => [newNotification, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[useNotifications] Notification updated via realtime:', payload);
            // Update existing notification
            setNotifications(prev =>
              prev.map(notification =>
                notification.id === payload.new.id
                  ? { ...notification, ...payload.new, status: payload.new.read ? 'read' : 'unread' }
                  : notification
              )
            );
          }
        )
        .subscribe((status) => {
          console.log('[useNotifications] Realtime subscription status:', status);
        });
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Computed values - only show non-dismissed notifications in the UI
  const visibleNotifications = notifications.filter(n => !n.dismissed);
  const unreadCount = visibleNotifications.filter(n => !n.read).length;
  const unreadNotifications = visibleNotifications.filter(n => !n.read);

  // Debug logging
  React.useEffect(() => {
    console.log('[useNotifications] All notifications:', notifications);
    console.log('[useNotifications] Visible notifications (not dismissed):', visibleNotifications);
    console.log('[useNotifications] Unread notifications:', unreadNotifications);
    console.log('[useNotifications] Unread count:', unreadCount);
  }, [notifications, visibleNotifications, unreadNotifications, unreadCount]);

  // Debug: Test function to create a simple notification
  const createTestNotification = useCallback(async () => {
    try {
      console.log('[useNotifications] Creating test notification...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Insert directly into notifications table for testing
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          title: 'Test Notification',
          message: 'This is a test notification to debug the system.',
          type: 'info',
          read: false,
          dismissed: false,
          metadata: { test: true }
        }])
        .select()
        .single();

      if (error) {
        console.error('[useNotifications] Error creating test notification:', error);
        throw error;
      }

      console.log('[useNotifications] Test notification created:', data);
      
      // Refresh notifications
      await fetchNotifications();
      
      return data;
    } catch (err) {
      console.error('[useNotifications] Error in createTestNotification:', err);
      throw err;
    }
  }, [fetchNotifications]);

  return {
    notifications: visibleNotifications, // Return only visible notifications
    unreadNotifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    createNotification,
    markAsRead,
    dismiss,
    // Convenience methods
    markAllAsRead: () => markAsRead(),
    dismissAll: () => dismiss(visibleNotifications.map(n => n.id)),
    createTestNotification
  };
}; 