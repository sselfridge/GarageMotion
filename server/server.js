const express = require("express");
const path = require("path");
const keys = require("../config/keys.js");
const mongooseStart = require("./bin/mongoose");

const config = require("../config/keys");
// const twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);

const pi = require("./controllers/piController");
const CheckController = require("./controllers/CheckController");

mongooseStart();

const app = express();

app.use(express.static(path.join(__dirname, "../build")));
app.use(express.static(path.join(__dirname, "..", "public")));

const CURRENT_ENV = process.env.NODE_ENV === "production" ? "production" : "dev";
const objIO = pi.setupIO();
const CC = new CheckController(objIO);

let motionTime = null;

if (CURRENT_ENV === "dev") {
  const logInterval = setInterval(() => {
    console.log(pi.ioStatus());
  }, 600);
}

//check interval for changing door / LED values
const interval = setInterval(() => {
  const now = new Date();

  const status = pi.heartbeat();
  const motionStatus = status.motion;
  const doorStatus = status.door;

  CC.checkDoor(doorStatus);
  CC.checkMotion(motionStatus);
}, 100);

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
  const status = req.params.status;
  let newValue;
  if (status === "open") {
    console.log("Open1:");
    newValue = objIO.OPEN;
    console.log("Open2:");
  } else if (status === "close") {
    console.log("Closed 1:");
    newValue = objIO.CLOSED;
    console.log("Closed 2:");
  } else {
    console.error(`Invalid door command. open / close is valid. Found: ${status}`);
    res.status(400).send();
  }
  objIO.door.writeSync(newValue);
  res.json("done");
});

let moveTimeout;

//trigger motion for 5 seconds
app.post("/move", (req, res) => {
  clearTimeout(moveTimeout);
  objIO.motion.writeSync(objIO.MOVEMENT);
  moveTimeout = setTimeout(() => objIO.motion.writeSync(objIO.NO_MOVEMENT), 5000);
  res.status(200).send();
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
