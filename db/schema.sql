-- BoostCal Database Schema
-- Based on: docs/requirements/database/database-design.md

-- ============================================
-- Extension: UUID generation
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Table: users
-- ============================================
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  google_id TEXT UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_domain ON users(domain);

-- ============================================
-- Table: schedule_links
-- ============================================
CREATE TABLE schedule_links (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  duration INTEGER NOT NULL DEFAULT 60,
  owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_links_slug ON schedule_links(slug);
CREATE INDEX idx_schedule_links_owner_id ON schedule_links(owner_id);

-- ============================================
-- Table: bookings
-- ============================================
CREATE TABLE bookings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  schedule_link_id VARCHAR(36) NOT NULL REFERENCES schedule_links(id),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  event_title TEXT,
  meeting_url TEXT,
  meeting_mode TEXT NOT NULL,
  conference_room_id TEXT,
  location_name TEXT,
  location_address TEXT,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_schedule_link_id ON bookings(schedule_link_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_status_start_time ON bookings(status, start_time);

-- ============================================
-- Table: booking_participants
-- ============================================
CREATE TABLE booking_participants (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  booking_id VARCHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(booking_id, user_id)
);

CREATE INDEX idx_bp_booking_id ON booking_participants(booking_id);
CREATE INDEX idx_bp_user_id ON booking_participants(user_id);

-- ============================================
-- Table: calendar_invitations
-- ============================================
CREATE TABLE calendar_invitations (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  inviter_id VARCHAR(36) NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_ci_token ON calendar_invitations(token);
CREATE INDEX idx_ci_email ON calendar_invitations(email);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users
CREATE POLICY select_own_user ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY insert_user ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

CREATE POLICY update_own_user ON users
  FOR UPDATE USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- RLS Policies: schedule_links
CREATE POLICY select_own_links ON schedule_links
  FOR SELECT USING (owner_id = auth.uid()::text);

CREATE POLICY select_active_links ON schedule_links
  FOR SELECT USING (is_active = true);

CREATE POLICY insert_own_links ON schedule_links
  FOR INSERT WITH CHECK (owner_id = auth.uid()::text);

CREATE POLICY update_own_links ON schedule_links
  FOR UPDATE USING (owner_id = auth.uid()::text);

CREATE POLICY delete_own_links ON schedule_links
  FOR DELETE USING (owner_id = auth.uid()::text);

-- RLS Policies: bookings (public insert for guests, owner can read)
CREATE POLICY insert_booking ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY select_own_bookings ON bookings
  FOR SELECT USING (
    schedule_link_id IN (
      SELECT id FROM schedule_links WHERE owner_id = auth.uid()::text
    )
  );

-- RLS Policies: booking_participants
CREATE POLICY select_own_bp ON booking_participants
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY insert_bp ON booking_participants
  FOR INSERT WITH CHECK (true);

-- RLS Policies: calendar_invitations
CREATE POLICY select_own_invitations ON calendar_invitations
  FOR SELECT USING (inviter_id = auth.uid()::text);

CREATE POLICY insert_invitations ON calendar_invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid()::text);
