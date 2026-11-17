CREATE TABLE IF NOT EXISTS "governance_audit_log" (
          "event_id" varchar(80) PRIMARY KEY,
          "actor_id" varchar(255) NOT NULL,
          "actor_email" text,
          "actor_role" varchar(64),
          "action_type" varchar(64) NOT NULL,
          "entity_type" varchar(64) NOT NULL,
          "entity_id" varchar(255) NOT NULL,
          "entity_label" text NOT NULL,
          "change_context_before" jsonb,
          "change_context_after" jsonb,
          "reason" text,
          "timestamp_ms" bigint NOT NULL
        );

CREATE INDEX IF NOT EXISTS "governance_audit_log_timestamp_idx" ON "governance_audit_log" ("timestamp_ms" DESC);
CREATE INDEX IF NOT EXISTS "governance_audit_log_action_idx" ON "governance_audit_log" ("action_type");
CREATE INDEX IF NOT EXISTS "governance_audit_log_entity_type_idx" ON "governance_audit_log" ("entity_type");
CREATE INDEX IF NOT EXISTS "governance_audit_log_actor_idx" ON "governance_audit_log" ("actor_id");
CREATE INDEX IF NOT EXISTS "governance_audit_log_entity_id_idx" ON "governance_audit_log" ("entity_id");
