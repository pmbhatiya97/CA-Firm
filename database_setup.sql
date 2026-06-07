-- ============================================================
-- Specentra AMS — MySQL Database Setup
-- Run this ONCE before starting the application
-- ============================================================

CREATE DATABASE IF NOT EXISTS specentra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'specentra'@'localhost' IDENTIFIED BY 'Specentra@2024';
GRANT ALL PRIVILEGES ON specentra.* TO 'specentra'@'localhost';
FLUSH PRIVILEGES;

USE specentra;

-- Tables are auto-created by SQLAlchemy on first run.
-- This script only creates the database and user.

SELECT 'Database specentra created successfully.' AS status;
