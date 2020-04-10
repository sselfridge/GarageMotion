const Event = require("../models/event");

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
