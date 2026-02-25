-- Allow any authenticated user to view any profile (name + avatar only, not sensitive)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);