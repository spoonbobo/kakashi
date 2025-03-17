-- Create the agent_task table
CREATE TABLE IF NOT EXISTS agent_task (
    id SERIAL PRIMARY KEY,
    task_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    room_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT,
    result TEXT
);

-- Insert data into the agent_task table
INSERT INTO agent_task (task_id, name, role, description, room_id, start_time, end_time, status, result) VALUES
    ('4', 'Get Weather Alerts', 'weather', 'Gets weather alerts for a US state.', 'weather-room-1', NULL, NULL, 'pending', NULL);