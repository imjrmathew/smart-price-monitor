/**
 * @file sqlite.js
 * @description SQLite database module for the Telegram Price Tracker Bot.
 * Handles database initialization and provides access to the database instance.
 * @module @database/sqlite
 * @author Don Mathew
 */

import { DatabaseSync } from "node:sqlite";

let dbInstance = null;
const DB_PATH = "./price_tracker.db";

/**
 * Initializes the SQLite database and creates required tables.
 */
export function initializeDatabase() {
  if (dbInstance) return dbInstance; // Prevent reinitialization

  const db = new DatabaseSync(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS price_tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      site TEXT NOT NULL,
      last_price NUMERIC NOT NULL,
      currency TEXT
    );
  `);

  dbInstance = db;
  console.log("✅ SQLite database initialized successfully.");
  return dbInstance;
}

/**
 * Returns the already initialized database instance.
 */
export function getInstance() {
  if (!dbInstance) {
    throw new Error("Database not initialized!");
  }
  return dbInstance;
}
