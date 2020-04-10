const config = require("../../config/keys");
const twilio = require("twilio")(config.twilio.accountSid, config.twilio.authToken);
const CURRENT_ENV = process.env.NODE_ENV === "production" ? "production" : "dev";
const m = require("moment");

let msgTimes = {};

const makeClient = (numbers) => {
  const client = {
    sendMsg: (sendMsg = (msg) => {
      if (throttleMsg(msg)) {
        numbers.forEach((number) => {
          if (CURRENT_ENV === "production") {
            twilio.messages
              .create({
                body: msg,
                from: config.twilio.from,
                to: number,
              })
              .then((message) => console.log(message.sid));
          } else {
            console.log('TEXT MESSAGE "sent" to', number);
            console.log(msg);
          }
        });
      }
    }),
  };
  return client;
};

const throttleMsg = (msg) => {
  const prevMsgTime = msgTimes[msg] ? msgTimes[msg] : 0;
  const minSinceLastMsg = parseInt(m(m() - prevMsgTime).format("mm"));

    console.log(msgTimes);

  if (minSinceLastMsg < 5) {
    console.log(`This message was sent ${minSinceLastMsg}min ago.`);
    console.log("msg not sent", msg);

    return false;
  }


  msgTimes[msg] = m();
  return true;
};

exports.makeClient = makeClient;
