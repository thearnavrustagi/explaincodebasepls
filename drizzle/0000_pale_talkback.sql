CREATE TABLE `job_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`section` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_sections_job_section_uq` ON `job_sections` (`job_id`,`section`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`repo_url` text NOT NULL,
	`owner` text NOT NULL,
	`repo` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
