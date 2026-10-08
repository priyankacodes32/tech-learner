ALTER TABLE public.courses
  ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

CREATE TYPE public.course_access_request_status AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE public.course_access_requests
  ADD COLUMN status public.course_access_request_status NOT NULL DEFAULT 'pending';

CREATE POLICY "Assigners can read requests" ON public.course_access_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'assigner'));
CREATE POLICY "Assigners can update requests" ON public.course_access_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'assigner')) WITH CHECK (public.has_role(auth.uid(), 'assigner'));

CREATE POLICY "Assigners can read courses" ON public.courses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'assigner'));
CREATE POLICY "Assigners can update featured flag" ON public.courses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'assigner')) WITH CHECK (public.has_role(auth.uid(), 'assigner'));

CREATE POLICY "Assigners can insert assignments" ON public.course_assignments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'assigner'));
