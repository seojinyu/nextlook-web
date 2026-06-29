-- Add processed_image_path column to clothes table
-- Stores the path to background-removed PNG image (web uploads only)
alter table clothes add column if not exists processed_image_path text;
