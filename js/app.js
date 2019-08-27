console.log("running node script");
("use strict");

const firebase = require("firebase");
// Required for side-effects
require("firebase/firestore");

const fs = require("fs");

// require("../libs/firebase-app.js");
let firestore = require("./firebaseApi.js");
let db = firestore.connect();

function updateDatabase() {
  //ammend provenance data for participants
  let nlParticipants = [
    "5d64759fedf23500018f9334",
    "5b1087bce9270900013c1730",
    "5b90bf1a42e93f00017cc9e9",
    "5d4dc127a370c600156b255b",
    "5c2c888df42a780001468c5f"
  ];
  let amParticipants = [
    "5cf2d589239c60001a088f03",
    "5c671a76085e6a0001fed1bc",
    "58c84d506d1c600001a09319",
    "5bb279805a4ee80001c39a8c",
    "5d1db2c56d66ec001904e555"
  ];

  let taskNames = [
    "S-task01",
    "S-task02",
    "S-task03",
    "S-task04",
    "S-task05",
    "S-task06",
    "S-task07",
    "S-task08",
    "S-task09",
    "S-task10",
    "S-task011",
    "S-task012",
    "S-task013",
    "S-task014",
    "S-task015",
    "S-task016"
  ];

  let allParticipants = nlParticipants.concat(amParticipants);

  allParticipants.map(async id => {
    // taskNames.map(async task=>{
    let docRef = db.collection("study_participants").doc(id);
    // console.log({
    //   id,
    //   mode:'study'
    // })
    console.log("updating db for ", id);
    await docRef
      .set(
        {
          mode: "study"
        },
        { merge: true }
      )
      .catch(err => {
        console.log("Error updating documents", err);
      });

    // })
  });
}

//iterate through and update their db entries;

//function to filter out only valid participants;
function isValidParticipant(d) {
  return d.data.mode === "study"; // && d.id[0] === "5";
}

async function fetchData() {
  let querySnapshot = await db.collection("study_participants").get();

  let studyParticipants = [];
  querySnapshot.forEach(function(doc) {
    let data = doc.data();
    studyParticipants.push({ id: doc.id, data });
  });

  studyParticipants = studyParticipants.filter(isValidParticipant);

  //array of ids for valid participants;
  let participantIDs = studyParticipants.map(p => p.id);

  fs.writeFileSync("study_participants.json", JSON.stringify(studyParticipants));

  let collectionNames = [
    "results",
    "participant_actions"
    // "heuristics_participants",
    // "provenance"
    // "trial_provenance",
    // "trial_results",
  ];

  await collectionNames.map(async collectionName => {
    let collectionRef, queryRef;
    collectionRef = db.collection(collectionName);
    if (collectionName === "provenance") {
      queryRef = collectionRef.where(
        new firebase.firestore.FieldPath("mode"),
        "==",
        "study"
      );
    } else {
      queryRef = collectionRef;
    }

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
    
    rawdata= fs.readFileSync('results/study/JSON/study_participants.json');
    let participant_info = JSON.parse(rawdata);

    rawdata = fs.readFileSync('results/study/JSON/results.json');
    let results = JSON.parse(rawdata);

    // rawdata = fs.readFileSync('results/study/JSON/participant_actions.json');
    // let provenance = JSON.parse(rawdata);


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

        console.log('average accuracy for ', p.id ,  ' is ', p.data.averageAccuracy)

      p.data.workerID = p.id;
      delete p.id;

      p.data.overallMinutesToComplete = participant_info.find(
        pt => pt.id === p.data.workerID
      ).data.minutesToComplete;

      //add demographic information for this participant;
      p.data.demographics = participant_info.find(
        pt => pt.id === p.data.workerID
      ).data.demographics;
      p.data.overallFeedback = participant_info.find(
        pt => pt.id === p.data.workerID
      ).data.feedback;

      return p.data;
    });

    fs.writeFileSync("processed_results.json", JSON.stringify(results));

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
      if (answer.radio === "Europeans") {
        score = score + 0.5; //score for getting the type right
      }

      if (answer.ids.includes("395853499")) {
        //Marc
        score = score+0.5;
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
      let correctAnswers = ["19299318","19283433","40219508","81658145","1085199426837188600","16112517"];
      let part1Score = scoreList(correctAnswers, answer);

      return answer.value >= 400 && answer.value <= 600 ? 1 : 0;
    },
    "S-task13": function(answer) {
      let score = 0;
      if (answer.radio === "EU") {
        score = score + 0.5; //score for getting the type right
      }

      if (answer.ids.includes("191257554")) {
        //AA
        score = score+0.5;
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
        score = score+0.5;
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

  function scoreList(correctAnswers, answer) {
    //+.25 points for each correct answer -.1 point for each incorrect answer;
    let ids = answer.ids.split(";").map(a => a.trim());


    let score = ids.reduce(
      (acc, cValue) =>
        correctAnswers.find(a => a == cValue)
          ? acc + 1 / correctAnswers.length
          : acc - 1 / correctAnswers.length,
      0
    );

    return Math.max(0, score);
  }

  return answers[taskID](answerObj);
}

function processProvenance() {

  let rawdata;
    rawdata= fs.readFileSync('results/events.json');
    let eventTypes = JSON.parse(rawdata);

    rawdata= fs.readFileSync('results/study/JSON/processed_results.json');
    let results = JSON.parse(rawdata);

    rawdata= fs.readFileSync('results/study/JSON/participant_actions.json');
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
        if (eventObj.label !== 'next' && eventObj.label !== 'back'){
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
                (e.label === "task" ? e.task === action.task : true)
              return value;
            })
            .pop();
            if (startObj === undefined){
              console.log('could not find start event for ' , action)
            }
            startObj.endTime = action.time;
        }
      }
    });

    events.push({ id: participant.id, provEvents: participantEventArray });
    // console.log(participantEventArray.filter(e=>e.type === 'longAction' && e.endTime === undefined))
  });

  // console.log(events)
  fs.writeFileSync("provenance_events.json", JSON.stringify(events));


}

(async function() {
  let mode = process.argv[2];
  console.log("mode is ", mode);
  switch (mode) {
    case "fetchData":
      await fetchData();
      break;
    case "fixData":
      // updateDatabase();
      break;
    case "process":
      processData();
      break;
    case "provenance":
        processProvenance();
        break;
  }
})();
