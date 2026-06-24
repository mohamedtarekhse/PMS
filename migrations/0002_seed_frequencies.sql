INSERT INTO frequencies (name, name_ar, type, interval_days, interval_hours, sort_order) VALUES
  ('Weekly', 'أسبوعي', 'calendar', 7, NULL, 1),
  ('Monthly', 'شهري', 'calendar', 30, NULL, 2),
  ('Quarterly', 'ربع سنوي', 'calendar', 90, NULL, 3),
  ('6 Months', 'نصف سنوي', 'calendar', 180, NULL, 4),
  ('1 Year', 'سنوي', 'calendar', 365, NULL, 5),
  ('500 Hours', '500 ساعة', 'hourly', NULL, 500, 6),
  ('1000 Hours', '1000 ساعة', 'hourly', NULL, 1000, 7),
  ('2000 Hours', '2000 ساعة', 'hourly', NULL, 2000, 8),
  ('3000 Hours', '3000 ساعة', 'hourly', NULL, 3000, 9),
  ('6000 Hours', '6000 ساعة', 'hourly', NULL, 6000, 10),
  ('Custom', 'مخصص', 'custom', 0, 0, 99);
