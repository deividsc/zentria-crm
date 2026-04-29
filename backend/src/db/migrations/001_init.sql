-- 001_init.sql
-- Zentria Tracking - Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table: tracks user sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anonymous_id UUID NOT NULL,
    known_id VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    user_agent TEXT,
    ip_address INET,
    landing_page TEXT,
    referrer TEXT,
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    device_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Events table: tracks all user interactions
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(64) NOT NULL UNIQUE, -- client-generated deduplication key
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    anonymous_id UUID NOT NULL,
    known_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    page_url TEXT,
    page_title TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Anonymous profiles table: stores traits for anonymous users
CREATE TABLE IF NOT EXISTS anonymous_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anonymous_id UUID NOT NULL UNIQUE,
    known_id VARCHAR(255),
    traits JSONB NOT NULL DEFAULT '{}',
    merge_history JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_anonymous_id ON sessions(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_sessions_known_id ON sessions(known_id) WHERE known_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_anonymous_id ON events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

CREATE INDEX IF NOT EXISTS idx_anonymous_profiles_anonymous_id ON anonymous_profiles(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_profiles_known_id ON anonymous_profiles(known_id) WHERE known_id IS NOT NULL;

-- Partial index for unprocessed events (if we add a processed flag later)
CREATE INDEX IF NOT EXISTS idx_events_type_timestamp ON events(event_type, timestamp DESC);

-- Comment on tables
COMMENT ON TABLE sessions IS 'User sessions for tracking visits';
COMMENT ON TABLE events IS 'All tracked user interactions';
COMMENT ON TABLE anonymous_profiles IS 'Traits and merge history for anonymous users';
