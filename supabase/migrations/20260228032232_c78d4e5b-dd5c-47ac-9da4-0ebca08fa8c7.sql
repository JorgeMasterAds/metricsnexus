
-- Allow authenticated users to delete their own clicks (for clearing views)
CREATE POLICY "click_delete"
ON public.clicks
FOR DELETE
USING (account_id = ANY (get_user_account_ids(auth.uid())));

-- Allow authenticated users to delete their own daily_metrics (for clearing views)
CREATE POLICY "dm_delete"
ON public.daily_metrics
FOR DELETE
USING (account_id = ANY (get_user_account_ids(auth.uid())));
