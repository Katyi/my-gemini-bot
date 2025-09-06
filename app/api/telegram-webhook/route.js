// app/api/telegram-webhook/route.js
import { Bot, webhookCallback } from 'grammy';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!BOT_TOKEN || !GEMINI_API_KEY) {
    console.error('Отсутствуют переменные окружения.');
    return new Response(null, { status: 500 });
  }

  // Инициализируем бота и Gemini API при каждом вызове
  const bot = new Bot(BOT_TOKEN);
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Обрабатываем все текстовые сообщения от пользователя
  bot.on('message:text', async (ctx) => {
    const prompt = ctx.message.text;

    if (!prompt) {
      await ctx.reply('Пожалуйста, введите запрос.');
      return;
    }

    try {
      const result = await model.generateContent(prompt);
      const apiResponse = result.response;
      const text = apiResponse.text();

      await ctx.reply(text);
    } catch (error) {
      console.error('Ошибка API Gemini:', error);
      await ctx.reply('Произошла ошибка. Попробуйте еще раз.');
    }
  });

  const webhookHandler = webhookCallback(bot, 'express');

  try {
    await webhookHandler(req);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Ошибка вебхука:', error);
    return new Response(null, { status: 500 });
  }
}
