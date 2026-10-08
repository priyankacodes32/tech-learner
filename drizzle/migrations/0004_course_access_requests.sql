CREATE TABLE public.course_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT ON public.course_access_requests TO authenticated;
GRANT ALL ON public.course_access_requests TO service_role;
ALTER TABLE public.course_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own requests" ON public.course_access_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own requests" ON public.course_access_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX course_access_requests_user_id_idx ON public.course_access_requests(user_id);
CREATE INDEX course_access_requests_course_id_idx ON public.course_access_requests(course_id);
