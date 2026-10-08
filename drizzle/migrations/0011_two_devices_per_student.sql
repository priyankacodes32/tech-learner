-- Allow up to two registered devices per student (was one).
ALTER TABLE public.student_devices DROP CONSTRAINT IF EXISTS student_devices_pkey;
ALTER TABLE public.student_devices ADD PRIMARY KEY (user_id, device_id);

-- Enforced in the database so two simultaneous first-time logins can't sneak in a third device.
CREATE OR REPLACE FUNCTION public.enforce_student_device_limit() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));
  IF (SELECT count(*) FROM public.student_devices WHERE user_id = NEW.user_id) >= 2 THEN
    RAISE EXCEPTION 'DEVICE_LIMIT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_devices_limit ON public.student_devices;
CREATE TRIGGER student_devices_limit BEFORE INSERT ON public.student_devices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_device_limit();
