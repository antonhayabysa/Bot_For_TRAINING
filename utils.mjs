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
        "Требуется ввод пароля для доступа к следующим вопросам."
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
