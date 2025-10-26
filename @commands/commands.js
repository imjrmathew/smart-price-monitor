/**
 * @file commands.js
 * @description Telegram bot command handlers for the Price Tracker Bot.
 * @module @commands/commands
 * @author Don Mathew
 */

import TelegramBot from "node-telegram-bot-api";
import {
  addToWatchlist,
  fetchPrice,
  getWatchlist,
  clearAll,
  removeFromWatchlist,
} from "../@helpers/helpers.js";
import dotenv from "dotenv";
dotenv.config();

const TGM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PARSE_MODE = "HTML";
let botInstance = null;

// User state management
const userStates = {};

/**
 * Creates and initializes the Telegram bot.
 * @returns {TelegramBot} Initialized Telegram bot instance
 */
export function createBot() {
  if (botInstance) return botInstance; // Prevent reinitialization

  if (!TGM_TOKEN) {
    throw new Error("Telegram bot token is missing in environment variables.");
  }

  const bot = new TelegramBot(TGM_TOKEN, { polling: true });
  console.log("✅ Telegram bot initialized successfully.");
  botInstance = bot;
  return botInstance;
}

/**
 * Returns the already initialized Telegram bot instance.
 * @returns {TelegramBot} Initialized Telegram bot instance
 */
export function getBot() {
  if (!botInstance) {
    throw new Error("Telegram bot not initialized!");
  }
  return botInstance;
}

/**
 * Handles the /start command.
 * @param {number} chatId - Telegram chat ID
 */
export async function startCommand(chatId) {
  await botInstance.sendMessage(
    chatId,
    "👋 Hi! Welcome to <b>Smart Price Monitor</b>! Use following options to start tracking prices:",
    {
      parse_mode: PARSE_MODE,
      reply_markup: {
        inline_keyboard: [
          [{ text: "Add Product", callback_data: "add" }],
          [{ text: "List Watchlist", callback_data: "list" }],
          [{ text: "Remove Product", callback_data: "remove" }],
          [{ text: "Clear All", callback_data: "clear" }],
          [{ text: "Help", callback_data: "help" }],
        ],
      },
    }
  );
}

/**
 * Handles the /add <url> <site> command.
 * @param {number} chatId - Telegram chat ID
 * @param {string} url - Product URL
 * @param {string} site - E-commerce site identifier
 */
export async function addCommand(chatId, url, site) {
  await botInstance.sendMessage(
    chatId,
    "Fetching price and adding to your watchlist... Please wait."
  );

  const { price, currencyText } = await fetchPrice(url, site);
  const chat_id = await addToWatchlist(chatId, url, site, price, currencyText);
  await botInstance.sendMessage(
    chat_id,
    `✅ Product added to your watchlist!\n<b>Current price is ${currencyText}${price}</b>.`,
    { parse_mode: PARSE_MODE }
  );
}

/**
 * Handles the /add command with user state.
 * @param {string} chatId
 */
export async function addCommandWithUserState(chatId) {
  userStates[chatId] = { step: "awaiting_site_url" };
  await botInstance.sendMessage(
    chatId,
    `Please send the product info in this format:\n<b>url - site</b>
        \n\nExample: https://amazon.in/product-123 - amazon`,
    { parse_mode: PARSE_MODE }
  );
}

/**
 * Handles the /list command.
 * @param {string} chatId
 * @returns {Promise<void>} list of products in the watchlist
 */
export async function listCommand(chatId) {
  await botInstance.sendMessage(
    chatId,
    "Here are your current products in your watchlist:"
  );

  const watches = await getWatchlist(chatId);
  if (watches.length === 0) {
    await botInstance.sendMessage(
      chatId,
      "Your watchlist is empty. Use /add to add products."
    );
    return;
  }

  watches.forEach((watch) => {
    botInstance.sendMessage(
      chatId,
      `<b>ID: ${watch.id}</b>\nURL: ${watch.url}\nSite: ${watch.site}\n<b>Last Price: ${watch.currency}${watch.last_price}</b>`,
      { parse_mode: PARSE_MODE }
    );
  });
}

/**
 * Handles the /remove command.
 * @param {string} chatId
 * @param {string} id
 */
export async function removeCommand(chatId, id) {
  await botInstance.sendMessage(
    chatId,
    `Removing product with <b>ID: ${id}</b> from your watchlist...`,
    { parse_mode: PARSE_MODE }
  );

  const changes = await removeFromWatchlist(chatId, id);
  if (changes > 0) {
    await botInstance.sendMessage(
      chatId,
      `✅ Product with <b>ID: ${id}</b> has been removed from your watchlist.`,
      { parse_mode: PARSE_MODE }
    );
  } else {
    await botInstance.sendMessage(
      chatId,
      `❌ No product found with <b>ID: ${id}</b> in your watchlist.`,
      { parse_mode: PARSE_MODE }
    );
  }
}

/**
 * Handles the /remove command with user state.
 * @param {string} chatId
 */
export async function removeCommandWithUserState(chatId) {
  await botInstance.sendMessage(
    chatId,
    "Send the <b>ID</b> of the product you want to remove from the watchlist:",
    { parse_mode: PARSE_MODE }
  );
  userStates[chatId] = { step: "awaiting_remove" };
}

/**
 * Handles the /clear command.
 * @param {string} chatId
 */
export async function clearCommand(chatId) {
  await botInstance.sendMessage(
    chatId,
    "Clearing all products from your watchlist..."
  );

  const changes = await clearAll(chatId);
  await botInstance.sendMessage(
    chatId,
    `✅ All products have been removed from your watchlist.\n<b>Total removed: ${changes}</b>.`,
    { parse_mode: PARSE_MODE }
  );
}

/**
 * Handles the /help command.
 * @param {string} chatId
 */
export async function helpCommand(chatId) {
  const helpMessage = `Available Commands: 
  \n<b>/start</b> - Start the bot and see options\n<b>/add &lt;URL&gt; &lt;SITE&gt;</b> - Add a product to your watchlist\n<b>/list</b> - List all products in your watchlist\n<b>/remove</b> &lt;ID&gt; - Remove a product from your watchlist by ID\n<b>/clear</b> - Clear all products from your watchlist\n<b>/help</b> - Show this help message.
    `;
  await botInstance.sendMessage(chatId, helpMessage, {
    parse_mode: PARSE_MODE,
  });
}

/**
 * Listens to incoming messages and handles user states.
 */
export async function listenToMessages(chatId, msg) {
  const state = userStates[chatId];

  if (!state) return;

  switch (state.step) {
    case "awaiting_site_url": {
      await handleUserStateForAddCommand(chatId, msg);
      break;
    }
    case "awaiting_remove":
      await handleUserStateForRemoveCommand(chatId, msg, state);
      break;
    default:
      throw new Error("Unknown user state step.");
  }

  delete userStates[chatId];
}

/**
 * Handles user state message for /add command.
 * @param {string} chatId
 * @param {string} msg
 * @returns {Promise<void>}
 */
async function handleUserStateForAddCommand(chatId, msg) {
  const text = msg.text.trim();
  const parts = text.split("-");

  if (parts.length < 2) {
    return await botInstance.sendMessage(
      chatId,
      "❌ Invalid message format. Use <b>url - site</b>.",
      { parse_mode: PARSE_MODE }
    );
  }

  const site = parts[0].trim();
  const url = parts[1].trim();

  await addCommand(chatId, site, url);
}

/**
 * Handles user state message for /remove command.
 * @param {string} chatId
 * @param {string} msg
 */
async function handleUserStateForRemoveCommand(chatId, msg) {
  const id = msg.text.trim();
  await removeCommand(chatId, id);
}
