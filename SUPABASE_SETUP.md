# Supabase Setup for Analyst OS

## Project: hf-analyst-os

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your "hf-analyst-os" project
3. Go to Settings > API
4. Copy your:
   - Project URL
   - Anon (public) key

### Step 2: Create Environment File

1. Rename `supabase-config.example` to `.env.local`
2. Replace the placeholder values with your actual credentials:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 3: Set Up Database Schema

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy the contents of `database-schema.sql`
4. Paste and run the SQL commands

### Step 4: Test the Connection

1. Start your React app: `npm start`
2. Check the browser console for any connection errors
3. The app should now be connected to Supabase

### Step 5: Enable Authentication (Optional)

If you want to add user authentication later:
1. Go to Authentication > Settings in Supabase
2. Configure your preferred auth providers
3. Update the RLS policies as needed

### Database Tables Created

- **daily_checkins**: Daily goals and reflections
- **coverage_universe**: Active and former coverage companies
- **deliverables**: Memos and models with workflow stages
- **crm_notes**: Notes for each company/ticker
- **stock_prices**: Cached stock price data
- **pipeline_ideas**: Research ideas and pipeline

### Next Steps

1. Update your React components to use Supabase instead of localStorage
2. Implement real-time subscriptions for live updates
3. Add authentication if needed
4. Set up stock price API integration

### Troubleshooting

- If you get CORS errors, check your Supabase project settings
- If RLS policies block access, ensure you're authenticated or adjust policies
- For connection issues, verify your environment variables are correct 