BEGIN;
LOCK TABLE "governance_audit_log" IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE "governance_audit_log" ADD COLUMN IF NOT EXISTS "state_digests" jsonb;
ALTER TABLE "governance_audit_log" ADD COLUMN IF NOT EXISTS "truncated" boolean NOT NULL DEFAULT false;
ALTER TABLE "governance_audit_log" ADD COLUMN IF NOT EXISTS "change_summary" text;
CREATE INDEX IF NOT EXISTS "governance_audit_keyset_idx" ON "governance_audit_log" ("timestamp_ms" DESC, "event_id" COLLATE "C" DESC);
CREATE INDEX IF NOT EXISTS "governance_audit_entity_keyset_idx" ON "governance_audit_log" ("entity_type", "timestamp_ms" DESC, "event_id" COLLATE "C" DESC);
CREATE INDEX IF NOT EXISTS "governance_audit_actor_keyset_idx" ON "governance_audit_log" ("actor_id", "timestamp_ms" DESC, "event_id" COLLATE "C" DESC);
CREATE INDEX IF NOT EXISTS "governance_audit_subject_keyset_idx" ON "governance_audit_log" ("entity_id", "timestamp_ms" DESC, "event_id" COLLATE "C" DESC);
CREATE INDEX IF NOT EXISTS "governance_audit_action_keyset_idx" ON "governance_audit_log" ("action_type", "timestamp_ms" DESC, "event_id" COLLATE "C" DESC);
CREATE TABLE IF NOT EXISTS "governance_audit_clock" ("id" integer PRIMARY KEY CHECK ("id" = 1), "timestamp_ms" bigint NOT NULL);
CREATE TABLE IF NOT EXISTS "admin_create_receipts" (
  "actor_id" varchar(255) NOT NULL,
  "operation" varchar(255) NOT NULL,
  "key" varchar(128) NOT NULL,
  "payload_digest" varchar(64) NOT NULL,
  "receipt" jsonb,
  PRIMARY KEY ("actor_id", "operation", "key")
);

CREATE TABLE IF NOT EXISTS "governance_audit_counts" (
  "kind" text NOT NULL, "key" text NOT NULL, "count" bigint NOT NULL, "label" text, "day" bigint,
  PRIMARY KEY ("kind", "key")
);
CREATE INDEX IF NOT EXISTS "governance_audit_counts_day_idx" ON "governance_audit_counts" ("kind", "day");

CREATE OR REPLACE FUNCTION "count_governance_audit_event"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.entity_type IN ('PATHWAY', 'PATHWAY_RULE', 'EVIDENCE_SOURCE') THEN
    INSERT INTO governance_audit_counts (kind, key, count, label, day) VALUES
      ('actor', NEW.actor_id, 1, NEW.actor_email, NULL),
      ('entity', NEW.entity_type, 1, NULL, NULL),
      ('day', (NEW.timestamp_ms / 86400000)::text, 1, NULL, NEW.timestamp_ms / 86400000)
    ON CONFLICT (kind, key) DO UPDATE SET count = governance_audit_counts.count + 1,
      label = COALESCE(EXCLUDED.label, governance_audit_counts.label);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS "count_governance_audit_event" ON "governance_audit_log";
CREATE TRIGGER "count_governance_audit_event" AFTER INSERT ON "governance_audit_log"
FOR EACH ROW EXECUTE FUNCTION "count_governance_audit_event"();

INSERT INTO governance_audit_counts (kind, key, count, label)
SELECT 'actor', actor_id, COUNT(*), MAX(actor_email) FROM governance_audit_log
WHERE entity_type IN ('PATHWAY', 'PATHWAY_RULE', 'EVIDENCE_SOURCE') GROUP BY actor_id
ON CONFLICT (kind, key) DO UPDATE SET count = EXCLUDED.count, label = EXCLUDED.label;
INSERT INTO governance_audit_counts (kind, key, count)
SELECT 'entity', entity_type, COUNT(*) FROM governance_audit_log
WHERE entity_type IN ('PATHWAY', 'PATHWAY_RULE', 'EVIDENCE_SOURCE') GROUP BY entity_type
ON CONFLICT (kind, key) DO UPDATE SET count = EXCLUDED.count;
INSERT INTO governance_audit_counts (kind, key, count, day)
SELECT 'day', (timestamp_ms / 86400000)::text, COUNT(*), timestamp_ms / 86400000 FROM governance_audit_log
WHERE entity_type IN ('PATHWAY', 'PATHWAY_RULE', 'EVIDENCE_SOURCE') GROUP BY timestamp_ms / 86400000
ON CONFLICT (kind, key) DO UPDATE SET count = EXCLUDED.count;

COMMIT;
