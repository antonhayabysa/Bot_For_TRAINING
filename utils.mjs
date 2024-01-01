import questions from "./questions.mjs";

let userLastQuestionIndex = {};
export const PASSWORD = "123";
let authorizedUsers = {};

function isAuthorized(ctx) {
  if (!ctx.session.paidUntil) {
    return false;
  }
  return ctx.session.paidUntil.getTime() > new Date().getTime();
}

export const getRandomQuestion = (topic, userId, ctx) => {
  if (!userLastQuestionIndex[userId]) {
    userLastQuestionIndex[userId] = {};
  }

  if (userLastQuestionIndex[userId][topic] === undefined) {
    userLastQuestionIndex[userId][topic] = 0;
  } else {
    if (userLastQuestionIndex[userId][topic] >= 4 && !isAuthorized(ctx)) {
      throw new Error(
        "🎉 Поздравляем с успешным прохождением ознакомительной части тестов! 🎉\n\n" +
          "Чтобы продолжить и получить полный доступ ко всем тестам, оформи подписку. Это не только позволит тебе глубже подготовиться к собеседованию, но и даст доступ к регулярно обновляемым и актуализированным материалам.\n\n" +
          "🔹 Оформи подписки на 30 дней стоит всего 50 гривен.\n" +
          "🔹 Переведи сумму на указанный номер карты: [4441-1111-5285-0941].\n" +
          "🔹 После оплаты пришли скриншот подтверждения оплаты.\n\n" +
          "Благодарим тебя за выбор нашего сервиса! Мы верим, что наши тесты помогут тебе в успешной подготовке к собеседованию и будем рады предоставлять тебе ы самую актуальную информацию. 🚀"
      );
    }
    userLastQuestionIndex[userId][topic] =
      (userLastQuestionIndex[userId][topic] + 1) % questions[topic].length;
  }

  const questionIndex = userLastQuestionIndex[userId][topic];
  const question = questions[topic][questionIndex];

  return { question: question, questionTopic: topic };
};

export const getCorrectAnswer = (topic, id) => {
  const question = questions[topic].find((q) => q.id === id);
  if (!question.hasOptions) {
    return question.answer;
  }
  return question.options.find((option) => option.isCorrect).text;
};

export { questions, authorizedUsers };
