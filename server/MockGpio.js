
// mock functionality of the GPIO on the pi
// no support for permissions of in vs out.
function mockGpio() {
  this.value = 1;
}

mockGpio.prototype.readSync = function() {
  return this.value;
};

mockGpio.prototype.writeSync = function(val) {
  this.value = val;
};


module.exports = mockGpio;