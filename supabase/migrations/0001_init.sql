-- ScoutAI MVP schema

create extension if not exists pgcrypto;

create type source_type as enum ('youtube', 'hudl', 'veo');
create type video_status as enum ('queued', 'downloading', 'analyzing', 'complete', 'failed');
create type evidence_category as enum ('technical', 'physical', 'tactical', 'mental');

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int,
  nationality text,
  current_team text,
  created_at timestamptz not null default now()
);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  source_url text not null,
  source_type source_type not null,
  status video_status not null default 'queued',
  duration_seconds int,
  storage_path text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  positions text[] not null,
  confidence_score real not null check (confidence_score >= 0 and confidence_score <= 100),
  style_summary text not null,
  strengths jsonb not null default '[]'::jsonb,
  development_areas jsonb not null default '[]'::jsonb,
  evidence_flags text[] not null default '{}',
  raw_gemini_output jsonb,
  role_view_cache jsonb,
  created_at timestamptz not null default now()
);

create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  time_seconds int not null check (time_seconds >= 0),
  time_label text not null,
  category evidence_category not null,
  description text not null,
  confidence real not null check (confidence >= 0 and confidence <= 100),
  created_at timestamptz not null default now()
);

create index if not exists idx_videos_player_id on videos(player_id);
create index if not exists idx_videos_status on videos(status);
create index if not exists idx_reports_video_id on reports(video_id);
create index if not exists idx_evidence_report_id on evidence(report_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_videos_updated_at on videos;
create trigger trg_videos_updated_at
before update on videos
for each row
execute function set_updated_at();
