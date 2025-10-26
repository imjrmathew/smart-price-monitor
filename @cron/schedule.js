/**
 * @file schedule.js
 * @description Cron job scheduler for periodic price checks.
 * @module @cron/schedule
 * @author Don Mathew
 */

import cron from "node-cron";
import {
  getAllWatchlist,
  fetchPrice,
  updateWatchlist,
} from "../@helpers/helpers.js";
import { getBot } from "../@commands/commands.js";

const CHECK_INTERVAL = "0 6,22 * * *";

/**
 * Schedule periodic price checks
 */
export async function schedulePriceChecks() {
  cron.schedule(CHECK_INTERVAL, async () => {
    console.debug("Scheduling price check cron job...");
    const watchlist = await getAllWatchlist();

    if (watchlist.length === 0) {
      console.debug("No items in watchlist to check.");
      return;
    }

    watchlist.forEach(async (item) => {
      await taskFunction(item);
    });
  });
}

async function taskFunction(item) {
  try {
    console.debug("Checking price for URL:", item.url);

    const { price, currencyText } = await fetchPrice(item.url, item.site);

    if (!price || price === item.last_price) {
      console.debug("No price change for ID:", item.id);
      return;
    }

    const chatId = await updateWatchlist({
      id: item.id,
      lastPrice: price,
      currency: currencyText,
    });
    console.debug(`Updating price for  ID: ${item.id}, chatId: ${chatId}:`);
    await prePriceCheck(item, price, currencyText);
  } catch (e) {
    console.error("Error checking", item.url, e.message);
    throw new Error("Something went wrong. Please try again.");
  }
}

/**
 * Notify users if there any price drop
 * @param {*} item
 * @param {number} price
 * @param {string} currency
 */
async function prePriceCheck(item, price, currency) {
  const bot = getBot();

  console.debug("Pre price check for ID:", item.id);
  if (price < item.last_price) {
    const msg = `🔔 <b>Price Drop!</b>
    \n<b>URL: ${item.url}</b>\n<b>Old: ${item.currency}${item.last_price}</b>\n<b>New: ${currency}${price}</b>`;
    await bot.sendMessage(item.chat_id, msg, { parse_mode: "HTML" });
  }
}
