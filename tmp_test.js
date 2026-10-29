import { extractOcrCandidates } from './src/ocrWords.ts';

// Test hyphens
console.log('Hyphens test:');
const r1 = extractOcrCandidates('well-being self-aware');
console.log(r1.map(c => c.text));

// Test mixed prefixes
console.log('\nMixed prefixes:');
const r2 = extractOcrCandidates('1) apple\n2. banana\na) cherry\n- date\n* elderberry');
console.log(r2.map(c => c.text));
console.log('Count:', r2.length);
