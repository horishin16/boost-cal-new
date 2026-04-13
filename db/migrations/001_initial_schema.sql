-- Migration: Initial Schema
-- Created: 2026-04-09
-- Description: BoostCal 初期テーブル・スキーマ作成

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users
CREATE TABLE IF NOT EXISTS users (
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_domain ON users(domain);

-- schedule_links
CREATE TABLE IF NOT EXISTS schedule_links (
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

CREATE INDEX IF NOT EXISTS idx_schedule_links_slug ON schedule_links(slug);
CREATE INDEX IF NOT EXISTS idx_schedule_links_owner_id ON schedule_links(owner_id);

-- bookings
CREATE TABLE IF NOT EXISTS bookings (
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

CREATE INDEX IF NOT EXISTS idx_bookings_schedule_link_id ON bookings(schedule_link_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status_start_time ON bookings(status, start_time);

-- booking_participants
CREATE TABLE IF NOT EXISTS booking_participants (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  booking_id VARCHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(booking_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bp_booking_id ON booking_participants(booking_id);
CREATE INDEX IF NOT EXISTS idx_bp_user_id ON booking_participants(user_id);

-- calendar_invitations
CREATE TABLE IF NOT EXISTS calendar_invitations (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  inviter_id VARCHAR(36) NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ci_token ON calendar_invitations(token);
CREATE INDEX IF NOT EXISTS idx_ci_email ON calendar_invitations(email);
