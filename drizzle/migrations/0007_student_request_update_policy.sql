CREATE POLICY "Students can update own requests" ON public.course_access_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND status = 'pending');
