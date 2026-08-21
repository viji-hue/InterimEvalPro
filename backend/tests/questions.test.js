import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSessionQuestions, QUESTION_BANK } from '../questions.js';

test('pickSessionQuestions returns the required moderate Java, testing, and Selenium questions', () => {
  const questions = pickSessionQuestions();

  assert.equal(questions.length, 5);
  assert.ok(questions.every(q => typeof q.q === 'string' && q.q.length > 0));
  assert.ok(questions.every(q => q.difficulty === 'medium'));
  assert.deepEqual(
    questions.map(q => q.id).sort(),
    ['ft_eval_design', 'ft_eval_functional', 'java_eval_oops', 'java_eval_program', 'sel_eval_textbox']
  );
  assert.ok(questions.some(q => q.q.toLowerCase().includes('textbox')));
  assert.ok(questions.some(q => q.q.toLowerCase().includes('oop')));
  assert.ok(questions.some(q => q.q.toLowerCase().includes('prime')));
  assert.ok(questions.some(q => q.q.toLowerCase().includes('test coverage')));
});

test('QUESTION_BANK includes the required assessment questions with evaluation keys', () => {
  const requiredIds = ['java_eval_oops', 'java_eval_program', 'ft_eval_design', 'ft_eval_functional', 'sel_eval_textbox'];
  const foundIds = requiredIds.filter(id => QUESTION_BANK.some(q => q.id === id));

  assert.deepEqual(foundIds, requiredIds);
  requiredIds.forEach(id => {
    const question = QUESTION_BANK.find(q => q.id === id);
    assert.ok(question.key.length > 0);
    assert.ok(question.evalHints.length > 0);
  });
});
