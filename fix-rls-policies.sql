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

-- Note: This removes security for development. 
-- When you implement authentication, you should revert to user-specific policies. 