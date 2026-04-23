-- =====================================================
-- MINERVA - Complete Database Schema
-- Generated: 2026-04-23
-- Description: Production-ready schema for STEM learning platform
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: courses
-- Description: Stores AI-generated courses with metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  summary text,
  original_text text NOT NULL,
  explanation_level text NOT NULL CHECK (explanation_level = ANY (ARRAY['simple'::text, 'detailed'::text])),
  additional_specs text,
  course_plan jsonb NOT NULL,
  locale text NOT NULL DEFAULT 'en'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE: quizzes
-- Description: Stores quiz questions for topics and modules
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  target_id text NOT NULL,
  target_type text NOT NULL CHECK (target_type = ANY (ARRAY['topic'::text, 'module'::text])),
  questions jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT quizzes_pkey PRIMARY KEY (id),
  CONSTRAINT quizzes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
  CONSTRAINT quizzes_unique UNIQUE (course_id, target_id, target_type)
);

-- =====================================================
-- TABLE: topic_explanations
-- Description: Stores detailed explanations for course topics
-- =====================================================
CREATE TABLE IF NOT EXISTS public.topic_explanations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  topic_id text NOT NULL,
  explanation text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT topic_explanations_pkey PRIMARY KEY (id),
  CONSTRAINT topic_explanations_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
  CONSTRAINT topic_explanations_unique UNIQUE (course_id, topic_id)
);

-- =====================================================
-- TABLE: user_progress
-- Description: Tracks user progress through courses
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  completed_topics text[] DEFAULT '{}'::text[],
  completed_modules text[] DEFAULT '{}'::text[],
  quiz_scores jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
  CONSTRAINT user_progress_unique UNIQUE (user_id, course_id)
);

-- =====================================================
-- INDEXES for Performance Optimization
-- =====================================================

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON public.courses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_locale ON public.courses(locale);

-- Quizzes indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_target ON public.quizzes(course_id, target_id, target_type);

-- Topic explanations indexes
CREATE INDEX IF NOT EXISTS idx_topic_explanations_course_id ON public.topic_explanations(course_id);
CREATE INDEX IF NOT EXISTS idx_topic_explanations_lookup ON public.topic_explanations(course_id, topic_id);

-- User progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON public.user_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lookup ON public.user_progress(user_id, course_id);

-- =====================================================
-- TRIGGERS for automatic updated_at
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for courses table
DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for user_progress table
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON public.user_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for COURSES
-- =====================================================

-- Users can view their own courses
CREATE POLICY "Users can view own courses"
  ON public.courses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own courses
CREATE POLICY "Users can insert own courses"
  ON public.courses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own courses
CREATE POLICY "Users can update own courses"
  ON public.courses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own courses
CREATE POLICY "Users can delete own courses"
  ON public.courses
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS Policies for QUIZZES
-- =====================================================

-- Users can view quizzes for their courses
CREATE POLICY "Users can view quizzes for own courses"
  ON public.quizzes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- Users can insert quizzes for their courses
CREATE POLICY "Users can insert quizzes for own courses"
  ON public.quizzes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = quizzes.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS Policies for TOPIC_EXPLANATIONS
-- =====================================================

-- Users can view explanations for their courses
CREATE POLICY "Users can view explanations for own courses"
  ON public.topic_explanations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = topic_explanations.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- Users can insert explanations for their courses
CREATE POLICY "Users can insert explanations for own courses"
  ON public.topic_explanations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = topic_explanations.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS Policies for USER_PROGRESS
-- =====================================================

-- Users can view their own progress
CREATE POLICY "Users can view own progress"
  ON public.user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
  ON public.user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
  ON public.user_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own progress"
  ON public.user_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- GRANT Permissions
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT ON public.quizzes TO authenticated;
GRANT SELECT, INSERT ON public.topic_explanations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;

-- Grant permissions on sequences (for auto-increment if needed)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- COMMENTS for Documentation
-- =====================================================

COMMENT ON TABLE public.courses IS 'Stores AI-generated STEM courses with metadata and course plans';
COMMENT ON TABLE public.quizzes IS 'Stores quiz questions generated for topics and modules';
COMMENT ON TABLE public.topic_explanations IS 'Stores detailed explanations for course topics (lazy-loaded)';
COMMENT ON TABLE public.user_progress IS 'Tracks user progress through courses including completed topics and quiz scores';

COMMENT ON COLUMN public.courses.course_plan IS 'JSONB structure containing modules, topics, and course outline';
COMMENT ON COLUMN public.courses.explanation_level IS 'Difficulty level: simple or detailed';
COMMENT ON COLUMN public.courses.original_text IS 'Original text provided by user to generate the course';

COMMENT ON COLUMN public.quizzes.questions IS 'JSONB array of quiz questions with options and correct answers';
COMMENT ON COLUMN public.quizzes.target_type IS 'Type of target: topic or module';

COMMENT ON COLUMN public.user_progress.completed_topics IS 'Array of topic IDs that user has completed';
COMMENT ON COLUMN public.user_progress.completed_modules IS 'Array of module IDs that user has completed';
COMMENT ON COLUMN public.user_progress.quiz_scores IS 'JSONB object storing quiz scores by target_id';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
