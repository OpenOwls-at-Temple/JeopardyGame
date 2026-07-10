-- Run once in the Supabase SQL editor.
-- Stores one row per generation call; quota check sums by date.
CREATE TABLE IF NOT EXISTS llm_usage (
    id            BIGSERIAL PRIMARY KEY,
    date          DATE        NOT NULL,
    tokens_input  INTEGER     NOT NULL DEFAULT 0,
    tokens_output INTEGER     NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_date ON llm_usage (date);
