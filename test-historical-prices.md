# Testing Historical Stock Prices Caching

## Step 1: Run the Database Migration

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Open the file `create-historical-stock-prices-table.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **Run**
8. You should see "Success" message

## Step 2: Verify Table Creation

Run this query in Supabase SQL Editor to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'historical_stock_prices';
```

You should see the table listed.

## Step 3: Start the App and Test

1. Start the React app:
   ```bash
   npm start
   ```

2. Open your browser to http://localhost:3000

3. Navigate to the Portfolio page

4. Open browser DevTools (F12) and check the Console tab

5. Look for these log messages:
   - `"No database cache for [TICKER], fetching from API..."` - First time, fetching from API
   - `"Stored X historical prices for [TICKER] in database"` - Storing in database
   - `"Loaded X historical prices for [TICKER] from database"` - Subsequent loads from database

## Step 4: Test the Caching

1. **First Load**: 
   - Navigate to Portfolio page
   - Check console - should see API fetch messages
   - Wait for chart to load

2. **Second Load** (to test cache):
   - Refresh the page (F5)
   - Navigate to Portfolio page again
   - Check console - should see "Loaded X historical prices from database"
   - Chart should load much faster!

## Step 5: Verify Data in Database

Run this query in Supabase SQL Editor:

```sql
SELECT 
  ticker, 
  COUNT(*) as price_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM historical_stock_prices
GROUP BY ticker
ORDER BY ticker;
```

This will show you which tickers have cached data and the date range.

## Expected Behavior

- **First time**: Fetches from Alpha Vantage API (slower, uses API quota)
- **Subsequent times**: Loads from database (much faster, no API calls)
- **Chart**: Should show actual portfolio value fluctuations over time

## Troubleshooting

If you see errors:
- Check that the table was created successfully
- Verify RLS policies allow access (should be public read/write)
- Check browser console for specific error messages
- Verify your Supabase connection is working

