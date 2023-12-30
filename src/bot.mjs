import {Bot, Keyboard, InlineKeyboard, GrammyError, HttpError, session} from "grammy";
import {
    getRandomQuestion,
    getCorrectAnswer,
    questions,
    authorizedUsers,
    PASSWORD,
} from "../utils.mjs";
import {connectToMongoDB, registerNewUser} from "../db.mjs";
import {MongoDBAdapter} from "@grammyjs/storage-mongodb";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

const db = await connectToMongoDB();
const collection = db.collection("Sessions");

bot.use(session({
    initial: () => ({
        startedUsingBot: new Date()
    }),
    storage: new MongoDBAdapter({collection})
}))

let userStats = {};

bot.command("password", async (ctx) => {
    const userId = ctx.from.id.toString();
    const enteredPassword = ctx.message.text.split(" ")[1];

    if (enteredPassword === PASSWORD) {
        authorizedUsers[userId] = PASSWORD;
        await ctx.reply("Пароль принят. Теперь вы можете продолжить.");
    } else {
        await ctx.reply("Неверный пароль. Попробуйте снова.");
    }
});

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
        .text("HTML")
        .text("CSS")
        .row()
        .text("JavaScript")
        .text("React")
        .row()
        .text("📈 Ваша статистика")
        .resized();

    // URL изображения для ответа
    const imageUrl =
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQO2T03NfMHwiRCOlG9RdASOXDkigs3TTIVfaH5B5Iv698_fwGhTXvWc3jQ9LDuVd2n0FY";

    // Отправляем приветственное сообщение с фото
    await ctx.replyWithPhoto(imageUrl);
    await ctx.reply(
        `Привет, ${userName}! Я - Frontend Interview Prep Bot 🤖 \nЯ помогу тебе подготовиться к интервью по фронтенду.`
    );

    // Отправляем сообщение с выбором темы
    await ctx.reply("С чего начнем? Выбери тему вопроса в меню 👇", {
        reply_markup: startKeyboard,
    });
});

bot.hears(["HTML", "CSS", "JavaScript", "React"], async (ctx) => {
    const topic = ctx.message.text.toLowerCase();
    const userId = ctx.from.id.toString();

    try {
        const {question, questionTopic} = getRandomQuestion(topic, userId);

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

        await ctx.reply(question.text, {reply_markup: inlineKeyboard});
    } catch (error) {
        await ctx.reply(error.message);
    }
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
        const stats = userStats[userId][topic] || {total: 0, completed: 0};
        const totalInTopic = totalQuestions[topic];
        message += `${topic.toUpperCase().padEnd(13)}| ${String(
            totalInTopic
        ).padEnd(15)}| ${String(stats.total).padEnd(8)}| ${stats.completed}\n`;
    }
    message += "</pre>";

    await ctx.reply(message, {parse_mode: "HTML"});
});

bot.on("callback_query:data", async (ctx) => {
    // const userId = ctx.from.id.toString();
    const callbackData = JSON.parse(ctx.callbackQuery.data);
    const topic = callbackData.type.split("-")[0];

    if (!ctx.session.stats) {
        ctx.session.stats = {
            html: {total: 0, completed: 0},
            css: {total: 0, completed: 0},
            javascript: {total: 0, completed: 0},
            react: {total: 0, completed: 0},
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

bot.on("message", async (ctx) => {
    const userId = ctx.from.id.toString();
    const enteredText = ctx.message.text;

    if (enteredText.trim() === PASSWORD) {
        authorizedUsers[userId] = PASSWORD;
        await ctx.reply("Пароль принят. Теперь вы можете продолжить.");
    } else {
    }
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
export {bot};
