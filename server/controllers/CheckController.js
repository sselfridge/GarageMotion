const moment = require("moment");
const event = require("./eventController");

class CheckController {
  constructor(objIO) {
    console.log("Initalize State");

    this.doorOpenTime = moment();
    this.doorCloseTime = moment(moment() - 5000);
    this.doorStatus = objIO.OPEN;
    this.motionStartTime = moment();
    this.motionStopTime = moment(moment() - 5000);
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
    const secSince = moment(moment() - lastEvent).seconds();
    return secSince > this.DOOR_BUFFER ? true : false;
  }

  checkDoor(doorStatus) {
    const prevDoorStatus = this.doorStatus;

    if (doorStatus !== prevDoorStatus && this.doorBuffer()) {
      if (doorStatus === this.OPEN) {
        console.log("DOOR OPENED!!!!");
        this.doorOpenTime = moment();

        const start = this.doorCloseTime;
        const end = this.doorOpenTime;
        event.createEvent("door", "open", start, end);
      } else if (doorStatus === this.CLOSED) {
        console.log("DOOR CLOSED!!!!");
        this.doorCloseTime = moment();

        const start = this.doorOpenTime;
        const end = this.doorCloseTime;
        event.createEvent("door", "close", start, end);
      } else {
        console.error("Invalid door state");
      }

      this.doorStatus = doorStatus;
    }
  }

  checkMotion(motionStatus) {
    const prevMotionStatus = this.motionStatus;
    if (motionStatus !== prevMotionStatus) {
      if (motionStatus === this.OPEN) {
        console.log("motion Started!!!!!");
        this.motionStartTime = moment();

        const start = this.motionStopTime;
        const end = this.motionStartTime;
        event.createEvent("motion", "start", start, end);
      } else if (motionStatus === this.CLOSED) {
        console.log("motion STOPPED!!!!");
        this.motionStopTime = moment();

        const start = this.motionStartTime;
        const end = this.motionStopTime;
        event.createEvent("motion", "stop", start, end);
      } else {
        console.error("Invalid motion state");
      }

      this.motionStatus = motionStatus;
    }
  }

  checkForActionReq() {}
}

module.exports = CheckController;
