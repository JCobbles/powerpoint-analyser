const textract = require('textract');
const process = require("process");
const fs = require( 'fs' );
const path = require( 'path' );
const gramophone = require('gramophone');
const parse = require('csv-parse/lib/sync');
const ppt2png = require('ppt2png');
const PDFImage = require("pdf-image").PDFImage;

const GC02 = 0;
const COMP103P = 1;
const TITLE_INDEX = 1;
const CLIENT_INDEX = 3;
const YOUTUBE_INDEX_103P = 4;
const YOUTUBE_INDEX_GC02 = 6;

var what = COMP103P;
var gc02InfosPath = 'data/GC02-infos.csv';
var comp103pInfosPath = 'data/COMP103P-infos.csv';

var gc02Objects = [];
var comp103pObjects = [];

var data = parse(fs.readFileSync(gc02InfosPath), {delimiter: ','}); 
var first = true;
for (var line of data) {
  if (first) {
    first = false;
    continue;
  }
  gc02Objects[line[0]] = line;
}

var data = parse(fs.readFileSync(comp103pInfosPath), {delimiter: ','}); 
first = true;
for (var line of data) {
  if (first) {
    first = false;
    continue;
  }
  comp103pObjects[line[0]] = line;
}

var dirPath = "./data/COMP103P-2016-Poster/";
f(dirPath);
dirPath = "./data/COMP103P-2016-Poster/";
f(dirPath);

function capitalise(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function extractTeamNumber(string) {
  if (what == GC02) {
    return parseInt(string);
  } else {
    return parseInt(string.substr(-2));
  }
}
function extractKeywords(text) {
  var keywords = gramophone.extract(text, {stopWords: ['ucl', 'ac', 'uk', 'ucl.ac.uk'], limit: 3});
  if (!keywords || keywords.length <= 0) {
    keywords = [];
  } else {
    keywords = JSON.stringify(keywords.map(s => s.toLowerCase()));
  }
  return keywords;
}

function extractTitle(id) {
  if (what == GC02) {
    return gc02Objects[id][TITLE_INDEX];
  } else {
    if (comp103pObjects[id] == undefined) {
      return `Team ${id}`;
    }
    return comp103pObjects[id][TITLE_INDEX];
  }
}

function extractClient(id) {
  if (what == GC02) {
    return gc02Objects[id][CLIENT_INDEX];
  } else {
    if (comp103pObjects[id] == undefined) {
      return `Client for Team ${id}`;
    }
    return comp103pObjects[id][CLIENT_INDEX];
  }
}

function extractYoutubeLink(id) {
  if (what == GC02) {
    return gc02Objects[id][YOUTUBE_INDEX_GC02];
  } else {
    if (comp103pObjects[id] == undefined) {
      return '';
    }
    return comp103pObjects[id][YOUTUBE_INDEX_103P];
  }
}

function convertToImage(file) {
  var extension = path.extname(file);
    if (extension == ".pdf") {
      var pdfImage = new PDFImage(file);
      pdfImage.convertPage(0).then(function (imagePath) {});
    } else {
      ppt2png(file, "./" + path.dirname(file) + "/" + path.basename(file, extension) + '-0', function(err) {
        console.log("ppt2png error: ", err);
      });
    }
    return path.basename(file, extension) + '-0.png';
}

function extractName(string) {
  string = string.substr(0, string.indexOf('@')); // remove @ucl.ac.uk ending
  string = string.replace(/\.[0-9]+/g, '');       // remove any .15 after name
  string = string.split(".").map(capitalise);     // split by dot and capitalise each
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
const moduleClass = "COMP103P";

function f(dirPath) {
  fs.readdir(dirPath, function(err, files) {
    if(err) {
        console.error("Could not list the directory", err);
        process.exit(1);
    }

    files.forEach(function(file, index) {
      var extension = path.extname(file);
      if (extension == ".md" || extension == ".png") {
        return;
      }
      var filePath = path.join(dirPath, file);
      var savedName = path.basename(file, extension);
      var outputPath = path.join(dirPath, savedName + ".md");

      textract.fromFileWithPath(filePath, { preserveLineBreaks: true }, function(error, text) {
        if (error) {
          console.log("errr: ", error);
          return;
        }

        var names = JSON.stringify(extractNamesFromText(text));
        
        const keywords = extractKeywords(text);
        const id = extractTeamNumber(this.name);
        const title = extractTitle(id);
        const client = extractClient(id);
        const imageUrl = convertToImage(this.file);
        const youtube = extractYoutubeLink(id);

        fs.writeFile(this.output, `
        ---
        title: ${title}
        authors: ${names}
        tags: ${keywords}
        client: ${client}
        score: -1
        image: "/images/${imageUrl}"
        module: "${moduleClass}"
        youtube: "${youtube}"
        ---
        ![]({{ site.baseurl }}/images/${imageUrl})`, function(err) {
            if(err) {
                console.log("error: ", err);
            }

        });      

      }.bind({ output: outputPath, name: savedName, file: filePath }));
    });
  });
}