-- Migration: Add rating field to daily_checkins table
-- Run this if you have an existing database without the rating field

-- Add the rating column
ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS rating INTEGER;

-- Add the check constraint
ALTER TABLE daily_checkins ADD CONSTRAINT daily_checkins_rating_check 
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Update existing records to have a default rating of 3 (neutral)
UPDATE daily_checkins SET rating = 3 WHERE rating IS NULL; 