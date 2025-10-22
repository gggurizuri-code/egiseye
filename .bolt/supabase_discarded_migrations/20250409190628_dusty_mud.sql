/*
  # Create forum system

  1. New Tables
    - `forum_posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `likes_count` (integer)
      - `is_pinned` (boolean)

    - `forum_comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references forum_posts)
      - `user_id` (uuid, references auth.users)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `likes_count` (integer)

    - `forum_likes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `post_id` (uuid, references forum_posts, nullable)
      - `comment_id` (uuid, references forum_comments, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add admin policies
*/

-- Create forum_posts table
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  likes_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- Create forum_comments table
CREATE TABLE IF NOT EXISTS forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  likes_count integer DEFAULT 0,
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- Create forum_likes table
CREATE TABLE IF NOT EXISTS forum_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  post_id uuid REFERENCES forum_posts(id),
  comment_id uuid REFERENCES forum_comments(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  CONSTRAINT check_like_target
    CHECK (
      (post_id IS NOT NULL AND comment_id IS NULL) OR
      (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Enable RLS
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_likes ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = user_id
    AND email = 'alistarsikalistarsik@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for forum_posts
CREATE POLICY "Anyone can view posts"
  ON forum_posts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON forum_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts or admins can update any post"
  ON forum_posts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    is_admin(auth.uid())
  );

CREATE POLICY "Users can delete own posts or admins can delete any post"
  ON forum_posts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    is_admin(auth.uid())
  );

-- Policies for forum_comments
CREATE POLICY "Anyone can view comments"
  ON forum_comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON forum_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments or admins can update any comment"
  ON forum_comments
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id OR
    is_admin(auth.uid())
  );

CREATE POLICY "Users can delete own comments or admins can delete any comment"
  ON forum_comments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    is_admin(auth.uid())
  );

-- Policies for forum_likes
CREATE POLICY "Anyone can view likes"
  ON forum_likes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create/delete likes"
  ON forum_likes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create triggers to update likes count
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE forum_posts
      SET likes_count = likes_count + 1
      WHERE id = NEW.post_id;
    ELSE
      UPDATE forum_comments
      SET likes_count = likes_count + 1
      WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE forum_posts
      SET likes_count = likes_count - 1
      WHERE id = OLD.post_id;
    ELSE
      UPDATE forum_comments
      SET likes_count = likes_count - 1
      WHERE id = OLD.comment_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_post_likes_count
AFTER INSERT OR DELETE ON forum_likes
FOR EACH ROW
EXECUTE FUNCTION update_likes_count();