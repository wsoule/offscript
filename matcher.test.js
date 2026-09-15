const test = require('node:test');
const assert = require('node:assert');
const { normalize, tokenize, findAdvance, similar } = require('./matcher');

const script = 'Hello everyone and welcome [pause] to the show. Today we talk about cats.';
const words = tokenize(script).filter(t => t.type === 'word' && t.norm).map(t => t.norm);

test('tokenize marks brackets as directions and excludes them from words', () => {
  const toks = tokenize(script);
  assert.ok(toks.some(t => t.type === 'direction' && t.text === '[pause]'));
  assert.deepStrictEqual(words.slice(0, 6), ['hello', 'everyone', 'and', 'welcome', 'to', 'the']);
});

test('normalize strips punctuation and case', () => {
  assert.strictEqual(normalize('Show.'), 'show');
  assert.strictEqual(normalize("Don't"), 'dont');
});

test('advances when spoken words match ahead', () => {
  assert.strictEqual(findAdvance(['hello', 'everyone'], words, 0), 2);
});

test('does not move on riffing that matches nothing', () => {
  assert.strictEqual(findAdvance(['so', 'anyway', 'like', 'i'], words, 2), null);
});

test('resumes at the right spot after a riff, skipping ahead if needed', () => {
  // speaker riffed, then jumped back in at "today we"
  assert.strictEqual(findAdvance(['blah', 'blah', 'today', 'we'], words, 4), 9);
});

test('never moves backward', () => {
  assert.strictEqual(findAdvance(['hello', 'everyone'], words, 5), null);
});

test('a single matching word is not enough to advance', () => {
  assert.strictEqual(findAdvance(['the'], words, 5), null);
});

test('re-reading the previous word plus the next one still advances', () => {
  // pos=4 means "to" is next; speaker says "welcome to"
  assert.strictEqual(findAdvance(['welcome', 'to'], words, 4), 5);
});

test('similar tolerates one-letter mishears on longer words', () => {
  assert.ok(similar('everyone', 'everyonr'));
  assert.ok(!similar('cat', 'car'));
});

test('skipping a few words of the script still tracks forward', () => {
  // pos=4 ("to" is next) but speaker skips "to the" and says "show today"
  assert.strictEqual(findAdvance(['show', 'today'], words, 4), 8);
});

test('skipping a whole paragraph does NOT jump ahead', () => {
  // at the very start, speaker says a phrase from 30+ words later - stay put
  assert.strictEqual(findAdvance(['talk', 'about', 'cats'], words, 0, 10), null);
});

test('a medium skip (4-10 words) needs three matching words, not two', () => {
  // pos=0, "today we" is 7 words ahead - two words are not enough
  assert.strictEqual(findAdvance(['today', 'we'], words, 0), null);
  // ...but three are
  assert.strictEqual(findAdvance(['today', 'we', 'talk'], words, 0), 10);
});
