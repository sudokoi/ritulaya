CREATE TABLE `sync_tombstones` (
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`deleted_at` text NOT NULL,
	PRIMARY KEY(`entity`, `entity_id`)
);
