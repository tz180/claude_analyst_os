-- Create table to store detected market regimes and probabilities
create table if not exists regimes (
  id uuid default uuid_generate_v4() primary key,
  as_of_date date not null,
  label text not null,
  probabilities jsonb default '{}'::jsonb,
  drivers jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Create table to store per-ticker factor betas/exposures
create table if not exists factor_exposures (
  date date not null,
  ticker text not null,
  betas jsonb not null,
  created_at timestamptz default now(),
  primary key (date, ticker)
);
