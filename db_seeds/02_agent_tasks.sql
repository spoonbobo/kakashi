-- Create the agent_task table
CREATE TABLE IF NOT EXISTS agent_task (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT,
    result TEXT
);

-- Insert data into the agent_task table
INSERT INTO agent_task (name, role, description, start_time, end_time, status, result) VALUES
    ('Customer Support', 'support', 'Handles customer inquiries and issues.', NULL, NULL, 'idle', NULL),
    ('Technical Assistant', 'technical', 'Provides technical support and troubleshooting.', NULL, NULL, 'idle', NULL),
    ('Sales Representative', 'sales', 'Manages sales and customer acquisition.', NULL, NULL, 'idle', NULL),
    ('General Inquiry', 'general', 'Handles general questions and information requests.', NULL, NULL, 'idle', NULL);