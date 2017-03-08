var textract = require('textract');
const cullKeywords = require('cull-keywords');

textract.fromFileWithPath("./data/COMP103P-2016-Poster/1st_team03.pptx", { preserveLineBreaks: true }, function( error, text ) {
  console.log(error);
  console.log(text);

  cullKeywords(text, (err, results) => {
    console.log(results);
  });

});
