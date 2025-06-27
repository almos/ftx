function getUnixTime() {
  return Math.floor(new Date().getTime() / 1000);
}

module.exports = {
  getUnixTime: getUnixTime,
};
