-- Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    notification_id TEXT NOT NULL,
    message TEXT NOT NULL,
    sender TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('new', 'acknowledged', 'resolved'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_notification_id ON notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
