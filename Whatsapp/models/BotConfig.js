const mongoose = require('mongoose');

const BotRuleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  keywords: [String],
  replyText: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

const BotConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'bot_config' },
    autoReplyEnabled: { type: Boolean, default: true },
    welcomeMessageEnabled: { type: Boolean, default: true },
    welcomeMessage: { type: String, default: '' },
    defaultFallbackReply: { type: String, default: '' },
    rules: [BotRuleSchema],
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

module.exports = mongoose.models.BotConfig || mongoose.model('BotConfig', BotConfigSchema);
