import { useEffect, useState } from 'react';
import useSocket from '@/hooks/useSocket';
import { Badge } from '@/components/ui/badge';

const RealTimeNotifications = () => {
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<Array<{id: string; message: string}>>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isConnected || !socket) return;

    const handleNotification = (data: { id: string; message: string }) => {
      setNotifications(prev => [...prev, data]);
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [isConnected, socket]);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      <button
        onClick={markAsRead}
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
      
      {notifications.length > 0 && (
        <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-lg overflow-hidden z-10">
          <div className="py-1">
            {notifications.map(notification => (
              <div key={notification.id} className="px-4 py-2 hover:bg-gray-50">
                <p className="text-sm text-gray-700">{notification.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeNotifications;