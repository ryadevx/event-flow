ALTER TABLE events ADD COLUMN IF NOT EXISTS sold_tickets INTEGER NOT NULL DEFAULT 0;

UPDATE events e
SET sold_tickets = COALESCE((
  SELECT SUM(t.quantity)
  FROM tickets t
  WHERE t.event_id = e.id
), 0);
