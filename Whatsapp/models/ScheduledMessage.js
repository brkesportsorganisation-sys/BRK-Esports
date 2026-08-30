const mongoose = require('mongoose');

const ScheduledMessageSchema = new mongoose.Schema(
  {
    groupJids: [String],
    message: { type: String, required: true },
    sendAt: { type: Date, required: true },
    isSent: { type: Boolean, default: false },
    failReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduledMessage', ScheduledMessageSchema);
