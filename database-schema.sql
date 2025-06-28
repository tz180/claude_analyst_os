-- Analyst OS Database Schema for hf-analyst-os project

-- Daily Check-ins Table
CREATE TABLE daily_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    goals TEXT[],
    reflection TEXT,
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