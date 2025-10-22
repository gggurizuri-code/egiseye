/*
  # Fix update_likes_count function CASE statement

  1. Database Functions
    - Update `update_likes_count()` function to include missing ELSE clause
    - Ensures proper handling of all CASE conditions when updating likes counts

  2. Changes
    - Add ELSE clause to CASE statement in update_likes_count function
    - Prevents "case not found" errors when liking/unliking posts or comments
*/

CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle post likes
  IF NEW.post_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE forum_posts 
      SET likes_count = likes_count + 1 
      WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE forum_posts 
      SET likes_count = GREATEST(0, likes_count - 1) 
      WHERE id = OLD.post_id;
    END IF;
  END IF;

  -- Handle comment likes
  IF (NEW.comment_id IS NOT NULL AND TG_OP = 'INSERT') OR (OLD.comment_id IS NOT NULL AND TG_OP = 'DELETE') THEN
    DECLARE
      comment_id_to_update uuid;
    BEGIN
      comment_id_to_update := CASE 
        WHEN TG_OP = 'INSERT' THEN NEW.comment_id
        WHEN TG_OP = 'DELETE' THEN OLD.comment_id
        ELSE NULL
      END;
      
      IF comment_id_to_update IS NOT NULL THEN
        IF TG_OP = 'INSERT' THEN
          UPDATE forum_comments 
          SET likes_count = likes_count + 1 
          WHERE id = comment_id_to_update;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE forum_comments 
          SET likes_count = GREATEST(0, likes_count - 1) 
          WHERE id = comment_id_to_update;
        END IF;
      END IF;
    END;
  END IF;

  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;