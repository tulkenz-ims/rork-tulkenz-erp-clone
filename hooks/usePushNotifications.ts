import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  actionUrl?: string;
}

export interface SendLocalNotificationInput {
  title: string;
  body: string;
  data?: PushNotificationData;
  categoryIdentifier?: string;
}

export interface SendTaskFeedNotificationInput {
  departmentCodes: string[];
  title: string;
  message: string;
  postId: string;
  postNumber: string;
  templateName: string;
  buttonType: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'web') {
    console.log('[PushNotifications] Web platform - skipping native push registration');
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

    console.log('[PushNotifications] Getting push token...');
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    token = tokenData.data;
    console.log('[PushNotifications] Push token:', token);

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
    }
  } catch (error) {
    console.error('[PushNotifications] Error registering:', error);
  }

  return token;
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const orgContext = useOrganization();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const organizationId = orgContext?.organizationId || '';

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
      if (token && user?.id && organizationId) {
        savePushToken(token, user.id, user.department_code || '', organizationId);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[PushNotifications] Notification received:', notification);
      setNotification(notification);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications_count'] });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[PushNotifications] Notification response:', response);
      const data = response.notification.request.content.data as PushNotificationData;
      handleNotificationResponse(data);
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
  }, [user?.id, user?.department_code, organizationId, queryClient, handleNotificationResponse]);

  const handleNotificationResponse = useCallback((data: PushNotificationData) => {
    console.log('[PushNotifications] Handling notification tap:', data);
  }, []);

  const savePushToken = async (
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
  };

  return {
    expoPushToken,
    notification,
  };
}

export function useSendLocalNotification() {
  return useMutation({
    mutationFn: async (input: SendLocalNotificationInput) => {
      if (Platform.OS === 'web') {
        console.log('[PushNotifications] Web platform - showing browser notification');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(input.title, { body: input.body });
        }
        return;
      }

      console.log('[PushNotifications] Scheduling local notification:', input.title);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: input.title,
          body: input.body,
          data: input.data || {},
          sound: 'default',
          categoryIdentifier: input.categoryIdentifier,
        },
        trigger: null,
      });
    },
    onError: (error) => {
      console.error('[PushNotifications] Error sending local notification:', error);
    },
  });
}

export function useSendTaskFeedNotifications() {
  const orgContext = useOrganization();
  const { user } = useUser();
  const organizationId = orgContext?.organizationId || '';

  return useMutation({
    mutationFn: async (input: SendTaskFeedNotificationInput) => {
      if (!organizationId) {
        console.log('[PushNotifications] No organization ID, skipping');
        return;
      }

      console.log('[PushNotifications] Sending task feed notifications to departments:', input.departmentCodes);

      const isUrgent = input.priority === 'urgent' || input.priority === 'high' || input.buttonType === 'report_issue';
      const channelId = isUrgent ? 'task_feed_urgent' : 'task_feed';

      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: input.title,
            body: input.message,
            data: {
              type: 'task_feed_assigned',
              sourceId: input.postId,
              sourceNumber: input.postNumber,
              departmentCodes: input.departmentCodes,
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
          .in('department_code', input.departmentCodes);

        if (error) {
          console.error('[PushNotifications] Error fetching push tokens:', error);
          return;
        }

        if (!pushTokens || pushTokens.length === 0) {
          console.log('[PushNotifications] No push tokens found for departments');
          return;
        }

        const messages = pushTokens
          .filter(t => t.push_token && t.user_id !== user?.id)
          .map(t => ({
            to: t.push_token,
            sound: 'default',
            title: input.title,
            body: input.message,
            data: {
              type: 'task_feed_assigned',
              sourceId: input.postId,
              sourceNumber: input.postNumber,
              departmentCode: t.department_code,
              actionUrl: '/taskfeed',
            },
            priority: isUrgent ? 'high' : 'default',
            channelId,
          }));

        if (messages.length > 0) {
          console.log('[PushNotifications] Sending', messages.length, 'push notifications via Expo');
          
          const chunks = [];
          for (let i = 0; i < messages.length; i += 100) {
            chunks.push(messages.slice(i, i + 100));
          }

          for (const chunk of chunks) {
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
        }
      } catch (error) {
        console.error('[PushNotifications] Exception sending push notifications:', error);
      }
    },
    onSuccess: () => {
      console.log('[PushNotifications] Task feed notifications sent successfully');
    },
    onError: (error) => {
      console.error('[PushNotifications] Error sending task feed notifications:', error);
    },
  });
}

export function useRequestNotificationPermission() {
  return useMutation({
    mutationFn: async () => {
      if (Platform.OS === 'web') {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
        return false;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    },
  });
}

export function useBadgeCount() {
  const setBadgeCount = useCallback(async (count: number) => {
    if (Platform.OS === 'web') return;
    
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('[PushNotifications] Error setting badge count:', error);
    }
  }, []);

  const clearBadge = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('[PushNotifications] Error clearing badge:', error);
    }
  }, []);

  return { setBadgeCount, clearBadge };
}
