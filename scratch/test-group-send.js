async function sendLiveTest() {
  const groupsToTest = [
    { name: 'Baler gorup', jid: '120363431294768022@g.us' },
    { name: 'REG-02', jid: '120363426443362477@g.us' },
    { name: 'REG-04', jid: '120363430987984161@g.us' },
    { name: 'OFFICIAL COMMUNITY', jid: '120363426203778465@g.us' },
  ];

  for (const g of groupsToTest) {
    console.log(`\nTesting send to: ${g.name} (${g.jid})...`);
    try {
      const res = await fetch('https://ezbd.onrender.com/api/send-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': 'blackrock_secret_bot_key_2026',
        },
        body: JSON.stringify({
          to: g.jid,
          message: `🏆 *ESPORTS ZONE BD | LIVE NOTICE TEST*\n\n✅ আপনার গ্রুপের সাথে বট সফলভাবে কানেক্টেড আছে!\n⏰ টাইম: ${new Date().toLocaleTimeString('en-US')}`,
        }),
      });

      const data = await res.json();
      console.log(`Status ${res.status}:`, data);
    } catch (err) {
      console.error('Failed:', err.message);
    }
  }
}

sendLiveTest();
