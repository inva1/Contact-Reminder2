import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient'; // Assuming this is your configured fetch wrapper
import { useAuth } from './useAuth'; // To check if user is authenticated
import { useToast } from './use-toast';
// Assuming user settings are available, e.g. via another hook or context.
// For this example, let's assume a simple hook useUserSettings exists or settings are fetched here.

interface PendingReminder {
  contactId: number;
  contactName: string;
  suggestion: string;
}

// Helper to get user settings - replace with your actual settings-fetching logic
// This is a placeholder. In a real app, settings would likely come from a context or a dedicated query.
const useUserSettings = () => {
  const { data: settings, isLoading } = useQuery<{ reminder_enabled?: boolean }>({
    queryKey: ['/api/settings'], // Ensure this query key matches your settings fetch
    // enabled: !!useAuth().isAuthenticated, // Only fetch if authenticated
  });
  return { settings, isLoadingSettings: isLoading };
};


export const useReminders = () => {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const { settings, isLoadingSettings } = useUserSettings(); // Placeholder for user settings
  const queryClient = useQueryClient();

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.error('This browser does not support desktop notification');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'denied') {
      toast({
        title: 'Notification Permission Denied',
        description: 'You will not receive reminders. Please enable notifications in browser settings.',
        variant: 'warning',
      });
    } else if (permission === 'granted') {
        toast({
            title: 'Notifications Enabled',
            description: 'You will now receive reminders as notifications.',
        });
    }
  }, [toast]);

  // Effect to request permission when component mounts or auth status changes
  useEffect(() => {
    if (isAuthenticated && notificationPermission === 'default') {
      requestPermission();
    }
  }, [isAuthenticated, notificationPermission, requestPermission]);

  const remindersEnabledInSettings = settings?.reminder_enabled ?? false;

  // Fetch pending reminders
  const { data: pendingReminders, refetch: refetchReminders } = useQuery<PendingReminder[]>({
    queryKey: ['/api/reminders/pending'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/reminders/pending');
      return res.json();
    },
    enabled: isAuthenticated && notificationPermission === 'granted' && remindersEnabledInSettings && !isLoadingSettings,
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    refetchOnWindowFocus: true,
  });

  // Display notifications
  useEffect(() => {
    if (pendingReminders && pendingReminders.length > 0) {
      const shownNotificationsKey = 'shownReminderNotifications';
      let shownNotifications: Record<string, number> = {}; // contactId_suggestionTimestamp -> notificationTime
      try {
        shownNotifications = JSON.parse(sessionStorage.getItem(shownNotificationsKey) || '{}');
      } catch (e) { console.error("Error parsing shown notifications from session storage", e); }

      const now = Date.now();
      const anHourAgo = now - (1000 * 60 * 60); // Don't reshow for at least an hour

      pendingReminders.forEach(reminder => {
        const notificationId = `${reminder.contactId}_${reminder.suggestion}`; // Simple ID
        
        if (shownNotifications[notificationId] && shownNotifications[notificationId] > anHourAgo) {
          // console.log(`Notification for ${reminder.contactName} (suggestion: ${reminder.suggestion}) already shown recently.`);
          return; 
        }

        const notification = new Notification(`Reminder: Connect with ${reminder.contactName}`, {
          body: reminder.suggestion,
          icon: '/favicon.ico', // Replace with your app's icon
          data: { contactId: reminder.contactId },
          tag: `contact-reminder-${reminder.contactId}` // Tag to prevent multiple notifications for same contact if not handled by shownNotifications
        });

        notification.onclick = () => {
          navigate(`/contact/${reminder.contactId}`);
          window.focus();
        };
        
        shownNotifications[notificationId] = now;
      });
      sessionStorage.setItem(shownNotificationsKey, JSON.stringify(shownNotifications));
    }
  }, [pendingReminders, navigate]);

  return {
    notificationPermission,
    requestPermission,
    pendingRemindersCount: pendingReminders?.length || 0,
    forceRefetchReminders: refetchReminders, // Expose refetch if manual trigger is needed
  };
};
