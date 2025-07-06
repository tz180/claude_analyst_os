-- Add valuation metrics fields to stock_notes table
ALTER TABLE stock_notes 
ADD COLUMN IF NOT EXISTS ev_to_ebitda_when_written DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ev_to_revenue_when_written DECIMAL(10,2);

-- Add comments to document the new fields
COMMENT ON COLUMN stock_notes.ev_to_ebitda_when_written IS 'EV/EBITDA ratio when the note was written';
COMMENT ON COLUMN stock_notes.ev_to_revenue_when_written IS 'EV/Revenue ratio when the note was written'; 