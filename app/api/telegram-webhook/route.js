export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { Bot, webhookCallback } from 'grammy';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
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

// bot.on('message:voice', async (ctx) => {
//   try {
//     const fileId = ctx.message.voice.file_id;
//     const file = await ctx.api.getFile(fileId);
//     const fileLink = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

//     await ctx.reply(`Спасибо за голосовое сообщение! Вот его URL: ${fileLink}`);
//   } catch (error) {
//     console.error('Ошибка при обработке голосового сообщения:', error);
//     await ctx.reply('Произошла ошибка при обработке голосового сообщения.');
//   }
// });

// Этот обработчик остается для текстовых сообщений

// Этот обработчик для аудио (файлы .mp3, .wav и т.д.)
bot.on('message:audio', async (ctx) => {
  try {
    const fileId = ctx.message.audio.file_id;
    const file = await ctx.api.getFile(fileId);
    const fileLink = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    // Скачиваем файл в буфер
    const audioBuffer = (
      await axios.get(fileLink, { responseType: 'arraybuffer' })
    ).data;

    // Отправляем аудиофайл
    await ctx.replyWithAudio(new Uint8Array(audioBuffer), {
      caption: 'Вот ваш аудиофайл.',
    });
  } catch (error) {
    console.error('Ошибка при обработке аудио:', error);
    await ctx.reply('Произошла ошибка при обработке аудио.');
  }
});

// Этот обработчик для голосовых сообщений (voice)
bot.on('message:voice', async (ctx) => {
  try {
    const fileId = ctx.message.voice.file_id;
    const file = await ctx.api.getFile(fileId);
    const fileLink = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    // Скачиваем файл в буфер
    const voiceBuffer = (
      await axios.get(fileLink, { responseType: 'arraybuffer' })
    ).data;

    // Отправляем голосовое сообщение
    await ctx.replyWithVoice(new Uint8Array(voiceBuffer), {
      caption: 'Вот ваше голосовое сообщение.',
    });
  } catch (error) {
    console.error('Ошибка при обработке голосового сообщения:', error);
    await ctx.reply('Произошла ошибка при обработке голосового сообщения.');
  }
});

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

export const POST = webhookCallback(bot, 'std/http');
