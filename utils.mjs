import questions from "./questions.mjs";

let userLastQuestionIndex = {};

export const getRandomQuestion = (topic, userId) => {
  if (!userLastQuestionIndex[userId]) {
    userLastQuestionIndex[userId] = {};
  }

  if (userLastQuestionIndex[userId][topic] === undefined) {
    userLastQuestionIndex[userId][topic] = 0;
  } else {
    userLastQuestionIndex[userId][topic] =
      (userLastQuestionIndex[userId][topic] + 1) % questions[topic].length;
  }

  const questionIndex = userLastQuestionIndex[userId][topic];
  const question = questions[topic][questionIndex];

  return {
    question: question,
    questionTopic: topic,
  };
};

export const getCorrectAnswer = (topic, id) => {
  const question = questions[topic].find((q) => q.id === id);

  if (!question.hasOptions) {
    return question.answer;
  }

  return question.options.find((option) => option.isCorrect).text;
};

// В utils.mjs
export { questions };
