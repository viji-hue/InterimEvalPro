import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSessionQuestions } from '../questions.js';

test('pickSessionQuestions keeps five questions and includes a newly added topic', () => {
  const questions = pickSessionQuestions();

  assert.equal(questions.length, 5);
  assert.ok(questions.some(q => q.topic === 'Core Java'));
  assert.ok(questions.some(q => q.topic === 'Functional Testing'));
  assert.ok(questions.some(q => q.topic === 'SQL'));
  assert.ok(questions.some(q => q.topic === 'Selenium'));
  assert.ok([
    'Spring Boot',
    'REST API',
    'Data JPA',
    'Angular'
  ].some(topic => questions.some(q => q.topic === topic)));
});
