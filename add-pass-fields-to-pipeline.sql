-- Migration: Add pass_date and pass_reason fields to pipeline_ideas table
-- Run this to add the missing fields for tracking passed ideas

-- Add the pass_reason column
ALTER TABLE pipeline_ideas ADD COLUMN IF NOT EXISTS pass_reason TEXT;

-- Add the pass_date column
ALTER TABLE pipeline_ideas ADD COLUMN IF NOT EXISTS pass_date DATE;

-- Update the status field to include 'Passed' as a valid option
-- Note: The existing status field should already support this, but we're documenting it
-- Valid statuses: 'On Deck', 'Core', 'Active', 'Passed', 'Archived' 