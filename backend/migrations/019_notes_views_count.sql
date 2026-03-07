-- Add views_count column to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Optional: Create an index for faster sorting by popularity
CREATE INDEX IF NOT EXISTS notes_views_count_idx ON notes(views_count DESC);
