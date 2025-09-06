import { Bot, webhookCallback } from 'grammy';
import { GoogleGenerativeAI } from '@google/generative-ai';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Инициализируем бота
const bot = new Bot(BOT_TOKEN);

// Инициализируем Gemini API
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

export async function POST(req) {
  try {
    await webhookHandler(req);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Ошибка вебхука:', error);
    return new Response(null, { status: 500 });
  }
}
