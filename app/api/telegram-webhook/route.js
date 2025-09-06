export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { Bot, webhookCallback } from 'grammy';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileUrl } from '@grammyjs/files';

const token = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!token)
  throw new Error('TELEGRAM_BOT_TOKEN environment variable not found.');

if (!geminiApiKey)
  throw new Error('GEMINI_API_KEY environment variable not found.');

const bot = new Bot(token);
const genAI = new GoogleGenerativeAI(geminiApiKey);

const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

// Единая функция для обработки аудио
async function handleAudio(ctx, file) {
  try {
    const fileLink = fileUrl(token, file.file_path); // Используем fileUrl для создания ссылки
    const mimeType = file.mime_type || 'audio/mpeg';

    const fetchedResponse = await fetch(fileLink);
    const data = await fetchedResponse.arrayBuffer();
    const base64Audio = Buffer.from(data).toString('base64');

    const audioPrompt = [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Audio,
        },
      },
      {
        text: 'Транскрибируй аудио, которое тебе прислали. Отвечай только текстом из аудио.',
      },
    ];

    const result = await model.generateContent(audioPrompt);
    const text = result.response.text();
    await handleText(ctx, text);
  } catch (error) {
    console.error('Ошибка при обработке аудио:', error);
    await ctx.reply(
      'Произошла ошибка при обработке аудио. Возможно, файл слишком большой.'
    );
  }
}

// Обработчик для MP3-файлов и других аудиоформатов
bot.on('message:audio', async (ctx) => {
  const file = await ctx.api.getFile(ctx.message.audio.file_id);
  await handleAudio(ctx, file);
});

// Обработчик для голосовых сообщений (voice)
bot.on('message:voice', async (ctx) => {
  const file = await ctx.api.getFile(ctx.message.voice.file_id);
  await handleAudio(ctx, file);
});

// Выносим логику обработки текста в отдельную функцию
async function handleText(ctx, prompt) {
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    await ctx.reply(text);
  } catch (error) {
    console.error('Ошибка при вызове Gemini:', error);
    await ctx.reply('Произошла ошибка при обработке вашего запроса.');
  }
}

// Обработчик для текстовых сообщений
bot.on('message:text', async (ctx) => {
  await handleText(ctx, ctx.message.text);
});

export const POST = webhookCallback(bot, 'std/http');
