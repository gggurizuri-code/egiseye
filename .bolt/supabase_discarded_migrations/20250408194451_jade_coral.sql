/*
  # Create reminders system

  1. New Tables
    - `reminders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `reminder_text` (text)
      - `created_at` (timestamp)
      - `scheduled_for` (timestamp)
      - `completed` (boolean)
      - `diagnosis_text` (text)

  2. Security
    - Enable RLS on `reminders` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  reminder_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  scheduled_for timestamptz NOT NULL,
  completed boolean DEFAULT false,
  diagnosis_text text,
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create their own reminders"
  ON reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reminders"
  ON reminders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON reminders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);