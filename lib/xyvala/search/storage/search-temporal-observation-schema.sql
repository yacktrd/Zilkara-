-- Search only. Installation descriptor; never executed by the repository.
-- Apply through the authorized migration process to a verified database.
-- No Market table, migration registry or application role is modified here.
-- Do not grant runtime ownership or permission to bypass the immutable trigger.

CREATE TABLE public.xyvala_search_temporal_observations (
  observation_key TEXT COLLATE "C" PRIMARY KEY,
  document_series_id TEXT COLLATE "C" NOT NULL
    CHECK (document_series_id ~ '^search_temporal_series_v1_[a-f0-9]{64}$'),
  document_key TEXT COLLATE "C" NOT NULL,
  observed_at_ms BIGINT NOT NULL
    CHECK (observed_at_ms BETWEEN -8640000000000000 AND 8640000000000000),
  record_format TEXT NOT NULL CHECK (record_format = '1.0.0'),
  payload TEXT NOT NULL
);

-- Keys contain JSON-encoded strings to preserve all JavaScript string content.
-- payload uses the repository's versioned negative-zero-preserving JSON codec.
-- Canonical values remain in payload; indexed columns are transport metadata.
CREATE INDEX xyvala_search_temporal_series_time_idx
  ON public.xyvala_search_temporal_observations
  (document_series_id, observed_at_ms);

CREATE INDEX xyvala_search_temporal_document_idx
  ON public.xyvala_search_temporal_observations
  (document_series_id, document_key);

CREATE FUNCTION public.xyvala_search_temporal_reject_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Search temporal observations are immutable';
END;
$$;

CREATE TRIGGER xyvala_search_temporal_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE
  ON public.xyvala_search_temporal_observations
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.xyvala_search_temporal_reject_mutation();
