import {
  Bot,
  Keyboard,
  InlineKeyboard,
  GrammyError,
  HttpError,
  session,
} from "grammy";
import { getRandomQuestion, getCorrectAnswer, questions } from "../utils.mjs";
import { connectToMongoDB, registerNewUser } from "../db.mjs";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const db = await connectToMongoDB();
const collection = db.collection("Sessions");
const admin = 305515622;

bot.command("test", async (ctx) => {});

function getLocalizedText(question, language) {
  return question.text[language] || question.text["en"]; // Возвращает текст на выбранном языке или на английском по умолчанию
}

bot.use(
  session({
    initial: () => ({
      startedUsingBot: new Date(),
      language: "en", // Установка английского языка по умолчанию
    }),
    storage: new MongoDBAdapter({ collection }),
  })
);

bot.command("start", async (ctx) => {
  ctx.session.chat = ctx.chat;

  const userId = ctx.from.id.toString();
  const userName = ctx.from.first_name || "Пользователь";
  const userUsername = ctx.from.username || "";
  ctx.session.language = "uk";

  console.log(
    `Пользователь: ${userId}, Имя: ${userName}, Username: ${userUsername}`
  );

  await registerNewUser(userId, userName, userUsername);

  // Инициализация клавиатуры для ответа пользователю
  const startKeyboard = new Keyboard()
    .text("🌐 HTML")
    .text("🎨 CSS")
    .row()
    .text("💻 JavaScript")
    .text("⚛️ React")
    .row()
    .text("🆘 FAQ")
    .text("🌍 Language")
    .resized();

  // URL изображения для ответа
  const imageUrl =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQO2T03NfMHwiRCOlG9RdASOXDkigs3TTIVfaH5B5Iv698_fwGhTXvWc3jQ9LDuVd2n0FY";

  // Отправляем приветственное сообщение с фото
  await ctx.replyWithPhoto(imageUrl);
  await ctx.reply(
    `👋 Вітаю,  ${userName}! Ласкаво просимо до Frontend Interview Prep Bot 🤖\n\n` +
      `Я тут, щоб допомогти вам якнайефективніше підготуватися до співбесіди з фронтенду. Попереду вас чекають цікаві завдання та корисні матеріали! 🚀\n\n` +
      `Давайте виберемо, з чого почнемо? Ви можете вибрати одну з тем нижче або переглянути вашу статистику. Розпочнемо? 👇`,
    {
      reply_markup: startKeyboard,
    }
  );
});

// Обработчик для кнопки выбора языка
bot.hears("🌍 Language", async (ctx) => {
  const languageKeyboard = new InlineKeyboard()
    .text("🇷🇺 Russian", "ru")
    .text("🇬🇧 English", "en")
    .text("🇺🇦 Ukrainian", "uk")
    .row();

  await ctx.reply("Choose language:", {
    reply_markup: languageKeyboard,
  });
});

// Обработчик для Inline кнопок выбора языка
bot.callbackQuery(["ru", "en", "uk"], async (ctx) => {
  const selectedLanguage = ctx.callbackQuery.data;
  ctx.session.language = selectedLanguage;
  await ctx.answerCallbackQuery(
    `Language changed to ${
      selectedLanguage === "ru"
        ? "🇷🇺 Russian"
        : selectedLanguage === "en"
        ? "🇬🇧 English"
        : "🇺🇦 Ukrainian"
    }.`
  );
});

bot.hears("🆘 FAQ", async (ctx) => {
  const helpKeyboard = new InlineKeyboard().url(
    "🗨️ Написати Антону",
    "https://t.me/AntonSnizhko"
  );

  await ctx.reply(
    "🤖 Вітаю! Якщо у вас є запитання або пропозиції, я тут, щоб допомогти!\n\n" +
      "💡 Потрібна допомога або хочете поділитися ідеями? Просто натисніть на кнопку нижче, щоб написати мені. Ваш відгук допомагає нам ставати кращими!\n\n" +
      "🚀 І якщо у вас є пропозиції щодо покращення курсу, ми будемо раді їх почути. Давайте разом зробимо навчання ще кращим!",
    {
      reply_markup: helpKeyboard,
    }
  );
});

bot.hears(["🌐 HTML", "🎨 CSS", "💻 JavaScript", "⚛️ React"], async (ctx) => {
  const topic = ctx.message.text.replace(/[^a-zA-Z]+/g, "").toLowerCase();
  const userId = ctx.from.id.toString(); // Получаем ID пользователя

  try {
    // Получаем случайный вопрос по теме
    const { question, questionTopic } = await getRandomQuestion(
      topic,
      userId,
      ctx
    );

    if (!question || Object.keys(question).length === 0) {
      // Если вопроса нет, прекращаем выполнение функции
      return;
    }

    const localizedQuestionText = getLocalizedText(
      question,
      ctx.session.language
    ); // Локализуем текст вопроса

    // Создаем клавиатуру с вариантами ответов или кнопкой для показа ответа
    let inlineKeyboard = new InlineKeyboard();

    if (question.hasOptions && Array.isArray(question.options)) {
      question.options.forEach((option) => {
        inlineKeyboard = inlineKeyboard
          .text(
            option.text[ctx.session.language] || option.text["uk"], // Локализуем текст вариантов ответов
            JSON.stringify({
              type: `${questionTopic}-option`,
              isCorrect: option.isCorrect,
              questionId: question.id,
            })
          )
          .row();
      });
    } else {
      // Если вариантов ответа нет, создаем кнопку для показа правильного ответа
      inlineKeyboard = inlineKeyboard.text(
        "🙊 🙉 🙈",
        JSON.stringify({
          type: questionTopic,
          questionId: question.id,
          showImage: question.codeImage ? true : false,
        })
      );
    }

    // Отправляем локализованный вопрос пользователю
    await ctx.reply(localizedQuestionText, { reply_markup: inlineKeyboard, parse_mode: "MarkdownV2" });
  } catch (error) {
    // Обработка ошибок
    await ctx.reply(`Произошла ошибка: ${error.message}`);
  }
});

bot.on("message:photo", async (ctx) => {
  // Отправка уведомления пользователю
  await ctx.reply("📸 Screenshot received! Wait for payment confirmation...");

  // Пересылка фото администратору
  await ctx.forwardMessage(admin);

  // Отправка уведомления администратору с возможностью подтверждения покупки
  await ctx.api.sendMessage(
    admin,
    `🔔 Пользователь ${ctx.chat.first_name} отправил скриншот оплаты. Пожалуйста, проверьте и подтвердите покупку подписки.`,
    {
      reply_markup: new InlineKeyboard().text(
        "Подтвердить продажу подписки",
        JSON.stringify({
          userID: ctx.chat.id,
          command: "purchaseSubscription",
        })
      ),
    }
  );
});

bot.on("callback_query:data", async (ctx) => {
  const callbackData = JSON.parse(ctx.callbackQuery.data);

  // Обработка показа ответа с изображением
  if (callbackData.showImage) {
    const answer = getCorrectAnswer(
      callbackData.type,
      callbackData.questionId,
      ctx.session.language // Добавление языка сессии
    );
    await ctx.reply(answer, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });

    const categoryQuestions = questions[callbackData.type];
    const question = categoryQuestions.find(
      (q) => q.id === callbackData.questionId
    );
    if (question && question.codeImage) {
      await ctx.replyWithPhoto(question.codeImage);
    }
    await ctx.answerCallbackQuery();
    return;
  }

  // Обработка подтверждения покупки подписки
  if (callbackData.command === "purchaseSubscription") {
    const currentDate = new Date();
    const dateIn30Days = new Date(
      currentDate.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    await collection.updateOne(
      {
        key: callbackData.userID.toString(),
      },
      {
        $set: {
          "value.paidUntil": dateIn30Days,
        },
      }
    );
    const formattedDate = dateIn30Days.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    await ctx.api.sendMessage(
      callbackData.userID,
      `🌟 Вітаємо з придбанням курсу! Тепер у Вас є повний доступ до всіх матеріалів для підготовки до співбесіди.\n\n` +
        `Ваша підписка активна до: ${formattedDate}.\n\n` +
        `Ми регулярно оновлюємо та вдосконалюємо матеріали курсу, щоб залишатися актуальними з останніми трендами та інформацією.\n\n` +
        `Якщо у Вас виникнуть запитання або потрібна додаткова допомога, будь ласка, не соромтеся звертатися до нас. Успіхів у навчанні та підготовці до співбесіди! 🚀`
    );
    await ctx.answerCallbackQuery({
      text: "Пользователь успешно оформил подписку!",
      show_alert: true,
    });
    return;
  }

  // Обработка ответов на вопросы

  const topic = callbackData.type.split("-")[0];

  if (!callbackData.type.includes("option")) {
    const answer = getCorrectAnswer(
      callbackData.type,
      callbackData.questionId,
      ctx.session.language
    );
    await ctx.reply(`${answer}`, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (!ctx.session.stats) {
    ctx.session.stats = {
      html: { total: 0, completed: 0 },
      css: { total: 0, completed: 0 },
      javascript: { total: 0, completed: 0 },
      react: { total: 0, completed: 0 },
    };
  }

  ctx.session.stats[topic].total += 1;
  if (callbackData.isCorrect) {
    ctx.session.stats[topic].completed += 1;
    await ctx.reply("👍 ✅");
  } else {
    const answer = getCorrectAnswer(
      callbackData.type.split("-")[0],
      callbackData.questionId,
      ctx.session.language
    );
    await ctx.reply(`👎 ❌ 🤦‍♂  Correct : ${answer}`);
  }

  await ctx.answerCallbackQuery();
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in Grammy request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

export default bot;
export { bot };
