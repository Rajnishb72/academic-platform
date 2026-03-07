-- Add username column back as UNIQUE to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create an index for quicker lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
