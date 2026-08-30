const { MongoClient } = require('mongodb');

// Same URI as .env.local
const MONGODB_URI = 'mongodb+srv://brkesportsorganisation_db_user:MJpnuFy61LNn5pEc@cluster0.rtlawss.mongodb.net/whatsapp_automation?retryWrites=true&w=majority&appName=Cluster0';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('whatsapp_automation');
    const collection = db.collection('whatsapp_settings');

    const settings = {
      _id: 'gateway_settings',
      provider: 'NODE_BOT',
      nodeBotUrl: 'https://ezbd.onrender.com',
      nodeBotSecret: 'blackrock_secret_bot_key_2026',
      isEnabled: true,
      updatedAt: new Date().toISOString(),
    };

    const result = await collection.replaceOne(
      { _id: 'gateway_settings' },
      settings,
      { upsert: true }
    );

    console.log('Settings saved!', result.upsertedCount ? 'Inserted new' : 'Updated existing');
    
    const saved = await collection.findOne({ _id: 'gateway_settings' });
    console.log('Saved document:', JSON.stringify(saved, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

main();
