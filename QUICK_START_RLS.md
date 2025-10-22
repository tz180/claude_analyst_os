# Quick Start: Enable Multi-User Support

## 🚀 Quick Steps (5 minutes)

### Step 1: Apply RLS Policies to Supabase

1. Open your Supabase dashboard → **SQL Editor**
2. Copy the contents of `restore-proper-rls.sql`
3. Paste and click **Run**
4. Wait for "Success" message

### Step 2: Verify Setup (Optional but Recommended)

1. In Supabase SQL Editor
2. Copy the contents of `verify-rls-setup.sql`
3. Paste and click **Run**
4. Review the output - look for ✓ symbols

### Step 3: Test with Multiple Users

1. **Deploy your latest code** (already pushed to GitHub)
2. Open your app and sign up as `user1@test.com`
3. Add some data (pipeline ideas, coverage, etc.)
4. Sign out
5. Sign up as `user2@test.com`
6. Verify you see a clean slate (no user1 data)
7. Add different data
8. Sign back in as user1 - confirm data is separate

## ✅ You're Done!

Your app now supports multiple users with complete data isolation.

## 📋 What Changed?

### Database:
- ✅ RLS policies now enforce user-specific access
- ✅ Each user can only see their own data
- ✅ Stock prices remain shared (market data)

### Code:
- ✅ Portfolio services now require authentication
- ✅ Portfolio queries filter by user_id
- ✅ All other services already had proper user filtering

## 🔧 If Something Goes Wrong

### "No data showing"
- Expected for new users - they start with empty data
- Have them create their first pipeline idea or coverage

### "Permission denied" errors
1. Check user is logged in (check browser console)
2. Verify RLS policies were applied (run verify-rls-setup.sql)
3. Check Supabase logs in dashboard

### "Can't see my old data"
- Old data might not have user_id set
- Run this to check:
```sql
SELECT COUNT(*) FROM pipeline_ideas WHERE user_id IS NULL;
SELECT COUNT(*) FROM coverage_universe WHERE user_id IS NULL;
SELECT COUNT(*) FROM deliverables WHERE user_id IS NULL;
```

- To migrate old data to your user:
```sql
-- First get your user ID
SELECT id, email FROM auth.users;

-- Then update records (replace 'your-user-id' with actual ID)
UPDATE pipeline_ideas SET user_id = 'your-user-id' WHERE user_id IS NULL;
UPDATE coverage_universe SET user_id = 'your-user-id' WHERE user_id IS NULL;
UPDATE deliverables SET user_id = 'your-user-id' WHERE user_id IS NULL;
UPDATE daily_checkins SET user_id = 'your-user-id' WHERE user_id IS NULL;
UPDATE portfolios SET user_id = 'your-user-id' WHERE user_id IS NULL;
```

## 📚 More Details

See `MULTI_USER_SETUP.md` for:
- Complete technical explanation
- How RLS policies work
- Production considerations
- Advanced configurations

## 🎉 Benefits

Now you can:
- Share your app with colleagues
- Each analyst has their own workspace
- Deploy to production safely
- Scale to unlimited users
- Data is secure at database level

