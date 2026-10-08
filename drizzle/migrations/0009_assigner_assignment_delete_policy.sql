CREATE POLICY "Assigners can delete assignments" ON public.course_assignments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'assigner'));
