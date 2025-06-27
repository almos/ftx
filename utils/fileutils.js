let fs = require('fs');

function getFilesizeInBytes(filename) {
  let stats = fs.statSync(filename);
  let fileSizeInBytes = stats.size;
  return fileSizeInBytes;
}

function getFilesizeInMegaBytes(filename) {
  return getFilesizeInBytes(filename) / (1024 * 1024);
}

async function readFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}
module.exports = {
  getFilesizeInBytes: getFilesizeInBytes,
  getFilesizeInMegaBytes: getFilesizeInMegaBytes,
  readFile: readFile,
};
