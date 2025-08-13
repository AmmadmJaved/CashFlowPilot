import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, X, Users, DollarSign, Clock } from "lucide-react";

interface NotificationItem {
  id: string;
  event: string;
  message: string;
  timestamp: string;
  type: 'transaction' | 'group' | 'member';
}

interface RealTimeNotificationsProps {
  isConnected: boolean;
}

export default function RealTimeNotifications({ isConnected }: RealTimeNotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Listen for custom events from the WebSocket hook
    const handleNotification = (event: CustomEvent) => {
      const { event: eventType, data, timestamp } = event.detail;
      
      let message = '';
      let type: 'transaction' | 'group' | 'member' = 'transaction';
      
      switch (eventType) {
        case 'transaction_created':
          message = `New ${data.type}: ${data.description} (${data.amount})`;
          type = 'transaction';
          break;
        case 'group_created':
          message = `Group "${data.name}" created`;
          type = 'group';
          break;
        case 'group_member_added':
          message = `${data.member.name} joined a group`;
          type = 'member';
          break;
        default:
          return;
      }
      
      const notification: NotificationItem = {
        id: `${eventType}-${Date.now()}`,
        event: eventType,
        message,
        timestamp,
        type
      };
      
      setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep only 10 most recent
    };

    window.addEventListener('websocket-notification', handleNotification as EventListener);
    
    return () => {
      window.removeEventListener('websocket-notification', handleNotification as EventListener);
    };
  }, []);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <DollarSign className="w-4 h-4" />;
      case 'group': return <Users className="w-4 h-4" />;
      case 'member': return <Users className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'transaction': return 'default';
      case 'group': return 'secondary';
      case 'member': return 'outline';
      default: return 'default';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isExpanded && notifications.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Real-time Activity</span>
            {notifications.length > 0 && (
              <Badge variant="secondary">{notifications.length}</Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearNotifications}
                data-testid="button-clear-notifications"
              >
                Clear
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid="button-toggle-notifications"
            >
              {isExpanded ? <X className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {!isConnected && (
            <div className="text-center py-4 text-amber-600 bg-amber-50 rounded-lg mb-4">
              <Clock className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">Waiting for real-time connection...</p>
            </div>
          )}
          
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
              <p className="text-sm">Real-time updates will appear here</p>
            </div>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                    data-testid={`notification-${notification.type}`}
                  >
                    <div className="mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <Badge variant={getBadgeVariant(notification.type)} className="text-xs">
                          {notification.type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-gray-700">{notification.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
}