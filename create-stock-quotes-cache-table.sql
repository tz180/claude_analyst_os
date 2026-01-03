-- Stock Quotes Cache Table
-- This table caches current stock quotes to reduce Alpha Vantage API calls
-- Quotes are refreshed based on TTL (Time To Live) - typically 15 minutes during market hours

-- Create the stock_quotes_cache table
CREATE TABLE IF NOT EXISTS stock_quotes_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) NOT NULL UNIQUE,
    price DECIMAL(20, 4) NOT NULL,
    change DECIMAL(20, 4),
    change_percent DECIMAL(10, 4),
    volume BIGINT,
    previous_close DECIMAL(20, 4),
    open_price DECIMAL(20, 4),
    high_price DECIMAL(20, 4),
    low_price DECIMAL(20, 4),
    last_trading_day DATE,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on ticker for fast lookups
CREATE INDEX IF NOT EXISTS idx_stock_quotes_cache_ticker ON stock_quotes_cache(ticker);

-- Create index on fetched_at for cache expiration queries
CREATE INDEX IF NOT EXISTS idx_stock_quotes_cache_fetched_at ON stock_quotes_cache(fetched_at);

-- Enable Row Level Security
ALTER TABLE stock_quotes_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read (stock quotes are public data)
CREATE POLICY "Allow authenticated users to read stock quotes cache"
    ON stock_quotes_cache
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy to allow authenticated users to insert/update stock quotes
CREATE POLICY "Allow authenticated users to insert stock quotes cache"
    ON stock_quotes_cache
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update stock quotes cache"
    ON stock_quotes_cache
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stock_quotes_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_stock_quotes_cache_updated_at ON stock_quotes_cache;
CREATE TRIGGER trigger_update_stock_quotes_cache_updated_at
    BEFORE UPDATE ON stock_quotes_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_quotes_cache_updated_at();

-- Instructions:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. This creates a cache table for stock quotes
-- 3. The cache will store current stock prices with timestamps
-- 4. The application will check if cached data is still fresh before calling the API
