ALTER TABLE public.courses
  ALTER COLUMN video_url DROP NOT NULL,
  ADD COLUMN video_path text,
  ADD COLUMN notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 5000);

ALTER TABLE public.courses
  ADD CONSTRAINT courses_video_source_chk CHECK (video_url IS NOT NULL OR video_path IS NOT NULL);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('course-videos', 'course-videos', false, 2147483648)
ON CONFLICT (id) DO NOTHING;
