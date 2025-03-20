-- Create the agent_task table
CREATE TABLE IF NOT EXISTS agent_task (
    id SERIAL PRIMARY KEY,
    task_id TEXT NOT NULL,
    summarization TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    room_id TEXT,
    conversation JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT,
    result TEXT,
    is_tool_call BOOLEAN NOT NULL DEFAULT FALSE,
    tools_called JSONB
);
