ALTER TABLE events ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE idempotency_keys ADD COLUMN payload_hash VARCHAR(64);
