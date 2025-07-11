-- Analyst OS Database Schema for hf-analyst-os project

-- Daily Check-ins Table
CREATE TABLE daily_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    goals TEXT[],
    reflection TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Add rating field for discipline tracking
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Coverage Universe Table
CREATE TABLE coverage_universe (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    company_name TEXT NOT NULL,
    sector TEXT,
    last_model_date DATE,
    last_memo_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'former'
    removal_reason TEXT,
    removal_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memos/Models Table
CREATE TABLE deliverables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'memo', 'model'
    stage VARCHAR(20) DEFAULT 'started', -- 'started', 'in_draft', 'sent', 'stalled', 'completed'
    priority INTEGER DEFAULT 3, -- 1=high, 2=medium, 3=low
    ticker VARCHAR(10),
    company_name TEXT,
    notes TEXT,
    due_date DATE,
    completed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRM Notes Table
CREATE TABLE crm_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    company_name TEXT NOT NULL,
    note_type VARCHAR(20) DEFAULT 'general', -- 'general', 'meeting', 'call', 'research'
    title TEXT,
    content TEXT NOT NULL,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Prices Table (for caching real-time data)
CREATE TABLE stock_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    price DECIMAL(10,2),
    change_percent DECIMAL(5,2),
    volume BIGINT,
    market_cap DECIMAL(20,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ticker)
);

-- Pipeline Ideas Table
CREATE TABLE pipeline_ideas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker VARCHAR(10),
    company_name TEXT NOT NULL,
    idea_type VARCHAR(20) DEFAULT 'general', -- 'long', 'short', 'research', 'watch'
    thesis TEXT,
    catalyst TEXT,
    target_price DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'abandoned'
    priority INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio Trading Tables

-- Portfolio Table
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Portfolio',
  starting_cash DECIMAL(15,2) NOT NULL DEFAULT 50000000.00, -- $50 million starting cash
  current_cash DECIMAL(15,2) NOT NULL DEFAULT 50000000.00, -- Current available cash
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio Positions Table
CREATE TABLE IF NOT EXISTS portfolio_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  shares DECIMAL(15,4) NOT NULL,
  average_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(portfolio_id, ticker)
);

-- Portfolio Transactions Table
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  shares DECIMAL(15,4) NOT NULL,
  price_per_share DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_daily_checkins_user_date ON daily_checkins(user_id, date);
CREATE INDEX idx_coverage_universe_user_status ON coverage_universe(user_id, status);
CREATE INDEX idx_deliverables_user_stage ON deliverables(user_id, stage);
CREATE INDEX idx_crm_notes_user_ticker ON crm_notes(user_id, ticker);
CREATE INDEX idx_pipeline_ideas_user_status ON pipeline_ideas(user_id, status);

-- Enable Row Level Security on all tables
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_universe ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_ideas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Daily Check-ins
CREATE POLICY "Users can view own daily checkins" ON daily_checkins
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily checkins" ON daily_checkins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily checkins" ON daily_checkins
    FOR UPDATE USING (auth.uid() = user_id);

-- Coverage Universe
CREATE POLICY "Users can view own coverage" ON coverage_universe
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coverage" ON coverage_universe
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coverage" ON coverage_universe
    FOR UPDATE USING (auth.uid() = user_id);

-- Deliverables
CREATE POLICY "Users can view own deliverables" ON deliverables
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deliverables" ON deliverables
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deliverables" ON deliverables
    FOR UPDATE USING (auth.uid() = user_id);

-- CRM Notes
CREATE POLICY "Users can view own notes" ON crm_notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON crm_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON crm_notes
    FOR UPDATE USING (auth.uid() = user_id);

-- Pipeline Ideas
CREATE POLICY "Users can view own pipeline ideas" ON pipeline_ideas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pipeline ideas" ON pipeline_ideas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pipeline ideas" ON pipeline_ideas
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Portfolio Tables
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;

-- Portfolio policies
CREATE POLICY "Users can view their own portfolios" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolios" ON portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios" ON portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios" ON portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Portfolio positions policies
CREATE POLICY "Users can view their own portfolio positions" ON portfolio_positions
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
  );

CREATE POLICY "Users can insert their own portfolio positions" ON portfolio_positions
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
  );

CREATE POLICY "Users can update their own portfolio positions" ON portfolio_positions
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
  );

CREATE POLICY "Users can delete their own portfolio positions" ON portfolio_positions
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
  );

-- Portfolio transactions policies
CREATE POLICY "Users can view their own portfolio transactions" ON portfolio_transactions
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
  );

CREATE POLICY "Users can insert their own portfolio transactions" ON portfolio_transactions
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
  );

CREATE POLICY "Users can update their own portfolio transactions" ON portfolio_transactions
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
  );

CREATE POLICY "Users can delete their own portfolio transactions" ON portfolio_transactions
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
  );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_portfolio_id ON portfolio_positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_ticker ON portfolio_positions(ticker);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_portfolio_id ON portfolio_transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_ticker ON portfolio_transactions(ticker);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_date ON portfolio_transactions(transaction_date);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_daily_checkins_updated_at BEFORE UPDATE ON daily_checkins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coverage_universe_updated_at BEFORE UPDATE ON coverage_universe
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON deliverables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_notes_updated_at BEFORE UPDATE ON crm_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_ideas_updated_at BEFORE UPDATE ON pipeline_ideas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 