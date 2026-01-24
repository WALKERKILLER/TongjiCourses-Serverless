-- pk schema patch: make course nature stable across semesters (calendarId scoped)

CREATE TABLE IF NOT EXISTS coursenature_by_calendar (
  calendarId INTEGER NOT NULL,
  courseLabelId INTEGER NOT NULL,
  courseLabelName TEXT,
  PRIMARY KEY (calendarId, courseLabelId)
);

CREATE INDEX IF NOT EXISTS idx_coursenature_by_calendar_calendar ON coursenature_by_calendar(calendarId);
CREATE INDEX IF NOT EXISTS idx_coursenature_by_calendar_label ON coursenature_by_calendar(courseLabelId);

