-- Seed System Templates
-- Created: 2025-11-02
-- Purpose: Create high-quality system templates for users

-- Template 1: Executive Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Executive Day',
  'Balanced schedule with strategic focus blocks and meetings. Perfect for leaders balancing deep work with team interactions.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 30, "title": "Morning Review", "type": "personal", "color": "#10b981", "is_flexible": false},
    {"start_time": "08:30", "duration_minutes": 90, "title": "Strategic Focus Block", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "10:00", "duration_minutes": 30, "title": "Team Standup", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "10:30", "duration_minutes": 90, "title": "Executive Work", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "12:00", "duration_minutes": 60, "title": "Lunch Break", "type": "break", "color": "#f59e0b", "is_flexible": true},
    {"start_time": "13:00", "duration_minutes": 60, "title": "1-on-1 Meetings", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "14:00", "duration_minutes": 30, "title": "Email & Communications", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "14:30", "duration_minutes": 90, "title": "Project Work", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "16:00", "duration_minutes": 30, "title": "End-of-Day Review", "type": "personal", "color": "#10b981", "is_flexible": false}
  ]'::jsonb
);

-- Template 2: Deep Work Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Deep Work Day',
  'Maximize focus with long, uninterrupted work blocks. Minimal meetings, maximum productivity for complex tasks.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 30, "title": "Morning Setup", "type": "personal", "color": "#10b981", "is_flexible": false},
    {"start_time": "08:30", "duration_minutes": 240, "title": "Deep Work Block 1", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "12:30", "duration_minutes": 60, "title": "Lunch & Walk", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "13:30", "duration_minutes": 240, "title": "Deep Work Block 2", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "17:30", "duration_minutes": 30, "title": "Wrap Up & Planning", "type": "personal", "color": "#10b981", "is_flexible": false}
  ]'::jsonb
);

-- Template 3: Meeting Heavy
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Meeting Heavy',
  'Structured schedule for days packed with meetings. Includes buffer time and quick breaks between sessions.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 30, "title": "Prep & Emails", "type": "work", "color": "#06b6d4", "is_flexible": false},
    {"start_time": "08:30", "duration_minutes": 30, "title": "Meeting 1", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "09:00", "duration_minutes": 30, "title": "Meeting 2", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "09:30", "duration_minutes": 15, "title": "Break", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "09:45", "duration_minutes": 60, "title": "Meeting 3", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "10:45", "duration_minutes": 30, "title": "Meeting 4", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "11:15", "duration_minutes": 45, "title": "Catch-up Work", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "12:00", "duration_minutes": 60, "title": "Lunch", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "13:00", "duration_minutes": 30, "title": "Meeting 5", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "13:30", "duration_minutes": 30, "title": "Meeting 6", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "14:00", "duration_minutes": 15, "title": "Break", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "14:15", "duration_minutes": 60, "title": "Meeting 7", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "15:15", "duration_minutes": 30, "title": "Meeting 8", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "15:45", "duration_minutes": 45, "title": "Follow-ups & Notes", "type": "work", "color": "#06b6d4", "is_flexible": false},
    {"start_time": "16:30", "duration_minutes": 30, "title": "End-of-Day Wrap", "type": "personal", "color": "#10b981", "is_flexible": false}
  ]'::jsonb
);

-- Template 4: Travel Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Travel Day',
  'Lighter schedule with flexibility for travel time. Essential meetings only, with buffer time built in.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 60, "title": "Travel Prep", "type": "personal", "color": "#10b981", "is_flexible": true},
    {"start_time": "09:00", "duration_minutes": 180, "title": "Travel Time", "type": "personal", "color": "#ef4444", "is_flexible": false},
    {"start_time": "12:00", "duration_minutes": 60, "title": "Lunch", "type": "break", "color": "#f59e0b", "is_flexible": true},
    {"start_time": "13:00", "duration_minutes": 60, "title": "Light Work / Emails", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "14:00", "duration_minutes": 30, "title": "Essential Meeting", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "14:30", "duration_minutes": 90, "title": "Flexible Work Block", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "16:00", "duration_minutes": 60, "title": "Wrap Up & Rest", "type": "personal", "color": "#10b981", "is_flexible": true}
  ]'::jsonb
);

-- Template 5: Recovery Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Recovery Day',
  'Minimal commitments with focus on rest and self-care. Light work, plenty of breaks, and personal time.',
  true,
  '[
    {"start_time": "09:00", "duration_minutes": 60, "title": "Morning Routine", "type": "personal", "color": "#10b981", "is_flexible": true},
    {"start_time": "10:00", "duration_minutes": 90, "title": "Light Work Block", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "11:30", "duration_minutes": 30, "title": "Break / Walk", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "12:00", "duration_minutes": 90, "title": "Lunch & Relaxation", "type": "break", "color": "#f59e0b", "is_flexible": true},
    {"start_time": "13:30", "duration_minutes": 60, "title": "Easy Tasks", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "14:30", "duration_minutes": 30, "title": "Personal Time", "type": "personal", "color": "#10b981", "is_flexible": true},
    {"start_time": "15:00", "duration_minutes": 60, "title": "Optional: Light Work", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "16:00", "duration_minutes": 120, "title": "Free Time / Self Care", "type": "personal", "color": "#10b981", "is_flexible": true}
  ]'::jsonb
);

-- Template 6: Maker Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Maker Day',
  'Optimized for creators, developers, and designers. Large blocks for creative flow with minimal interruptions.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 30, "title": "Creative Warmup", "type": "personal", "color": "#10b981", "is_flexible": false},
    {"start_time": "08:30", "duration_minutes": 180, "title": "Creation Block 1", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "11:30", "duration_minutes": 30, "title": "Quick Break", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "12:00", "duration_minutes": 60, "title": "Lunch", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "13:00", "duration_minutes": 180, "title": "Creation Block 2", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "16:00", "duration_minutes": 30, "title": "Review & Refine", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "16:30", "duration_minutes": 30, "title": "Planning Tomorrow", "type": "personal", "color": "#10b981", "is_flexible": false}
  ]'::jsonb
);

-- Template 7: Balanced Day
INSERT INTO day_templates (name, description, is_system, template_blocks)
VALUES (
  'Balanced Day',
  'Well-rounded schedule mixing work, meetings, breaks, and personal time. Great default template for most days.',
  true,
  '[
    {"start_time": "08:00", "duration_minutes": 30, "title": "Morning Routine", "type": "personal", "color": "#10b981", "is_flexible": false},
    {"start_time": "08:30", "duration_minutes": 120, "title": "Focused Work", "type": "work", "color": "#3b82f6", "is_flexible": false},
    {"start_time": "10:30", "duration_minutes": 30, "title": "Meeting", "type": "meeting", "color": "#8b5cf6", "is_flexible": false},
    {"start_time": "11:00", "duration_minutes": 60, "title": "Project Work", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "12:00", "duration_minutes": 60, "title": "Lunch Break", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "13:00", "duration_minutes": 30, "title": "Emails & Admin", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "13:30", "duration_minutes": 90, "title": "Collaborative Work", "type": "work", "color": "#3b82f6", "is_flexible": true},
    {"start_time": "15:00", "duration_minutes": 15, "title": "Coffee Break", "type": "break", "color": "#f59e0b", "is_flexible": false},
    {"start_time": "15:15", "duration_minutes": 60, "title": "Wrap Up Tasks", "type": "work", "color": "#06b6d4", "is_flexible": true},
    {"start_time": "16:15", "duration_minutes": 30, "title": "End-of-Day Review", "type": "personal", "color": "#10b981", "is_flexible": false}
  ]'::jsonb
);

COMMENT ON TABLE day_templates IS 'System templates created. Users can now browse and apply these templates to their timeline.';
