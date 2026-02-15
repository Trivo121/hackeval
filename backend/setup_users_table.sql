-- Create the public.users table to sync with auth.users
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  google_sub text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Policy: Users can view their own profile
create policy "Users can view own profile" 
on public.users for select 
using ( auth.uid() = id );

-- Policy: Users can update their own profile
create policy "Users can update own profile" 
on public.users for update 
using ( auth.uid() = id );

-- Policy: Service Role (Backend) can do anything (Implicit, but good to know)
-- No policy needed for service_role key as it bypasses RLS.
