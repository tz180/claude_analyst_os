# Multi-User Setup Guide for Analyst OS

This guide will help you configure proper Row Level Security (RLS) and authentication so multiple users can use the application independently with their data properly isolated.

## Current Status

Your app already has:
- ✅ Authentication system set up (`AuthContext.js`)
- ✅ Login/signup UI
- ✅ User ID being captured in most service calls
- ✅ Database schema with proper user_id foreign keys

## What Needs to be Fixed

Currently, your database has RLS policies that allow ALL users to see ALL data (`FOR ALL USING (true)`). This means:
- User A can see User B's pipeline ideas
- User A can see User B's coverage companies
- User A can see User B's portfolio
- etc.

## Step 1: Apply Proper RLS Policies

Run the `restore-proper-rls.sql` script in your Supabase SQL Editor:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Open the file `restore-proper-rls.sql`
4. Copy and paste the entire contents
5. Click **Run**

This will:
- Remove the insecure "allow all" policies
- Install proper user-specific policies
- Ensure each user can only access their own data
- Keep stock_prices table shared (since it's market data)

## Step 2: Verify Your Changes

After running the SQL script, you can verify the policies are in place:

```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'daily_checkins', 
  'coverage_universe', 
  'deliverables', 
  'crm_notes', 
  'pipeline_ideas',
  'portfolios',
  'portfolio_positions',
  'portfolio_transactions'
);
-- All should show rowsecurity = true

-- Check policies exist
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Step 3: Test Multi-User Functionality

### Test with two accounts:

1. **Create First User**
   - Sign up with email: `user1@test.com`
   - Add some pipeline ideas, coverage companies, etc.
   - Note down what data you created

2. **Create Second User**
   - Sign out
   - Sign up with email: `user2@test.com`
   - You should see an empty dashboard (no data from user1)
   - Add different data

3. **Verify Isolation**
   - Sign back in as `user1@test.com`
   - Confirm you ONLY see user1's data
   - Sign in as `user2@test.com`
   - Confirm you ONLY see user2's data

## Step 4: Understanding the RLS Policies

### How RLS Works

Each table now has 4 policies per table:

1. **SELECT** - Users can view their own data
   ```sql
   CREATE POLICY "Users can view own records" 
   ON table_name FOR SELECT 
   USING (auth.uid() = user_id);
   ```

2. **INSERT** - Users can create records with their user_id
   ```sql
   CREATE POLICY "Users can insert own records" 
   ON table_name FOR INSERT 
   WITH CHECK (auth.uid() = user_id);
   ```

3. **UPDATE** - Users can update their own data
   ```sql
   CREATE POLICY "Users can update own records" 
   ON table_name FOR UPDATE 
   USING (auth.uid() = user_id);
   ```

4. **DELETE** - Users can delete their own data
   ```sql
   CREATE POLICY "Users can delete own records" 
   ON table_name FOR DELETE 
   USING (auth.uid() = user_id);
   ```

### Special Cases

**Portfolio Related Tables:**
The `portfolio_positions` and `portfolio_transactions` tables check ownership through the parent `portfolios` table:

```sql
CREATE POLICY "Users can view their own portfolio positions" 
ON portfolio_positions FOR SELECT 
USING (
  auth.uid() = (SELECT user_id FROM portfolios WHERE id = portfolio_id)
);
```

**Stock Prices Table:**
This is shared data (market prices are the same for everyone):

```sql
CREATE POLICY "Stock prices are readable by authenticated users" 
ON stock_prices FOR SELECT 
USING (auth.uid() IS NOT NULL);
```

## Step 5: Code Changes Made

The following code changes were made to support proper multi-user functionality:

### `src/supabaseServices.js`

1. **Portfolio Service - getPortfolio()**
   - Changed from: Getting any portfolio (no user filter)
   - Changed to: Only getting the authenticated user's portfolio
   - Now properly filters: `.eq('user_id', userId)`

2. **Portfolio Service - createPortfolio()**
   - Changed from: Optionally including user_id
   - Changed to: Always requiring user_id
   - Returns error if not authenticated

All other services were already correctly implemented with user_id filtering.

## Step 6: What This Means for Your App

### Benefits
- ✅ **Data Privacy**: Each user's data is completely isolated
- ✅ **Multi-tenancy**: You can have unlimited users on the same database
- ✅ **Security**: Enforced at the database level (not just app level)
- ✅ **Scalability**: Ready for production use

### Behavior Changes
- Users MUST be authenticated to use the app
- Each user gets their own:
  - Dashboard and daily check-ins
  - Coverage universe
  - Pipeline ideas
  - Deliverables (memos/models)
  - Portfolio (starts with $50M)
  - CRM notes
  - Stock notes

### Shared Data
- Stock prices (market data is the same for everyone)
- Authentication is handled by Supabase Auth

## Step 7: Production Considerations

### Before Going Live

1. **Email Configuration**
   - Configure email templates in Supabase > Authentication > Email Templates
   - Set up custom SMTP (optional but recommended)
   - Test password reset flow

2. **User Management**
   - Decide on sign-up flow (open vs. invite-only)
   - Configure email confirmation requirements
   - Set up password requirements

3. **Rate Limiting**
   - Consider adding rate limits to prevent abuse
   - Supabase has built-in auth rate limiting

4. **Monitoring**
   - Set up monitoring for failed auth attempts
   - Monitor RLS policy performance

### Optional Enhancements

1. **User Profiles Table**
   ```sql
   CREATE TABLE user_profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     display_name TEXT,
     firm_name TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can view own profile" 
   ON user_profiles FOR SELECT 
   USING (auth.uid() = id);
   ```

2. **Team/Organization Support**
   - Add organization table
   - Link users to organizations
   - Share data within organizations

3. **Admin Role**
   - Create admin users
   - Add policies for admin access

## Troubleshooting

### "No data showing after login"
- Expected behavior for new users
- Each user starts with empty datasets
- Have them add their first pipeline idea or coverage company

### "Permission denied" errors
- Check that the user is authenticated
- Verify RLS policies are correctly applied
- Check browser console for specific errors

### "Can't create portfolio"
- Ensure user is logged in
- Check that `user_id` is being passed
- Verify portfolios table has RLS enabled with INSERT policy

### Testing RLS in SQL Editor

You can test RLS policies by impersonating a user:

```sql
-- Set the current user context
SET request.jwt.claim.sub = 'user-uuid-here';

-- Now run queries - they will be filtered by RLS
SELECT * FROM pipeline_ideas;
```

## Support

If you run into issues:
1. Check the Supabase logs (Dashboard > Logs)
2. Check browser console for errors
3. Verify policies with the SQL queries above
4. Test with fresh user accounts

## Summary

After following this guide:
- ✅ Your app is multi-user ready
- ✅ Data is properly isolated per user
- ✅ Security is enforced at the database level
- ✅ Ready for production deployment

You can now safely share your app with multiple users!

