ALTER TABLE "events"
ALTER COLUMN "capacity"
SET DATA TYPE integer
USING "capacity"::integer;
