const Event = require("../models/event");

const eventController = {
  average: "00:00"
};

// controller helper functions

eventController.createEvent = function(type, action, start, end) {
  const duration = end - start;
  const newEvent = new Event({ start, end, duration, type, action });
  newEvent.save();
  console.log(`Event Created`);
};

eventController.getAverageDuration = events => {
  let total = 0;
  events.forEach(element => {
    total += element.duration;
  });
  const avgMilli = total / events.length;
  const avg = (avgMilli / 60000).toFixed(2);
  const seconds = ("0" + Math.floor((avg % 1) * 60)).slice(-2);
  const minutes = Math.floor(avg);
  return `${minutes}:${seconds}`;
};

//Middleware
eventController.getAllEvents = async (req, res, next) => {
  console.log("Get All Events");
  Event.find({}, (err, events) => {
    if (err) {
      console.log("Error getting Events");
      res.locals.err = err;
      next();
    }

    eventController.average = eventController.getAverageDuration(events);
    res.locals.data = events;
    next();
  });
};

eventController.getAverage = (req, res, next) => {
  if (res.locals.err) next();
  res.locals.average = eventController.average; //this is commuted when getAllEvents is called
  next();
};

module.exports = eventController;
