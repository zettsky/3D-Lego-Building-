-- Tsumiki data pipeline: initial schema.
-- Target: PostgreSQL 15+ (tested on PGlite / PostgreSQL 18 in WASM). See docs/data/SCHEMA.md.
-- Conventions: catalog rows use the source's stable natural key where one exists (Rebrickable set_num,
-- part_num, colour id, LDraw file name). Pipeline-created rows use bigint identity keys.

-- ---------------------------------------------------------------- sources & provenance
CREATE TABLE sources (
  id               text PRIMARY KEY,                -- 'rebrickable', 'ldraw', 'ldraw-omr', 'lego', 'brickset', 'user', 'manual', 'test-fixture'
  name             text NOT NULL,
  homepage         text,
  terms_url        text,
  terms_checked_at date,
  licence_summary  text,
  decision         text NOT NULL CHECK (decision IN ('download', 'api', 'reference_only', 'private')),
  notes            text
);

CREATE TABLE provenance (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id      text NOT NULL REFERENCES sources(id),
  url            text,
  licence        text,
  retrieved_at   timestamptz NOT NULL DEFAULT now(),
  sha256         char(64),
  etag           text,
  last_modified  text,
  byte_size      bigint,
  notes          text
);
CREATE INDEX provenance_source_url ON provenance (source_id, url, retrieved_at DESC);

-- ---------------------------------------------------------------- catalog (Rebrickable keys)
CREATE TABLE themes (
  id             integer PRIMARY KEY,               -- Rebrickable theme id
  name           text NOT NULL,
  parent_id      integer REFERENCES themes(id) DEFERRABLE INITIALLY DEFERRED,
  provenance_id  bigint REFERENCES provenance(id),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE colors (
  id             integer PRIMARY KEY,               -- Rebrickable colour id (-1 = unknown, 9999 = any)
  name           text NOT NULL,
  rgb            char(6) NOT NULL CHECK (rgb ~ '^[0-9A-Fa-f]{6}$'),
  is_trans       boolean NOT NULL,
  provenance_id  bigint REFERENCES provenance(id),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE part_categories (
  id             integer PRIMARY KEY,
  name           text NOT NULL,
  provenance_id  bigint REFERENCES provenance(id)
);

CREATE TABLE parts (
  part_num       text PRIMARY KEY,                  -- Rebrickable part number
  name           text NOT NULL,
  category_id    integer REFERENCES part_categories(id),
  material       text,
  provenance_id  bigint REFERENCES provenance(id),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE part_relationships (
  rel_type        char(1) NOT NULL CHECK (rel_type IN ('P', 'R', 'B', 'M', 'T', 'A')),
  child_part_num  text NOT NULL REFERENCES parts(part_num),
  parent_part_num text NOT NULL REFERENCES parts(part_num),
  provenance_id   bigint REFERENCES provenance(id),
  PRIMARY KEY (rel_type, child_part_num, parent_part_num)
);

-- LEGO element id -> part + colour, as verified by the source that published it (Rebrickable elements.csv).
CREATE TABLE elements (
  element_id     text PRIMARY KEY,
  part_num       text NOT NULL REFERENCES parts(part_num),
  color_id       integer NOT NULL REFERENCES colors(id),
  design_id      text,
  source_id      text NOT NULL REFERENCES sources(id),
  provenance_id  bigint REFERENCES provenance(id)
);
CREATE INDEX elements_part_color ON elements (part_num, color_id);

CREATE TABLE sets (
  set_num        text PRIMARY KEY,                  -- e.g. '21368-1'
  name           text NOT NULL,
  year           integer CHECK (year BETWEEN 1940 AND 2100),
  theme_id       integer REFERENCES themes(id),
  num_parts      integer NOT NULL CHECK (num_parts >= 0),
  image_url      text,                              -- reference only, never re-hosted
  provenance_id  bigint REFERENCES provenance(id),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sets_theme ON sets (theme_id);

CREATE TABLE minifigs (
  fig_num        text PRIMARY KEY,
  name           text NOT NULL,
  num_parts      integer NOT NULL CHECK (num_parts >= 0),
  image_url      text,
  provenance_id  bigint REFERENCES provenance(id),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- An inventory belongs to exactly one set or one minifig. Several versions may exist.
CREATE TABLE inventories (
  id             integer PRIMARY KEY,               -- Rebrickable inventory id
  version        integer NOT NULL CHECK (version >= 1),
  set_num        text REFERENCES sets(set_num),
  fig_num        text REFERENCES minifigs(fig_num),
  provenance_id  bigint REFERENCES provenance(id),
  CHECK ((set_num IS NULL) <> (fig_num IS NULL))
);
CREATE UNIQUE INDEX inventories_set_version ON inventories (set_num, version) WHERE set_num IS NOT NULL;
CREATE UNIQUE INDEX inventories_fig_version ON inventories (fig_num, version) WHERE fig_num IS NOT NULL;

CREATE TABLE inventory_parts (
  inventory_id   integer NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  part_num       text NOT NULL REFERENCES parts(part_num),
  color_id       integer NOT NULL REFERENCES colors(id),
  is_spare       boolean NOT NULL,
  quantity       integer NOT NULL CHECK (quantity > 0),
  source_lines   integer NOT NULL DEFAULT 1 CHECK (source_lines >= 1),  -- >1 when duplicate source rows were merged
  PRIMARY KEY (inventory_id, part_num, color_id, is_spare)
);

CREATE TABLE inventory_minifigs (
  inventory_id   integer NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  fig_num        text NOT NULL REFERENCES minifigs(fig_num),
  quantity       integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (inventory_id, fig_num)
);

CREATE TABLE inventory_sets (
  inventory_id   integer NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  set_num        text NOT NULL REFERENCES sets(set_num),
  quantity       integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (inventory_id, set_num)
);

-- ---------------------------------------------------------------- LDraw side + verified mappings
CREATE TABLE ldraw_parts (
  file           text PRIMARY KEY,                  -- lower-case file name without '.dat', e.g. '3001', 's/3001s01' excluded
  name           text,
  has_geometry   boolean NOT NULL DEFAULT false,    -- geometry known to the app (parts-meta.json or .ldraw library)
  licence        text,
  provenance_id  bigint REFERENCES provenance(id)
);

CREATE TABLE ldraw_colors (
  code           integer PRIMARY KEY,
  name           text NOT NULL,
  rgb            char(6),
  alpha          integer,
  provenance_id  bigint REFERENCES provenance(id)
);

-- A mapping exists only when a named source verifies it. Never inferred from equal strings.
CREATE TABLE part_mappings (
  part_num       text NOT NULL REFERENCES parts(part_num),
  system         text NOT NULL CHECK (system IN ('ldraw', 'bricklink', 'lego_design', 'brickowl', 'lego_element')),
  external_id    text NOT NULL,
  source_id      text NOT NULL REFERENCES sources(id),
  provenance_id  bigint REFERENCES provenance(id),
  verified_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (part_num, system, external_id)
);
CREATE INDEX part_mappings_external ON part_mappings (system, external_id);

CREATE TABLE color_mappings (
  color_id       integer NOT NULL REFERENCES colors(id),
  system         text NOT NULL CHECK (system IN ('ldraw', 'bricklink', 'lego', 'brickowl')),
  external_id    text NOT NULL,
  source_id      text NOT NULL REFERENCES sources(id),
  provenance_id  bigint REFERENCES provenance(id),
  verified_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (color_id, system, external_id)
);
CREATE INDEX color_mappings_external ON color_mappings (system, external_id);

-- ---------------------------------------------------------------- users, assets, uploads
CREATE TABLE app_users (
  id             uuid PRIMARY KEY,
  display_name   text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Stored bytes. A row exists only for content whose licence allows storage (enforced by the asset service
-- and by the CHECK below). Content-addressed: one row per distinct sha256.
CREATE TABLE assets (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sha256             char(64) NOT NULL UNIQUE CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  byte_size          bigint NOT NULL CHECK (byte_size >= 0),
  content_type       text NOT NULL,
  storage_driver     text NOT NULL,                  -- 'local' | 's3'
  storage_key        text NOT NULL,
  licence            text NOT NULL,
  storage_permission text NOT NULL CHECK (storage_permission IN ('allowed', 'private_upload')),
  visibility         text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  owner_id           uuid REFERENCES app_users(id),
  provenance_id      bigint REFERENCES provenance(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (storage_permission <> 'private_upload' OR (visibility = 'private' AND owner_id IS NOT NULL))
);

CREATE TABLE user_uploads (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id       uuid NOT NULL REFERENCES app_users(id),
  asset_id       bigint NOT NULL REFERENCES assets(id),
  kind           text NOT NULL CHECK (kind IN ('ldraw', 'pdf', 'image', 'json')),
  filename       text NOT NULL,
  set_num        text REFERENCES sets(set_num),
  visibility     text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'pdf' OR visibility = 'private')   -- manuals uploaded by users are never shared
);

-- ---------------------------------------------------------------- instruction discovery index
-- What exists and where. Discovery is not permission: storage_permission defaults to reference_only.
CREATE TABLE instruction_sources (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  set_num            text NOT NULL,                  -- not a FK: a source may list a set before the catalog has it
  source_id          text NOT NULL REFERENCES sources(id),
  kind               text NOT NULL CHECK (kind IN ('pdf', 'ldraw_model', 'web_page')),
  external_id        text,
  url                text NOT NULL,
  title              text,
  language           text,
  revision           text,
  booklet_index      integer CHECK (booklet_index >= 1),
  booklet_count      integer CHECK (booklet_count >= 1),
  byte_size          bigint,
  availability       text NOT NULL DEFAULT 'unknown' CHECK (availability IN ('available', 'unavailable', 'unknown')),
  storage_permission text NOT NULL DEFAULT 'reference_only' CHECK (storage_permission IN ('reference_only', 'allowed', 'denied')),
  licence            text,
  licence_evidence   text,                           -- e.g. the header line or terms URL that justifies storage_permission
  author             text,
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_checked_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (booklet_index IS NULL OR booklet_count IS NULL OR booklet_index <= booklet_count),
  UNIQUE (source_id, url)
);
CREATE INDEX instruction_sources_set ON instruction_sources (set_num);

-- A concrete document we hold or process (a stored booklet, a stored model file, or a private upload).
CREATE TABLE instruction_documents (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  set_num               text,
  instruction_source_id bigint REFERENCES instruction_sources(id),
  upload_id             bigint REFERENCES user_uploads(id),
  kind                  text NOT NULL CHECK (kind IN ('pdf', 'ldraw_model', 'images')),
  booklet_index         integer CHECK (booklet_index >= 1),
  booklet_count         integer CHECK (booklet_count >= 1),
  language              text,
  revision              text,
  version               integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  asset_id              bigint REFERENCES assets(id),
  page_count            integer CHECK (page_count >= 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK ((instruction_source_id IS NOT NULL) OR (upload_id IS NOT NULL))
);
CREATE UNIQUE INDEX instruction_documents_version
  ON instruction_documents (coalesce(instruction_source_id, -1), coalesce(upload_id, -1), version);

CREATE TABLE instruction_pages (
  document_id    bigint NOT NULL REFERENCES instruction_documents(id) ON DELETE CASCADE,
  page_no        integer NOT NULL CHECK (page_no >= 1),
  asset_id       bigint REFERENCES assets(id),
  page_kind      text CHECK (page_kind IN ('cover', 'steps', 'parts_list', 'other')),
  width          integer,
  height         integer,
  PRIMARY KEY (document_id, page_no)
);

-- Steps found in a document (pipeline output of step segmentation), with confidence.
CREATE TABLE instruction_steps (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id    bigint NOT NULL REFERENCES instruction_documents(id) ON DELETE CASCADE,
  page_no        integer NOT NULL,
  manual_step    integer,
  label          text,
  bbox           jsonb,
  confidence     real CHECK (confidence BETWEEN 0 AND 1),
  status         text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected')),
  FOREIGN KEY (document_id, page_no) REFERENCES instruction_pages(document_id, page_no) ON DELETE CASCADE
);

-- ---------------------------------------------------------------- 3D models
CREATE TABLE models (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  set_num               text,                         -- usually a catalog set; may be null for uploads/MOCs
  source_id             text NOT NULL REFERENCES sources(id),
  instruction_source_id bigint REFERENCES instruction_sources(id),
  upload_id             bigint REFERENCES user_uploads(id),
  asset_id              bigint REFERENCES assets(id),
  title                 text NOT NULL,
  format                text NOT NULL CHECK (format IN ('ldraw', 'tsumiki')),
  author                text,
  licence               text,
  content_sha256        char(64) NOT NULL,
  step_order_source     text NOT NULL CHECK (step_order_source IN ('source', 'unknown', 'manual')),
  piece_count           integer NOT NULL CHECK (piece_count >= 0),
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'needs_review', 'verified', 'rejected')),
  version               integer NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, content_sha256)
);
CREATE INDEX models_set ON models (set_num);

CREATE TABLE model_steps (
  model_id       bigint NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  idx            integer NOT NULL CHECK (idx >= 0),
  manual_step    integer,
  page           integer,
  label          text,
  submodel       text,                                -- MPD sub-model this step comes from
  PRIMARY KEY (model_id, idx)
);

CREATE TABLE brick_instances (
  model_id       bigint NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  uid            text NOT NULL,
  step_idx       integer NOT NULL,
  ldraw_part     text NOT NULL,                       -- LDraw file name without '.dat' (= engine partId)
  ldraw_color    integer NOT NULL,
  engine_color   text,                                -- engine colour id when the engine palette has this LDraw code
  pose           double precision[] NOT NULL CHECK (array_length(pose, 1) = 12),
  frame          text,
  submodel_path  text,
  source_line    integer,
  PRIMARY KEY (model_id, uid),
  FOREIGN KEY (model_id, step_idx) REFERENCES model_steps(model_id, idx) ON DELETE CASCADE
);
CREATE INDEX brick_instances_part ON brick_instances (ldraw_part, ldraw_color);

CREATE TABLE model_validations (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  model_id          bigint NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  validator_version text NOT NULL,
  status            text NOT NULL CHECK (status IN ('verified', 'needs_review', 'rejected', 'draft')),
  issue_count       integer NOT NULL,
  checks            jsonb NOT NULL,
  inventory_match   jsonb,
  run_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX model_validations_model ON model_validations (model_id, run_at DESC);

-- ---------------------------------------------------------------- jobs and queue
CREATE TABLE ingestion_jobs (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind           text NOT NULL,                       -- 'rebrickable_import' | 'discovery' | 'model_import' | 'validation'
  params         jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE job_runs (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id         bigint NOT NULL REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
  status         text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'skipped')),
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  report         jsonb,
  error          text
);

-- Processing queue for document/model stages. Claimed with FOR UPDATE SKIP LOCKED.
CREATE TABLE queue_tasks (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stage           text NOT NULL,
  subject_type    text NOT NULL CHECK (subject_type IN ('document', 'model', 'upload')),
  subject_id      bigint NOT NULL,
  input_sha256    char(64) NOT NULL,
  idempotency_key text NOT NULL UNIQUE,               -- stage + subject + input checksum
  status          text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'running', 'done', 'failed', 'needs_review', 'skipped', 'blocked')),
  attempts        integer NOT NULL DEFAULT 0,
  max_attempts    integer NOT NULL DEFAULT 3,
  run_after       timestamptz NOT NULL DEFAULT now(),
  locked_by       text,
  locked_at       timestamptz,
  confidence      real CHECK (confidence BETWEEN 0 AND 1),
  output          jsonb,
  error           text,
  parent_id       bigint REFERENCES queue_tasks(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX queue_tasks_claim ON queue_tasks (stage, run_after) WHERE status = 'queued';

-- Cache of successful stage outputs keyed by input checksum, so re-runs never repeat work (or AI calls).
CREATE TABLE stage_cache (
  stage          text NOT NULL,
  input_sha256   char(64) NOT NULL,
  output         jsonb NOT NULL,
  confidence     real,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stage, input_sha256)
);

CREATE TABLE review_tasks (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  queue_task_id  bigint REFERENCES queue_tasks(id) ON DELETE CASCADE,
  model_id       bigint REFERENCES models(id) ON DELETE CASCADE,
  reason         text NOT NULL,
  payload        jsonb,
  resolved_by    uuid REFERENCES app_users(id),
  resolved_at    timestamptz,
  resolution     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- seed: sources (decisions from docs/data/SOURCES.md)
INSERT INTO sources (id, name, homepage, terms_url, terms_checked_at, licence_summary, decision, notes) VALUES
  ('rebrickable', 'Rebrickable', 'https://rebrickable.com', 'https://rebrickable.com/terms/', NULL,
   'Unverified: terms page returned 402 to automated client on 2026-11-10', 'download',
   'Bulk CSVs from cdn.rebrickable.com. Attribute; do not republish dumps. Owner to confirm terms.'),
  ('ldraw', 'LDraw Parts Library', 'https://www.ldraw.org', 'https://www.ldraw.org/docs-main/licenses/legal-info.html', '2026-11-10',
   'CC BY 2.0 / CC BY 4.0 / CC0 per part header', 'download', NULL),
  ('ldraw-omr', 'LDraw Official Model Repository', 'https://library.ldraw.org/omr', 'https://www.ldraw.org/article/593.html', '2026-11-10',
   'CC BY 4.0 (legacy: CC BY 2.0 and CC BY 4.0) per model header', 'download', 'Store only models whose header licence is recognised.'),
  ('lego', 'LEGO building instructions', 'https://www.lego.com/service/building-instructions', 'https://www.lego.com/en-us/legal/terms-of-use/', '2026-11-10',
   'All rights reserved; personal non-commercial download only; no redistribution', 'reference_only', 'Never fetched automatically.'),
  ('brickset', 'Brickset API v3', 'https://brickset.com', 'https://brickset.com/terms', NULL,
   'Unverified: pages behind Cloudflare challenge on 2026-11-10', 'reference_only', 'Requires owner-supplied API key.'),
  ('user', 'User upload', NULL, NULL, NULL, 'Uploader''s own rights; private by default', 'private', NULL),
  ('manual', 'Curated reference', NULL, NULL, NULL, 'References entered by a person; no bytes stored', 'reference_only', NULL),
  ('tsumiki', 'Tsumiki project data', NULL, NULL, NULL, 'Project-authored data', 'download', 'Hand transcriptions and checked mappings in this repo.');
