import questions from "./questions.mjs";

let userLastQuestionIndex = {};
let authorizedUsers = {};
const admin = 305515622;

function isAuthorized(ctx) {
  // Проверяем, является ли пользователь администратором
  if (ctx.from.id === admin) {
    return true; // Администратор всегда авторизован
  }

  // Проверяем наличие и действительность подписки для обычных пользователей
  if (!ctx.session.paidUntil) {
    return false;
  }
  return ctx.session.paidUntil.getTime() > new Date().getTime();
}

export const getRandomQuestion = async (topic, userId, ctx) => {
  if (!userLastQuestionIndex[userId]) {
    userLastQuestionIndex[userId] = {};
  }

  if (userLastQuestionIndex[userId][topic] === undefined) {
    userLastQuestionIndex[userId][topic] = 0;
  } else {
    // Проверяем, если индекс вопроса достиг последнего в списке или пользователь прошел 5 вопросов
    if (
      userLastQuestionIndex[userId][topic] >= questions[topic].length - 1 ||
      (!isAuthorized(ctx) && userLastQuestionIndex[userId][topic] >= 4)
    ) {
      // Если пользователь авторизован, начинаем вопросы сначала и выводим сообщение
      if (isAuthorized(ctx)) {
        await ctx.reply(
          "🎉 Ви відповіли на всі питання у цьому розділі! 🧠 Тепер ми почнемо спочатку для повторення та закріплення знань! 🔄\n\n🎉 The tests are completed! Let's start over for a revision. 🔄"
        );
        userLastQuestionIndex[userId][topic] = 0;
      } else {
        // Если пользователь не авторизован, выводим сообщение о необходимости подписки
        await ctx.reply(
          "🌟🎉 Вітаємо з успішним завершенням вступної частини тестів! 🎉🌟\n\n" +
            "🔑 Хочете розблокувати повний доступ до всіх тестів і матеріалів? Оформіть підписку! Це ваш ключ до глибокої підготовки до співбесіди та доступу до постійно оновлюваних ресурсів.\n\n" +
            "💳 Вартість підписки на 30 днів всього 50 гривень. Оберіть зручний спосіб оплати:\n" +
            "   🔹 Номер картки: [4441-1111-5285-0941], або\n" +
            "   🔹 Криптовалютний гаманець UID: 102517541 (1.5 USDT).\n\n" +
            "📸 Після оплати, будь ласка, надішліть скріншот підтвердження для активації підписки.\n\n" +
            "🙏 Дякуємо за довіру до нашого сервісу! Ми впевнені, що наші тести стануть важливим інструментом у вашій підготовці до співбесіди. Вперед до нових знань і успіхів! 🚀"
        );
        return {}; // Возвращаем пустой объект, чтобы не продолжать обработку
      }
    } else {
      // Инкрементируем индекс для следующего вопроса
      userLastQuestionIndex[userId][topic]++;
    }
  }

  const questionIndex = userLastQuestionIndex[userId][topic];
  const question = questions[topic][questionIndex];

  return question ? { question: question, questionTopic: topic } : {};
};

export const getCorrectAnswer = (topic, id, language = "en") => {
  const question = questions[topic].find((q) => q.id === id);
  if (!question.hasOptions) {
    return question.answer[language] || question.answer["en"]; // Возврат ответа на выбранном языке
  }
  const correctOption = question.options.find((option) => option.isCorrect);
  return correctOption.text[language] || correctOption.text["en"]; // Возврат текста правильного варианта ответа
};

export { questions, authorizedUsers };
