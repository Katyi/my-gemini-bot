export const dynamic = 'force-dynamic';

export const fetchCache = 'force-no-store';

import { Bot, webhookCallback } from 'grammy';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN environment variable not found.');
    return new Response(null, { status: 500 });
  }

  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY environment variable not found.');
    return new Response(null, { status: 500 });
  }

  // Инициализация бота и Gemini API внутри функции POST
  const bot = new Bot(token);
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Обработчик сообщений
  bot.on('message:text', async (ctx) => {
    const prompt = ctx.message.text;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      await ctx.reply(text);
    } catch (error) {
      console.error('Ошибка при вызове Gemini:', error);
      await ctx.reply('Произошла ошибка при обработке вашего запроса.');
    }
  });

  // Установка вебхука для Next.js App Router
  const webhookHandler = webhookCallback(bot, 'next-app');

  try {
    await webhookHandler(req);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Ошибка вебхука:', error);
    return new Response(null, { status: 500 });
  }
}
