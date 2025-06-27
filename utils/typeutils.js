const isBoolean = (val) => 'boolean' === typeof val;

function parseBool(val) {
  return (val + '').toLowerCase() === 'true';
}

function isObject(o) {
  return o !== null && typeof o === 'object' && Array.isArray(o) === false;
}

function bufferToString(buffer) {
  let json = JSON.stringify(buffer);
  let originalBuffer = Buffer.from(JSON.parse(json).data);
  return originalBuffer.toString('hex');
}

module.exports = {
  isBoolean: isBoolean,
  parseBool: parseBool,
  isObject: isObject,
  bufferToString: bufferToString,
};
