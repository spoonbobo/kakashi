-- Create roles first
CREATE ROLE spoonbobo WITH LOGIN PASSWORD 'bobo1234';
CREATE ROLE ivanho WITH LOGIN PASSWORD 'ivanho1234';
GRANT ALL PRIVILEGES ON DATABASE postgres TO spoonbobo;
GRANT ALL PRIVILEGES ON DATABASE postgres TO ivanho;

-- Then create the users table and insert data
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

INSERT INTO users (username, password) VALUES
('spoonbobo', 'bobo1234'),
('ivanho', 'ivanho1234'),
('agent', 'agent1234');