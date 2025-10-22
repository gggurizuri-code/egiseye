/*
  # Add more achievements and titles

  1. New Achievements
    - Add more diverse achievements for different activities
    - Include social, exploration, and expertise achievements

  2. New Titles
    - Add special titles including "Толстый Алхимик" and "Токаев"
    - Add more creative titles based on achievements

  3. Changes
    - Insert new achievements with various requirements
    - Insert new titles with different unlock conditions
*/

-- Insert additional achievements
INSERT INTO achievements (name, description, icon_name, required_action, required_count) VALUES
  ('Социальная бабочка', 'Получите 100 лайков на комментариях', 'message-circle', 'receive_comment_like', 100),
  ('Легенда форума', 'Создайте 100 постов', 'edit', 'create_post', 100),
  ('Мастер общения', 'Оставьте 100 комментариев', 'message-circle', 'create_comment', 100),
  ('Звезда сообщества', 'Получите 200 лайков на постах', 'thumbs-up', 'receive_post_like', 200),
  ('Супер поддержка', 'Поставьте 100 лайков', 'heart', 'give_like', 100),
  ('Профессиональный диагност', 'Проведите 100 сканирований растений', 'search', 'scan_plant', 100),
  ('Гуру растений', 'Проведите 500 сканирований', 'search', 'scan_plant', 500),
  ('Первый шаг в AI', 'Отправьте 10 сообщений чат-боту', 'message-circle', 'chatbot_message', 10),
  ('AI Консультант', 'Отправьте 50 сообщений чат-боту', 'message-circle', 'chatbot_message', 50),
  ('Мастер AI', 'Отправьте 200 сообщений чат-боту', 'message-circle', 'chatbot_message', 200),
  ('Ранняя пташка', 'Войдите в систему 7 дней подряд', 'search', 'daily_login', 7),
  ('Постоянный пользователь', 'Войдите в систему 30 дней подряд', 'search', 'daily_login', 30),
  ('Ветеран ADOPTD', 'Войдите в систему 100 дней подряд', 'search', 'daily_login', 100),
  ('Помощник новичков', 'Получите 20 лайков на комментариях', 'heart', 'receive_comment_like', 20),
  ('Наставник', 'Получите 50 лайков на комментариях', 'heart', 'receive_comment_like', 50);

-- Insert additional titles including special ones
INSERT INTO titles (name, description, required_achievement_id) VALUES
  ('Толстый Алхимик', 'Специальный титул для CEO Беки', NULL),
  ('Токаев', 'Специальный титул для администратора', NULL),
  ('Социальная звезда', 'Получите достижение "Социальная бабочка"', (SELECT id FROM achievements WHERE name = 'Социальная бабочка')),
  ('Легенда', 'Получите достижение "Легенда форума"', (SELECT id FROM achievements WHERE name = 'Легенда форума')),
  ('Мастер слова', 'Получите достижение "Мастер общения"', (SELECT id FROM achievements WHERE name = 'Мастер общения')),
  ('Звезда ADOPTD', 'Получите достижение "Звезда сообщества"', (SELECT id FROM achievements WHERE name = 'Звезда сообщества')),
  ('Супер помощник', 'Получите достижение "Супер поддержка"', (SELECT id FROM achievements WHERE name = 'Супер поддержка')),
  ('Профессионал', 'Получите достижение "Профессиональный диагност"', (SELECT id FROM achievements WHERE name = 'Профессиональный диагност')),
  ('Гуру', 'Получите достижение "Гуру растений"', (SELECT id FROM achievements WHERE name = 'Гуру растений')),
  ('AI Партнер', 'Получите достижение "AI Консультант"', (SELECT id FROM achievements WHERE name = 'AI Консультант')),
  ('AI Мастер', 'Получите достижение "Мастер AI"', (SELECT id FROM achievements WHERE name = 'Мастер AI')),
  ('Постоянный житель', 'Получите достижение "Постоянный пользователь"', (SELECT id FROM achievements WHERE name = 'Постоянный пользователь')),
  ('Ветеран', 'Получите достижение "Ветеран ADOPTD"', (SELECT id FROM achievements WHERE name = 'Ветеран ADOPTD')),
  ('Наставник сообщества', 'Получите достижение "Наставник"', (SELECT id FROM achievements WHERE name = 'Наставник')),
  ('Мудрец растений', 'Получите 3 достижения связанных с растениями', NULL),
  ('Социальный лидер', 'Получите 5 достижений связанных с общением', NULL),
  ('Покоритель ADOPTD', 'Получите 10 любых достижений', NULL);