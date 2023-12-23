import {
  Bot,
  Keyboard,
  InlineKeyboard,
  GrammyError,
  HttpError,
  InputFile,
} from "grammy";
import { getRandomQuestion, getCorrectAnswer, questions } from "../utils.mjs";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

let userStats = {};

const getTotalQuestionsByTopic = () => {
  const totalQuestions = {};
  for (const topic in questions) {
    totalQuestions[topic] = questions[topic].length;
  }
  return totalQuestions;
};

bot.command("start", async (ctx) => {
  const userName = ctx.from.first_name || "Пользователь";

  const startKeyboard = new Keyboard()
    .text("HTML")
    .text("CSS")
    .row()
    .text("JavaScript")
    .text("React")
    .row()
    .text("📈 Ваша статистика")
    .resized();
  const photo = new InputFile("./src/img/bot.png");
  await ctx.replyWithPhoto(photo);
  await ctx.reply(
    `Привет, ${userName}! Я - Frontend Interview Prep Bot 🤖 \nЯ помогу тебе подготовиться к интервью по фронтенду.`
  );
  await ctx.reply("С чего начнем? Выбери тему вопроса в меню 👇", {
    reply_markup: startKeyboard,
  });
});

bot.hears(["HTML", "CSS", "JavaScript", "React"], async (ctx) => {
  const topic = ctx.message.text.toLowerCase();
  const userId = ctx.from.id.toString();
  const { question, questionTopic } = getRandomQuestion(topic, userId);

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
});

bot.hears("📈 Ваша статистика", async (ctx) => {
  const userId = ctx.from.id.toString();
  const userName = ctx.from.first_name || "Пользователь";

  if (!userStats[userId] || Object.keys(userStats[userId]).length === 0) {
    await ctx.reply(`📊 ${userName}, вы еще не прошли ни одного теста.`);
    return;
  }

  const totalQuestions = getTotalQuestionsByTopic();
  let message = `<b>📈 Ваша статистика, ${userName}:</b>\n\n`;
  message += "<pre>";
  message += "Тема         | Всего вопросов | Пройдено | Верно\n";
  message += "-------------|----------------|----------|------\n";

  for (const topic of Object.keys(totalQuestions)) {
    const stats = userStats[userId][topic] || { total: 0, completed: 0 };
    const totalInTopic = totalQuestions[topic];
    message += `${topic.toUpperCase().padEnd(13)}| ${String(
      totalInTopic
    ).padEnd(15)}| ${String(stats.total).padEnd(8)}| ${stats.completed}\n`;
  }
  message += "</pre>";

  await ctx.reply(message, { parse_mode: "HTML" });
});

bot.on("callback_query:data", async (ctx) => {
  const userId = ctx.from.id.toString();
  const callbackData = JSON.parse(ctx.callbackQuery.data);
  const topic = callbackData.type.split("-")[0];

  if (!userStats[userId]) {
    userStats[userId] = {
      html: { total: 0, completed: 0 },
      css: { total: 0, completed: 0 },
      javascript: { total: 0, completed: 0 },
      react: { total: 0, completed: 0 },
    };
  }

  userStats[userId][topic].total += 1;
  if (callbackData.isCorrect) {
    userStats[userId][topic].completed += 1;
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
    await ctx.answerCallbackQuery();
    return;
  }

  const answer = getCorrectAnswer(
    callbackData.type.split("-")[0],
    callbackData.questionId
  );
  await ctx.reply(`Неверно ❌ Правильный ответ: ${answer}`);
  await ctx.answerCallbackQuery();
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

export default bot;
export { bot };
