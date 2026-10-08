-- One registered device per student. Only the server (service role) reads/writes this table.
CREATE TABLE IF NOT EXISTS public.student_devices (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL CHECK (char_length(device_id) BETWEEN 16 AND 100),
  user_agent text,
  bound_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_devices FROM anon, authenticated;
GRANT ALL ON public.student_devices TO service_role;

-- Video locations must never be readable straight from the browser: they are only
-- handed out by the server after checking enrollment, expiry and the registered device.
REVOKE SELECT ON public.courses FROM anon, authenticated;
GRANT SELECT (id, category_id, title, description, duration_minutes, price, is_published, created_at, updated_at, notes, is_featured)
  ON public.courses TO authenticated;
