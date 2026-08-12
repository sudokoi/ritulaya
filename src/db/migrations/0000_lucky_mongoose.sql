CREATE TABLE `cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `day_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`cycle_id` text,
	`flow_intensity` text,
	`symptoms` text DEFAULT '[]',
	`mood` text,
	`notes` text,
	`cervical_mucus` text,
	`bbt` real,
	`sexual_activity` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `cycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `day_logs_date_unique` ON `day_logs` (`date`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`avg_cycle_length` integer DEFAULT 28,
	`avg_period_length` integer DEFAULT 5,
	`luteal_phase_length` integer DEFAULT 14,
	`theme` text DEFAULT 'system',
	`language` text DEFAULT 'en',
	`biometric_lock` integer DEFAULT 0,
	`discreet_mode` integer DEFAULT 0,
	`reminder_period_ahead` integer DEFAULT 2,
	`reminder_daily_log` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
