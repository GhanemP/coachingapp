'use client';

import { format } from 'date-fns';
import { Bell } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Badge } from '@/components/ui/badge'; // Unused import
import { useSocket } from '@/hooks/use-socket';
import logger from '@/lib/logger-client';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markNotificationRead } = useSocket();

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markNotificationRead(notificationId);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'QUICK_NOTE':
        return '📝';
      case 'ACTION_ITEM':
        return '✅';
      case 'SESSION_SCHEDULED':
        return '📅';
      case 'SESSION_COMPLETED':
        return '🎯';
      case 'ACTION_PLAN':
        return '📋';
      default:
        return '🔔';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-lg hover:bg-[#51B1A8]/10 transition-all duration-200"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5 text-gray-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#51B1A8] text-white text-xs flex items-center justify-center font-medium shadow-md">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 shadow-xl border-gray-200" align="end">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-[#51B1A8]/5 to-transparent">
          <h3 className="font-semibold text-gray-900 text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#51B1A8] hover:bg-[#51B1A8]/10 font-medium"
              onClick={async () => {
                try {
                  await fetch('/api/notifications', {
                    method: 'POST',
                  });
                  // The socket will handle updating the UI
                } catch (error) {
                  logger.error('Error marking all as read:', error as Error);
                }
              }}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[450px]">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No notifications yet</p>
              <p className="text-gray-400 text-sm mt-1">
                We&apos;ll notify you when something important happens
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    'px-5 py-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-0',
                    !notification.isRead && 'bg-[#51B1A8]/5 hover:bg-[#51B1A8]/10'
                  )}
                  onClick={() => handleNotificationClick(notification.id, notification.isRead)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#51B1A8]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2 font-medium">
                        {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-[#51B1A8] rounded-full mt-2 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
