const express = require("express");
const path = require("path");
const fs = require("fs");
const m = require("moment");
const config = require("../config/keys");
const mongooseStart = require("./bin/mongoose");
const pi = require("./controllers/piController");
const CheckController = require("./controllers/event");

mongooseStart();

const twilio = require("./controllers/twilio");
const numbers = ["+18057651413"];
const client = twilio.makeClient(numbers);

const app = express();

// app.use(express.static(path.join(__dirname, "../build")));
// app.use(express.static(path.join(__dirname, "..", "public")));

const CURRENT_ENV = process.env.NODE_ENV === "production" ? "production" : "dev";
const piStartTime = m();
const objIO = pi.setupIO();
const CC = new CheckController(objIO);

if (CURRENT_ENV === "dev") {
  const logInterval = setInterval(() => {
    console.log(pi.ioStatus());
  }, 1000);
}

//check interval for changing door / LED values
intervalCount = 0;
const interval = setInterval(() => {
  const now = new Date();

  const status = pi.heartbeat();
  const motionStatus = status.motion;
  const doorStatus = status.door;

  CC.checkDoor(doorStatus);
  CC.checkMotion(motionStatus);

  if (doorStatus === CC.OPEN) eventCheck(CC);

  //blink light every so often.
  if (intervalCount % 5 === 0) pi.blinkLED("green", 2000);
  intervalCount++;
}, 2000);

const eventCheck = (CC) => {
  const { doorOpenTime, motionStopTime, motionStartTime } = CC;
  const now = m();

  const idleAlertTimeMin = 45;

  const openDuration = parseInt(m(now - doorOpenTime).minutes());
  const timeSinceMotion = parseInt(m(now - motionStopTime).minutes());

  if (intervalCount % 25 === 0) {
    console.log(`Open Duration: ${openDuration} min - Time Since Motion: ${timeSinceMotion} min`);
  }

  // motion currently going on, no action
  // if (motionStartTime > motionStopTime) return;

  if (timeSinceMotion === 45) {
    let str = `Garage Alert:${now.format("hh:mm A")}\n`;
    str += `Door has been open for ${openDuration}min\n`;
    str += `with no motion for ${timeSinceMotion}min`;
    client.sendMsg(101, str);
  }

  if (now.format("hh:mm") === "23:00") {
    let str = `Garage Alert:${now.format("hh:mm A")}\n`;
    str += `Its ${now.format("hh:mm A")} and the garage door is still open`;
    str += `Door has been open for ${openDuration}min\n`;
    str += `with no motion for ${timeSinceMotion}min`;
    client.sendMsg(11, str);
  }
};

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
                body: `Reservation:\n\n${message}`,
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
    newValue = objIO.OPEN;
  } else if (status === "close") {
    newValue = objIO.CLOSED;
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
// for react, no need since currently just sending html
app.get("/", function (req, res) {
  // if (req.session) {
  //   console.log(req.session);
  // }
  try {
    const template = fs.readFileSync("build/index.html", "utf-8");

    let html = makeHtml(template);

    // res.sendFile(html);
    res.send(html);
  } catch (error) {
    console.log(error);
  }
});

app.get("/api/unauthorized", (req, res) => {
  res.send("You aren't authorized to access this");
});

// catch all 404 function
app.use(function (req, res) {
  res.status(404).json("Something broke! Check url and try again?");
});

// other catch all, might be better error reporting
app.use(({ errCode, error }, req, res, next) => {
  console.log("Error Code:");
  console.log(errCode);
  console.log(error);
  res.status(errCode).json({ error });
});

const makeHtml = (template) => {
  const data = CC.getData();
  data.intervalCount = intervalCount;
  data.startTime = piStartTime.format("MMMM Do YYYY, h:mm:ss a")
  data.startTimeFromNow = m(piStartTime).fromNow();

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const element = data[key];
      const regex = new RegExp("{" + key + "}");
      template = template.replace(regex, element);
    }
  }
  return template
};

const port = CURRENT_ENV === "production" ? 5000 : 3001;

app.listen(port);
console.log(`Listening on ${port}`);
