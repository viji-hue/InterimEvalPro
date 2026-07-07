import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSessionQuestions, QUESTION_BANK } from '../questions.js';

test('pickSessionQuestions keeps five Selenium questions for a session', () => {
  const questions = pickSessionQuestions();

  assert.equal(questions.length, 5);
  assert.ok(questions.every(q => q.topic === 'Selenium'));
  assert.ok(questions.every(q => typeof q.q === 'string' && q.q.length > 0));
});

test('QUESTION_BANK includes five technical Selenium interview questions', () => {
  const technicalIds = ['sel3a', 'sel3b', 'sel3c', 'sel3d', 'sel3e'];
  const foundIds = technicalIds.filter(id => QUESTION_BANK.some(q => q.id === id));

  assert.deepEqual(foundIds, technicalIds);
});
