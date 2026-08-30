async function testSend() {
  try {
    const res = await fetch('https://ezbd.onrender.com/api/send-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': 'blackrock_secret_bot_key_2026',
      },
      body: JSON.stringify({
        to: '120363431294768022@g.us',
        message: '⚡ [ESPORTS ZONE BD] Live Test Broadcast - Everything is connected!',
      }),
    });

    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test Error:', err);
  }
}

testSend();
