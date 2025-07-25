'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useSession } from 'next-auth/react';

export default function TestSocketPage() {
  const { data: session } = useSession();
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    if (socket) {
      // Log connection status
      setMessages(prev => [...prev, `Socket initialized: ${socket.id || 'pending'}`]);

      socket.on('connect', () => {
        setMessages(prev => [...prev, `Connected with ID: ${socket.id}`]);
      });

      socket.on('disconnect', () => {
        setMessages(prev => [...prev, 'Disconnected from server']);
      });

      socket.on('connect_error', (error) => {
        setMessages(prev => [...prev, `Connection error: ${error.message}`]);
      });

      socket.on('authenticated', (data) => {
        setMessages(prev => [...prev, `Authentication: ${JSON.stringify(data)}`]);
      });

      // Test events
      socket.on('notification', (data) => {
        setMessages(prev => [...prev, `Notification received: ${JSON.stringify(data)}`]);
      });

      socket.on('quick-note', (data) => {
        setMessages(prev => [...prev, `Quick note received: ${JSON.stringify(data)}`]);
      });

      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('authenticated');
        socket.off('notification');
        socket.off('quick-note');
      };
    }
  }, [socket]);

  const sendTestNotification = () => {
    if (socket) {
      socket.emit('notification:send', {
        userId: session?.user?.id,
        title: 'Test Notification',
        message: 'This is a test notification',
        timestamp: new Date().toISOString()
      });
      setMessages(prev => [...prev, 'Test notification sent']);
    }
  };

  const sendTestQuickNote = () => {
    if (socket) {
      socket.emit('quickNote:create', {
        sessionId: 'test-session',
        content: 'Test quick note',
        category: 'GENERAL',
        timestamp: new Date().toISOString()
      });
      setMessages(prev => [...prev, 'Test quick note sent']);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Socket.IO Connection Test</h1>
      
      <div className="mb-4">
        <p className="text-lg">
          Connection Status: 
          <span className={`ml-2 font-bold ${connected ? 'text-green-600' : 'text-red-600'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </p>
        {session && (
          <p className="text-sm text-gray-600">
            User: {session.user?.email} (ID: {session.user?.id})
          </p>
        )}
      </div>

      <div className="space-x-2 mb-4">
        <button
          onClick={sendTestNotification}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={!connected}
        >
          Send Test Notification
        </button>
        <button
          onClick={sendTestQuickNote}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={!connected}
        >
          Send Test Quick Note
        </button>
      </div>

      <div className="border rounded p-4 bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Event Log:</h2>
        <div className="space-y-1 font-mono text-sm">
          {messages.map((msg, index) => (
            <div key={index} className="text-gray-700">
              [{new Date().toLocaleTimeString()}] {msg}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-gray-500">No events yet...</div>
          )}
        </div>
      </div>
    </div>
  );
}