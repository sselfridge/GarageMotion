const config = require("../../config/keys");
const twilio = require("twilio")(config.twilio.accountSid, config.twilio.authToken);
const CURRENT_ENV = process.env.NODE_ENV === "production" ? "production" : "dev";
const m = require("moment");

let msgTimes = {};

const makeClient = (numbers) => {
  const client = {
    sendMsg: (sendMsg = (id, msg) => {
      if (throttleMsg(id, msg)) {
        numbers.forEach(number => sendMsgToNumber(number,msg))
      }
    }),
  };
  return client;
};

const sendMsgToNumber = (number,msg) => {
  if (CURRENT_ENV === "production") {
    twilio.messages
      .create({
        body: msg,
        from: config.twilio.from,
        to: number,
      })
      .then((message) => console.log(message.sid));
  } else {
    console.log("***************************MESSAGE SENT*******************************");
    console.log('To:', number);
    console.log(msg);
  }
}



const throttleMsg = (id, msg) => {
  if (msgTimes[id] === undefined) {
    console.log(`Message ID: ${id} sent for the 1st time`);
    msgTimes[id] = m();
    return true;
  } else {
    console.log(`2nd Time for msg:${id}`);
    const prevMsgTime = msgTimes[id];
    const now = m();
    const minSinceLastMsg = m(now - prevMsgTime).minutes();


    if (minSinceLastMsg < 5) {
      console.log(`This message was sent ${minSinceLastMsg}min ago.`);
      console.log("MSG NOT SENT ---MSG NOT SENT ---MSG NOT SENT ---MSG NOT SENT ---", msg);

      return false;
    } else {
      console.log(`Message ${id} Ready to Send again. Last sent: ${prevMsgTime.format('hh:mm A')}`);
      msgTimes[id] = m();
      return true;
    }
  }
};

exports.makeClient = makeClient;
