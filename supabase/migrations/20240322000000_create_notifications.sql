-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')) DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    related_table TEXT,
    related_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_dismissed ON notifications(user_id, dismissed);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_table, related_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications for users" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications for users"
    ON notifications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to automatically clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    -- Delete dismissed notifications older than 30 days
    DELETE FROM notifications 
    WHERE dismissed = true 
    AND dismissed_at < NOW() - INTERVAL '30 days';
    
    -- Delete read notifications older than 90 days
    DELETE FROM notifications 
    WHERE read = true 
    AND read_at < NOW() - INTERVAL '90 days';
    
    -- Delete unread notifications older than 1 year
    DELETE FROM notifications 
    WHERE read = false 
    AND created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Create function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_metadata JSONB DEFAULT '{}',
    p_related_table TEXT DEFAULT NULL,
    p_related_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, title, message, type, metadata, related_table, related_id
    ) VALUES (
        p_user_id, p_title, p_message, p_type, p_metadata, p_related_table, p_related_id
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Mark all unread notifications as read
        UPDATE notifications 
        SET read = true, read_at = NOW()
        WHERE user_id = p_user_id AND read = false;
    ELSE
        -- Mark specific notifications as read
        UPDATE notifications 
        SET read = true, read_at = NOW()
        WHERE user_id = p_user_id 
        AND id = ANY(p_notification_ids) 
        AND read = false;
    END IF;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to dismiss notifications
CREATE OR REPLACE FUNCTION dismiss_notifications(
    p_user_id UUID,
    p_notification_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE notifications 
    SET dismissed = true, dismissed_at = NOW()
    WHERE user_id = p_user_id 
    AND id = ANY(p_notification_ids);
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for automatic notification creation
CREATE OR REPLACE FUNCTION trigger_create_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- This can be customized based on your needs
    -- Example: Create notification when a transaction rule is created
    IF TG_TABLE_NAME = 'transaction_rules' AND TG_OP = 'INSERT' THEN
        PERFORM create_notification(
            NEW.user_id,
            'Transaction Rule Created',
            'New transaction rule "' || NEW.name || '" has been created successfully.',
            'success',
            jsonb_build_object('rule_id', NEW.id, 'rule_name', NEW.name),
            'transaction_rules',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic notifications (optional)
-- Uncomment these if you want automatic notifications for rule creation
-- CREATE TRIGGER trigger_transaction_rule_notification
--     AFTER INSERT ON transaction_rules
--     FOR EACH ROW
--     EXECUTE FUNCTION trigger_create_notification();

-- Create a view for easy notification querying
CREATE OR REPLACE VIEW user_notifications AS
SELECT 
    n.*,
    CASE 
        WHEN n.read = false THEN 'unread'
        WHEN n.dismissed = true THEN 'dismissed'
        ELSE 'read'
    END as status
FROM notifications n
WHERE n.user_id = auth.uid()
AND n.dismissed = false
ORDER BY n.created_at DESC; 