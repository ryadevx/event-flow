ALTER TABLE inbox_events ADD COLUMN retry_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE inbox_events ADD COLUMN last_error TEXT;
