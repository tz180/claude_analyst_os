-- Restore Proper Row Level Security for Multi-User Support
-- This replaces the temporary "allow all" policies with proper user-specific policies

-- Drop the temporary "allow all" policies
DROP POLICY IF EXISTS "Allow all daily checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Allow all coverage" ON coverage_universe;
DROP POLICY IF EXISTS "Allow all deliverables" ON deliverables;
DROP POLICY IF EXISTS "Allow all notes" ON crm_notes;
DROP POLICY IF EXISTS "Allow all pipeline ideas" ON pipeline_ideas;
DROP POLICY IF EXISTS "Allow all portfolios" ON portfolios;
DROP POLICY IF EXISTS "Allow all portfolio positions" ON portfolio_positions;
DROP POLICY IF EXISTS "Allow all portfolio transactions" ON portfolio_transactions;

-- Also drop the original user-specific policies if they exist
DROP POLICY IF EXISTS "Users can view own daily checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can insert own daily checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can update own daily checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can delete own daily checkins" ON daily_checkins;

DROP POLICY IF EXISTS "Users can view own coverage" ON coverage_universe;
DROP POLICY IF EXISTS "Users can insert own coverage" ON coverage_universe;
DROP POLICY IF EXISTS "Users can update own coverage" ON coverage_universe;
DROP POLICY IF EXISTS "Users can delete own coverage" ON coverage_universe;

DROP POLICY IF EXISTS "Users can view own deliverables" ON deliverables;
DROP POLICY IF EXISTS "Users can insert own deliverables" ON deliverables;
DROP POLICY IF EXISTS "Users can update own deliverables" ON deliverables;
DROP POLICY IF EXISTS "Users can delete own deliverables" ON deliverables;

DROP POLICY IF EXISTS "Users can view own notes" ON crm_notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON crm_notes;
DROP POLICY IF EXISTS "Users can update own notes" ON crm_notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON crm_notes;

DROP POLICY IF EXISTS "Users can view own pipeline ideas" ON pipeline_ideas;
DROP POLICY IF EXISTS "Users can insert own pipeline ideas" ON pipeline_ideas;
DROP POLICY IF EXISTS "Users can update own pipeline ideas" ON pipeline_ideas;
DROP POLICY IF EXISTS "Users can delete own pipeline ideas" ON pipeline_ideas;

DROP POLICY IF EXISTS "Users can view their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can insert their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can update their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can delete their own portfolios" ON portfolios;

DROP POLICY IF EXISTS "Users can view their own portfolio positions" ON portfolio_positions;
DROP POLICY IF EXISTS "Users can insert their own portfolio positions" ON portfolio_positions;
DROP POLICY IF EXISTS "Users can update their own portfolio positions" ON portfolio_positions;
DROP POLICY IF EXISTS "Users can delete their own portfolio positions" ON portfolio_positions;

DROP POLICY IF EXISTS "Users can view their own portfolio transactions" ON portfolio_transactions;
DROP POLICY IF EXISTS "Users can insert their own portfolio transactions" ON portfolio_transactions;
DROP POLICY IF EXISTS "Users can update their own portfolio transactions" ON portfolio_transactions;
DROP POLICY IF EXISTS "Users can delete their own portfolio transactions" ON portfolio_transactions;

-- ========================================
-- DAILY CHECK-INS POLICIES
-- ========================================
CREATE POLICY "Users can view own daily checkins" 
ON daily_checkins FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily checkins" 
ON daily_checkins FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily checkins" 
ON daily_checkins FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily checkins" 
ON daily_checkins FOR DELETE 
USING (auth.uid() = user_id);

-- ========================================
-- COVERAGE UNIVERSE POLICIES
-- ========================================
CREATE POLICY "Users can view own coverage" 
ON coverage_universe FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coverage" 
ON coverage_universe FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coverage" 
ON coverage_universe FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own coverage" 
ON coverage_universe FOR DELETE 
USING (auth.uid() = user_id);

-- ========================================
-- DELIVERABLES POLICIES
-- ========================================
CREATE POLICY "Users can view own deliverables" 
ON deliverables FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deliverables" 
ON deliverables FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deliverables" 
ON deliverables FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deliverables" 
ON deliverables FOR DELETE 
USING (auth.uid() = user_id);

-- ========================================
-- CRM NOTES POLICIES
-- ========================================
CREATE POLICY "Users can view own notes" 
ON crm_notes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" 
ON crm_notes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" 
ON crm_notes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" 
ON crm_notes FOR DELETE 
USING (auth.uid() = user_id);

-- ========================================
-- PIPELINE IDEAS POLICIES
-- ========================================
CREATE POLICY "Users can view own pipeline ideas" 
ON pipeline_ideas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pipeline ideas" 
ON pipeline_ideas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pipeline ideas" 
ON pipeline_ideas FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pipeline ideas" 
ON pipeline_ideas FOR DELETE 
USING (auth.uid() = user_id);

-- ========================================
-- PORTFOLIO POLICIES
-- ========================================
CREATE POLICY "Users can view their own portfolios" 
ON portfolios FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolios" 
ON portfolios FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios" 
ON portfolios FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios" 
ON portfolios FOR DELETE 
USING (auth.uid() = user_id);

-- ========================================
-- PORTFOLIO POSITIONS POLICIES
-- ========================================
CREATE POLICY "Users can view their own portfolio positions" 
ON portfolio_positions FOR SELECT 
USING (
  auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

CREATE POLICY "Users can insert their own portfolio positions" 
ON portfolio_positions FOR INSERT 
WITH CHECK (
  auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

CREATE POLICY "Users can update their own portfolio positions" 
ON portfolio_positions FOR UPDATE 
USING (
  auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

CREATE POLICY "Users can delete their own portfolio positions" 
ON portfolio_positions FOR DELETE 
USING (
  auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

-- ========================================
-- PORTFOLIO TRANSACTIONS POLICIES
-- ========================================
CREATE POLICY "Users can view their own portfolio transactions" 
ON portfolio_transactions FOR SELECT 
USING (
  auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

CREATE POLICY "Users can insert their own portfolio transactions" 
ON portfolio_transactions FOR INSERT 
WITH CHECK (
  auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

CREATE POLICY "Users can update their own portfolio transactions" 
ON portfolio_transactions FOR UPDATE 
USING (
  auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

CREATE POLICY "Users can delete their own portfolio transactions" 
ON portfolio_transactions FOR DELETE 
USING (
  auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);

-- ========================================
-- VERIFY RLS IS ENABLED
-- ========================================
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_universe ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STOCK NOTES TABLE (if it exists)
-- ========================================
-- First check if stock_notes table exists and enable RLS
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_notes') THEN
    -- Drop any existing policies
    DROP POLICY IF EXISTS "Users can view own stock notes" ON stock_notes;
    DROP POLICY IF EXISTS "Users can insert own stock notes" ON stock_notes;
    DROP POLICY IF EXISTS "Users can update own stock notes" ON stock_notes;
    DROP POLICY IF EXISTS "Users can delete own stock notes" ON stock_notes;
    DROP POLICY IF EXISTS "Allow all stock notes" ON stock_notes;
    
    -- Enable RLS
    ALTER TABLE stock_notes ENABLE ROW LEVEL SECURITY;
    
    -- Create proper policies
    CREATE POLICY "Users can view own stock notes" 
    ON stock_notes FOR SELECT 
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own stock notes" 
    ON stock_notes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own stock notes" 
    ON stock_notes FOR UPDATE 
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own stock notes" 
    ON stock_notes FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ========================================
-- STOCK PRICES TABLE - PUBLIC ACCESS
-- ========================================
-- Stock prices should be accessible to all authenticated users
-- since they're shared market data, not user-specific
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_prices') THEN
    DROP POLICY IF EXISTS "Stock prices are readable by authenticated users" ON stock_prices;
    DROP POLICY IF EXISTS "Stock prices can be updated by authenticated users" ON stock_prices;
    
    ALTER TABLE stock_prices ENABLE ROW LEVEL SECURITY;
    
    -- Allow all authenticated users to read stock prices
    CREATE POLICY "Stock prices are readable by authenticated users" 
    ON stock_prices FOR SELECT 
    USING (auth.uid() IS NOT NULL);
    
    -- Allow all authenticated users to update stock prices (for caching)
    CREATE POLICY "Stock prices can be updated by authenticated users" 
    ON stock_prices FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE 'Row Level Security policies have been successfully restored!';
  RAISE NOTICE 'All tables now enforce user-specific data access.';
  RAISE NOTICE 'Users can only see and modify their own data.';
END $$;

