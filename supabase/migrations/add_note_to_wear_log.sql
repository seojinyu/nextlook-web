-- Add note column to wear_log
alter table wear_log add column if not exists note text;
