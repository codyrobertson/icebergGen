-- Create tables for the Iceberg Research application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for storing user profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'free',
  searches_remaining INTEGER DEFAULT 3,
  deep_dives_remaining INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table for storing search logs
CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  model TEXT NOT NULL,
  tone TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  results_count INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL
);

-- Table for storing saved icebergs
CREATE TABLE IF NOT EXISTS icebergs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS search_logs_user_id_idx ON search_logs (user_id);
CREATE INDEX IF NOT EXISTS search_logs_query_idx ON search_logs (query);
CREATE INDEX IF NOT EXISTS search_logs_timestamp_idx ON search_logs (timestamp);
CREATE INDEX IF NOT EXISTS icebergs_user_id_idx ON icebergs (user_id);
CREATE INDEX IF NOT EXISTS icebergs_query_idx ON icebergs (query);
CREATE INDEX IF NOT EXISTS icebergs_created_at_idx ON icebergs (created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE icebergs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profiles
CREATE POLICY "Users can read their own profiles" 
ON user_profiles FOR SELECT 
USING (auth.uid() = id);

-- Create policy to allow users to update their own profiles
CREATE POLICY "Users can update their own profiles" 
ON user_profiles FOR UPDATE 
USING (auth.uid() = id);

-- Create policy to allow users to read their own search logs
CREATE POLICY "Users can read their own search logs" 
ON search_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own search logs
CREATE POLICY "Users can insert their own search logs" 
ON search_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to read their own icebergs
CREATE POLICY "Users can read their own icebergs" 
ON icebergs FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own icebergs
CREATE POLICY "Users can insert their own icebergs" 
ON icebergs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create a trigger to create a user profile when a new user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, role, searches_remaining, deep_dives_remaining)
  VALUES (NEW.id, NEW.email, 'free', 3, 3);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

