// Test script to check Ollama connection and model
const fetch = require('node-fetch');

async function testOllama() {
  try {
    console.log('Testing Ollama connection...');
    
    // Test 1: Check connection
    const tagsResponse = await fetch('http://localhost:11434/api/tags');
    if (!tagsResponse.ok) {
      console.error('❌ Ollama is not running or not accessible');
      return;
    }
    const tagsData = await tagsResponse.json();
    console.log('✅ Ollama is connected');
    console.log('Available models:', tagsData.models?.map(m => m.name).join(', ') || 'none');
    
    // Test 2: Try to chat with the model
    console.log('\nTesting chat with gpt-oss:120b-cloud...');
    const chatResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-oss:120b-cloud',
        messages: [
          { role: 'user', content: 'Hello, say hi' }
        ],
        stream: false
      })
    });
    
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('❌ Chat failed:', chatResponse.status, errorText);
      return;
    }
    
    const chatData = await chatResponse.json();
    console.log('✅ Chat successful!');
    console.log('Response:', chatData.message?.content || 'No content');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOllama();

