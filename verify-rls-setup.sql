-- Verification Script for Row Level Security Setup
-- Run this after applying restore-proper-rls.sql to verify everything is configured correctly

-- ========================================
-- 1. CHECK RLS IS ENABLED
-- ========================================
SELECT 
  '=== RLS ENABLED CHECK ===' as check_name,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✓ ENABLED'
    ELSE '✗ DISABLED (FIX REQUIRED)'
  END as status
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
  'portfolio_transactions',
  'stock_notes',
  'stock_prices'
)
ORDER BY tablename;

-- ========================================
-- 2. CHECK POLICIES EXIST
-- ========================================
SELECT 
  '=== POLICIES COUNT ===' as check_name,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✓ Good (4+ policies)'
    WHEN COUNT(*) > 0 THEN '⚠ Warning (less than 4 policies)'
    ELSE '✗ ERROR (no policies)'
  END as status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
  'daily_checkins', 
  'coverage_universe', 
  'deliverables', 
  'crm_notes', 
  'pipeline_ideas',
  'portfolios',
  'portfolio_positions',
  'portfolio_transactions',
  'stock_notes',
  'stock_prices'
)
GROUP BY tablename
ORDER BY tablename;

-- ========================================
-- 3. LIST ALL POLICIES
-- ========================================
SELECT 
  '=== ALL POLICIES DETAIL ===' as check_name,
  tablename,
  policyname,
  cmd as command,
  CASE 
    WHEN policyname LIKE '%own%' OR policyname LIKE '%their own%' THEN '✓ User-specific'
    WHEN policyname LIKE '%all%' AND tablename != 'stock_prices' THEN '✗ INSECURE (allows all)'
    ELSE '✓ OK'
  END as security_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
  'daily_checkins', 
  'coverage_universe', 
  'deliverables', 
  'crm_notes', 
  'pipeline_ideas',
  'portfolios',
  'portfolio_positions',
  'portfolio_transactions',
  'stock_notes',
  'stock_prices'
)
ORDER BY tablename, policyname;

-- ========================================
-- 4. CHECK FOR INSECURE POLICIES
-- ========================================
SELECT 
  '=== INSECURE POLICIES FOUND ===' as check_name,
  tablename,
  policyname,
  '✗ WARNING: This policy allows all access!' as warning
FROM pg_policies 
WHERE schemaname = 'public'
AND (
  qual = 'true' 
  OR qual LIKE '%true%'
  OR policyname LIKE '%Allow all%'
)
AND tablename != 'stock_prices' -- stock_prices is OK to be shared
ORDER BY tablename;

-- ========================================
-- 5. VERIFY USER_ID COLUMNS EXIST
-- ========================================
SELECT 
  '=== USER_ID COLUMNS CHECK ===' as check_name,
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'user_id' THEN '✓ user_id exists'
    ELSE '⚠ Note: uses different column'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
  'daily_checkins', 
  'coverage_universe', 
  'deliverables', 
  'crm_notes', 
  'pipeline_ideas',
  'portfolios',
  'stock_notes'
)
AND column_name = 'user_id'
ORDER BY table_name;

-- ========================================
-- 6. CHECK FOREIGN KEY CONSTRAINTS
-- ========================================
SELECT 
  '=== USER_ID FOREIGN KEYS ===' as check_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✓ FK to auth.users' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND kcu.column_name = 'user_id'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ========================================
-- 7. FINAL SUMMARY
-- ========================================
SELECT '=== FINAL SUMMARY ===' as summary;

SELECT 
  'Total Tables with RLS' as metric,
  COUNT(*) as count,
  'Should be 8+' as expected
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
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

SELECT 
  'Total RLS Policies' as metric,
  COUNT(*) as count,
  'Should be 32+ (4 per table for 8 tables)' as expected
FROM pg_policies 
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

SELECT 
  'Insecure Policies (not including stock_prices)' as metric,
  COUNT(*) as count,
  'Should be 0' as expected
FROM pg_policies 
WHERE schemaname = 'public'
AND (qual = 'true' OR policyname LIKE '%Allow all%')
AND tablename != 'stock_prices';

-- ========================================
-- INSTRUCTIONS
-- ========================================
SELECT '
╔════════════════════════════════════════════════════════════╗
║                    VERIFICATION COMPLETE                    ║
╚════════════════════════════════════════════════════════════╝

Review the results above:

✓ = Everything OK
⚠ = Warning - may need attention  
✗ = Error - needs fixing

KEY CHECKS:
1. RLS Enabled: All tables should show "✓ ENABLED"
2. Policies Count: Each table should have 4+ policies
3. Security Check: Should show "✓ User-specific" (not "allows all")
4. Insecure Policies: Should find 0 results (except stock_prices)
5. Foreign Keys: user_id should reference auth.users

If you see any ✗ or unexpected ⚠:
- Rerun restore-proper-rls.sql
- Check for syntax errors
- Verify you ran it against the correct database

' as instructions;

