const mongoose = require("mongoose");
const config = require("../../config/keys");

const startMongoose = () => {
  const uri = config.dbKeys.mongoURI
  mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Starting Connection");
  var db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", function() {
    console.log("DB connected");
  });
};

module.exports = startMongoose;



