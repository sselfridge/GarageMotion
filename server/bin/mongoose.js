const mongoose = require("mongoose");
const config = require("../../config/keys");

const startMongoose = () => {
  mongoose.connect(config.dbKeys.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
  mongoose.connection.once("open", (error, client) => {
    console.log("DB Connected");
  });
};

module.exports = startMongoose;
