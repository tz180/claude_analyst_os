-- Create table to store historical stock prices
-- This allows us to cache historical price data and avoid hitting the API repeatedly

CREATE TABLE IF NOT EXISTS historical_stock_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  open DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  volume BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ticker, date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_historical_stock_prices_ticker ON historical_stock_prices(ticker);
CREATE INDEX IF NOT EXISTS idx_historical_stock_prices_date ON historical_stock_prices(date);
CREATE INDEX IF NOT EXISTS idx_historical_stock_prices_ticker_date ON historical_stock_prices(ticker, date);

-- Enable Row Level Security (allow all reads, but restrict writes if needed)
ALTER TABLE historical_stock_prices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can view historical stock prices" ON historical_stock_prices;
DROP POLICY IF EXISTS "Anyone can insert historical stock prices" ON historical_stock_prices;
DROP POLICY IF EXISTS "Anyone can update historical stock prices" ON historical_stock_prices;

-- Allow all authenticated users to read historical prices (they're public data)
CREATE POLICY "Anyone can view historical stock prices" ON historical_stock_prices
  FOR SELECT USING (true);

-- Allow all authenticated users to insert/update historical prices
CREATE POLICY "Anyone can insert historical stock prices" ON historical_stock_prices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update historical stock prices" ON historical_stock_prices
  FOR UPDATE USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_historical_stock_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS update_historical_stock_prices_updated_at ON historical_stock_prices;

CREATE TRIGGER update_historical_stock_prices_updated_at 
  BEFORE UPDATE ON historical_stock_prices 
  FOR EACH ROW 
  EXECUTE FUNCTION update_historical_stock_prices_updated_at();

