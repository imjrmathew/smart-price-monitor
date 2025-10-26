/**
 * @file helpers.js
 * @description Helper functions for price tracking and database operations.
 * @module @helpers/helpers
 * @author Don Mathew
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { getInstance } from "../@database/sqlite.js";
import { classSelectors } from "../constants.js";

/**
 * Fetches the price from the given URL based on the site.
 * @param {string} url
 * @param {string} site
 * @returns {Promise<{price: number, currencyText: string}>} The fetched price and currency text.
 */
export async function fetchPrice(url, site) {
  const headers = { "User-Agent": "Mozilla/5.0 PriceWatcherBot" };
  const response = await axios.get(url, { headers });
  const $ = cheerio.load(response.data);

  const selector = classSelectors[site];
  return pipeline(site, selector, $);
}

/**
 *  Adds a new item to the watchlist.
 * @param {string} chatId
 * @param {string} url
 * @param {string} site
 * @param {number} price
 * @param {string} currency
 * @returns {Promise<string>} The chat ID of the added product to the watchlist.
 */
export async function addToWatchlist(chatId, url, site, price, currency) {
  const db = getInstance();

  try {
    const insert =
      db.prepare(`INSERT INTO price_tracker(chat_id, url, site, last_price, currency) 
        VALUES (?, ?, ?, ?, ?)
        RETURNING chat_id`);
    const { chat_id } = insert.get(chatId, url, site, price, currency);
    console.debug("Item added successfully for chat ID:", chat_id);
    return chat_id;
  } catch (err) {
    console.error("Something went wrong:", err);
    throw new Error("Database insertion failed");
  }
}

/**
 * Updates an existing item in the watchlist.
 * @param {*} record
 * @returns {Promise<string>} The chat ID of the updated product in the watchlist.
 */
export async function updateWatchlist(record) {
  const db = getInstance();

  try {
    const update =
      db.prepare(`UPDATE price_tracker SET last_price = ?, currency = ? WHERE id = ?
        RETURNING chat_id`);
    const { chat_id } = update.get(
      record.lastPrice,
      record.currency,
      record.id
    );
    console.debug("Item updated successfully for chat ID:", chat_id);
    return chat_id;
  } catch (err) {
    console.error("Something went wrong:", err);
    throw new Error("Database update failed");
  }
}

/**
 * Lists all items from the watchlist for a given chat ID.
 * @param {string} chatId
 * @returns {Promise<Array>} An array of records for the specified chat ID from the watchlist.
 */
export async function getWatchlist(chatId) {
  const db = getInstance();
  try {
    const select = db.prepare(`SELECT * FROM price_tracker WHERE chat_id = ?`);
    const rows = select.all(chatId);
    console.debug(`Found ${rows.length} watches for chat ID:`, chatId);
    return rows;
  } catch (err) {
    console.error("Something went wrong:", err);
    throw new Error("Database query failed");
  }
}

/**
 * Lists all items from the watchlist.
 * @param {string} chatId
 * @returns {Promise<Array>} An array of records from the watchlist.
 */
export async function getAllWatchlist() {
  const db = getInstance();
  try {
    const select = db.prepare(`SELECT * FROM price_tracker`);
    const rows = select.all();
    console.debug(`Found ${rows.length} items in the watchelist.`);
    return rows;
  } catch (err) {
    console.error("Something went wrong:", err);
    throw new Error("Database query failed");
  }
}

/**
 * Removes an item from the watchlist.
 * @param {string} chatId
 * @param {number} id
 * @returns {Promise<number>} The number of deleted records.
 */
export function removeFromWatchlist(chatId, id) {
  const db = getInstance();
  try {
    const del = db.prepare(
      `DELETE FROM price_tracker WHERE chat_id = ? AND id = ?`
    );
    const result = del.run(chatId, id);
    console.debug(
      `Deleted ${result.changes} items for chat ID from the watchlist:`,
      chatId
    );
    return result.changes;
  } catch (err) {
    console.error("Something went wrong:", err);
    throw new Error("Database deletion failed");
  }
}

/**
 * Clears all items from watchlist for a given chat ID.
 * @param {string} chatId
 * @returns {Promise<number>} The number of deleted records.
 */
export function clearAll(chatId) {
  const db = getInstance();
  try {
    const del = db.prepare(`DELETE FROM price_tracker WHERE chat_id = ?`);
    const result = del.run(chatId);
    console.debug(
      `Deleted ${result.changes} items for chat ID from the watchlist:`,
      chatId
    );
    return result.changes;
  } catch (err) {
    console.error("Something went wrong:", err);
    throw new Error("Database deletion failed");
  }
}

/**
 * Processes the price extraction pipeline based on the site.
 * @param {string} site
 * @param {string} selector
 * @param {*} $
 * @returns {Promise<{price: number, currencyText: string}>} The extracted price and currency text.
 */
function pipeline(site, selector, $) {
  switch (site) {
    case "amazon":
      return getAmazonPrice(selector, $);
    default:
      throw new Error("Unsupported site");
  }
}

/**
 * Extracts the price from an Amazon product page.
 * @param {string} selector
 * @param {*} $
 * @returns {Promise<{price: number, currencyText: string}>} The extracted price and currency text.
 */
function getAmazonPrice(selector, $) {
  let price = 0.0;
  let currencyText = "₹";

  const priceText = $(`.${selector.price}`).first().text().replace(/[,.]/g, "");
  currencyText = $(`.${selector.currency}`).first().text();

  if (priceText) {
    price = parseFloat(priceText);
  }

  return { price, currencyText };
}
