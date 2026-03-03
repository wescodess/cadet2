CREATE TABLE "intake_draft" (
	"userId" text PRIMARY KEY NOT NULL,
	"currentSection" text NOT NULL,
	"sectionProgress" jsonb NOT NULL,
	"fieldValues" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "intake_draft_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "intake_draft_userId_idx" ON "intake_draft" USING btree ("userId");
