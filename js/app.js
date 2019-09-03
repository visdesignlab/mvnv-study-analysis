console.log("running node script");
("use strict");

const firebase = require("firebase");
// Required for side-effects
require("firebase/firestore");

const fs = require("fs");

// require("../libs/firebase-app.js");
let firestore = require("./firebaseApi.js");
let db = firestore.connect();

let taskTitles = {
  "S-task01": "NA with most tweets",
  "S-task02": "EU with least likes [Distractors]",
  "S-task03": "Well connected with few likes/tweets",
  "S-task04": "Lane's EU neighbors",
  "S-task05": "giCentre's NA neighbors [Distractors]",
  "S-task06": "Most mentions with Jeffrey",
  "S-task07": "Alex more EU or NA interactions? Most mentions with Alex. ",
  "S-task08": "Most followers among common neighbors of Jeffrey and Robert",
  "S-task09": "Most common/how many interactions between Evis19 and Jon",
  "S-task10": "Noeska's neighbors with more friends than followers",
  "S-task11": "Thomas' neighbors with more friends than followers [small]",
  "S-task12": "Alex cluster / average number of followers.",
  "S-task13": "Inst.(nationality) on shortest path from Lane to Rob.",
  "S-task14": "Inst.(nationality) on shortest path from Jason to Jon. [small]",
  "S-task15": "Oldest account of all NA two interactions from Sereno",
  "S-task16": "Free Explore"
};

(async function() {
  let mode = process.argv[2];
  console.log("mode is ", mode);
  switch (mode) {
    case "fetch":
      await fetchData();
      break;
    case "fetchProvenance":
      await fetchProvenance();
      break;
    case "process":
      processData();
      break;
    case "provenance":
      processProvenance();
      break;
    case "export":
      exportResults();
      break;
  }
})();

//function to filter out only valid participants;
function isValidParticipant(d) {
  return d.data.mode === "study" && d.id[0] === "5" && d.data.demographics;
}

async function fetchProvenance() {
  paginate(0);
}

async function paginate(i, lastDoc) {
  let ref;

  if (lastDoc) {
    ref = db
      .collection("provenance")
      .orderBy("initialSetup")
      .startAfter(lastDoc.data().initialSetup)
      .limit(1000);
  } else {
    ref = db
      .collection("provenance")
      .orderBy("initialSetup")
      .limit(1000);
  }

  ref.get().then(snapshot => {
    // ...
    let numDocs = snapshot.docs.length;
    console.log("numDocs", numDocs);

    let data = JSON.stringify(
      snapshot.docs.map(d => {
        return { id: d.id, data: d.data() };
      })
    );
    fs.writeFileSync("provenance_" + i + ".json", data);

    // Get the last document
    let last = snapshot.docs[snapshot.docs.length - 1];

    if (numDocs === 1000) {
      paginate(i + 1, last);
    }
  });
}

async function fetchData() {
  let querySnapshot = await db.collection("study_participants").get();

  let studyParticipants = [];
  querySnapshot.forEach(function(doc) {
    let data = doc.data();
    studyParticipants.push({ id: doc.id, data });
  });

  studyParticipants = studyParticipants.filter(isValidParticipant);

  console.log("fetched", studyParticipants.length, "valid participants");

  //array of ids for valid participants;
  let participantIDs = studyParticipants.map(p => p.id);

  fs.writeFileSync(
    "study_participants.json",
    JSON.stringify(studyParticipants)
  );

  console.log("exported study_participants.json");

  let collectionNames = [
    "results",
    "participant_actions"
    // "heuristics_participants",
    // "trial_provenance",
    // "trial_results",
  ];

  await collectionNames.map(async collectionName => {
    let collectionRef, queryRef;
    collectionRef = db.collection(collectionName);
    queryRef = collectionRef;

    let querySnapshot = await queryRef.get();

    let allData = [];
    querySnapshot.forEach(function(doc) {
      let data = doc.data();
      if (participantIDs.includes(doc.id)) {
        allData.push({ id: doc.id, data });
      }
    });

    let data = JSON.stringify(allData);
    fs.writeFileSync(collectionName + ".json", data);

    console.log("saved", collectionName);
  });
}

async function processData() {
  //load data;

  let rawdata;

  rawdata = fs.readFileSync("results/study/JSON/study_participants.json");
  let participant_info = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/study/JSON/results.json");

  let results = JSON.parse(rawdata);

  

  results.map(p => {
    //flatten answer.nodes, then flatten the whole data;
    Object.keys(p.data).map(key => {
      delete p.data[key].replyCount;
      delete p.data[key].replyType;
      delete p.data[key].answerKey;

      if (p.data[key].answer) {
        ["answer"].map(answer => {
          //answerKey as well?
          p.data[key][answer].ids = p.data[key][answer].nodes
            .map(n => n.id)
            .join("; ");
          p.data[key][answer].nodes = p.data[key][answer].nodes
            .map(n => n.name)
            .join("; ");
        });

        //compute accuracy and add to data structure;
        let answer = p.data[key].answer;
        // console.log('user id', p.data[key].workerID)
        answer.accuracy = computeAccuracy(key, answer); // col for more nuanced score
        // console.log('accuracy for task ', key ,  ' is ', answer.accuracy)
        answer.correct = answer.accuracy === 1 ? 1 : 0; //col for boolean right/wrong
      }

      p.data[key].taskID = key;
    });

    //compute average accuracy for this participant;
    p.data.averageAccuracy =
      Object.keys(p.data).reduce((acc, key) => {
        return acc + p.data[key].answer.accuracy;
      }, 0) / Object.keys(p.data).length;

    // console.log("average accuracy for ", p.id, " is ", p.data.averageAccuracy);

    p.data.workerID = p.id;
    delete p.id;

    //add overall accuracy to participant info

    let participant = participant_info.find(pt => pt.id === p.data.workerID);

    participant.data.averageAccuracy = p.data.averageAccuracy;

    p.data.overallMinutesToComplete = participant.data.minutesToComplete;

    //add demographic information for this participant;
    p.data.demographics = participant.data.demographics;
    p.data.overallFeedback = participant.data.feedback;

    return p.data;
  });

  fs.writeFileSync("processed_results.json", JSON.stringify(results));
  console.log("exported processed_results.json");

  fs.writeFileSync("study_participants.json", JSON.stringify(participant_info));
  console.log("exported updated study_participants.json");
}

function exportResults() {
  let rawdata = fs.readFileSync("results/study/JSON/processed_results.json");
  let results = JSON.parse(rawdata);

  exportCSV(results);
  exportTidy(results);
}

async function exportCSV(results) {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;
  let csvWriter;

  let csvKeys = [];

  results.map(r => {
    Object.keys(flatten(r.data)).map(key => {
      if (!csvKeys.includes(key)) {
        csvKeys.push(key);
      }
    });
  });

  csvKeys = csvKeys.filter(k => {
    return (
      k.includes("answer.nodes") ||
      k.includes("answer.accuracy") ||
      k.includes("answer.correct") ||
      k.includes("answer.radio") ||
      k.includes("answer.value") ||
      k.includes("feedback") ||
      k.includes("minutesToComplete") ||
      k.includes("order") ||
      k.includes("prompt") ||
      k.includes("workerID") ||
      k.includes("overall") ||
      k.includes("averageAccuracy") ||
      k.includes("demographics") ||
      k.includes("visType") ||
      k.includes("taskID")
    );
  });

  // console.log(csvKeys)

  csvWriter = createCsvWriter({
    path: "results.csv",
    header: csvKeys.map(key => {
      return { id: key, title: key };
    })
  });

  let sorted = results
    //sort by visType
    .sort((a, b) => (a.data["S-task01"].visType === "nodeLink" ? 1 : -1));

  let csvValues = sorted.map(p => {
    //fill in missing values;
    let obj = {};
    csvKeys.map(key => {
      let value = nameSpace(p.data, key);
      // console.log(key, value)
      //user did not take that task
      if (value === undefined) {
        console.log("missing value for ", key);
        setNested(p.data, key, "");
      }

      let v = nameSpace(p.data, key);

      //remove commas, newlines, and html markup
      if (typeof v === "string") {
        v = v.replace(/,/g, "");
        v = v.replace(/\r?\n|\r/g, "");
        v = v.replace(/<span class='attribute'>/g, "");
        v = v.replace(/<span class='attribute' >/g, "");
        v = v.replace(/<\/span>/g, "");
      }
      // return v.toString();
      obj[key] = v;
    });
    return obj;
  });

  csvWriter
    .writeRecords(csvValues)
    .then(() => console.log("results.csv was written successfully"));
}

async function exportTidy(results) {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;
  let csvWriter;

  let rawdata = fs.readFileSync("results/study/JSON/study_participants.json");
  let participants = JSON.parse(rawdata);

  let rHeaders, rRows;

  rHeaders = ["prolificId", "measure", "value"];

  csvWriter = createCsvWriter({
    path: "participantInfoTidyR.csv",
    header: rHeaders.map(key => {
      return { id: key, title: key };
    })
  });

  rRows = [];

  participants.map(participant => {
    let id = participant.data.PROLIFIC_PID;

    let createTidyRow = function(measure, value) {
      return {
        prolificId: id,
        measure,
        value
      };
    };

    rRows.push(createTidyRow("browser",participant.data.browserInfo['Browser name']));
    rRows.push(createTidyRow("age",participant.data.demographics.age));
    rRows.push(createTidyRow("degree",participant.data.demographics.degree));
    rRows.push(createTidyRow("sex",participant.data.demographics.sex));
    rRows.push(createTidyRow("visExperience",participant.data.demographics.vis_experience));
    rRows.push(createTidyRow("minutesToComplete",Math.round(participant.data.minutesToComplete)));
    rRows.push(createTidyRow("averageAccuracy",participant.data.averageAccuracy));
  });

  csvWriter
    .writeRecords(rRows)
    .then(() => console.log("participantInfoTidyR.csv was written successfully"));


    
  rHeaders = [
    "prolificId",
    "taskId",
    "taskTitle",
    "visType",
    "taskType",
    "topology",
    "hypothesis_1",
    "hypothesis_2",
    "measure",
    "value"
  ];

  csvWriter = createCsvWriter({
    path: "TidyR.csv",
    header: rHeaders.map(key => {
      return { id: key, title: key };
    })
  });

  rRows = [];

  results.map(participantData => {
    let id = participantData.data.workerID;

    Object.keys(participantData.data)
      .filter(key => key[0] === "S") //only look at task keys
      .map(taskId => {
        let createTidyRow = function(measure, value) {
          let hypothesis = data.hypothesis.split(",");

          return {
            prolificId: id,
            taskId: taskId,
            taskTitle: taskTitles[taskId],
            visType: data.visType,
            taskType: data.taxonomy.type,
            topology: data.taxonomy.target,
            hypothesis_1: hypothesis[0],
            hypothesis_2: hypothesis[1] ? hypothesis[1] : "",
            measure,
            value
          };
        };

        let data = participantData.data[taskId];

        //create a row for every relevant value;
        data.answer.nodes
          .split(";")
          .map(n => n.trim())
          .map(node => {
            rRows.push(createTidyRow("nodeAnswer", node));
          });

        data.answer.value
          .split(";")
          .map(n => n.trim())
          .map(v => {
            if (v.length > 0) {
              v = v.replace(/,/g, "");
              v = v.replace(/\r?\n|\r/g, "");
              rRows.push(createTidyRow("valueAnswer", v));
            }
          });

        if (data.answer.radio) {
          rRows.push(createTidyRow("valueAnswer", data.answer.radio));
        }
        rRows.push(createTidyRow("accuracy", data.answer.accuracy));
        rRows.push(createTidyRow("correct", data.answer.correct));
        rRows.push(createTidyRow("difficulty", data.feedback.difficulty));
        rRows.push(createTidyRow("confidence", data.feedback.confidence));
        rRows.push(createTidyRow("minutesToComplete", data.minutesToComplete));
      });
  });

  csvWriter
    .writeRecords(rRows)
    .then(() => console.log("TidyR.csv was written successfully"));
}

function computeAccuracy(taskID, answerObj) {
  //dictionary of functions that compute the accuracy for each task; Each function
  // returns a score between 0 and 1

  let second = 0.8; //credit given for second best answer;
  let third = 0.6; //credit given for second best answer;

  let answers = {
    "S-task01": function(answer) {
      if (answer.ids.includes("18704160")) {
        //T.J - 5151 tweets
        return 1;
      }

      if (answer.nodes.includes("9527212")) {
        //Arvind - 4812 tweets
        return second;
      }

      if (answer.nodes.includes("44195788")) {
        //Carlos - 4787 tweets
        return third;
      }
      return 0;
    },
    "S-task02": function(answer) {
      if (answer.ids.includes("909697437694087200")) {
        //Evis2018
        return 1;
      }
      if (
        //Jason - 7 likes and european
        answer.ids.includes("19299318") ||
        //EVision - 7 lkes and european
        answer.ids.includes("190726679")
      ) {
        return second;
      }

      return 0;
    },
    "S-task03": function(answer) {
      //Jeffrey or Alex
      let correctAnswers = ["247943631", "81658145", "208312922", "40219508"];
      if (correctAnswers.find(a => a == answer.ids)) {
        return 1;
      }
      // //Rob && Noeska
      // if (correctAnswers.find(a => a == answer.ids)) {
      //   return second;
      // }

      return 0;
    },
    "S-task04": function(answer) {
      // 'AA','Noeska', 'Till', 'Joe'
      let correctAnswers = ["191257554", "40219508", "36853217", "15208867"];
      return scoreList(correctAnswers, answer);
    },
    "S-task05": function(answer) {
      //Robert 16112517
      let score = answer.ids
        .split(";")
        .map(a => a.trim())
        .reduce((acc, cValue) => (cValue == "16112517" ? acc + 1 : acc - 1), 0);
      return Math.max(0, score);
    },
    "S-task06": function(answer) {
      //Robert 16112517
      let score = answer.ids
        .split(";")
        .reduce((acc, cValue) => (cValue == "16112517" ? acc + 1 : acc - 1), 0);
      return Math.max(0, score);
    },
    "S-task07": function(answer) {
      let score = 0;
      if (answer.radio === "European") {
        score = score + 0.5; //score for getting the type right
      }

      if (answer.ids.includes("395853499")) {
        //Marc
        console.log()
        score = score + 0.5;
      }

      return score;
    },
    "S-task08": function(answer) {
      if (answer.ids === "78865306") {
        //Chris
        return 1;
      }

      if (answer.ids === "1652270612") {
        //Tamara
        return second;
      }

      if (answer.ids === "16112517") {
        //Robert
        return third;
      }
      return 0;
    },
    "S-task09": function(answer) {
      let score = 0;
      if (answer.radio === "Mentions") {
        score = score + 0.5; //score for getting the type right
      }
      if (answer.value == 4) {
        score = score + 0.5; //score for getting the weight right
      }

      return score;
    },
    "S-task10": function(answer) {
      // 'Lonni','Thomas', 'Anna', 'Klaus'
      let correctAnswers = [
        "2924711485",
        "2527017636",
        "446672281",
        "270431596"
      ];
      return scoreList(correctAnswers, answer);
    },
    "S-task11": function(answer) {
      //  'Anna'
      let correctAnswers = ["446672281"];
      return scoreList(correctAnswers, answer);
    },
    "S-task12": function(answer) {
      //Jason, giCentre, Noeska, Alex, EVis19, Robert,
      let correctAnswers = [
        "19299318",
        "19283433",
        "40219508",
        "81658145",
        "1085199426837188600",
        "16112517"
      ];
      let score = scoreList(correctAnswers, answer,.5);

      // console.log('score is ', score)
      score = answer.value >= 400 && answer.value <= 800 ? score + 0.5 : score;
      // console.log('score is ', score)

      return score;
    },
    "S-task13": function(answer) {
      let score = 0;
      if (answer.radio === "EU") {
        score = score + 0.5; //score for getting the type right
      }

      if (answer.ids.includes("191257554")) {
        //AA
        score = score + 0.5;
      }

      return score;
    },
    "S-task14": function(answer) {
      let score = 0;
      if (answer.radio === "EU") {
        score = score + 0.5; //score for getting the type right
      }

      if (answer.ids.includes("1085199426837188600")) {
        //EVis19
        score = score + 0.5;
      }

      return score;
    },
    "S-task15": function(answer) {
      //Robert 16112517
      return answer.ids.includes("16112517") ? 1 : 0;
    },
    "S-task16": function(answer) {
      return 1;
    }
  };

  function scoreList(correctAnswers, answer,maxValue=1) {
    //+.25 points for each correct answer -.1 point for each incorrect answer;
    let ids = answer.ids.split(";").map(a => a.trim());

    let score = ids.reduce(
      (acc, cValue) =>
        correctAnswers.find(a => a == cValue)
          ? acc + 1 / correctAnswers.length
          : acc - 1 / correctAnswers.length,
      0
    );

    return Math.max(0, score*maxValue);
  }

  return answers[taskID](answerObj);
}

function processProvenance() {
  let rawdata;
  rawdata = fs.readFileSync("results/events.json");
  let eventTypes = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/study/JSON/processed_results.json");
  let results = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/study/JSON/participant_actions.json");
  let provenance = JSON.parse(rawdata);

  //create events objects per participant;
  let events = [];

  provenance.map(participant => {
    participantEventArray = [];

    participant.data.provGraphs.map(action => {
      //see if this a single event, or the start/end of a long event;
      let event = eventTypes[action.event];

      if (event && event.type === "singleAction") {
        //create copy of event template
        let eventObj = JSON.parse(JSON.stringify(eventTypes[action.event]));
        eventObj.label = action.event;
        eventObj.time = action.time;
        if (eventObj.label !== "next" && eventObj.label !== "back") {
          participantEventArray.push(eventObj);
        }
      } else {
        //at the start of an event;
        if (event && event.start.trim() == action.event.trim()) {
          let eventObj = JSON.parse(JSON.stringify(eventTypes[action.event]));
          eventObj.startTime = action.time;
          eventObj.task = action.task;
          participantEventArray.push(eventObj);
        } else {
          //at the end of an event;
          //find the 'start' eventObj;
          let startObj = participantEventArray
            .filter(e => {
              let value =
                e.type === "longAction" &&
                Array.isArray(e.end) &&
                e.end.includes(action.event) &&
                (e.label === "task" ? e.task === action.task : true);
              return value;
            })
            .pop();
          if (startObj === undefined) {
            console.log("could not find start event for ", action);
          } else {
            startObj.endTime = action.time;
          }
        }
      }
    });

    events.push({ id: participant.id, provEvents: participantEventArray });
    // console.log(participantEventArray.filter(e=>e.type === 'longAction' && e.endTime === undefined))
  });

  // console.log(events)
  fs.writeFileSync("provenance_events.json", JSON.stringify(events));
  console.log("exported provenance_events.json");
}

function flatten(data) {
  var result = {};
  function recurse(cur, prop) {
    if (Object(cur) !== cur) {
      result[prop] = cur;
    } else if (Array.isArray(cur)) {
      for (var i = 0, l = cur.length; i < l; i++)
        recurse(cur[i], prop + "[" + i + "]");
      if (l == 0) result[prop] = [];
    } else {
      var isEmpty = true;
      for (var p in cur) {
        isEmpty = false;
        recurse(cur[p], prop ? prop + "." + p : p);
      }
      if (isEmpty && prop) result[prop] = {};
    }
  }
  recurse(data, "");
  return result;
}

function nameSpace(obj, path) {
  var property,
    path = path.split(".");
  while ((property = path.shift())) {
    if (typeof obj[property] === "undefined") return undefined;
    obj = obj[property];
  }
  return obj;
}

function setNested(obj, path, value) {
  var property,
    path = path.split(".");
  while ((property = path.shift())) {
    if (typeof obj[property] === "undefined") {
      if (path.length > 0) {
        obj[property] = {};
      }
    }

    if (path.length === 0) {
      obj[property] = value;
    } else {
      obj = obj[property];
    }
    // console.log(obj,property,obj[property])
  }
}
