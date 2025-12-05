-- Create table to store historical portfolio values
-- This pre-calculates daily portfolio values based on transactions and historical stock prices

CREATE TABLE IF NOT EXISTS historical_portfolio_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cash DECIMAL(15,2) NOT NULL,
  positions_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_value DECIMAL(15,2) NOT NULL,
  interest_earned DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(portfolio_id, date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_historical_portfolio_values_portfolio_id ON historical_portfolio_values(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_historical_portfolio_values_date ON historical_portfolio_values(date);
CREATE INDEX IF NOT EXISTS idx_historical_portfolio_values_portfolio_date ON historical_portfolio_values(portfolio_id, date);

-- Enable Row Level Security
ALTER TABLE historical_portfolio_values ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own portfolio values" ON historical_portfolio_values;
DROP POLICY IF EXISTS "Users can insert own portfolio values" ON historical_portfolio_values;
DROP POLICY IF EXISTS "Users can update own portfolio values" ON historical_portfolio_values;

-- Allow users to view their own portfolio values
CREATE POLICY "Users can view own portfolio values" ON historical_portfolio_values
  FOR SELECT USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Allow users to insert/update their own portfolio values
CREATE POLICY "Users can insert own portfolio values" ON historical_portfolio_values
  FOR INSERT WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own portfolio values" ON historical_portfolio_values
  FOR UPDATE USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_historical_portfolio_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS update_historical_portfolio_values_updated_at ON historical_portfolio_values;

CREATE TRIGGER update_historical_portfolio_values_updated_at 
  BEFORE UPDATE ON historical_portfolio_values 
  FOR EACH ROW 
  EXECUTE FUNCTION update_historical_portfolio_values_updated_at();

