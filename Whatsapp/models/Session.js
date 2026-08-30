const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  data: { type: String, required: true }, // Encoded JSON Auth Data
});

module.exports = mongoose.model('Session', SessionSchema);
