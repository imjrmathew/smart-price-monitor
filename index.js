/**
 * @file index.js
 * @description Main entry point for the Telegram Price Tracker Bot.
 * @module index
 * @author Don Mathew
 */

import { initializeDatabase } from "./@database/sqlite.js";
import {
  clearCommand,
  createBot,
  addCommand,
  startCommand,
  listCommand,
  removeCommand,
  helpCommand,
  addCommandWithUserState,
  removeCommandWithUserState,
  listenToMessages,
} from "./@commands/commands.js";
import { schedulePriceChecks } from "./@cron/schedule.js";

// Initialize bot and database
const bot = createBot();
initializeDatabase();

// Schedule periodic price checks
await schedulePriceChecks();

// Command handlers
bot.onText(/\/start/, async (msg) => await startCommand(msg.chat.id));

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Acknowledge Telegram that we received the callback
  await bot.answerCallbackQuery(query.id);

  // Handle different callback data
  switch (data) {
    case "add":
      await addCommandWithUserState(chatId);
      break;
    case "list":
      await listCommand(chatId);
      break;
    case "remove":
      await removeCommandWithUserState(chatId);
      break;
    case "clear":
      await clearCommand(chatId);
      break;
    case "help":
      await helpCommand(chatId);
      break;
    default:
      await bot.sendMessage(
        chatId,
        "❌ Unknown command. Please input a valid command."
      );
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  await listenToMessages(chatId, msg);
});

bot.onText(/\/add/, async (msg) => {
  const chatId = msg.chat.id;
  await addCommandWithUserState(chatId);
});

bot.onText(/\/remove/, async (msg) => {
  const chatId = msg.chat.id;
  await removeCommandWithUserState(chatId);
});

bot.onText(/\/add (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];
  const site = match[2];
  await addCommand(chatId, url, site);
});

bot.onText(/\/list/, async (msg) => await listCommand(msg.chat.id));

bot.onText(/\/remove (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const id = match[1];
  await removeCommand(chatId, id);
});

bot.onText(/\/clear/, async (msg) => await clearCommand(msg.chat.id));

bot.onText(/\/help/, async (msg) => await helpCommand(msg.chat.id));
