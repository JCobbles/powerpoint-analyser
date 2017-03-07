var textract = require('textract');

textract.fromFileWithPath(filePath, function( error, text ) {
  console.log(error);
  console.log(text);
});
