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
    if (userLastQuestionIndex[userId][topic] >= 4 && !isAuthorized(ctx)) {
      await ctx.reply(
        "🌟🎉 Поздравляем с успешным завершением вступительной части тестов! 🎉🌟\n\n" +
          "🔑 Хотите разблокировать полный доступ ко всем тестам и материалам? Оформите подписку! Это ваш ключ к глубокой подготовке к собеседованию, а также доступу к постоянно обновляемым ресурсам.\n\n" +
          "💳 Стоимость подписки на 30 дней — всего 50 гривен. Выберите удобный способ оплаты:\n" +
          "   🔹 Номер карты: [4441-1111-5285-0941], или\n" +
          "   🔹 Криптовалютный кошелек UID: 102517541 (1.5 USDT).\n\n" +
          "📸 После оплаты, пожалуйста, отправьте скриншот подтверждения для активации подписки.\n\n" +
          "🙏 Спасибо за доверие к нашему сервису! Мы уверены, что наши тесты станут важным инструментом в вашей подготовке к собеседованию. Вперёд к новым знаниям и успехам! 🚀"
      );
      return {}; // Возвращаем пустой объект
    }
    userLastQuestionIndex[userId][topic] =
      (userLastQuestionIndex[userId][topic] + 1) % questions[topic].length;
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
