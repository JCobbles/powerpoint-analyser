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
const TEAM_LEADER_103P = 6;
const TEAM_LEADER_GC02 = 7;

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
f(dirPath, COMP103P);

dirPath = "./data/COMPGC02-2015-Poster/";
f(dirPath, GC02);

function capitalise(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getModule(m) {
  if (m == GC02) {
    return "COMPGC02";
  } else {
    return "COMP103P";
  }
}
function extractTeam(id, m) {
  var team = [];
  for (var i = 0; i < 3; i++) {
    if (m == GC02) {
      if (gc02Objects[id][TEAM_LEADER_GC02 + i] != undefined) {
        team.push(gc02Objects[id][TEAM_LEADER_GC02 + i]);
      }
    } else {
      if (comp103pObjects[id] == undefined) {break;}
      if (!isNullOrEmpty(comp103pObjects[id][TEAM_LEADER_103P + i])) {
        team.push(comp103pObjects[id][TEAM_LEADER_103P + i]);
      }
    }
  }
  return team;
}
function isNullOrEmpty(string) {
  string = string.trim().replace(/(\r\n|\n|\r)/gm,"");  
  return !string;
}
function extractTeamNumber(string, m) {
  if (m == GC02) {
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

function extractTitle(id, m) {
  if (m == GC02) {
    return gc02Objects[id][TITLE_INDEX].replace(/[\u2018\u2019]/g, "'");
  } else {
    if (comp103pObjects[id] == undefined) {
      return `Team ${id}`;
    }
    return comp103pObjects[id][TITLE_INDEX].replace(/[\u2018\u2019]/g, "'");
  }
}

function extractClient(id, m) {
  if (m == GC02) {
    return gc02Objects[id][CLIENT_INDEX];
  } else {
    if (comp103pObjects[id] == undefined) {
      return `Client for Team ${id}`;
    }
    return comp103pObjects[id][CLIENT_INDEX];
  }
}

function extractYoutubeLink(id, m) {
  if (m == GC02) {
    return gc02Objects[id][YOUTUBE_INDEX_GC02];
  } else {
    if (comp103pObjects[id] == undefined) {
      return '';
    }
    return comp103pObjects[id][YOUTUBE_INDEX_103P];
  }
}

function getModuleDate(m) {
  if (m == GC02) {
    return "2015-06-01";
  } else {
    return "2016-06-01";
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

function f(dirPath, what) {
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
        
        const keywords = extractKeywords(text);
        const id = extractTeamNumber(this.name, this.thisModule);
        const title = extractTitle(id, this.thisModule);
        console.log(`title: ${title}`)
        const client = extractClient(id, this.thisModule);
        const names = JSON.stringify(extractTeam(id, this.thisModule));
        console.log(names);
        const imageUrl = convertToImage(this.file);
        const youtube = extractYoutubeLink(id, this.thisModule);
        const mdPath = path.dirname(this.output) + `/output/${getModuleDate(this.thisModule)}-${title}.md`;
        const moduleName = getModule(this.thisModule);

        if (!fs.existsSync(path.dirname(this.output) + `/output/`)){
          fs.mkdirSync(path.dirname(this.output) + `/output/`);
        }
        fs.writeFile(mdPath, 
`---
title: "${title}"
authors: ${names}
tags: ${keywords}
client: "${client}"
score: -1
image: "/images/${imageUrl}"
module: "${moduleName}"
youtube: "${youtube}"
excerpt: ""
---
![]({{ site.baseurl }}/images/${imageUrl})`, function(err) {
            if(err) {
                console.log("error: ", err);
            }

        });      

      }.bind({ output: outputPath, name: savedName, file: filePath, thisModule: this.what }));
    }.bind({ what: this.what }));
  }.bind({ what: what }));
}