/*
  # Add occupation field to users table

  1. Changes
    - Add occupation column to users table
*/

ALTER TABLE users
ADD COLUMN occupation text;