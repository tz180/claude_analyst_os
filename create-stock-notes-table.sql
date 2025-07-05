-- Create stock_notes table for storing research notes with price tracking
CREATE TABLE IF NOT EXISTS stock_notes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  price_when_written DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_notes_user_ticker ON stock_notes(user_id, ticker);
CREATE INDEX IF NOT EXISTS idx_stock_notes_created_at ON stock_notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE stock_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own stock notes" ON stock_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stock notes" ON stock_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock notes" ON stock_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stock notes" ON stock_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_notes_updated_at 
  BEFORE UPDATE ON stock_notes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 