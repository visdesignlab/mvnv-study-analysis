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
          console.log('saving ', collectionName)
        saveJSON(JSON.stringify(allData[collectionName]), collectionName + ".json");
      }
    } else {
      let filename = "results/" + mode + "/JSON/" + collectionName + ".json";
      allData[collectionName] = await d3.json(filename);
    }
  });

  Promise.all(allDocs).then(function(values) {
    console.log("finished loading docs", allData);

    if (saveFlag){
        return;
    }
    
    //create csv files for analysis
    let validParticipants = allData.study_participants
      .filter(p =>{
          return p.data.demographics && isProlific(p.id) && Date.parse(p.data.startTime) > new Date() - (1*24*60*60*1000) //only keep participants that completed the study;
      })
      .map(p => p.id);

      console.log(validParticipants)

    let filteredCollections = ["results"];

    //saveKeys
    filteredCollections.map(collection => {
        
        let validData = allData[collection]
        .filter(p => validParticipants.includes(p.id))

      let flattenAnswers = validData
        .map(p => {
          //flatten answer.nodes, then flatten the whole data;
          Object.keys(p.data).map(key => {
            delete p.data[key].replyCount;
            delete p.data[key].replyType;
            delete p.data[key].answerKey;            

            if (p.data[key].answer){
                ["answer"].map(answer => { //answerKey as well? 
                    p.data[key][answer].ids = p.data[key][answer].nodes.map(n => n.id).join("; ");
                    p.data[key][answer].nodes = p.data[key][answer].nodes.map(n => n.name).join("; ");
                  });
            }
           

          });
          p.data.id = p.id;
          return p.data;
        });

      // console.log(flattenAnswers)

      if (validData.length > 0) {

        //create keys from users 1 and 2 (since they had different task lists)
        let csvKeys1 = Object.keys(flatten(flattenAnswers[0]))
        let csvKeys2 = Object.keys(flatten(flattenAnswers[1]));

        let csvKeys = csvKeys1.concat(csvKeys2.filter(key=>!csvKeys1.includes(key)));

        //keys for summary results
        // csvKeys = csvKeys.filter(k=>
        //     k.includes('minutesToComplete') ||
        //     k.includes('order') ||
        //     k.includes('feedback') ||
        //     k.includes('visType') || k.includes('prompt'));

        //keys for answer only fields
            // csvKeys = csvKeys.filter(k=>
            //     k.includes('answer') || k.includes('prompt'));


            // csvKeys = csvKeys.filter(k=>
            //     k.includes('answer.nodes') || 
            //     k.includes('answer.radio') || 
            //     k.includes('answer.value') || 
            //     k.includes('feedback') || 
            //     k.includes('minutesToComplete') || 
            //     k.includes('order') || 
            //     k.includes('prompt') || 
            //     k.includes('workerID') || 
            //     k.includes('visType') 
            //     );

        // fill in blanks for tasks the user did not take ;
        let sorted = validData
        //sort by visType
          .sort((a,b)=> a.data['S-task1'].visType === 'nodeLink' ? 1: -1);

          let csvValues = sorted  
          .map(p => {
            //fill in missing values;
            let values = csvKeys.map(key => {
              let value = nameSpace(p.data, key);

              //user did not take that task
              if (value === undefined) {
                setNested(p.data, key, ""); 
              }

              let v = nameSpace(p.data,key);

              //remove commas, newlines, and html markup
              if (typeof v === "string") {
                v = v.replace(/,/g, "");
                v = v.replace(/\r?\n|\r/g, ""); 
                v = v.replace(/<span class='attribute'>/g, "");
                v = v.replace(/<span class='attribute' >/g, "");
                v = v.replace(/<\/span>/g,"");

              }
              return v.toString();
            });
            return values;
          });

        let csvData = [csvKeys].concat(csvValues);


        saveCSV(csvData, collection + ".csv");
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
  let csvContent =
       data.map(e => e.join(",")).join("\n"); //"data:text/csv;charset=utf-8,"

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
