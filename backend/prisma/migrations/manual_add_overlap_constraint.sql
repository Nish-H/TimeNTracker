-- Add exclusion constraint to prevent overlapping time logs
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE time_logs ADD CONSTRAINT no_overlapping_time_logs 
EXCLUDE USING GIST (
  user_id WITH =,
  tsrange(start_time, end_time, '[)') WITH &&
) WHERE (end_time IS NOT NULL);
