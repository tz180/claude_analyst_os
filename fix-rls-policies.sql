-- Fix RLS policies to allow anonymous access for development
-- This is a temporary solution until we implement proper authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own daily checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can insert own daily checkins" ON daily_checkins;
DROP POLICY IF EXISTS "Users can update own daily checkins" ON daily_checkins;

DROP POLICY IF EXISTS "Users can view own coverage" ON coverage_universe;
DROP POLICY IF EXISTS "Users can insert own coverage" ON coverage_universe;
DROP POLICY IF EXISTS "Users can update own coverage" ON coverage_universe;

DROP POLICY IF EXISTS "Users can view own deliverables" ON deliverables;
DROP POLICY IF EXISTS "Users can insert own deliverables" ON deliverables;
DROP POLICY IF EXISTS "Users can update own deliverables" ON deliverables;

DROP POLICY IF EXISTS "Users can view own notes" ON crm_notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON crm_notes;
DROP POLICY IF EXISTS "Users can update own notes" ON crm_notes;

DROP POLICY IF EXISTS "Users can view own pipeline ideas" ON pipeline_ideas;
DROP POLICY IF EXISTS "Users can insert own pipeline ideas" ON pipeline_ideas;
DROP POLICY IF EXISTS "Users can update own pipeline ideas" ON pipeline_ideas;

-- Create new policies that allow anonymous access
-- Daily Check-ins
CREATE POLICY "Allow all daily checkins" ON daily_checkins
    FOR ALL USING (true);

-- Coverage Universe
CREATE POLICY "Allow all coverage" ON coverage_universe
    FOR ALL USING (true);

-- Deliverables
CREATE POLICY "Allow all deliverables" ON deliverables
    FOR ALL USING (true);

-- CRM Notes
CREATE POLICY "Allow all notes" ON crm_notes
    FOR ALL USING (true);

-- Pipeline Ideas
CREATE POLICY "Allow all pipeline ideas" ON pipeline_ideas
    FOR ALL USING (true);

-- Fix RLS Policies for Portfolio Tables
-- These policies were missing from the original schema

-- Portfolio RLS Policies
CREATE POLICY "Users can view own portfolio" ON portfolios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio" ON portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio" ON portfolios
    FOR UPDATE USING (auth.uid() = user_id);

-- Portfolio Positions RLS Policies
CREATE POLICY "Users can view own portfolio positions" ON portfolio_positions
    FOR SELECT USING (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own portfolio positions" ON portfolio_positions
    FOR INSERT WITH CHECK (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own portfolio positions" ON portfolio_positions
    FOR UPDATE USING (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own portfolio positions" ON portfolio_positions
    FOR DELETE USING (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = auth.uid()
        )
    );

-- Portfolio Transactions RLS Policies
CREATE POLICY "Users can view own portfolio transactions" ON portfolio_transactions
    FOR SELECT USING (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own portfolio transactions" ON portfolio_transactions
    FOR INSERT WITH CHECK (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own portfolio transactions" ON portfolio_transactions
    FOR UPDATE USING (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own portfolio transactions" ON portfolio_transactions
    FOR DELETE USING (
        portfolio_id IN (
            SELECT id FROM portfolios WHERE user_id = auth.uid()
        )
    );

-- Note: This removes security for development. 
-- When you implement authentication, you should revert to user-specific policies. 