-- Submission Slides Table Updates
ALTER TABLE submission_slides 
ADD COLUMN IF NOT EXISTS qdrant_point_id UUID;

ALTER TABLE submission_slides 
ADD COLUMN IF NOT EXISTS qdrant_indexed BOOLEAN DEFAULT false;

ALTER TABLE submission_slides 
ADD COLUMN IF NOT EXISTS qdrant_indexed_at TIMESTAMPTZ;

ALTER TABLE submission_slides 
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'all-MiniLM-L6-v2';

ALTER TABLE submission_slides 
ADD COLUMN IF NOT EXISTS embedding_version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_slides_qdrant_indexed 
ON submission_slides(qdrant_indexed);

CREATE INDEX IF NOT EXISTS idx_slides_qdrant_point 
ON submission_slides(qdrant_point_id);

-- Processing Jobs Table Updates
ALTER TABLE processing_jobs
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
