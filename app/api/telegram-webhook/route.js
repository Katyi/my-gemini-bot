export const dynamic = 'force-dynamic';

export const fetchCache = 'force-no-store';

import { Bot, webhookCallback } from 'grammy';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Импортируем Gemini API

// Инициализация переменных окружения
const token = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!token)
  throw new Error('TELEGRAM_BOT_TOKEN environment variable not found.');

if (!geminiApiKey)
  throw new Error('GEMINI_API_KEY environment variable not found.');

// Инициализация бота и Gemini
const bot = new Bot(token);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' }); // Выбираем модель

// Обработчик сообщений
bot.on('message:text', async (ctx) => {
  const prompt = ctx.message.text;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    await ctx.reply(text); // Отправляем ответ от Gemini
  } catch (error) {
    console.error('Ошибка при вызове Gemini:', error);
    await ctx.reply('Произошла ошибка при обработке вашего запроса.');
  }
});

// Установка вебхука для Vercel Functions
export const POST = webhookCallback(bot, 'std/http');
