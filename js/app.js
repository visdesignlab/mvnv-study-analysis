console.log("running node script");
("use strict");

const firebase = require("firebase");
// Required for side-effects
require("firebase/firestore");

const fs = require("fs");

// require("../libs/firebase-app.js");
let firestore = require("./firebaseApi.js");
let db = firestore.connect();

let followers = [
  { id: 91169926, followers: 875.9531049269019 },
  { id: 208312922, followers: 540 },
  { id: 191257554, followers: 407 },
  { id: 1085199426837188600, followers: 124 },
  { id: 4058687172, followers: 21 },
  { id: 201277609, followers: 509 },
  { id: 81658145, followers: 1048 },
  { id: 78865306, followers: 1130 },
  { id: 16112517, followers: 1058.6447463109218 },
  { id: 10414152, followers: 887.5503146097599 },
  { id: 1314101, followers: 1128.083816360442 },
  { id: 247943631, followers: 1194.128970165576 },
  { id: 1873322353, followers: 917.0129159130782 },
  { id: 30009655, followers: 141 },
  { id: 19299318, followers: 610 },
  { id: 2873695769, followers: 47 },
  { id: 2596138699, followers: 311 },
  { id: 40219508, followers: 552 },
  { id: 270431596, followers: 12 },
  { id: 2889052877, followers: 83 },
  { id: 241173920, followers: 288 },
  { id: 1055379531731796000, followers: 7 },
  { id: 43953969, followers: 1028 },
  { id: 84043985, followers: 940.6973594225974 },
  { id: 16557883, followers: 867.5043748613535 },
  { id: 6146692, followers: 1088.2704116657321 },
  { id: 944216617268973600, followers: 47 },
  { id: 19283433, followers: 558 },
  { id: 1667081238, followers: 334 },
  { id: 188046229, followers: 1001.3912552594699 },
  { id: 1658560038, followers: 84 },
  { id: 190726679, followers: 354 },
  { id: 2924711485, followers: 204 },
  { id: 318046158, followers: 965.9807228075383 },
  { id: 395853499, followers: 554 },
  { id: 85844572, followers: 130 },
  { id: 18406335, followers: 1181.4016849958925 },
  { id: 79908341, followers: 33 },
  { id: 1325316703, followers: 889 },
  { id: 2527017636, followers: 171 },
  { id: 4893004803, followers: 317 },
  { id: 446672281, followers: 38 },
  { id: 92951551, followers: 579 },
  { id: 158685605, followers: 204 },
  { id: 1006945298, followers: 1113.360675327881 },
  { id: 227831457, followers: 544 },
  { id: 29700681, followers: 224 },
  { id: 4597853354, followers: 911.3508800205839 },
  { id: 1035496563743842300, followers: 23 },
  { id: 14905766, followers: 879.9774423669157 },
  { id: 824684769543741400, followers: 971.464782079251 },
  { id: 49457800, followers: 340 },
  { id: 711885257549680600, followers: 54 },
  { id: 18325271, followers: 534 },
  { id: 1556132462, followers: 909.1013619633616 },
  { id: 18704160, followers: 974 },
  { id: 1652270612, followers: 1122.9834643104346 },
  { id: 31638712, followers: 216 },
  { id: 9527212, followers: 946.5240684637761 },
  { id: 136400506, followers: 1052.2786937013052 },
  { id: 82890309, followers: 1038.0641979221682 },
  { id: 44195788, followers: 896.4227855913206 },
  { id: 3230388598, followers: 1137.7135906185335 },
  { id: 36853217, followers: 1066.516300154543 },
  { id: 403626099, followers: 264 },
  { id: 15208867, followers: 1072 },
  { id: 889998600, followers: 385 },
  { id: 11493602, followers: 904.8672020539047 },
  { id: 14148549, followers: 757 },
  { id: 909697437694087200, followers: 92 },
  { id: 22766040, followers: 238 },
  { id: 21084111, followers: 965.461156482286 },
  { id: 1068137549355515900, followers: 1134 },
  { id: 743468486756868100, followers: 208 },
  { id: 701375574, followers: 273 }
];

let taskTitles = {
  "S-task01": "Node Search on Attribute",
  "S-task02": "Node Search on Attribute with Distractors",
  "S-task03": "Node Search on Topology and Multiple Attributes",
  "S-task04": "Neighbor Search on Attribute",
  "S-task05": "Neighbor Search on Attribute with Distractors",
  "S-task06": "Neighbor Search on Edge Attribute",
  "S-task07": "Neighbor Overview on Edge Attribute",
  "S-task08": "Attribute of Common Neighbors",
  "S-task09": "Edge Attributes",
  "S-task10": "Node Attribute Comparison",
  "S-task11": "Node Attribute Comparison on Small Network",
  "S-task12": "Cluster and Attribute Estimation",
  "S-task13": "Attribute along Shortest Path",
  "S-task14": "Attribute along Shortest Path on Small Network",
  "S-task15": "Attribute on Subnetwork",
  "S-task16": "Free Explore"
};

let taskPrompts = {

  "S-task01": "Find the North American with the most Tweets.",
  "S-task02": "Find the European person or institution with the least likes.",
  "S-task03": "Which person has many interactions (edges) in this network, several followers, but few tweets and likes in general?",
  "S-task04": "Find all of Lane's European Neighbors.",
  "S-task05": "Find all of giCentre's North American Neighbors.",
  "S-task06": "Who had the most mention interactions with Jeffrey?",
  "S-task07": "Does Alex have more mention interactions with North American or European accounts? Who does he have the most mentions interactions with?",
  "S-task08": "Among all people who have interacted with both Jeffrey and Robert, who has the most followers?",
  "S-task09": "What is the most common form of interaction between Evis19 and Jon? How often has this interaction happened?",
  "S-task10": "Select all of Noeska’s neighbors that are people and have more friends than followers.",
  "S-task11": "Select the people who have interacted with Thomas and have more friends than followers.",
  "S-task12": "Select all the people who are in a cluster with Alex. Estimate the average number of followers among the selected people.",
  "S-task13": "What is the institution on a shortest path between Lane and Rob. What is its continent of origin?",
  "S-task14": "What is the institution on a shortest path between Jason and Jon. What is its continent of origin?",
  "S-task15": "Of the North Americans who are two interactions away from Sereno, who has been on twitter the longest?",
  "S-task16": "Please explore the network freely and report on your findings. Is there anything surprising or particularly interesting in the network?"
};

(async function() {
  let mode = process.argv[2];
  console.log("mode is ", mode);
  switch (mode) {
    case "maxQDA":
      processMaxQDA();
      break;
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
    case "visProvenance":
         //exportTidyProvenance();

          processVisProvenance();
          break;
    case "export":
      exportResults();
      break;
  }
})();

//function to filter out only valid participants;
function isValidParticipant(d) {
  let rejected = [
    { id: "5d00163d9f497e00191a609c", reason: "NOCODE", vis: "nodeLink" },
    { id: "5d49f4637df55600014dda45", reason: "NOCODE", vis: "nodeLink" },
    { id: "5c12d0d303f44c00017441e3", reason: "NOCODE", vis: "nodeLink" },
    { id: "5c5629c79fcbc40001dc55cc", reason: "NOCODE", vis: "nodeLink" },
    { id: "5d37d2861566530016a061de", reason: "LowEffort", vis: "nodeLink" },
    { id: "5d017f2466581d001a9059dc", reason: "NOCODE", vis: "nodeLink" },
    { id: "5d30e6ef53416100199ad7bf", reason: "NOCODE", vis: "nodeLink" },
    { id: "5d4c50d3ff031f001883cf4f", reason: "NOCODE", vis: "nodeLink" },
    { id: "5b74656b9750540001f26fde", reason: "NOCODE", vis: "nodeLink" },

    { id: "5d63dc6c163b260001acc8e6", reason: "NOCODE", vis: "adjMatrix" },
    { id: "5b2486c6007d870001c795a4", reason: "LowEffort", vis: "adjMatrix" },
    { id: "5c582efbe66e510001eedfa8", reason: "NOCODE", vis: "adjMatrix" },
    { id: "5c5043028003d4000107b97a", reason: "NOCODE", vis: "adjMatrix" },
    { id: "5d017f2466581d001a9059dc", reason: "NOCODE", vis: "adjMatrix" },
    { id: "5d36060877dd7c00197477e7", reason: "NOCODE", vis: "adjMatrix" },
    { id: "5d641c307c4e9c0019d604d8", reason: "LowEffort", vis: "adjMatrix" },
    { id: "5c1d19c810677f0001d9d56c", reason: "NOCODE", vis: "adjMatrix" },
    { id: "5ac393cf0527ba0001c2043c", reason: "LowEffort", vis: "adjMatrix" },
    { id: "5c6cf98a34d8f80001ddf31d", reason: "NOCODE", vis: "adjMatrix" }
  ];

  let invalid = [
    { id: "5d54d0b14a1521001850610a", reason: "TIMED OUT", vis: "nodeLink" },
    { id: "5caa534a19731a00190bb935", reason: "TIMED OUT", vis: "adjMatrix" },
    { id: "5d5c49acdd90af0001f13f7d", reason: "TIMED OUT", vis: "adjMatrix" },
    { id: "5b3d79ec4915d00001828240", reason: "RETURNED", vis: "adjMatrix" },
    { id: "5bfaed16e2562a0001ce0ff4", reason: "TIMED OUT", vis: "nodeLink" },
    { id: "5d645bf6912c630018e269e3", reason: "TIMED OUT", vis: "nodeLink" }
  ];

  let wasRejected = rejected.find(r => r.id === d.id);

  let invalidParticipant = invalid.find(r => r.id === d.id);

  return (
    d.data.mode === "study" &&
    d.id[0] === "5" &&
    d.data.demographics &&
    !wasRejected &&
    !invalidParticipant
  );
}

function processMaxQDA() {
  const csv = require("csv-parser");

  let codes = [];
  let insights = [];

  fs.createReadStream("results/study/MaxQDA/codes.csv")
    .pipe(csv())
    .on("data", row => {
      row.Code = row.Code.split("\\");
      row.Code = row.Code[row.Code.length - 1];
      codes.push(row);
    })
    .on("end", () => {
      fs.createReadStream("results/study/MaxQDA/insights.csv")
        .pipe(csv())
        .on("data", row => {
          insights.push(row);
        })

        .on("end", () => {
          //iterate through all the codes and add the type of vis, confidence, difficulty, and minutes to complete
          codes.map(code => {
            let seg = code.Segment;
            let originalData = insights.find(r =>
              r["S-task16.answer.value"].includes(seg)
            );
            if (originalData === undefined) {
              console.log("could not find data for ", seg);
            } else {
              code.visType = originalData["S-task16.visType"];
              code.minutesToComplete =
                originalData["S-task16.minutesToComplete"];
              code.confidence = originalData["S-task16.feedback.confidence"];
              code.difficulty = originalData["S-task16.feedback.difficulty"];
            }
            return code;
          });

          //write out new codes CSV file for R processing
          const createCsvWriter = require("csv-writer").createObjectCsvWriter;
          let csvWriter;

          headers = Object.keys(codes[0]);

          csvWriter = createCsvWriter({
            path: "results/study/MaxQDA/codesTidy.csv",
            header: headers.map(key => {
              return { id: key, title: key };
            })
          });

          csvWriter
            .writeRecords(codes)
            .then(() => console.log("codesTidy.csv was written successfully"));
        });
    });
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
    "results/study/JSON/study_participants.json",
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
    fs.writeFileSync("results/study/JSON/" + collectionName + ".json", data);

    console.log("saved", collectionName);
  });
}

async function processData() {
  //load data;

  //load in taskList to have the latest task taxonomy and associated hypothesis for each task;



  let rawdata;

  rawdata = fs.readFileSync("results/study/JSON/taskList.json");
  let taskList = JSON.parse(rawdata);

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

      //replace taxonomy and hypothesis from taskList file (for post-study updates)
      p.data[key].taxonomy = taskList[key].taxonomy;
      p.data[key].attributes = taskList[key].attributes;
      p.data[key].hypothesis = taskList[key].hypothesis;

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
        let acc = computeAccuracy(key, answer); // col for more nuanced score
        // console.log('user id', p.data[key].workerID)
        if (key === "S-task12") {
          answer.accuracy = acc.scoreCluster * acc.scoreAverage;
          answer.scoreCluster = acc.scoreCluster;
          answer.scoreAverage = acc.scoreAverage;
        } else {
          answer.accuracy = acc; // col for more nuanced score
        }
        // console.log('accuracy for task ', key ,  ' is ', answer.accuracy)
        answer.correct = answer.accuracy === 1 ? 1 : 0; //col for boolean right/wrong
      }

      p.data[key].taskID = key;
      p.data[key].minutesOnTask = p.data[key].minutesToComplete; //will update this field as necessary when processing provenance for browsed away
    });

    //compute average accuracy for this participant,  disregard task16 since accuracy for that is always 1;
    p.data.averageAccuracy =
      Object.keys(p.data).reduce((acc, key) => {
        return key === "S-task16" ? acc : acc + p.data[key].answer.accuracy;
      }, 0) /
      (Object.keys(p.data).length - 1);

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

  fs.writeFileSync(
    "results/study/JSON/processed_results.json",
    JSON.stringify(results)
  );
  console.log("exported processed_results.json");

  fs.writeFileSync(
    "results/study/JSON/study_participants.json",
    JSON.stringify(participant_info)
  );
  console.log("exported updated study_participants.json");
}

function exportResults() {
  let rawdata = fs.readFileSync(
    "results/study/JSON/provenance_processed_results.json"
  );
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
      k.includes("minutesOnTask") ||
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
    path: "results/study/CSV/results.csv",
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

  let rawdata = fs.readFileSync(
    "results/study/JSON/provenance_study_participants.json"
  );
  let participants = JSON.parse(rawdata);

  let rHeaders, rRows;

  rHeaders = ["prolificId", "measure", "value"];

  csvWriter = createCsvWriter({
    path: "results/study/CSV/participantInfoTidyR.csv",
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

    rRows.push(
      createTidyRow("browser", participant.data.browserInfo["Browser name"])
    );
    rRows.push(createTidyRow("age", participant.data.demographics.age));
    rRows.push(createTidyRow("degree", participant.data.demographics.degree));
    rRows.push(createTidyRow("sex", participant.data.demographics.sex));
    rRows.push(
      createTidyRow(
        "visExperience",
        participant.data.demographics.vis_experience
      )
    );
    rRows.push(createTidyRow("minutesOnTask", participant.data.minutesOnTask));
    rRows.push(
      createTidyRow("averageAccuracy", participant.data.averageAccuracy)
    );
  });

  csvWriter
    .writeRecords(rRows)
    .then(() =>
      console.log("participantInfoTidyR.csv was written successfully")
    );

  rHeaders = [
    "prolificId",
    "taskId",
    "taskNumber",
    "taskOrder",
    "taskTitle",
    "taskPrompt",
    "visType",
    "taskType",
    "topology",
    "node_attributes",
    "edge_attributes",
    "attributes",
    "hypothesis_1",
    "hypothesis_2",
    "measure",
    "value"
  ];

  csvWriter = createCsvWriter({
    path: "results/study/CSV/TidyR.csv",
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
        let createTidyRow = function(measure, value, customTaskId) {
          let hypothesis = data.hypothesis.split(",");
          return {
            prolificId: id,
            taskId: customTaskId ? customTaskId : taskId,
            taskNumber: customTaskId ? 'T' + customTaskId.replace('S-task','') : 'T' + taskId.replace('S-task','')  ,
            taskOrder:data.order,
            taskTitle: taskTitles[taskId],
            taskPrompt: customTaskId ? (customTaskId.includes('A') ? taskPrompts[taskId].split('.')[0]  : taskPrompts[taskId].split('.')[1] ) : taskPrompts[taskId],
            visType: data.visType,
            taskType: data.taxonomy.type,
            topology: data.taxonomy.target,
            node_attributes:data.attributes.node,
            edge_attributes:data.attributes.edge,
            attributes:data.attributes.node + data.attributes.edge,
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
        if (taskId == "S-task12") {
          rRows.push(
            createTidyRow("accuracy", data.answer.scoreCluster, "S-task12A")
          );
          rRows.push(
            createTidyRow("accuracy", data.answer.scoreAverage, "S-task12B")
          );
        }

        rRows.push(createTidyRow("accuracy", data.answer.accuracy));
        rRows.push(createTidyRow("correct", data.answer.correct));
        rRows.push(createTidyRow("difficulty", data.feedback.difficulty));
        rRows.push(createTidyRow("confidence", data.feedback.confidence));
        rRows.push(createTidyRow("minutesOnTask", data.minutesOnTask));
      });
  });

  csvWriter
    .writeRecords(rRows)
    .then(() => console.log("TidyR.csv was written successfully"));
}

function computeAccuracy(taskID, answerObj) {
  //dictionary of functions that compute the accuracy for each task; Each function
  // returns a score between 0 and 1

  let second = 0.5; //credit given for second best answer;
  // let third = 0.3; //credit given for second best answer;

  let answers = {
    "S-task01": function(answer) {
      //  "S-task01": "NA with most tweets",

      if (answer.ids.includes("18704160")) {
        //T.J - 5151 tweets
        return 1;
      }

      if (answer.nodes.includes("9527212")) {
        //Arvind - 4812 tweets
        return second;
      }

      // if (answer.nodes.includes("44195788")) {
      //   //Carlos - 4787 tweets
      //   return third;
      // }
      return 0;
    },
    "S-task02": function(answer) {
      //  "S-task02": "EU with least likes [Distractors]",

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
      //  "S-task03": "Well connected with few likes/tweets",

      //Jeffrey or Alex
      let correctAnswers = ["247943631", "81658145"];
      if (correctAnswers.find(a => a == answer.ids)) {
        return 1;
      }

      let almostCorrect = ["208312922", "40219508"];
      //Rob && Noeska
      if (almostCorrect.find(a => a == answer.ids)) {
        return second;
      }

      return 0;
    },
    "S-task04": function(answer) {
      //   "S-task04": "Lane's EU neighbors",

      // 'AA','Noeska', 'Till', 'Joe'
      let correctAnswers = ["191257554", "40219508", "36853217", "15208867"];
      return scoreList(correctAnswers, answer);
    },
    "S-task05": function(answer) {
      //  "S-task05": "giCentre's NA neighbors [Distractors]",

      //Robert 16112517
      let score = answer.ids
        .split(";")
        .map(a => a.trim())
        .reduce((acc, cValue) => (cValue == "16112517" ? acc + 1 : acc - 1), 0);
      return Math.max(0, score);
    },
    "S-task06": function(answer) {
      //  "S-task06": "Most mentions with Jeffrey",

      //Robert 16112517
      let score = answer.ids
        .split(";")
        .reduce((acc, cValue) => (cValue == "16112517" ? acc + 1 : acc - 1), 0);
      return Math.max(0, score);
    },
    "S-task07": function(answer) {
      //   "S-task07": "Alex more EU or NA interactions? Most mentions with Alex. ",

      let score = 0;
      if (answer.radio === "European") {
        score = score + 0.5; //score for getting the type right
      }

      if (answer.ids.includes("395853499")) {
        //Marc
        score = score + 0.5;
      }

      return score;
    },
    "S-task08": function(answer) {
      //"S-task08": "Most followers among common neighbors of Jeffrey and Robert",

      if (answer.ids === "78865306") {
        //Chris
        return 1;
      }

      if (answer.ids === "1652270612") {
        //Tamara
        return second;
      }

      // if (answer.ids === "16112517") {
      //   //Robert
      //   return third;
      // }
      return 0;
    },
    "S-task09": function(answer) {
      //   "S-task09": "Most common/how many interactions between Evis19 and Jon",

      let score = 0;
      if (answer.radio === "Mentions") {
        score = score + 0.5; //score for getting the type right
      }
      if (answer.value == 4 && answer.radio === "Mentions") {
        score = score + 0.5; //score for getting the weight right
      }

      return score;
    },
    "S-task10": function(answer) {
      //  "S-task10": "Noeska's neighbors with more friends than followers",

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
      //   "S-task11": "Thomas' neighbors with more friends than followers [small]",

      //  'Anna'
      let correctAnswers = ["446672281"];
      return scoreList(correctAnswers, answer);
    },
    "S-task12": function(answer) {
      //  "S-task12": "Alex cluster / average number of followers.",

      //
      //Jason, Noeska, Alex,Robert,
      let correctAnswers = [
        { id: "19299318", followers: 610 }, //Jason
        { id: "40219508", followers: 552 }, //Noeska
        { id: "81658145", followers: 1048 }, //Alex
        { id: "16112517", followers: 1059 } //Robert
      ];

      //Tamara, James, Jon, Marc, Klaus
      let extendedAnswers = [
        { id: "1652270612", followers: 1123 }, //Tamara
        { id: "30009655", followers: 141 }, //James
        { id: "201277609", followers: 509 }, //Jon
        { id: "395853499", followers: 554 }, //Marc
        { id: "270431596", followers: 12 } //Klaus
      ];

      //1/4 points for each correct answer -1/4 point for each incorrect answer;
      let ids = answer.ids.split(";").map(a => a.trim());

      let scoreCluster = ids.reduce((acc, cValue) => {
        if (correctAnswers.find(a => a.id == cValue)) {
          return acc + 1 / correctAnswers.length;
        }

        if (extendedAnswers.find(a => a.id == cValue)) {
          return acc; //no penalty and no credit for nodes in the extended answer;
        }

        //otherwise, -1/9 for any incorrect answer;
        return acc - 1 / correctAnswers.length; //- 1/(correctAnswers.length + extendedAnswers.length);
      }, 0);

      scoreCluster = Math.max(0, scoreCluster);

      // let validNodes = ids.reduce((acc, cValue) => {
      //   let correctNode =
      //     correctAnswers.find(a => a.id == cValue) ||
      //     extendedAnswers.find(a => a.id == cValue);
      //   if (correctNode) {
      //     return acc.concat(correctNode);
      //   }
      //   //otherwise, return;
      //   return acc;
      // }, []);

      let validNodes = ids.map(id => followers.find(f => f.id == id));

      let meanFollowers = average(validNodes.map(n => n.followers));
      let tolerance = standardDeviation(validNodes.map(n => n.followers));

      let distanceToAnswer = Math.abs(answer.value - meanFollowers);
      let scoreAverage =
        distanceToAnswer > tolerance ? 0 : 1 - distanceToAnswer / tolerance;

      return { scoreCluster, scoreAverage };
    },
    "S-task13": function(answer) {
      //   "S-task13": "Inst.(nationality) on shortest path from Lane to Rob.",

      let score = 0;

      if (answer.ids.includes("191257554")) {
        //AA
        score = score + 0.5;
      }

      if (answer.radio === "EU" && answer.ids.includes("191257554")) {
        score = score + 0.5; //score for getting the type right
      }

      return score;
    },
    "S-task14": function(answer) {
      //   "S-task14": "Inst.(nationality) on shortest path from Jason to Jon. [small]",

      let score = 0;

      if (answer.ids.includes("1085199426837188600")) {
        //EVis19
        score = score + 0.5;
      }
      if (answer.radio === "EU" && answer.ids.includes("1085199426837188600")) {
        score = score + 0.5; //score for getting the type right
      }

      return score;
    },
    "S-task15": function(answer) {
      //  "S-task15": "Oldest account of all NA two interactions from Sereno",

      //Robert 16112517
      return answer.ids.includes("16112517") ? 1 : 0;
    },
    "S-task16": function(answer) {
      //  "S-task16": "Free Explore"

      return 1;
    }
  };

  function scoreList(correctAnswers, answer, maxValue = 1) {
    //+.25 points for each correct answer -.1 point for each incorrect answer;
    let ids = answer.ids.split(";").map(a => a.trim());

    let score = ids.reduce(
      (acc, cValue) =>
        correctAnswers.find(a => a == cValue)
          ? acc + 1 / correctAnswers.length
          : acc - 1 / correctAnswers.length,
      0
    );

    return Math.max(0, score * maxValue);
  }

  return answers[taskID](answerObj);
}

function standardDeviation(values) {
  var avg = average(values);

  var squareDiffs = values.map(function(value) {
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data) {
  var sum = data.reduce(function(sum, value) {
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}



function processVisProvenance() {
  let rawdata;

  rawdata = fs.readFileSync("results/study/JSON/processed_results.json");
  let results = JSON.parse(rawdata);

  let validParticipants = results.map(r=>r.data.workerID);

  let allProvenance={};

  let slimProvenance = {};

  var files =[...Array(56).keys()]
  files.map((n,i)=>{
    rawdata = fs.readFileSync("allProvenance/provenance_" + i + ".json");
  let provenance = JSON.parse(rawdata);

  provenance.filter(prov=>{
    let id = prov.id.split('_')[0];
    if (validParticipants.includes(id)){
      let task = prov.id.split('_')[1];
      if (allProvenance[id]){
        allProvenance[id][task] = prov;
        slimProvenance[id][task] = prov['data']['provGraphs'].map(e=>{
          if (e.event === 'sort'){
            //distinguish between sort on attribute and sort on person; 
            if (typeof e.sortKey == 'number'){
              return 'sort-matrix-col';
            }else {
              return 'sort-' + e.sortKey;
            }
          } else {
            return e.event
          }
          });
        
      

      } else {
        allProvenance[id]={};
        allProvenance[id].visType = prov['data']['provGraphs'][0].selections ? 'adjMatrix' : 'nodeLink'
        allProvenance[id][task] = prov;

        slimProvenance[id]={};
        slimProvenance[id].visType = prov['data']['provGraphs'][0].selections ? 'adjMatrix' : 'nodeLink'
        slimProvenance[id][task] = prov['data']['provGraphs'].map(e=>{
          if (e.event === 'sort'){
            //distinguish between sort on attribute and sort on person; 
            if (typeof e.sortKey == 'number'){
              return 'sort-matrix-col';
            }else {
              return 'sort-' + e.sortKey;
            }
          } else {
            return e.event
          }
          });
        
      }
    };
  })

  })


  fs.writeFileSync(
    "results/study/JSON/slimProvenance.json",
    JSON.stringify(slimProvenance)
  );

};


function exportTidyProvenance(){

  let rawdata;
  rawdata = fs.readFileSync("results/study/JSON/slimProvenance.json");
  let slimProvenance = JSON.parse(rawdata);

  //Read in JSON file for slimProvenance; 

    //write out provenance events for R processing
    const createCsvWriter = require("csv-writer").createObjectCsvWriter;
    let csvWriter;

    headers = ['id','taskId','visType','event'];

    csvWriter = createCsvWriter({
      path: "results/study/CSV/provenanceTidy.csv",
      header: headers.map(key => {
        return { id: key, title: key };
      })
    });

    let provCsv = [];
    // "5d49e0634aff6e0018fb7004": {
    //   "visType": "adjMatrix",
    //   "S-task08": [null, "search", "c

    Object.keys(slimProvenance).map(id=>{
      Object.keys(slimProvenance[id]).map(taskId=>{
        if (Array.isArray(slimProvenance[id][taskId])){
          slimProvenance[id][taskId].map(event=>{
            if (event){
              provCsv.push({
                id,
                taskId,
                visType:slimProvenance[id].visType,
                event
              })
            }
          })
        }
      })
    })

    csvWriter
      .writeRecords(provCsv)
      .then(() => console.log("provenanceTidy.csv was written successfully"));
  

  

}
function processProvenance() {
  let rawdata;
  rawdata = fs.readFileSync("results/events.json");
  let eventTypes = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/study/JSON/processed_results.json");
  let results = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/study/JSON/study_participants.json");
  let study_participants = JSON.parse(rawdata);

  rawdata = fs.readFileSync("results/study/JSON/participant_actions.json");
  let provenance = JSON.parse(rawdata);

  //create events objects per participant;
  let events = [];

  provenance.map(participant => {
    participantEventArray = [];

    let r = results.find(r => r.data.workerID === participant.id);
    r.data.browsedAwayTime = 0;

    let p = study_participants.find(p => p.id === participant.id);

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

          //if this event started after the last task, ignore it;
          // if (Date.parse(eventObj.startTime)< Date.parse(r.data['S-task16'].startTime)){
          participantEventArray.push(eventObj);
          // }
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
            // console.log("could not find start event for ", action.event, action.task);
          } else {
            startObj.endTime = action.time;
            let minutesBrowsedAway =
              (Date.parse(startObj.endTime) - Date.parse(startObj.startTime)) /
              1000 /
              60;

            if (
              startObj.label === "browse away" &&
              startObj.task &&
              startObj.task[0] === "S"
            ) {
              //only adjust time for browse away events during task completions
              if (
                Date.parse(startObj.startTime) <
                Date.parse(r.data["S-task16"].endTime)
              ) {
                if (minutesBrowsedAway < 50) {
                  r.data.browsedAwayTime =
                    r.data.browsedAwayTime + minutesBrowsedAway;

                  //catch case where browse away is logged at several hours;
                  r.data[startObj.task].minutesOnTask =
                    Math.round(
                      (r.data[startObj.task].minutesOnTask -
                        minutesBrowsedAway) *
                        10
                    ) / 10;
                }
              }
            }
          }
        }
      }
    });

    //update total on study time
    r.data.overallMinutesOnTask =
      r.data.overallMinutesToComplete - r.data.browsedAwayTime;
    //update total on participant_info
    p.data.minutesOnTask = r.data.overallMinutesOnTask;

    events.push({ id: participant.id, provEvents: participantEventArray });
    // console.log(participantEventArray.filter(e=>e.type === 'longAction' && e.endTime === undefined))
  });

  // console.log(events)
  fs.writeFileSync(
    "results/study/JSON/provenance_events.json",
    JSON.stringify(events)
  );
  console.log("exported provenance_events.json");

  // console.log(events)
  fs.writeFileSync(
    "results/study/JSON/provenance_processed_results.json",
    JSON.stringify(results)
  );
  console.log("exported provenance_processed_results.json");

  // console.log(events)
  fs.writeFileSync(
    "results/study/JSON/provenance_study_participants.json",
    JSON.stringify(study_participants)
  );
  console.log("exported provenance_study_participants.json");
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
