-- Enable realtime for accounts table
ALTER TABLE public.accounts REPLICA IDENTITY FULL;

-- Add accounts table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;