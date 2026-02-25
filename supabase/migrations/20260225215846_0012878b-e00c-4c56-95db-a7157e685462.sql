-- Add Stripe Connect account ID to accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

-- Add referred_by_code to track which referral code was used at signup
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS commission_paid boolean DEFAULT false;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS stripe_transfer_id text;

-- Add stripe_connect_status to track onboarding
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS stripe_connect_status text DEFAULT 'pending';

-- Update commissions table to track stripe transfer
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS stripe_transfer_id text;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS description text;