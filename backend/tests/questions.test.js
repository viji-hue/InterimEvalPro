import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSessionQuestions, QUESTION_BANK } from '../questions.js';

test('pickSessionQuestions returns the requested five-question mix', () => {
  const questions = pickSessionQuestions();

  assert.equal(questions.length, 5);
  assert.ok(questions.every(q => typeof q.q === 'string' && q.q.length > 0));

  const counts = questions.reduce((acc, q) => {
    acc[q.topic] = (acc[q.topic] || 0) + 1;
    return acc;
  }, {});

  assert.deepEqual(counts, {
    'TypeScript': 1,
    Playwright: 2,
    'Functional Testing': 1,
    'SQL': 1,
  });
});

test('SQL questions are scenario-based and use a single shared schema', () => {
  const sqlQuestions = QUESTION_BANK.filter(q => q.topic === 'SQL');

  assert.equal(sqlQuestions.length, 5);
  sqlQuestions.forEach(q => {
    const text = `${q.q} ${q.detailedAnswer || ''}`.toLowerCase();
    assert.match(text, /scenario|business|dashboard|report|team|analysis/);
    assert.ok(text.includes('employees') || text.includes('departments') || text.includes('projects'));
  });
});

test('QUESTION_BANK includes the required TypeScript and Playwright questions', () => {
  const requiredIds = ['ts1', 'pw1', 'pw2', 'ft1', 'sql1'];
  const foundIds = requiredIds.filter(id => QUESTION_BANK.some(q => q.id === id));

  assert.deepEqual(foundIds, requiredIds);
});
