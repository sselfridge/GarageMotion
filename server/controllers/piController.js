const MockGpio = require("../MockGpio");

const OPEN = 0;
const CLOSED = 1;
const ON = 1;
const OFF = 0;
const MOVEMENT = 1;
const NO_MOVEMENT = 0;
const piController = {
  // objIO exported to main server

  objIO: {
    red: null,
    yellow: null,
    green: null,
    motion: null,
    doorTime: null, // time door has been in current state
    doorState: null, // current door state

    //constants for the door values
    OPEN: OPEN,
    CLOSED: CLOSED,

    MOVEMENT: MOVEMENT,
    NO_MOVEMENT: NO_MOVEMENT,

    //constants for LED values
    ON: ON,
    OFF: OFF,

    //time constants in seconds
    DOOR_BUFFER: 30, // door must be in new state for this long before changing
    MOTION_TIMEOUT: 1200, // N in minutes x 60 x 1000
  },
};

// exported functions
piController.setupIO = setupIO;
piController.heartbeat = heartbeat;
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
  console.log('ENV Production');
    var onoff = require('onoff');
    const Gpio = onoff.Gpio;
    piController.objIO.motion = new Gpio(4, 'in');
    piController.objIO.door = new Gpio(23, 'in');
    piController.objIO.green =  new Gpio(17, 'out');

  } else {
    piController.objIO.motion = new MockGpio(0);
    piController.objIO.door = new MockGpio(0);
    piController.objIO.green = new MockGpio(0);

  }
  piController.objIO.doorTime = 0; //initialize to 0
  return piController.objIO;
}

let prevState;

function heartbeat() {
  const motionState = piController.objIO.motion.readSync();
  const doorState = piController.objIO.door.readSync();

  // if (doorState) {
  //   turnOnLED("green");
  // } else {
  //   turnOffLED("green");
  // }

  const status = {
    door: doorState,
    motion: motionState,
  };
  return status;
}

function ioStatus() {
  let motion = piController.objIO.motion.readSync();
  let door = piController.objIO.door.readSync();
  let green = piController.objIO.green.readSync();

  motion = motion === MOVEMENT ? "Movement" : "NO Movement";
  door = door === OPEN ? "open" : "closed";
  green = green === ON ? "ON" : "  ";

  return `motion: ${motion} door: ${door}------- -- green:${green}`;
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
  // if (CURRENT_ENV === "dev") console.log(`Blink ${color} LED for ${time}`);
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
