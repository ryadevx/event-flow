CREATE TABLE "idempotency_keys" (
	"key" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"ticket_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_key_user_id_pk" PRIMARY KEY("key","user_id")
);
