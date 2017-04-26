const textract = require('textract');
const process = require("process");
const fs = require( 'fs' );
const path = require( 'path' );
const gramophone = require('gramophone');
const parse = require('csv-parse/lib/sync');

const GC02 = 0;
const COMP103P = 1;
const TITLE_INDEX = 1;
const CLIENT_INDEX = 3;
const YOUTUBE_INDEX_103P = 4;
const YOUTUBE_INDEX_GC02 = 6;
const TEAM_LEADER_103P = 6;
const TEAM_LEADER_GC02 = 7;

var infosPath = 'data/2017-infos.csv';

var infos = [];

var data = parse(fs.readFileSync(infosPath), {delimiter: ','}); 
var first = true;
for (var line of data) {
  if (first) {
    first = false;
    continue;
  }
  infos.push(line);
}

infos.forEach(function(dataset) {
  const category = dataset[0];
  // console.log("category", category);
  const title = dataset[5].replace(/"/g, "");
  const pathSafeTitle = title.replace("/", " ");
  // console.log(`title: ${title}`)
  const client = dataset[2];
  const names = JSON.stringify(extractTeam(dataset[9]));
  // console.log("names", names);
  const moduleName = dataset[3];
  // console.log("module", moduleName);
  const excerpt = dataset[10].replace("--", "").replace(/"/g, "'").trim();
  const tags = extractKeywords(excerpt);
  // console.log(excerpt);
  if (!fs.existsSync(__dirname + `/output/`)) {
    console.log("does not exist", __dirname);
    fs.mkdirSync(__dirname + `/output/`);
  }
  console.log(__dirname);
  fs.writeFile(__dirname + `/output/2017-04-01-${pathSafeTitle}.md`, 
`---
title: "${title}"
authors: ${names}
category: "${category}"
tags: ${tags}
client: "${client}"
score: -1
image: ""
module: "${moduleName}"
youtube: ""
excerpt: "${excerpt}"
---
${excerpt}`, function(err) {
    if(err) {
        console.log("error: ", err);
    }
  }); 
});

function capitalise(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function extractTeam(teamstring) {
  var team = [];
  if (isNullOrEmpty(teamstring)) {
    return team;
  }
  teamstring = teamstring.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, "");
  teamstring = teamstring.replace(/(\(|\))/gm, "");
  names = teamstring.split(",");
  for (var name of names) {
    if (name.length > 4) {
      name = name.replace(";", "").trim();
      team.push(name);
    }
  }
  console.log("team: ", teamstring, team);
  return team;
}

function isNullOrEmpty(string) {
  string = string.trim().replace(/(\r\n|\n|\r)/gm,"");  
  return !string;
}

function extractKeywords(text) {
  var keywords = gramophone.extract(text, {stopWords: ['ucl', 'ac', 'uk', 'ucl.ac.uk'], limit: 3});
  if (!keywords || keywords.length <= 0) {
    keywords = JSON.stringify([]);
  } else {
    keywords = JSON.stringify(keywords.map(s => s.toLowerCase()));
  }
  return keywords;
}


function extractName(string) {
  string = string.substr(0, string.indexOf('@')); // remove @ucl.ac.uk ending
  string = string.replace(/\.[0-9]+/g, '');       // remove any .15 after name
  string = string.split(".").map(capitalise);     // split by dot and capitalise each
  return string.join(" ");
}