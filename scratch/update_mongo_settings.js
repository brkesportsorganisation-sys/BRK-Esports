const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://brkesportsorganisation_db_user:pd%21fGT3Q%213_X%25yZ@cluster0.rtlawss.mongodb.net/brk_whatsapp?appName=Cluster0';

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    
    // Update or insert the whatsapp_settings document
    const collection = db.collection('whatsapp_settings');
    
    const settings = {
      provider: 'NODE_BOT',
      nodeBotUrl: 'https://ezbd.onrender.com',
      nodeBotSecret: 'blackrock_secret_bot_key_2026',
      isEnabled: true,
      updatedAt: new Date()
    };
    
    // Check if any settings exist
    const count = await collection.countDocuments({});
    if (count === 0) {
      await collection.insertOne({ ...settings, _id: 'default' });
    } else {
      await collection.updateMany({}, { $set: settings });
    }
    
    console.log('✅ Successfully updated Vercel settings in MongoDB!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
