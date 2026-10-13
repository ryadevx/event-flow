CREATE INDEX IF NOT EXISTS idx_outbox_events_published_at ON outbox_events(published_at);
