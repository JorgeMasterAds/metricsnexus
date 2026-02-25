
-- Performance indexes for high-volume tables
CREATE INDEX IF NOT EXISTS idx_clicks_account_project_created ON clicks(account_id, project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_smartlink_id ON clicks(smartlink_id);
CREATE INDEX IF NOT EXISTS idx_conversions_account_project_created ON conversions(account_id, project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_status_created ON conversions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_transaction_id ON conversions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_account_created ON webhook_logs(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_project_created ON webhook_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_account_date ON daily_metrics(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_smartlink_date ON daily_metrics(smartlink_id, date DESC);

-- Unique constraint for idempotency on conversions (prevent duplicate transaction processing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_transaction_unique ON conversions(transaction_id, account_id) WHERE account_id IS NOT NULL;

-- Allow super admins to read all profiles (needed for admin panel)
CREATE POLICY "Super admins can view all profiles"
ON profiles FOR SELECT
USING (is_super_admin(auth.uid()));
