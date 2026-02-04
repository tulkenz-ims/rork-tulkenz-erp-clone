import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import createContextHook from '@nkzw/create-context-hook';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationData {
  type: string;
  sourceId?: string;
  sourceNumber?: string;
  departmentCode?: string;
  departmentCodes?: string[];
  actionUrl?: string;
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[PushNotifications] Web platform - checking browser notification support');
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log('[PushNotifications] Browser notification permission:', permission);
      }
    } catch (e) {
      console.log('[PushNotifications] Browser notifications not supported');
    }
    return null;
  }

  if (!Device.isDevice) {
    console.log('[PushNotifications] Must use physical device for push notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[PushNotifications] Requesting permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted');
      return null;
    }

    // Set up Android notification channels first
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('task_feed', {
        name: 'Task Feed',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('task_feed_urgent', {
        name: 'Urgent Tasks',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#EF4444',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    // Try to get push token - this may fail in development/Expo Go
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    if (!projectId) {
      console.log('[PushNotifications] No project ID configured, skipping push token registration');
      return null;
    }

    console.log('[PushNotifications] Getting push token...');
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      console.log('[PushNotifications] Push token obtained:', tokenData.data);
      return tokenData.data;
    } catch (tokenError: any) {
      // This is expected in Expo Go / development - log but don't treat as error
      console.log('[PushNotifications] Could not get push token (expected in development):', tokenError?.message || 'Unknown error');
      return null;
    }
  } catch (error: any) {
    console.log('[PushNotifications] Setup error:', error?.message || 'Unknown error');
    return null;
  }
}

export const [PushNotificationsProvider, usePushNotifications] = createContextHook(() => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const orgContext = useOrganization();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const organizationId = orgContext?.organizationId || '';

  const savePushToken = useCallback(async (
    token: string,
    userId: string,
    departmentCode: string,
    orgId: string
  ) => {
    try {
      console.log('[PushNotifications] Saving push token for user:', userId);
      
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          organization_id: orgId,
          department_code: departmentCode,
          push_token: token,
          platform: Platform.OS,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,organization_id',
        });

      if (error) {
        console.error('[PushNotifications] Error saving push token:', error);
      } else {
        console.log('[PushNotifications] Push token saved successfully');
      }
    } catch (error) {
      console.error('[PushNotifications] Exception saving push token:', error);
    }
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        setPermissionGranted(true);
        if (user?.id && organizationId) {
          savePushToken(token, user.id, user.department_code || '', organizationId);
        }
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notif => {
      console.log('[PushNotifications] Notification received:', notif.request.content.title);
      setNotification(notif);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_count'] });
      queryClient.invalidateQueries({ queryKey: ['task_feed_department_tasks'] });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[PushNotifications] Notification tapped');
      const data = response.notification.request.content.data as PushNotificationData;
      console.log('[PushNotifications] Notification data:', data);
    });

    return () => {
      if (Platform.OS !== 'web') {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      }
    };
  }, [user?.id, organizationId, queryClient, savePushToken]);

  useEffect(() => {
    if (expoPushToken && user?.id && organizationId) {
      savePushToken(expoPushToken, user.id, user.department_code || '', organizationId);
    }
  }, [expoPushToken, user?.id, user?.department_code, organizationId, savePushToken]);

  const sendLocalNotification = useCallback(async (
    title: string,
    body: string,
    data?: PushNotificationData
  ) => {
    if (Platform.OS === 'web') {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null,
    });
  }, []);

  const sendTaskFeedNotification = useCallback(async (params: {
    departmentCodes: string[];
    title: string;
    message: string;
    postId: string;
    postNumber: string;
    buttonType: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
  }) => {
    if (!organizationId) return;

    const isUrgent = params.priority === 'urgent' || params.priority === 'high' || params.buttonType === 'report_issue';
    const channelId = isUrgent ? 'task_feed_urgent' : 'task_feed';

    console.log('[PushNotifications] Sending task feed notifications to:', params.departmentCodes);

    if (Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.message,
          data: {
            type: 'task_feed_assigned',
            sourceId: params.postId,
            sourceNumber: params.postNumber,
            departmentCodes: params.departmentCodes,
            actionUrl: '/taskfeed',
          },
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger: null,
      });
    }

    try {
      const { data: pushTokens, error } = await supabase
        .from('user_push_tokens')
        .select('push_token, user_id, department_code')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .in('department_code', params.departmentCodes);

      if (error) {
        console.error('[PushNotifications] Error fetching push tokens:', error);
        return;
      }

      if (!pushTokens || pushTokens.length === 0) {
        console.log('[PushNotifications] No push tokens found for target departments');
        return;
      }

      const messages = pushTokens
        .filter(t => t.push_token && t.user_id !== user?.id)
        .map(t => ({
          to: t.push_token,
          sound: 'default' as const,
          title: params.title,
          body: params.message,
          data: {
            type: 'task_feed_assigned',
            sourceId: params.postId,
            sourceNumber: params.postNumber,
            departmentCode: t.department_code,
            actionUrl: '/taskfeed',
          },
          priority: isUrgent ? ('high' as const) : ('default' as const),
          channelId,
        }));

      if (messages.length > 0) {
        console.log('[PushNotifications] Sending', messages.length, 'push notifications');
        
        for (let i = 0; i < messages.length; i += 100) {
          const chunk = messages.slice(i, i + 100);
          try {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(chunk),
            });

            const result = await response.json();
            console.log('[PushNotifications] Expo push response:', result);
          } catch (fetchError) {
            console.error('[PushNotifications] Error sending to Expo:', fetchError);
          }
        }

        await supabase.from('notification_logs').insert({
          organization_id: organizationId,
          notification_type: isUrgent ? 'task_feed_urgent' : 'task_feed_assigned',
          target_type: 'department',
          target_department_code: params.departmentCodes.join(','),
          source_type: 'task_feed_post',
          source_id: params.postId,
          source_number: params.postNumber,
          push_sent: true,
          push_sent_at: new Date().toISOString(),
          push_recipients: messages.length,
        });
      }
    } catch (error) {
      console.error('[PushNotifications] Exception:', error);
    }
  }, [organizationId, user?.id]);

  const setBadgeCount = useCallback(async (count: number) => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('[PushNotifications] Error setting badge:', error);
    }
  }, []);

  const clearBadge = useCallback(async () => {
    await setBadgeCount(0);
  }, [setBadgeCount]);

  return {
    expoPushToken,
    notification,
    permissionGranted,
    sendLocalNotification,
    sendTaskFeedNotification,
    setBadgeCount,
    clearBadge,
  };
});
