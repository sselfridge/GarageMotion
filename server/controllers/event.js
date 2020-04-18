const m = require("moment");
const Event = require("../models/event");

class CheckController {
  constructor(objIO) {
    console.log("Initalize State");

    this.doorOpenTime = m();
    this.doorCloseTime = m(m() - 5000);
    this.doorStatus = objIO.OPEN;
    this.motionStartTime = m();
    this.motionStopTime = m(m() - 5000);
    this.motionStatus = objIO.MOVEMENT;

    this.OPEN = objIO.OPEN;
    this.CLOSED = objIO.CLOSED;
    this.MOVEMENT = objIO.MOVEMENT;
    this.NO_MOVEMENT = objIO.NO_MOVEMENT;

    this.DOOR_BUFFER = objIO.DOOR_BUFFER;
    this.MOTION_TIMEOUT = objIO.MOTION_TIMEOUT;
  }

  //only change status after a buffer time has past.
  //set in piController.js
  doorBuffer() {
    const lastEvent = Math.max(this.doorCloseTime, this.doorOpenTime);
    const secSince = m(m() - lastEvent).seconds();
    return secSince > this.DOOR_BUFFER ? true : false;
  }

  checkDoor(doorStatus) {
    const prevDoorStatus = this.doorStatus;

    if (doorStatus !== prevDoorStatus) {
      if (doorStatus === this.OPEN) {
        console.log("DOOR OPENED");
        this.doorOpenTime = m();
      } else if (doorStatus === this.CLOSED) {
        console.log("DOOR CLOSED");
        this.doorCloseTime = m();

        const start = this.doorOpenTime;
        const end = this.doorCloseTime;
        createEvent("door", "close", start, end);
      } else {
        console.error("Invalid door state");
      }

      this.doorStatus = doorStatus;
    }
  }

  checkMotion(motionStatus, doorStatus) {
    const prevMotionStatus = this.motionStatus;
    if (motionStatus !== prevMotionStatus) {
      if (motionStatus === this.MOVEMENT) {
        console.log("motion Started");
        this.motionStartTime = m();
      } else if (motionStatus === this.NO_MOVEMENT) {
        console.log("motion Stopped");
        this.motionStopTime = m();

        const start = this.motionStartTime;
        const end = this.motionStopTime;
        createEvent("motion", "stop", start, end);
      } else {
        console.error("Invalid motion state");
      }

      this.motionStatus = motionStatus;
    }
  }

  getData() {
    const formatStr = "dddd, MMMM Do YYYY - h:mm:ss a";
    const formatStr2 = "h:mm:ss a";
    const { doorOpenTime, doorCloseTime, motionStopTime, doorStatus, OPEN } = this;
    const motionDuration = m(motionStopTime).fromNow();
    const doorStatusText = doorStatus === OPEN ? "OPEN" : "CLOSED";
    const mostRecentDoorEvent = Math.max(doorCloseTime, doorOpenTime);
    const doorDuration = m(mostRecentDoorEvent).fromNow();

    return {
      currentTime: m().format(formatStr),
      doorStatus: doorStatusText,
      doorDuration,
      motionDuration,
      motionTime: m(motionStopTime).format(formatStr2),
      doorTime: m(mostRecentDoorEvent).format(formatStr2),
      intervalCount
    };
  }
}

createEvent = function (type, note, start, end) {
  const duration = end - start;
  const newEvent = new Event({ start, end, duration, type, note });
  newEvent.save();
  console.log(`Event Created`);
};

module.exports = CheckController;
