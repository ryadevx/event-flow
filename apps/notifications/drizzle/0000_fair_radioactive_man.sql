CREATE TABLE "inbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" varchar(100) NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
