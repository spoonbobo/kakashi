export interface Notification {
    id: string;
    notification_id: string;
    message: string;
    sender: string;
    timestamp: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'new' | 'acknowledged' | 'resolved';
}