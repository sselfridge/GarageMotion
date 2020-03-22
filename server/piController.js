const MockGpio = require("./MockGpio");

const OPEN = 1;
const CLOSED = 0;
const ON = 1;
const OFF = 0;

const piController = {
  // objIO exported to main server

  objIO: {
    red: null,
    yellow: null,
    green: null,
    motion: null,
    doorTime: 0, // time door has been in current state
    doorState: OPEN, // current door state
    //constants for the door values
    OPEN: OPEN,
    CLOSED: CLOSED,

    //constants for LED values
    ON: 1,
    OFF: 0,

    //time constants
    STATE_CHANGE_TIMEOUT: 500 //time in new door state before changing
  }
};

piController.setupIO = setupIO;
piController.motionCheck = motionCheck;
piController.ioStatus = ioStatus;
piController.blinkLED = blinkLED;
piController.turnOffLED = turnOffLED;
piController.turnOnLED = turnOnLED;

const CURRENT_ENV = process.env.NODE_ENV === "production" ? "production" : "dev";

// for Production it will look at the actuall Pi
// rest will use mockups driven by the ui
// prettier-ignore
function setupIO(){
    console.log(`PI Controller: Setup IO`);
if (CURRENT_ENV === 'production') {
    var onoff = require('onoff');
    const Gpio = onoff.Gpio;
    piController.objIO.motion = new Gpio(2, 'in');
    piController.objIO.green =  new Gpio(4, 'out');
    piController.objIO.yellow = new Gpio(27, 'out');
    piController.objIO.red =  new Gpio(22, 'out');
  } else {
    piController.objIO.motion = new MockGpio();
    piController.objIO.green = new MockGpio();
    piController.objIO.yellow = new MockGpio();
    piController.objIO.red = new MockGpio();
  }
  piController.objIO.doorTime = 0; //initialize to 0
  return piController.objIO;
}

let prevState;
// returns closed (in use) or open (available) (same as objIO.OPEN objIO.CLOSED)
// room consitered in use when it has been in the new state for > 30 seconds
// expected to be called every 1000ms in server.js
function motionCheck() {
  const currentState = piController.objIO.motion.readSync();
  let doorState = piController.objIO.doorState;
  let doorTime = piController.objIO.doorTime;

  if (currentState !== prevState) {
    blinkLED("yellow", 1000);
  }

  prevState = currentState;

  if (currentState !== doorState && doorTime === 0) {
    // start timer
    // console.log('Start Door Timer');
    piController.objIO.doorTime = Date.now();
  }

  if (currentState !== doorState && doorTime > 0) {
    const diffTime = Date.now() - doorTime;
    // console.log(`Door Timer: ${diffTime}`);
    if (diffTime > piController.objIO.STATE_CHANGE_TIMEOUT) {
      //change door state
      //   console.log('Change Door State!');
      doorState = doorState ^ 1;
      piController.objIO.doorTime = 0;
    }
  } else if (currentState === doorState && doorTime > 0) {
    // door closed before timeout - remove timer
    piController.objIO.doorTime = 0;
  }

  piController.objIO.doorState = doorState;
  return doorState;
}

function ioStatus() {
  let motion = piController.objIO.motion.readSync();
  let red = piController.objIO.red.readSync();
  let yellow = piController.objIO.yellow.readSync();
  let green = piController.objIO.green.readSync();

  motion = motion === OPEN ? "open" : "closed";
  red = red === ON ? "ON" : "  ";
  yellow = yellow === ON ? "ON" : "  ";
  green = green === ON ? "ON" : "  ";

  return `motion: ${motion} -- -------------------- -- green:${green}`;
}

function turnOnLED(color, timeout = 0) {
  let led;
  switch (color) {
    case "red":
      led = piController.objIO.red;
      break;
    case "yellow":
      led = piController.objIO.yellow;
      break;
    case "green":
      led = piController.objIO.green;
      break;
    default:
      console.log("INVALID COLOR FOUND");
      break;
  }

  led.writeSync(ON);
  if (timeout) {
    setTimeout(turnOffLED, timeout, color);
  }
}

function turnOffLED(color, timeout = 0) {
  let led;
  switch (color) {
    case "red":
      led = piController.objIO.red;
      break;
    case "yellow":
      led = piController.objIO.yellow;
      break;
    case "green":
      led = piController.objIO.green;
      break;
    default:
      console.log("INVALID COLOR FOUND");
      break;
  }

  led.writeSync(OFF);
  if (timeout !== 0) {
    setTimeout(turnOnLED, timeout, color);
  }
}

function blinkLED(color, time = 5000) {
  console.log(`Blink ${color} LED for ${time}`);
  let led;
  switch (color) {
    case "red":
      led = piController.objIO.red;
      break;
    case "yellow":
      led = piController.objIO.yellow;
      break;
    case "green":
      led = piController.objIO.green;
      break;
    default:
      console.log("INVALID COLOR FOUND");
      break;
  }
  let toggled = led.readSync() ^ 1;
  led.writeSync(toggled);
  if (time > 500) {
    setTimeout(blinkLED, 500, color, time - 500);
  } else {
    led.writeSync(OFF);
  }
}

module.exports = piController;
