-- Frequencies
INSERT OR IGNORE INTO frequencies (id, name, name_ar, type, interval_days, interval_hours, sort_order) VALUES
  (1, 'Weekly', 'أسبوعي', 'calendar', 7, NULL, 1),
  (2, 'Monthly', 'شهري', 'calendar', 30, NULL, 2),
  (3, 'Quarterly', 'ربع سنوي', 'calendar', 90, NULL, 3),
  (4, '6 Months', 'نصف سنوي', 'calendar', 180, NULL, 4),
  (5, '1 Year', 'سنوي', 'calendar', 365, NULL, 5),
  (6, '500 Hours', '500 ساعة', 'hourly', NULL, 500, 6),
  (7, '1000 Hours', '1000 ساعة', 'hourly', NULL, 1000, 7),
  (8, '2000 Hours', '2000 ساعة', 'hourly', NULL, 2000, 8),
  (9, '3000 Hours', '3000 ساعة', 'hourly', NULL, 3000, 9),
  (10, '6000 Hours', '6000 ساعة', 'hourly', NULL, 6000, 10),
  (11, 'Custom', 'مخصص', 'custom', 0, 0, 99);

-- Manager user (password: admin123)
INSERT OR IGNORE INTO users (id, username, email, password_hash, role, full_name, preferred_lang)
VALUES (1, 'manager', 'mohamedtarekhse@gmail.com', '$2a$10$bQUHJ4ux3BX1CSmdGBz/quXOtSqbXqTH6OoJJNfNJpn51Tv/LYWx.', 'manager', 'Mohamed Tarek', 'en');
