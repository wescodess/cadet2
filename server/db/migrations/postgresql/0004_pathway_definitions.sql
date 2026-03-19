CREATE TABLE IF NOT EXISTS "pathway_definitions" (
  "id" varchar(120) PRIMARY KEY,
  "pathway_id" varchar(100) NOT NULL UNIQUE,
  "display_name" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "pathway_definitions" (
  "id",
  "pathway_id",
  "display_name",
  "description",
  "status"
)
VALUES
  (
    'pathway-mvp-skilled-worker',
    'mvp-skilled-worker',
    'Skilled Worker pathway',
    'Core skilled worker pathway supported in the MVP recommendation catalog.',
    'active'
  ),
  (
    'pathway-mvp-provincial-nominee',
    'mvp-provincial-nominee',
    'Provincial Nominee pathway',
    'Province-linked route that requires offer and relocation flexibility.',
    'active'
  ),
  (
    'pathway-mvp-study-to-work',
    'mvp-study-to-work',
    'Study-to-Work pathway',
    'Longer-horizon study route available for candidates open to retraining.',
    'active'
  )
ON CONFLICT ("pathway_id") DO NOTHING;
