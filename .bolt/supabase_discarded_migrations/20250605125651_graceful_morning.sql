/*
  # Add achievements and titles system

  1. New Tables
    - `achievements`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `icon_name` (text)
      - `required_action` (text)
      - `required_count` (integer)
    
    - `user_achievements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `achievement_id` (uuid, references achievements)
      - `unlocked_at` (timestamp)
      - `progress` (integer)

    - `titles`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `required_achievement_id` (uuid, references achievements)

    - `user_titles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title_id` (uuid, references titles)
      - `equipped` (boolean)

  2. Security
    - Enable RLS on all tables
    - Add policies for viewing and updating
*/

-- Create achievements table
CREATE TABLE achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon_name text NOT NULL,
  required_action text NOT NULL,
  required_count integer NOT NULL
);

-- Create user_achievements table
CREATE TABLE user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  achievement_id uuid REFERENCES achievements(id) NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  progress integer DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- Create titles table
CREATE TABLE titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  required_achievement_id uuid REFERENCES achievements(id)
);

-- Create user_titles table
CREATE TABLE user_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title_id uuid REFERENCES titles(id) NOT NULL,
  equipped boolean DEFAULT false,
  UNIQUE(user_id, title_id)
);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_titles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can view titles"
  ON titles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can view any user achievements"
  ON user_achievements FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can view any user titles"
  ON user_titles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update their own achievements"
  ON user_achievements FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own titles"
  ON user_titles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert initial achievements
INSERT INTO achievements (name, description, icon_name, required_action, required_count) VALUES
  ('Первые шаги', 'Создайте свой первый пост', 'edit', 'create_post', 1),
  ('Активный автор', 'Создайте 10 постов', 'edit', 'create_post', 10),
  ('Мастер пера', 'Создайте 50 постов', 'edit', 'create_post', 50),
  ('Комментатор', 'Оставьте 10 комментариев', 'message-circle', 'create_comment', 10),
  ('Эксперт диалога', 'Оставьте 50 комментариев', 'message-circle', 'create_comment', 50),
  ('Первое признание', 'Получите 10 лайков на постах', 'thumbs-up', 'receive_post_like', 10),
  ('Народный любимец', 'Получите 50 лайков на постах', 'thumbs-up', 'receive_post_like', 50),
  ('Помощник', 'Поставьте 10 лайков', 'heart', 'give_like', 10),
  ('Поддержка сообщества', 'Поставьте 50 лайков', 'heart', 'give_like', 50),
  ('Диагност', 'Проведите 10 сканирований растений', 'search', 'scan_plant', 10),
  ('Эксперт по растениям', 'Проведите 50 сканирований', 'search', 'scan_plant', 50);

-- Insert initial titles
INSERT INTO titles (name, description, required_achievement_id) VALUES
  ('Начинающий садовод', 'Получите достижение "Первые шаги"', (SELECT id FROM achievements WHERE name = 'Первые шаги')),
  ('Опытный садовод', 'Получите достижение "Активный автор"', (SELECT id FROM achievements WHERE name = 'Активный автор')),
  ('Мастер садоводства', 'Получите достижение "Мастер пера"', (SELECT id FROM achievements WHERE name = 'Мастер пера')),
  ('Эксперт по растениям', 'Получите достижение "Эксперт по растениям"', (SELECT id FROM achievements WHERE name = 'Эксперт по растениям')),
  ('Народный целитель', 'Получите достижение "Народный любимец"', (SELECT id FROM achievements WHERE name = 'Народный любимец')),
  ('Защитник растений', 'Получите достижение "Диагност"', (SELECT id FROM achievements WHERE name = 'Диагност'));

-- Add function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements()
RETURNS trigger AS $$
DECLARE
  achievement_record RECORD;
  title_record RECORD;
BEGIN
  -- Check each achievement
  FOR achievement_record IN SELECT * FROM achievements
  LOOP
    -- Check if user meets requirements
    CASE achievement_record.required_action
      WHEN 'create_post' THEN
        IF (SELECT COUNT(*) FROM forum_posts WHERE user_id = NEW.user_id) >= achievement_record.required_count THEN
          INSERT INTO user_achievements (user_id, achievement_id, progress)
          VALUES (NEW.user_id, achievement_record.id, achievement_record.required_count)
          ON CONFLICT (user_id, achievement_id) DO NOTHING;
        END IF;
      WHEN 'create_comment' THEN
        IF (SELECT COUNT(*) FROM forum_comments WHERE user_id = NEW.user_id) >= achievement_record.required_count THEN
          INSERT INTO user_achievements (user_id, achievement_id, progress)
          VALUES (NEW.user_id, achievement_record.id, achievement_record.required_count)
          ON CONFLICT (user_id, achievement_id) DO NOTHING;
        END IF;
      WHEN 'receive_post_like' THEN
        IF (SELECT SUM(likes_count) FROM forum_posts WHERE user_id = NEW.user_id) >= achievement_record.required_count THEN
          INSERT INTO user_achievements (user_id, achievement_id, progress)
          VALUES (NEW.user_id, achievement_record.id, achievement_record.required_count)
          ON CONFLICT (user_id, achievement_id) DO NOTHING;
        END IF;
      WHEN 'give_like' THEN
        IF (SELECT COUNT(*) FROM forum_likes WHERE user_id = NEW.user_id) >= achievement_record.required_count THEN
          INSERT INTO user_achievements (user_id, achievement_id, progress)
          VALUES (NEW.user_id, achievement_record.id, achievement_record.required_count)
          ON CONFLICT (user_id, achievement_id) DO NOTHING;
        END IF;
    END CASE;
  END LOOP;

  -- Award titles based on achievements
  FOR title_record IN SELECT * FROM titles
  LOOP
    IF EXISTS (
      SELECT 1 FROM user_achievements
      WHERE user_id = NEW.user_id
      AND achievement_id = title_record.required_achievement_id
    ) THEN
      INSERT INTO user_titles (user_id, title_id)
      VALUES (NEW.user_id, title_record.id)
      ON CONFLICT (user_id, title_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for achievement checks
CREATE TRIGGER check_achievements_on_post
AFTER INSERT ON forum_posts
FOR EACH ROW
EXECUTE FUNCTION check_and_award_achievements();

CREATE TRIGGER check_achievements_on_comment
AFTER INSERT ON forum_comments
FOR EACH ROW
EXECUTE FUNCTION check_and_award_achievements();

CREATE TRIGGER check_achievements_on_like
AFTER INSERT ON forum_likes
FOR EACH ROW
EXECUTE FUNCTION check_and_award_achievements();