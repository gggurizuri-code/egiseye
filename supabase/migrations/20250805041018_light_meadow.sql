/*
  # Синхронизация действий между user_actions и achievements

  1. Изменения
    - Обновляем required_action в таблице achievements для соответствия action_type из user_actions
    - post_created остается post_created (уже совпадает)
    - post_liked остается post_liked (уже совпадает) 
    - create_comment → comment_created
    - receive_post_like → post_like_received
    - receive_comment_like → comment_like_received
    - scan_plant → plant_scanned
    - chatbot_message → chatbot_message_sent
    - daily_login остается daily_login (уже совпадает)

  2. Безопасность
    - Обновляем только существующие записи
    - Не удаляем данные
*/

-- Обновляем required_action для соответствия action_type из user_actions
UPDATE achievements 
SET required_action = 'comment_created' 
WHERE required_action = 'create_comment';

UPDATE achievements 
SET required_action = 'post_like_received' 
WHERE required_action = 'receive_post_like';

UPDATE achievements 
SET required_action = 'comment_like_received' 
WHERE required_action = 'receive_comment_like';

UPDATE achievements 
SET required_action = 'plant_scanned' 
WHERE required_action = 'scan_plant';

UPDATE achievements 
SET required_action = 'chatbot_message_sent' 
WHERE required_action = 'chatbot_message';