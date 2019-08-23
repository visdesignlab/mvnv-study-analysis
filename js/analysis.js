let flatten = function(data) {
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
};

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

//checks if member is is from prolific (only contains numbers)
let isProlific = function(id) {
  return id[0] == "5";
};
async function startAnalysis(fetchFlag) {
  let collectionNames = [
    // "heuristics_participants",
    "results",
    // "provenance",
    // "trial_provenance",
    // "trial_results",
    "participant_actions",
    "study_participants"
  ];

  let allData = {};

  let allDocs = collectionNames.map(async collectionName => {
    if (fetchFlag) {
      let querySnapshot = await db.collection(collectionName).get();

      allData[collectionName] = [];
      querySnapshot.forEach(function(doc) {
        allData[collectionName].push({ id: doc.id, data: doc.data() });
      });

      if (saveFlag) {
        console.log("saving ", collectionName);
        saveJSON(
          JSON.stringify(allData[collectionName]),
          collectionName + ".json"
        );
      }
    } else {
      let filename = "results/" + mode + "/JSON/" + collectionName + ".json";
      allData[collectionName] = await d3.json(filename);
    }
  });

  Promise.all(allDocs).then(function(values) {
    console.log("finished loading docs", allData);

    if (saveFlag) {
      return;
    }

    //create csv files for analysis
    let validParticipants = allData.study_participants
      .filter(p => {
        return (
          p.data.demographics &&
          isProlific(p.id) &&
          p.id !== '5d449accde2d3a001a707892' && //bad data from participant that timed out
          Date.parse(p.data.startTime) >
            Date.parse(
              "Tue Aug 20 2019 01:00:00 GMT-0600 (Mountain Daylight Time)"
            )
        ); //only keep participants that completed the study;
      })
      .map(p => p.id);

    let filteredCollections = ["results"];

    //saveKeys
    filteredCollections.map(collection => {
      let validData = allData[collection].filter(p =>
        validParticipants.includes(p.id)
      );

      let flattenAnswers = validData.map(p => {
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
            answer.accuracy = computeAccuracy(p.data[key].taskID, answer); // col for more nuanced score
            answer.correct = answer.accuracy === 1 ? 1 : 0; //col for boolean right/wrong
          }
        });
        p.data.id = p.id;
        return p.data;
      });

      // console.log(flattenAnswers)

      if (validData.length > 0) {
        //create keys from users 1 and 2 (since they had different task lists)
        let csvKeys1 = Object.keys(flatten(flattenAnswers[0]));
        let csvKeys2 = Object.keys(flatten(flattenAnswers[1]));

        let csvKeys = csvKeys1.concat(
          csvKeys2.filter(key => !csvKeys1.includes(key))
        );

        // csvKeys = csvKeys.filter(
        //   k =>
        //     k.includes("answer.nodes") ||
        //     k.includes("answer.accuracy") ||
        //     k.includes("answer.correct") ||
        //     k.includes("answer.radio") ||
        //     k.includes("answer.value") ||
        //     k.includes("feedback") ||
        //     k.includes("minutesToComplete") ||
        //     k.includes("order") ||
        //     k.includes("prompt") ||
        //     k.includes("workerID") ||
        //     k.includes("visType")
        // );

        // fill in blanks for tasks the user did not take ;
        let sorted = validData
          //sort by visType
        //   .sort((a, b) => (a.data["S-task1"].visType === "nodeLink" ? 1 : -1));

        let rHeaders = ['prolificId','taskId','visType','responseType','value'];
        let rRows = [];

        console.log(validData);

        validData.map(participantData=>{
            let id= participantData.id;
            Object.keys(participantData.data).filter(key=>key[0] === 'S').map(taskId=>{
                let data = participantData.data[taskId];
                let visType = data.visType;

                //create a row for every relevant value; 
                data.answer.nodes.split(';').map(n=>n.trim()).map(node=>{
                    rRows.push([id,taskId,visType,'nodeAnswer',node]);
                }) 
                // console.log(data.answer.value.split(';'))
                data.answer.value.split(';').map(n=>n.trim()).map(value=>{
                    if (value.length>0){
                        rRows.push([id,taskId,visType,'valueAnswer',value]);
                    }
                })  
                if (data.answer.radio){
                    rRows.push([id,taskId,visType,'valueAnswer',data.answer.radio]);
                }
                rRows.push([id,taskId,visType,'accuracy',data.answer.accuracy]);
                rRows.push([id,taskId,visType,'correct',data.answer.correct]);
                rRows.push([id,taskId,visType,'difficulty',data.feedback.difficulty]);
                rRows.push([id,taskId,visType,'confidence',data.feedback.confidence]);
                rRows.push([id,taskId,visType,'minutesToComplete',data.minutesToComplete]);
            })
        })

        let csvValues = sorted.map(p => {
          //fill in missing values;
          let values = csvKeys.map(key => {
            let value = nameSpace(p.data, key);

            //user did not take that task
            if (value === undefined) {
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
            return v.toString();
          });
          return values;
        });

         csvKeys  = csvKeys.map(k=>k.split('.').pop());
         let csvData = [csvKeys].concat(csvValues);

        // saveCSV(csvData, collection + ".csv");

        saveCSV([rHeaders].concat(rRows), collection + ".csv");
      }
    });
  });
}
//Function to save exportedGraph to file automatically;
function saveJSON(data, filename) {
  if (!data) {
    console.error("Console.save: No data");
    return;
  }

  if (!filename) filename = "output.json";

  if (typeof data === "object") {
    data = JSON.stringify(data, undefined, 4);
  }

  var blob = new Blob([data], { type: "text/json" }),
    e = document.createEvent("MouseEvents"),
    a = document.createElement("a");

  a.download = filename;
  a.href = window.URL.createObjectURL(blob);
  a.dataset.downloadurl = ["text/json", a.download, a.href].join(":");
  e.initMouseEvent(
    "click",
    true,
    false,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null
  );
  a.dispatchEvent(e);
}

function saveCSV(data, filename) {
  let csvContent = data.map(e => e.join(",")).join("\n"); //"data:text/csv;charset=utf-8,"

  var blob = new Blob([csvContent], { type: "text/csv" }),
    e = document.createEvent("MouseEvents"),
    a = document.createElement("a");

  a.download = filename;
  a.href = window.URL.createObjectURL(blob);
  a.dataset.downloadurl = ["text/csv", a.download, a.href].join(":");
  e.initMouseEvent(
    "click",
    true,
    false,
    window,
    0,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null
  );
  a.dispatchEvent(e);
}

function computeAccuracy(task, answerObj) {
  //dictionary of functions that compute the accuracy for each task; Each function
  // returns a score between 0 and 1

  let second = 0.8; //credit given for second best answer;
  let third = 0.6; //credit given for second best answer;

  let answers = {
    "S-task1": function(answer) {
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
    "S-task1A": function(answer) {
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
    "S-task3": function(answer) {
      //Jeffrey or Alex
      let correctAnswers = ["247943631", "81658145","208312922", "40219508"];
      if (correctAnswers.find(a => a == answer.ids)) {
        return 1;
      }
     
      return 0;
    },
    "S-task4": function(answer) {
      // 'AA','Noeska', 'Till', 'Joe'
      let correctAnswers = ["191257554", "40219508", "36853217", "15208867"];
      return scoreList(correctAnswers, answer)
    },
    "S-task4A": function(answer) {
      //Robert 16112517
      let score = answer.ids
        .split(";")
        .map(a => a.trim())
        .reduce(
          (acc, cValue) => (cValue == "16112517" ? acc + 1 : acc - 1),
          0
        );
      return d3.max([0, score]);
    },
    "S-task5": function(answer) {
      //Robert 16112517
      let score = answer.ids
        .split(";")
        .reduce(
          (acc, cValue) => (cValue == "16112517" ? acc + 1 : acc - 1),
          0
        );
      return d3.max([0, score]);
    },
    "S-task6": function(answer) {
      return answer.radio == "European" ? 1 : 0;
    },
    "S-task7": function(answer) {
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
    "S-task8": function(answer) {
      let score = 0;
      if (answer.radio === "Mentions") {
        score = score + 0.5; //score for getting the type right
      }
      if (answer.value == 4) {
        score = score + 0.5; //score for getting the weight right
      }

      return score;
    },
    "S-task9": function(answer) {
      // 'Lonni','Thomas', 'Anna', 'Klaus'
      let correctAnswers = [
        "2924711485",
        "2527017636",
        "446672281",
        "270431596"
      ];
     return scoreList(correctAnswers, answer);
    },
    "S-task9A": function(answer) {
      //  'Anna'
      let correctAnswers = ["446672281"];
      return scoreList(correctAnswers, answer);
    },
    "S-task11": function(answer) {
      return answer.value >= 1500 && answer.value <= 2500 ? 1 : 0;
    },
    "S-task12": function(answer) {
      //EVis19, Mandy
      let correctAnswers = ["1085199426837188600", "1035496563743842300"];
      return scoreList(correctAnswers, answer);
    },
    "S-task12A": function(answer) {
      //Rob, Micah
      let correctAnswers = ["208312922", "84043985"];
     return scoreList(correctAnswers, answer);
    },
    "S-task13": function(answer) {
      //Robert 16112517
      return answer.ids.includes("16112517") ? 1 : 0;
    },
    "S-taskExplore": function(answer) {
      return 1;
    }
  };

  function scoreList(correctAnswers, answer) {
    //+.25 points for each correct answer -.1 point for each incorrect answer;
    let ids = answer.ids
    .split(";")
    .map(a => a.trim());

    let score = ids
      .reduce(
        (acc, cValue) =>
          correctAnswers.find(a => a === cValue)
            ? acc + 1/correctAnswers.length
            : acc - 1/correctAnswers.length,
        0
      );

    return d3.max([0, score]);
  }

  return answers[task](answerObj);
}
