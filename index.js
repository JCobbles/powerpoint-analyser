const textract = require('textract');
const summarizer = require('nodejs-text-summarizer')
const process = require("process");
const cullKeywords = require('cull-keywords');
const fs = require( 'fs' );
const path = require( 'path' );

var dirPath = "./data/COMP103P-2016-Poster/";

function capitalise(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function extractName(string) {
  string = string.substr(0, string.indexOf('@')); // remove @ucl.ac.uk ending
  string = string.replace(/\.[0-9]+/g, '');       // remove any .15 after name
  string = string.split(".").map(capitalise);     // split by dot and capitalise each
  console.log(string);
  return string.join(" ");
}

function extractNamesFromText(string) {
    var emails = string.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
    if (emails == null) {
      return [];
    } else {
      return emails.map(extractName);
    }
}

fs.readdir(dirPath, function(err, files) {
  if(err) {
      console.error("Could not list the directory", err);
      process.exit(1);
  }

  files.forEach(function(file, index) {
    var extension = path.extname(file);
    if (extension == ".info") {
      return;
    }
    var filePath = path.join(dirPath, file);
    var outputPath = path.join(dirPath, path.basename(file, extension) + ".info");
    console.log(outputPath);
    textract.fromFileWithPath(filePath, { preserveLineBreaks: true }, function(error, text) {
      if (error) {
        console.log(error);
        return;
      }

      //console.log(text);

      cullKeywords(text, function(err, results) {
        //console.log(results);
        var names = JSON.stringify(extractNamesFromText(this.text));
        console.log(names);
        var keywords;
        if (!results || !results.keywords || results.keywords.length <= 0) {
          keywords = "";
        } else {
          keywords = JSON.stringify(results.keywords.map(s => s.toLowerCase()));
        }
        fs.writeFile(this.output, "{ text: \"" + this.text + "\", authors: " + names + " tags: " + keywords + "}", function(err) {
            if(err) {
                return console.log(err);
            }

        });
      }.bind({ text: text, output: this.output }));

      //console.log(summarizer(text));

    }.bind({ output: outputPath }));
  });
});
