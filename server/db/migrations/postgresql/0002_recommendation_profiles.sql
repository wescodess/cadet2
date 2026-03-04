CREATE TABLE "recommendation_profiles" (
	"snapshotId" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"submittedPayload" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recommendation_profiles_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "recommendation_profiles_userId_idx" ON "recommendation_profiles" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX "recommendation_profiles_createdAt_idx" ON "recommendation_profiles" USING btree ("createdAt");
