ALTER TABLE `notes` ADD COLUMN `summary` text;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_notes_updated_at`;--> statement-breakpoint
CREATE INDEX `idx_notes_cursor` ON `notes` (`updated_at` DESC,`id` DESC);
