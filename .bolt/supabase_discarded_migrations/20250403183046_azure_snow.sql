/*
  # Create admin user

  1. Changes
    - Insert admin user into auth.users table
    - Set email_confirmed_at to current timestamp
    - Set is_super_admin to true
*/

-- Insert admin user into auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'alistarsikalistarsik@gmail.com',
  crypt('339344', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"is_super_admin":true}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);