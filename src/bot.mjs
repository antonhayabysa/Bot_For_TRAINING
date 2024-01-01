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

bot.use(
  session({
    initial: () => ({
      startedUsingBot: new Date(),
    }),
    storage: new MongoDBAdapter({ collection }),
  })
);

const getTotalQuestionsByTopic = () => {
  const totalQuestions = {};
  for (const topic in questions) {
    totalQuestions[topic] = questions[topic].length;
  }
  return totalQuestions;
};

bot.command("start", async (ctx) => {
  ctx.session.chat = ctx.chat;

  const userId = ctx.from.id.toString();
  const userName = ctx.from.first_name || "Пользователь";
  const userUsername = ctx.from.username || "";

  console.log(
    `Пользователь: ${userId}, Имя: ${userName}, Username: ${userUsername}`
  );

  // Регистрируем нового пользователя в MongoDB
  await registerNewUser(userId, userName, userUsername);

  // Инициализация клавиатуры для ответа пользователю
  const startKeyboard = new Keyboard()
    .text("🌐 HTML")
    .text("🎨 CSS")
    .row()
    .text("💻 JavaScript")
    .text("⚛️ React")
    .row()
    .text("🆘 Помощь")
    .text("📈 Ваша статистика")
    .row()
    .resized();

  // URL изображения для ответа
  const imageUrl =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQO2T03NfMHwiRCOlG9RdASOXDkigs3TTIVfaH5B5Iv698_fwGhTXvWc3jQ9LDuVd2n0FY";

  // Отправляем приветственное сообщение с фото
  await ctx.replyWithPhoto(imageUrl);
  await ctx.reply(
    `👋 Привет, ${userName}! Добро пожаловать в Frontend Interview Prep Bot 🤖\n\n` +
      `Я здесь, чтобы помочь тебе максимально эффективно подготовиться к интервью по фронтенду. Впереди тебя ждут интересные задачи и полезные материалы! 🚀\n\n` +
      `Давай выберем, с чего начнем? Ты можешь выбрать одну из тем ниже или посмотреть свою статистику. Приступим? 👇`,
    {
      reply_markup: startKeyboard,
    }
  );
});

bot.hears("🆘 Помощь", async (ctx) => {
  const helpKeyboard = new InlineKeyboard().url(
    "🗨️ Написать Антону",
    "https://t.me/AntonSnizhko"
  );

  await ctx.reply(
    "🤖 Привет! Если у тебя возникли вопросы или есть что сказать, я здесь, чтобы помочь!\n\n" +
      "💡 Нужна помощь или хотите поделиться идеями? Просто нажми на кнопку ниже, чтобы написать мне. Твой фидбек помогает нам стать лучше!\n\n" +
      "🚀 И если у тебя есть предложения по улучшению курса, мы будем рады их услышать. Давайте вместе сделаем обучение ещё лучше!",
    {
      reply_markup: helpKeyboard,
    }
  );
});

bot.hears(["HTML", "CSS", "JavaScript", "React"], async (ctx) => {
  const topic = ctx.message.text.toLowerCase();
  const userId = ctx.from.id.toString();

  try {
    const { question, questionTopic } = getRandomQuestion(topic, userId, ctx);

    let inlineKeyboard = new InlineKeyboard();

    if (question.hasOptions) {
      question.options.forEach((option) => {
        inlineKeyboard = inlineKeyboard
          .text(
            option.text,
            JSON.stringify({
              type: `${questionTopic}-option`,
              isCorrect: option.isCorrect,
              questionId: question.id,
            })
          )
          .row();
      });
    } else {
      inlineKeyboard = inlineKeyboard.text(
        "Узнать ответ",
        JSON.stringify({
          type: questionTopic,
          questionId: question.id,
        })
      );
    }

    await ctx.reply(question.text, { reply_markup: inlineKeyboard });
  } catch (error) {
    await ctx.reply(error.message);
  }
});

bot.hears("📈 Ваша статистика", async (ctx) => {
  const userName = ctx.from.first_name || "Пользователь";

  if (!ctx.session.stats || Object.keys(ctx.session.stats).length === 0) {
    await ctx.reply(`📊 ${userName}, ты еще не прошёл ни одного теста.`);
    return;
  }

  const totalQuestions = getTotalQuestionsByTopic();
  let message = `<b>📈 Твоя статистика ${userName}:</b>\n\n`;
  message += "<pre>";
  message += "Тема   | Всего | Пройд. | Верно\n";
  message += "-------|-------|--------|------\n";

  for (const topic of Object.keys(totalQuestions)) {
    const shortTopic = topic === "javascript" ? "js" : topic;
    const stats = ctx.session.stats[topic] || { total: 0, completed: 0 };
    const totalInTopic = totalQuestions[topic];
    message += `${shortTopic.substr(0, 5).padEnd(7)}| ${String(
      totalInTopic
    ).padEnd(7)}| ${String(stats.total).padEnd(8)}| ${stats.completed}\n`;
  }
  message += "</pre>";

  await ctx.reply(message, { parse_mode: "HTML" });
});

bot.on("message:photo", async (ctx) => {
  // Отправка уведомления пользователю
  await ctx.reply("📸 Скриншот получен! Ожидайте подтверждения оплаты...");

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
    // Форматирование даты на русском языке в европейском стиле (день, месяц, год)
    const formattedDate = dateIn30Days.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    await ctx.api.sendMessage(
      callbackData.userID,
      `🌟 Поздравляем с приобретением курса! Теперь у тебя есть полный доступ к всем материалам для подготовки к собеседованию.\n\n` +
        `Твоя подписка активна до: ${formattedDate}.\n\n` +
        `Мы регулярно обновляем и улучшаем материалы курса, чтобы оставаться актуальными по последним трендам и информации.\n\n` +
        `Если у тебя возникнут вопросы или нужна дополнительная помощь, не стесняйтесь обращаться к нам. Удачи в обучении и подготовке к собеседованиям! 🚀`
    );

    // Ответ на callback-запрос
    await ctx.answerCallbackQuery({
      text: "Пользователь успешно оформил подписку!",
      show_alert: true,
    });
    return;
  }

  const topic = callbackData.type.split("-")[0];

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
  }

  if (ctx.session.stats[topic].total >= questions[topic].length) {
    ctx.session.stats[topic].total = 0;
    ctx.session.stats[topic].completed = 0;
  }

  if (!callbackData.type.includes("option")) {
    const answer = getCorrectAnswer(callbackData.type, callbackData.questionId);
    await ctx.reply(answer, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    await ctx.answerCallbackQuery();
    return;
  }

  if (callbackData.isCorrect) {
    await ctx.reply("Верно ✅");
  } else {
    const answer = getCorrectAnswer(
      callbackData.type.split("-")[0],
      callbackData.questionId
    );
    await ctx.reply(`Неверно ❌ Правильный ответ: ${answer}`);
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
