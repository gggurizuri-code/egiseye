/*
  # Функции для отслеживания получения лайков

  1. Новые функции
    - Обновляем toggle_like_and_get_result для записи действия получения лайка
    - Обновляем toggle_comment_like для записи действия получения лайка на комментарий

  2. Безопасность
    - Функции проверяют права доступа
    - Записывают действия только для владельцев контента
*/

-- Обновляем функцию toggle_like_and_get_result
CREATE OR REPLACE FUNCTION toggle_like_and_get_result(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    like_exists BOOLEAN;
    post_author_id UUID;
BEGIN
    -- Получаем автора поста
    SELECT user_id INTO post_author_id 
    FROM forum_posts 
    WHERE id = p_post_id;
    
    -- Проверяем, существует ли лайк
    SELECT EXISTS(
        SELECT 1 FROM forum_likes 
        WHERE post_id = p_post_id AND user_id = p_user_id
    ) INTO like_exists;
    
    IF like_exists THEN
        -- Удаляем лайк
        DELETE FROM forum_likes 
        WHERE post_id = p_post_id AND user_id = p_user_id;
        RETURN FALSE;
    ELSE
        -- Добавляем лайк
        INSERT INTO forum_likes (post_id, user_id) 
        VALUES (p_post_id, p_user_id);
        
        -- Записываем действие получения лайка для автора поста (если это не он сам)
        IF post_author_id IS NOT NULL AND post_author_id != p_user_id THEN
            INSERT INTO user_actions (user_id, action_type, target_id)
            VALUES (post_author_id, 'post_like_received', p_post_id);
        END IF;
        
        RETURN TRUE;
    END IF;
END;
$$;

-- Обновляем функцию toggle_comment_like
CREATE OR REPLACE FUNCTION toggle_comment_like(comment_id_to_toggle UUID)
RETURNS TABLE(new_likes_count INTEGER, liked_by_user BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    like_exists BOOLEAN;
    comment_author_id UUID;
BEGIN
    -- Получаем текущего пользователя
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Получаем автора комментария
    SELECT user_id INTO comment_author_id 
    FROM forum_comments 
    WHERE id = comment_id_to_toggle;
    
    -- Проверяем, существует ли лайк
    SELECT EXISTS(
        SELECT 1 FROM forum_comment_likes 
        WHERE comment_id = comment_id_to_toggle AND user_id = current_user_id
    ) INTO like_exists;
    
    IF like_exists THEN
        -- Удаляем лайк
        DELETE FROM forum_comment_likes 
        WHERE comment_id = comment_id_to_toggle AND user_id = current_user_id;
    ELSE
        -- Добавляем лайк
        INSERT INTO forum_comment_likes (comment_id, user_id) 
        VALUES (comment_id_to_toggle, current_user_id);
        
        -- Записываем действие получения лайка для автора комментария (если это не он сам)
        IF comment_author_id IS NOT NULL AND comment_author_id != current_user_id THEN
            INSERT INTO user_actions (user_id, action_type, target_id)
            VALUES (comment_author_id, 'comment_like_received', comment_id_to_toggle);
        END IF;
    END IF;
    
    -- Возвращаем обновленную информацию
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM forum_comment_likes WHERE comment_id = comment_id_to_toggle) as new_likes_count,
        NOT like_exists as liked_by_user;
END;
$$;