import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSessionQuestions, QUESTION_BANK } from '../questions.js';

test('pickSessionQuestions returns five SQL questions only', () => {
  const questions = pickSessionQuestions();

  assert.equal(questions.length, 5);
  assert.ok(questions.every(q => typeof q.q === 'string' && q.q.length > 0));
  assert.ok(questions.every(q => q.topic === 'SQL'));
  assert.ok(questions.every(q => q.q.includes('Schema diagram')));
});

test('SQL questions are scenario-based and use a shared schema with tables, columns, and links', () => {
  const sqlQuestions = QUESTION_BANK.filter(q => q.topic === 'SQL');

  assert.equal(sqlQuestions.length, 5);
  sqlQuestions.forEach(q => {
    const text = `${q.q} ${q.detailedAnswer || ''}`.toLowerCase();
    assert.match(text, /scenario|finance|hr|operations|leadership/);
    assert.ok(text.includes('employees'));
    assert.ok(text.includes('departments'));
    assert.ok(text.includes('projects'));
    assert.ok(text.includes('employee_projects'));
    assert.ok(text.includes('fk') || text.includes('links'));
  });
});

test('QUESTION_BANK includes the required SQL questions', () => {
  const requiredIds = ['sql1', 'sql2', 'sql3', 'sql4', 'sql5'];
  const foundIds = requiredIds.filter(id => QUESTION_BANK.some(q => q.id === id));

  assert.deepEqual(foundIds, requiredIds);
});
