import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: string;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  const connect = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('Connected to real-time updates');
        setIsConnected(true);
        
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          
          switch (message.event) {
            case 'connected':
              // Initial connection message
              break;
              
            case 'transaction_created':
              // Invalidate transactions and stats queries to refetch data
              queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
              queryClient.invalidateQueries({ queryKey: ['/api/stats/monthly'] });
              
              // Dispatch custom event for notifications component
              window.dispatchEvent(new CustomEvent('websocket-notification', { 
                detail: message 
              }));
              
              toast({
                title: 'New Transaction',
                description: `A new ${message.data.type} has been added: ${message.data.description}`,
                duration: 3000,
              });
              break;
              
            case 'group_created':
              // Invalidate groups query to refetch data
              queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
              
              // Dispatch custom event for notifications component
              window.dispatchEvent(new CustomEvent('websocket-notification', { 
                detail: message 
              }));
              
              toast({
                title: 'New Group Created',
                description: `Group "${message.data.name}" has been created`,
                duration: 3000,
              });
              break;
              
            case 'group_member_added':
              // Invalidate groups query to refetch data
              queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
              
              // Dispatch custom event for notifications component
              window.dispatchEvent(new CustomEvent('websocket-notification', { 
                detail: message 
              }));
              
              toast({
                title: 'New Group Member',
                description: `${message.data.member.name} has joined a group`,
                duration: 3000,
              });
              break;
              
            default:
              console.log('Unknown WebSocket event:', message.event);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setIsConnected(false);
    }
  };
  
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  return {
    isConnected,
    reconnect: connect
  };
}