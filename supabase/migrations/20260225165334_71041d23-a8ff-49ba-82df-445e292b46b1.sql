
ALTER TABLE public.system_announcements
ADD COLUMN created_by uuid REFERENCES auth.users(id);
