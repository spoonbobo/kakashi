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
    ('Run SLURM Job', 'hpc', 'Submits and manages SLURM jobs on the cluster.', NULL, NULL, 'idle', NULL),
    ('Upload DeepSeek Model', 'hpc', 'Uploads and configures DeepSeek models for analysis.', NULL, NULL, 'idle', NULL),
    ('Run NCCL Test', 'hpc', 'Executes NCCL tests to evaluate GPU communication performance.', NULL, NULL, 'idle', NULL);