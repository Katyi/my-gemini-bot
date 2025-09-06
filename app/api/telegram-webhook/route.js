export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { Bot, webhookCallback } from 'grammy';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';

const token = process.env.TELEGRAM_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;
const replicateApiKey = process.env.REPLICATE_API_KEY;

if (!token)
  throw new Error('TELEGRAM_BOT_TOKEN environment variable not found.');

if (!geminiApiKey)
  throw new Error('GEMINI_API_KEY environment variable not found.');

if (!replicateApiKey)
  throw new Error('REPLICATE_API_KEY environment variable not found.');

const bot = new Bot(token);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
const replicate = new Replicate({ auth: replicateApiKey });

// Обработчик для генерации изображений с помощью Stable Diffusion
bot.command('stable', async (ctx) => {
  const prompt = ctx.match;
  if (!prompt) {
    return ctx.reply(
      'Пожалуйста, введите описание для изображения после команды /stable.'
    );
  }

  try {
    await ctx.reply(
      'Генерирую изображение. Это может занять несколько секунд...'
    );

    // Запрос к Stable Diffusion через Replicate
    const image = await replicate.run(
      // 'stability-ai/stable-diffusion:ac732df8398180b474fe8c581c6af2637a5ab6b57d2de6cd02216b22b10298a1',
      // 'ideogram-ai/ideogram-v3-turbo',
      'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
      {
        input: {
          prompt: prompt,
        },
      }
    );

    if (image && image[0]) {
      await ctx.replyWithPhoto(image[0]);
    } else {
      await ctx.reply(
        'Не удалось сгенерировать изображение. Попробуйте еще раз.'
      );
    }
  } catch (error) {
    console.error('Ошибка при генерации изображения:', error);
    await ctx.reply(
      'Произошла ошибка при генерации изображения. Убедитесь, что ваш запрос не нарушает правила безопасности.'
    );
  }
});

// Этот обработчик будет работать, если в сообщении есть фотография
bot.on('message:photo', async (ctx) => {
  try {
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const file = await ctx.api.getFile(fileId);
    const fileLink = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const mimeType = file.mime_type || 'image/jpeg';
    const caption = ctx.message.caption || 'Что на этом фото?';

    const fetchedResponse = await fetch(fileLink);
    const data = await fetchedResponse.arrayBuffer();
    const base64Photo = Buffer.from(data).toString('base64');

    const photoPrompt = [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Photo,
        },
      },
      {
        text: caption,
      },
    ];

    const result = await model.generateContent(photoPrompt);
    const text = result.response.text();
    await ctx.reply(text);
  } catch (error) {
    console.error('Ошибка при обработке изображения:', error);
    await ctx.reply('Произошла ошибка при обработке изображения.');
  }
});

// Этот обработчик для аудио (файлы .mp3, .wav и т.д.)
bot.on('message:audio', async (ctx) => {
  try {
    const fileId = ctx.message.audio.file_id;
    const file = await ctx.api.getFile(fileId);
    const fileLink = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    const fetchedResponse = await fetch(fileLink);
    const data = await fetchedResponse.arrayBuffer();
    const base64Audio = Buffer.from(data).toString('base64');

    const audioPrompt = [
      {
        inlineData: {
          mimeType: 'audio/mpeg',
          data: base64Audio,
        },
      },
      {
        text: 'Транскрибируй аудио, которое тебе прислали. Отвечай только текстом из аудио.',
      },
    ];

    // Шаг 1: Получаем расшифровку от Gemini
    const result = await model.generateContent(audioPrompt);
    const text = result.response.text();

    // Шаг 2: Отправляем расшифровку в основной текстовый обработчик
    // Это как если бы пользователь сам написал этот текст
    await handleText(ctx, text);
  } catch (error) {
    console.error('Ошибка при обработке аудио файла:', error);
    await ctx.reply(
      'Произошла ошибка при обработке аудио файла. Возможно, файл слишком большой.'
    );
  }
});

// Этот обработчик для голосовых сообщений (voice)
bot.on('message:voice', async (ctx) => {
  try {
    const fileId = ctx.message.voice.file_id;
    const file = await ctx.api.getFile(fileId);
    const fileLink = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    const fetchedResponse = await fetch(fileLink);
    const data = await fetchedResponse.arrayBuffer();
    const base64Audio = Buffer.from(data).toString('base64');

    const audioPrompt = [
      {
        inlineData: {
          mimeType: 'audio/ogg',
          data: base64Audio,
        },
      },
      {
        text: 'Транскрибируй аудио, которое тебе прислали. Отвечай только текстом из аудио.',
      },
    ];

    // Шаг 1: Получаем расшифровку от Gemini
    const result = await model.generateContent(audioPrompt);
    const text = result.response.text();

    // Шаг 2: Отправляем расшифровку в основной текстовый обработчик
    // Это как если бы пользователь сам написал этот текст
    await handleText(ctx, text);
  } catch (error) {
    console.error('Ошибка при обработке голосового сообщения:', error);
    await ctx.reply(
      'Произошла ошибка при обработке голосового сообщения. Возможно, файл слишком большой.'
    );
  }
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
