-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  original_text TEXT NOT NULL,
  explanation_level TEXT NOT NULL CHECK (explanation_level IN ('simple', 'detailed')),
  additional_specs TEXT,
  course_plan JSONB NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own courses
CREATE POLICY "Users can view their own courses"
  ON courses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own courses
CREATE POLICY "Users can insert their own courses"
  ON courses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own courses
CREATE POLICY "Users can update their own courses"
  ON courses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own courses
CREATE POLICY "Users can delete their own courses"
  ON courses
  FOR DELETE
  USING (auth.uid() = user_id);
