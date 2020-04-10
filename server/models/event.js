const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  start: { type: Number, required: true },
  end: { type: Number, required: true },
  duration: { type: Number, required: true },
  type: { type: String, required: true },
  note: { type: String, required: true }
});

module.exports = mongoose.model("Event", eventSchema);
