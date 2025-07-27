"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  message: string;
}

const RealTimeNotifications = () => {
  const { socket, connected, on, off } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Use refs to maintain stable references
  const notificationsRef = useRef(notifications);
  const unreadCountRef = useRef(unreadCount);
  
  // Update refs when state changes
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);
  
  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Create stable handler using useCallback
  const handleNotification = useCallback((data: unknown) => {
    const notification = data as Notification;
    setNotifications(prev => [...prev, notification]);
    setUnreadCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!connected || !socket) return;

    // Register handler
    on('notification', handleNotification);

    // Cleanup function
    return () => {
      off('notification', handleNotification);
    };
  }, [connected, socket, on, off, handleNotification]); // Now all dependencies are stable

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const toggleNotifications = useCallback(() => {
    setShowNotifications(prev => !prev);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={toggleNotifications}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <Badge className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2">
            {unreadCount}
          </Badge>
        )}
      </button>
      
      {showNotifications && notifications.length > 0 && (
        <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-lg overflow-hidden z-10">
          <div className="py-1 max-h-96 overflow-y-auto">
            {notifications.map(notification => (
              <div key={notification.id} className="px-4 py-2 hover:bg-gray-50">
                <p className="text-sm text-gray-700">{notification.message}</p>
              </div>
            ))}
          </div>
          {unreadCount > 0 && (
            <div className="border-t px-4 py-2">
              <button
                onClick={markAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealTimeNotifications;