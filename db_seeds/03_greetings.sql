-- Create the greetings table
CREATE TABLE IF NOT EXISTS greetings (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL
);

-- Insert default greeting messages
INSERT INTO greetings (message) VALUES
('Hello! How can I assist you today?'),
('Welcome! What brings you here?'),
('Hi there! Ready to chat?');