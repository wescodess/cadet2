CREATE TABLE IF NOT EXISTS "pathway_rules" (
  "id" varchar(120) PRIMARY KEY,
  "pathway_id" varchar(100) NOT NULL REFERENCES "pathway_definitions" ("pathway_id") ON DELETE CASCADE,
  "unmet_condition_id" varchar(160) NOT NULL,
  "field_path" varchar(120) NOT NULL,
  "operator" varchar(8) NOT NULL,
  "comparison_value" jsonb NOT NULL,
  "display_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pathway_rules_pathway_condition_unique" UNIQUE ("pathway_id", "unmet_condition_id")
);

INSERT INTO "pathway_rules" (
  "id",
  "pathway_id",
  "unmet_condition_id",
  "field_path",
  "operator",
  "comparison_value",
  "display_order"
)
VALUES
  (
    'pathway-rule-mvp-skilled-worker-english-clb',
    'mvp-skilled-worker',
    'minimum-english-clb-8',
    'englishClb',
    '>=',
    '8'::jsonb,
    0
  ),
  (
    'pathway-rule-mvp-skilled-worker-experience',
    'mvp-skilled-worker',
    'minimum-skilled-experience-2-years',
    'yearsSkilledExperience',
    '>=',
    '2'::jsonb,
    1
  ),
  (
    'pathway-rule-mvp-skilled-worker-funds',
    'mvp-skilled-worker',
    'minimum-settlement-funds-15000-cad',
    'settlementFundsCad',
    '>=',
    '15000'::jsonb,
    2
  ),
  (
    'pathway-rule-mvp-provincial-nominee-offer',
    'mvp-provincial-nominee',
    'requires-valid-job-offer',
    'hasValidJobOffer',
    '==',
    'true'::jsonb,
    0
  ),
  (
    'pathway-rule-mvp-provincial-nominee-relocation',
    'mvp-provincial-nominee',
    'requires-relocation-flexibility',
    'openToRelocation',
    '==',
    'true'::jsonb,
    1
  ),
  (
    'pathway-rule-mvp-study-to-work-intent',
    'mvp-study-to-work',
    'requires-study-or-retraining-intent',
    'willingToStudyOrRetrain',
    '==',
    'true'::jsonb,
    0
  ),
  (
    'pathway-rule-mvp-study-to-work-budget',
    'mvp-study-to-work',
    'minimum-budget-25000-cad',
    'budgetCad',
    '>=',
    '25000'::jsonb,
    1
  ),
  (
    'pathway-rule-mvp-study-to-work-timeline',
    'mvp-study-to-work',
    'minimum-timeline-10-months',
    'targetTimelineMonths',
    '>=',
    '10'::jsonb,
    2
  )
ON CONFLICT ("id") DO NOTHING;
