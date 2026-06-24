-- Users & Roles
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('technician', 'coordinator', 'manager')),
  full_name TEXT NOT NULL,
  invite_token TEXT UNIQUE,
  invite_expires TEXT,
  is_active INTEGER DEFAULT 1,
  preferred_lang TEXT DEFAULT 'en' CHECK(preferred_lang IN ('en', 'ar')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- PM Frequencies
CREATE TABLE IF NOT EXISTS frequencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_ar TEXT,
  type TEXT NOT NULL CHECK(type IN ('calendar', 'hourly', 'custom')),
  interval_days INTEGER,
  interval_hours INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

-- Equipment Templates
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Template tasks
CREATE TABLE IF NOT EXISTS template_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES templates(id),
  item_number INTEGER NOT NULL,
  task_description TEXT NOT NULL,
  task_description_ar TEXT,
  task_type TEXT DEFAULT 'status' CHECK(task_type IN ('status', 'numeric_reading')),
  reading_unit TEXT,
  has_notes INTEGER DEFAULT 0,
  sort_order INTEGER NOT NULL
);

-- Equipment instances
CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES templates(id),
  equipment_name TEXT NOT NULL,
  equipment_name_ar TEXT,
  model TEXT,
  make TEXT,
  serial_number TEXT,
  location TEXT DEFAULT 'Rig 8',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Equipment-Frequency assignments
CREATE TABLE IF NOT EXISTS equipment_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  frequency_id INTEGER NOT NULL REFERENCES frequencies(id),
  is_active INTEGER DEFAULT 1,
  last_pm_date TEXT,
  next_due_date TEXT,
  last_hours_reading INTEGER,
  custom_description TEXT,
  UNIQUE(equipment_id, frequency_id)
);

-- PM Records
CREATE TABLE IF NOT EXISTS pm_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  frequency_id INTEGER NOT NULL REFERENCES frequencies(id),
  submitted_by INTEGER NOT NULL REFERENCES users(id),
  submitted_at TEXT DEFAULT (datetime('now')),
  completed_by TEXT,
  accepted_by TEXT,
  acknowledged_by TEXT,
  equipment_hours TEXT,
  overall_status TEXT DEFAULT 'pending' CHECK(overall_status IN ('pending', 'ok', 'issues_found', 'needs_review')),
  needs_coordinator_review INTEGER DEFAULT 0,
  manager_reviewed INTEGER DEFAULT 0,
  manager_reviewed_by INTEGER REFERENCES users(id),
  manager_reviewed_at TEXT
);

-- Individual task results
CREATE TABLE IF NOT EXISTS pm_task_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pm_record_id INTEGER NOT NULL REFERENCES pm_records(id),
  template_task_id INTEGER NOT NULL REFERENCES template_tasks(id),
  status TEXT,
  notes TEXT,
  flagged INTEGER DEFAULT 0,
  ai_evaluation TEXT
);

-- Comments
CREATE TABLE IF NOT EXISTS pm_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pm_record_id INTEGER NOT NULL REFERENCES pm_records(id),
  comment_text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pm_record_id INTEGER NOT NULL REFERENCES pm_records(id),
  alert_type TEXT NOT NULL CHECK(alert_type IN ('issue', 'needs_review', 'comment_flagged', 'overdue_pm', 'info')),
  severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  is_read INTEGER DEFAULT 0,
  assigned_to INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Email notification log
CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id INTEGER REFERENCES alerts(id),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'sent'
);

-- Invitations
CREATE TABLE IF NOT EXISTS invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('technician', 'coordinator', 'manager')),
  full_name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  invited_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_pm_records_equipment ON pm_records(equipment_id);
CREATE INDEX idx_pm_records_submitted ON pm_records(submitted_by);
CREATE INDEX idx_pm_records_status ON pm_records(overall_status);
CREATE INDEX idx_alerts_assigned ON alerts(assigned_to);
CREATE INDEX idx_alerts_read ON alerts(is_read);
CREATE INDEX idx_equipment_schedules_due ON equipment_schedules(next_due_date);
CREATE INDEX idx_template_tasks_template ON template_tasks(template_id);
CREATE INDEX idx_pm_task_results_record ON pm_task_results(pm_record_id);
