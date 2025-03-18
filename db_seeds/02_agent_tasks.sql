-- Create the agent_task table
CREATE TABLE IF NOT EXISTS agent_task (
    id SERIAL PRIMARY KEY,
    task_id TEXT NOT NULL,
    summarization TEXT NOT NULL,
    role TEXT NOT NULL,
    task_type TEXT,
    description TEXT,
    room_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT,
    result TEXT,
    is_tool_call BOOLEAN NOT NULL DEFAULT FALSE,
    tools_called JSONB
);

-- Insert data into the agent_task table
INSERT INTO agent_task (task_id, summarization, role, task_type, description, room_id, start_time, end_time, status, result, is_tool_call, tools_called) VALUES
    (
        '12345-12345-12345-12345-12345', 
        'Get Weather Alerts', 
        'agent', 
        'weather', 
        'Gets weather alerts for a US state.', 
        '550e8400-e29b-41d4-a716-446655440000', 
        NULL, 
        NULL, 
        'pending', 
        NULL, 
        FALSE, 
        NULL);
