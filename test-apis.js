// Test script to verify Claude and Gemini API connections
// Run with: node test-apis.js

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testClaude() {
  if (!ANTHROPIC_API_KEY) {
    console.log('❌ ANTHROPIC_API_KEY not set');
    return false;
  }

  console.log('Testing Claude API...');
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say hello in 5 words' }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('❌ Claude API failed:', response.status, error);
      return false;
    }

    const data = await response.json();
    console.log('✅ Claude API working!');
    console.log('   Response:', data.content?.[0]?.text || 'No text');
    return true;
  } catch (error) {
    console.log('❌ Claude API error:', error.message);
    return false;
  }
}

async function testGemini() {
  if (!GEMINI_API_KEY) {
    console.log('❌ GEMINI_API_KEY not set');
    return false;
  }

  console.log('\nTesting Gemini API...');
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say hello in 5 words' }] }],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.log('❌ Gemini API failed:', response.status, error);
      return false;
    }

    const data = await response.json();
    console.log('✅ Gemini API working!');
    console.log('   Response:', data.candidates?.[0]?.content?.parts?.[0]?.text || 'No text');
    return true;
  } catch (error) {
    console.log('❌ Gemini API error:', error.message);
    return false;
  }
}

async function main() {
  console.log('=== Testing AI Provider APIs ===\n');

  const claudeWorks = await testClaude();
  const geminiWorks = await testGemini();

  console.log('\n=== Summary ===');
  console.log('Claude:', claudeWorks ? '✅ Working' : '❌ Failed');
  console.log('Gemini:', geminiWorks ? '✅ Working' : '❌ Failed');

  if (!claudeWorks && !geminiWorks) {
    console.log('\n⚠️  Both APIs failed! Check your API keys.');
    process.exit(1);
  }
}

main();
