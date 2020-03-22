const express = require("express");
const path = require("path");
const keys = require("../config/keys.js");

const config = require("../config/keys");
// const twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);

const app = express();

app.use(express.static(path.join(__dirname, "../build")));
app.use(express.static(path.join(__dirname, "..", "public")));

// app.use('/profile', profileRoutes);

const pi = require("./piController");

let roomInUse = false;
const eventObj = {
  start: null,
  end: null
};

const CURRENT_ENV = process.env.NODE_ENV === "production" ? "production" : "dev";
const objIO = pi.setupIO();
// ONLY USE THE GET ROUTES WITH objIO mentioned in them
// NOT THE POST ROUTES

// turn off all the lights every 5min
const turnOffTheLights = setInterval(() => {
  pi.turnOffLED("green");
  pi.turnOffLED("yellow");
  pi.turnOffLED("red");
}, 300000);

const logInterval = setInterval(() => {
  console.log(pi.ioStatus());
}, 1000);

//check interval for changing door / LED values
const interval = setInterval(() => {
  const now = new Date();

  const motionStatus = pi.motionCheck();

  // if (doorStatus === objIO.CLOSED) {
  //   if (roomInUse === false) {
  //     pi.turnOnLED('green', 1000);
  //     roomInUse = true;
  //     eventObj.start = Date.now();
  //     console.log('Event Started');
  //   } else {
  //     if (Q.queue.length > 0) pi.turnOnLED('yellow');
  //     else pi.turnOffLED('yellow');
  //   }
  // } else { //door open
  //   if (roomInUse === true) {
  //     pi.turnOnLED('green', 1000);
  //     roomInUse = false;
  //     eventObj.end = Date.now();
  //     console.log('Event End');
  //     if (eventObj.start) eventController.createEvent(eventObj);
  //     Q.queue.shift();
  //     eventObj.start = null;
  //     eventObj.end = null;
  //   } else {
  //     if (Q.queue.length > 0) {
  //       pi.turnOnLED('red');
  //     } else {
  //       pi.turnOffLED('red');
  //     }
  //   }
  // }
}, 20);

// app.get('/api/', (req, res) => {
//   console.log('/api');
//   const value = objIO.doorStatus.readSync();
//   objIO.doorStatus.writeSync(value ^ 1);
//   res.json('Allo!!!');
// });

app.post("/sms", (req, res) => {
  const message = req.body.message;
  console.log(`message:${message}`);
  if ("userId" in req.cookies) {
    const phone = "phone" in req.body ? req.body.phone : "";
    const userId = req.cookies.userId;
    Session.findOne(
      { _id: userId },

      (err, userDataArr) => {
        if (err) {
          res.send("err");
        } else {
          const user = userDataArr;
          if (user.phone) {
            twilio.messages.create(
              {
                to: user.phone,
                from: config.twilio.number,
                body: `Reservation:\n\n${message}`
              },
              (err, message) => {
                if (err) {
                  console.log("Twilio Error");
                  console.log(err);
                  res.status(444).json("SMS error");
                }
                console.log(message.sid);
              }
            );
            res.json("SENT!");
            return;
          } else {
            res.status(445).send("No Phone for user");
          }
        }
      }
    );
  }
});
// get current door status
app.get("/door", (req, res) => {
  // console.log(`/door`);
  res.json(roomInUse);
});
// change door status DEV only
app.post("/door/:status", (req, res) => {
  console.log(`/door/:status`);
  console.log(req);
  console.log(req.params);
  const status = req.params.status;
  console.log("Incoming Status:", status);
  let newValue;
  if (status === "open") {
    newValue = objIO.OPEN;
  } else if (status === "close") {
    newValue = objIO.CLOSED;
  } else {
    console.error(`Invalid door command. open / close is valid. Found: ${status}`);
    res.status(400).send();
  }
  objIO.motion.writeSync(newValue);
  res.json("done");
});

app.get("/led/:color", (req, res) => {
  console.log(`/led/:color`);
  const color = req.params.color;
  console.log(`Color:${color}`);

  let led;
  if (color === "red") {
    led = objIO.red;
  } else if (color === "yellow") {
    led = objIO.yellow;
  } else if (color === "green") {
    led = objIO.green;
  } else {
    console.log("Invalid color");
    res.status(402).json(`Invalid color ${color}.  Valid colors: red,yellow,green`);
    return;
  }

  const newStatus = led.readSync() ^ 1;
  led.writeSync(newStatus);
  res.json(newStatus);
});

// change color DEV only
app.post("/led/:color", (req, res) => {
  console.log(`/led/:color`);
  const color = req.params.color;

  let led;
  if (color === "red") {
    led = objIO.red;
  } else if (color === "yellow") {
    led = objIO.yellow;
  } else if (color === "green") {
    led = objIO.green;
  } else {
    console.log("Invalid color");
    res.status(402).json(`Invalid color ${color}.  Valid colors: red,yellow,green`);
    return;
  }

  const newStatus = led.readSync() ^ 1;
  led.writeSync(newStatus);
  res.json(newStatus);
});

// blink color DEV only
// turns off after
app.post("/led/blink/:color/:time", (req, res) => {
  console.log(`/led/blink/:color/:time`);
  const color = req.params.color;
  const time = parseInt(req.params.time);
  let led;
  if (color === "red") {
    led = objIO.red;
  } else if (color === "yellow") {
    led = objIO.yellow;
  } else if (color === "green") {
    led = objIO.green;
  } else {
    console.log("Invalid color");
    res.status(402).json(`Invalid color ${color}.  Valid colors: red,yellow,green`);
    return;
  }
  console.log(`Time: ${time}`);
  if (Number.isInteger(time) && time > 0) {
    pi.blinkLED(color, time);
  } else {
    console.log("Invalid color");
    res.status(402).json(`Invalid time ${time}. Must be positive integer`);
    return;
  }

  res.json("done");
});

//only need this to host the static files if we're running on the pi
if (CURRENT_ENV === "production") {
  app.get("/", function(req, res) {
    if (req.session) {
      console.log(req.session);
    }
    res.sendFile(path.join(__dirname + "/../build/index.html"));
  });
}

app.get("/api/unauthorized", (req, res) => {
  res.send("You aren't authorized to access this");
});

// catch all 404 function
app.use(function(req, res) {
  res.status(404).json("Something broke! Check url and try again?");
});

// other catch all, might be better error reporting
app.use(({ errCode, error }, req, res, next) => {
  console.log("Error Code:");
  console.log(errCode);
  res.status(errCode).json({ error });
});

const port = CURRENT_ENV === "production" ? 5000 : 3001;

app.listen(port);
console.log(`Listening on ${port}`);
