export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { Bot, webhookCallback } from 'grammy';
import { GoogleGenerativeAI } from '@google/generative-ai';
// import axios from 'axios';
// import { fileUrl } from '@grammyjs/files'; // Импортируем fileUrl

const token = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!token)
  throw new Error('TELEGRAM_BOT_TOKEN environment variable not found.');

if (!geminiApiKey)
  throw new Error('GEMINI_API_KEY environment variable not found.');

const bot = new Bot(token);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Этот обработчик будет работать, если в сообщении есть фотография
bot.on('message:photo', async (ctx) => {
  try {
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const file = await ctx.api.getFile(fileId);
    const fileLink = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    await ctx.reply(`Спасибо за изображение! Вот его URL: ${fileLink}`);
  } catch (error) {
    console.error('Ошибка при обработке изображения:', error);
    await ctx.reply('Произошла ошибка при обработке изображения.');
  }
});

// Этот обработчик будет работать, если в сообщении есть аудио
// bot.on('message:audio', async (ctx) => {
//   try {
//     const fileId = ctx.message.audio.file_id;
//     const file = await ctx.api.getFile(fileId);
//     const fileLink = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

//     await ctx.reply(`Спасибо за аудио! Вот его URL: ${fileLink}`);
//   } catch (error) {
//     console.error('Ошибка при обработке аудио:', error);
//     await ctx.reply('Произошла ошибка при обработке аудио.');
//   }
// });

// Этот обработчик для аудио (файлы .mp3, .wav и т.д.)
// bot.on('message:audio', async (ctx) => {
//   try {
//     const fileId = ctx.message.audio.file_id;
//     const file = await ctx.api.getFile(fileId);
//     const fileLink = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

//     // Отправляем аудио по URL
//     await ctx.replyWithAudio(fileLink, { caption: 'Вот ваш аудиофайл.' });
//   } catch (error) {
//     console.error('Ошибка при обработке аудио:', error);
//     await ctx.reply('Произошла ошибка при обработке аудио.');
//   }
// });

// Этот обработчик для голосовых сообщений (voice)
// bot.on('message:voice', async (ctx) => {
//   try {
//     const fileId = ctx.message.voice.file_id;
//     const file = await ctx.api.getFile(fileId);
//     const fileLink = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

//     const fetchedResponse = await fetch(fileLink);
//     const data = await fetchedResponse.arrayBuffer();
//     const base64Audio = Buffer.from(data).toString('base64');

//     const audioPrompt = [
//       {
//         inlineData: {
//           mimeType: 'audio/ogg',
//           data: base64Audio,
//         },
//       },
//       {
//         text: 'Транскрибируй аудио, которое тебе прислали. Отвечай только текстом из аудио.',
//       },
//     ];

//     // Шаг 1: Получаем расшифровку от Gemini
//     const result = await model.generateContent(audioPrompt);
//     const text = result.response.text();

//     // Шаг 2: Отправляем расшифровку в основной текстовый обработчик
//     // Это как если бы пользователь сам написал этот текст
//     await handleText(ctx, text);
//   } catch (error) {
//     console.error('Ошибка при обработке голосового сообщения:', error);
//     await ctx.reply(
//       'Произошла ошибка при обработке голосового сообщения. Возможно, файл слишком большой.'
//     );
//   }
// });

// Единая функция для обработки аудио
async function handleAudio(ctx, file) {
  try {
    const fileLink = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
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
  await handleAudio(ctx, ctx.message.audio);
});

// Обработчик для голосовых сообщений (voice)
bot.on('message:voice', async (ctx) => {
  await handleAudio(ctx, ctx.message.voice);
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
