#!/bin/bash

echo "Running database migration to add pass fields to pipeline_ideas table..."
echo "Make sure you have access to your Supabase database."

echo ""
echo "You can run this migration in one of these ways:"
echo "1. Copy the SQL from add-pass-fields-to-pipeline.sql and run it in your Supabase SQL editor"
echo "2. Use the Supabase CLI: supabase db push"
echo "3. Run it directly in your database connection"

echo ""
echo "The migration will add:"
echo "- pass_reason (TEXT) - to store why an idea was passed"
echo "- pass_date (DATE) - to store when an idea was passed"

echo ""
echo "After running the migration, restart your application to see the changes." 