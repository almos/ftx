const csvParser = require('papaparse');
const fs = require('fs');
const logger = require('./logger').instance;

function importItemsFromCsv(user, pathToFile, makingFunction) {
  return new Promise((resolve, reject) => {
    let fileStream = fs.createReadStream(pathToFile),
      fieldsNames = [];

    let successRecordsCount = 0,
      failedRecordsCount = 0,
      errors = [],
      responseObjects = [];

    csvParser.parse(fileStream, {
      skipEmptyLines: 'greedy',
      worker: true,
      comments: '#',
      step: async (row, parser) => {
        if (!fieldsNames.length) {
          fieldsNames = row.data;
          return;
        }

        let itemObject = makeItemObject(fieldsNames, row.data);
        parser.pause();

        await makingFunction(itemObject)
          .then((response) => {
            if (response?.email) responseObjects.push(response);
            successRecordsCount++;
          })
          .catch((error) => {
            failedRecordsCount++;
            errors.push(`Error: ${error.message} with data: ${row.data}. `);
            logger.error(`Error processing CSV input. Data: ${row.data}. Error: ${error.message}`);
          });

        parser.resume();
      },
      complete: function (result) {
        if (result.errors.length) {
          logger.error(`Due to errors occurred during CSV import file is kept: ${pathToFile}`);
        }

        fs.unlinkSync(pathToFile);

        resolve({
          result: responseObjects,
          success: successRecordsCount,
          failed: failedRecordsCount,
          errors: errors,
        });
      },
    });
  });
}

function makeObjectFromFieldsAndValues(fieldName, object, value) {
  if (!value.trim().length) {
    return object;
  }

  let firstDotIndex = fieldName.indexOf('.'),
    firstOpenBracketIndex = fieldName.indexOf('['),
    firstCloseBracketIndex = fieldName.indexOf(']');

  if (firstDotIndex < 0 && firstOpenBracketIndex < 0) {
    return (object[fieldName] = value);
  }

  if (firstDotIndex < 0) {
    firstDotIndex = Infinity;
  }

  if (firstOpenBracketIndex < 0) {
    firstOpenBracketIndex = Infinity;
  }
  // if next part of fieldName is Object
  if (firstDotIndex < firstOpenBracketIndex) {
    let innerObject = fieldName.slice(0, firstDotIndex);

    if (!object[innerObject]) {
      object[innerObject] = {};
    }
    fieldName = fieldName.replace(`${innerObject}.`, '');

    if (fieldName) {
      makeObjectFromFieldsAndValues(fieldName, object[innerObject], value);
    } else {
      return (object[innerObject] = value);
    }
  }
  // if next part of fieldName is Array
  if (firstOpenBracketIndex < firstDotIndex) {
    let innerArray = fieldName.slice(0, firstCloseBracketIndex + 1),
      arrayName = fieldName.slice(0, firstOpenBracketIndex),
      indexInArray = fieldName.slice(firstOpenBracketIndex + 1, firstCloseBracketIndex);

    if (!object[arrayName]) {
      object[arrayName] = [];
    }
    if (!object[arrayName][parseInt(indexInArray)]) {
      object[arrayName][parseInt(indexInArray)] = {};
    }
    fieldName = fieldName.replace(`${innerArray}`, '');
    if (fieldName.indexOf('.') == 0) {
      fieldName = fieldName.replace('.', '');
    }

    if (fieldName) {
      makeObjectFromFieldsAndValues(fieldName, object[arrayName][indexInArray], value);
    } else {
      return (object[arrayName][indexInArray] = value);
    }
  }

  return object;
}

function makeItemObject(fieldNames, fieldValues) {
  let userObject = {};

  fieldNames.forEach((fieldName, idx) => {
    makeObjectFromFieldsAndValues(fieldName.trim(), userObject, fieldValues[idx]);
  });

  return userObject;
}

module.exports = {
  importItemsFromCsv: importItemsFromCsv,
};
