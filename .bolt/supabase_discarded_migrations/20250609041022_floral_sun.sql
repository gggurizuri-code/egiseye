/*
  # Fix reminders foreign key reference

  1. Changes
    - Update reminders table foreign key to reference users table instead of auth.users
    - This aligns with the existing users table structure
*/

-- Drop the existing foreign key constraint
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS fk_user;
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_user_fkey;

-- Add new foreign key constraint referencing users table
ALTER TABLE reminders 
ADD CONSTRAINT reminders_user_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;