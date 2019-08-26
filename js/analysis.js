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
function isProlific(id) {
  return id[0] == "5";
}

function getProlificParticipants(study_participants) {
  return study_participants
    .filter(p => {
      return (
        p.data.demographics &&
        isProlific(p.id) &&
        p.id !== "5d449accde2d3a001a707892" && //bad data from participant that timed out
        Date.parse(p.data.startTime) >
          Date.parse(
            "Tue Aug 20 2019 01:00:00 GMT-0600 (Mountain Daylight Time)"
          )
      ); //only keep participants that completed the study;
    })
    .map(p => p.id);
}

function showTooltip(data,delay=200){

  let tooltip = d3.select('.tooltip');

    tooltip.html(data)
    .style("left", (window.event.pageX + 10) + "px")
    .style("top", (window.event.pageY - 20) + "px"); 

    tooltip.transition().duration(delay).style("opacity", .9);

}

function hideTooltip(){
  d3.select('.tooltip').transition().duration(100).style("opacity",0);
}



function makePlot(provData,index,type,width,height,svg,participantResults,sortOrder) {

  let dateDomain = d3.extent(provData[index].provEvents.filter(e=>e.type === type).map(e=>Date.parse(e.startTime)).concat(provData[index].provEvents.filter(e=>e.type === type).map(e=> Date.parse(e.endTime))))

  let opacityScale = d3.scaleLinear()
  .domain([0,15])
  .range([.3,1]);

  let startTime = dateDomain[0]
  // console.log('start time is ', Date(startTime))
  // set the ranges
  var x = d3.scaleLinear().range([0, width]);

  x.domain([0,60*60*1000]);

  var y = d3.scaleLinear().range([height-10, 0]);
  y.domain(type === 'singleAction' ? [0,0] : [-2,2]) //provData[index].provEvents.filter(e=>e.type === type && e.level === undefined).length-1+2]);

  var xAxis_woy = d3
    .axisBottom(x)
    .ticks(10)
    // .tickValues([0,5000,1000,15,20,30,40,50,60,70])
    .tickFormat(d=>Math.round(d/1000/60));
  // .tickValues(provData.map(d => Date.parse(d.provEvents[0].startTime)  || Date.parse(d.provEvents[0].time))); 

  svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis_woy);


    let studyStarted = 0;
     provData[index].provEvents.map((e,i)=>{
       if (e.label === 'study'){
         studyStarted = i;
       }
     });

       //compute taskOrder in provData
    provData[index].provEvents.filter((e,i)=>e.label === 'task' && i>=studyStarted).map((e,i)=>{
      e.order=i
    });

    // console.log(provData[index].provEvents.filter((e,i)=>e.label === 'task' && i>=studyStarted))

    // console.log(participantResults);
    let resultsArray;
    if (participantResults){
      resultsArray = Object.entries(participantResults);
    }

    //associate results data for each task
    provData[index].provEvents.map(e=>{
      if (e.order!== undefined && resultsArray){
        let data = resultsArray.filter(r=> r[1].order == e.order)[0];
        e.task = {id:data[0],data:data[1]};
      }
    })

    // console.log(provData[index].provEvents);
   

  let participantGroups = svg
    .selectAll(".participantGroup")
    .data([provData[index]]);

  let participantGroupsEnter = participantGroups
    .enter()
    .append("g")
    .attr("class", "participantGroup");

  participantGroups.exit().remove();

  participantGroups = participantGroupsEnter.merge(participantGroups);

  
  let rects = participantGroups.selectAll(".event").data((d, i) =>
    d.provEvents
      .filter(e => e.type === type)
      .map(pEvent => {
        pEvent.participantOrder = i;
        return pEvent;
      })
  );

  let rectsEnter = rects
    .enter()
    .append("rect")
    .attr("class", "event")
    .style('opacity',d=>d.task ? opacityScale(d.task.id.match(/\d+/g).map(Number)):'');

  rects.exit().remove();

  rects = rectsEnter.merge(rects);

  rects
    .attr("height", 15)
    .attr("x", d => {
      let time = Date.parse(d.startTime)|| x(Date.parse(d.time))
      return x(time-startTime)
    })
    .attr("y", (d, i) => y(d.level)) //y(d.participantOrder))
    .attr("width", d => {
      let diff = x(Date.parse(d.endTime)) - x(Date.parse(d.startTime));

      return diff || 0;
    })
    .attr("class", d => "event " + d.label.replace(/ /g, ""))
    .classed('wrong',d=>d.task && d.task.data.answer ? d.task.data.answer.correct == 0 : false)
    // .classed('sortedOn', d=>sortOrder && d.task && d.task.id == sortOrder)

    rects
    .on('mouseover',d=>{

      let tooltipContent;
      if (d.label == 'task'){
        tooltipContent =(d.task !== undefined ? '<strong>' + d.task.id + '</strong>' + '[' + d.task.data.answer.accuracy + ']' + '<br/>' +  d.task.data.prompt : '');

      } else {
        tooltipContent = d.label + ':' + (Math.round((Date.parse(d.endTime) - Date.parse(d.startTime))/1000/6)/10)  +  'min';
            }
      showTooltip(d.endTime ? tooltipContent : d.label)
    })
    .on("mouseout",hideTooltip)
    .on("click",d=>{
      if (d.order!==undefined){
        drawProvenance(provData,d.task.id)
      }
    })

    let frames = participantGroups.selectAll(".frames").data((d, i) =>
    d.provEvents
      .filter(e => e.label === 'task' && e.order!== undefined));

  let framesEnter = frames
    .enter()
    .append("rect")
    .attr("class", "frames")

    frames.exit().remove();

    frames = framesEnter.merge(frames);

    frames
    .attr("height", 15)
    .attr("x", d => {
      let time = Date.parse(d.startTime)|| x(Date.parse(d.time))
      return x(time-startTime)
    })
    .attr("y", (d, i) => y(d.level)) //y(d.participantOrder))
    .attr("width", d => {
      let diff = x(Date.parse(d.endTime)) - x(Date.parse(d.startTime));
      return diff || 0;
    })
    .classed('sortedOn', d=>sortOrder && d.task && d.task.id == sortOrder)



    

    participantGroups.append('text').attr('class','rank')
    .text(participantResults ? 'Avg Accuracy:' + Math.round(participantResults.averageAccuracy*100)/100  : 'NA')
    .attr('x',x.range()[1])
    .attr('y',0)
    .style('text-anchor','end')


    participantGroups.append('text').attr('class','visType')
    .text(participantResults ? (participantResults['S-task01'].visType == 'adjMatrix' ? 'AM' : 'NL') : 'NA')
    .attr('x',x.range()[0]-30)
    .attr('y',y(.8))
    .style('text-anchor','end')

  let labels = participantGroups.selectAll(".label").data((d, i) =>
    d.provEvents
      .filter(e => e.type === type)
      .map(pEvent => {
        pEvent.participantOrder = i;
        return pEvent;
      })
  );



  let labelsEnter = labels
    .enter()
    .append("text")
    .attr("class", "label");

  labels.exit().remove();

  labels = labelsEnter.merge(rects);

  labels
    // .attr("x", d => x(Date.parse(d.startTime) || Date.parse(d.time)))
    // .attr("y", (d, i) => y(d.level)) //y(d.participantOrder))
    .attr('transform',d=>{

      let time = Date.parse(d.startTime)|| x(Date.parse(d.time))      
      return 'translate(' +x(time-startTime)  + ',' + y(d.level-1.5)+  ') rotate(0)'
    })
    .attr("dy", 5)
    .style("text-anchor", "start")
    .style("font-size", 12)
    .attr("class", d => "label " + d.label.replace(/ /g, ""))
    .text(d => d.level == 0 ? d.label : '')


  rects = participantGroups.selectAll(".s-event").data((d, i) =>
    d.provEvents
      .filter(e => e.type === 'singleAction' && e.label !=='submitted valid answer')
      .map(pEvent => {
        pEvent.participantOrder = i;
        return pEvent;
      })
  );

  rectsEnter = rects
    .enter()
    .append("rect")
    .attr("class", "s-event");
  // .style('opacity',.2);

  rects.exit().remove();

  rects = rectsEnter.merge(rects);

  rects
    .attr("height", 20)
    .attr("x", d => x(Date.parse(d.time)) -x(startTime))
    .attr("y", (d, i) => y(d.level+1.1)) //y(d.participantOrder))
    .attr("width", 3)
    .attr("class", d => "s-event " + d.label.replace(/ /g, ""))
    .on('mouseover',d=>{
      showTooltip(d.label)
    })
    .on("mouseout",hideTooltip)


}

async function drawProvenance(provData,sortOrder) {

  participantResults = await d3.json(
    "results/pilot/JSON/analysisData.json"
  );

     
  var margin = { top: 50, right: 15, bottom: 25, left: 150 };

  var height = 180;
  var width = window.screen.availWidth - margin.left;


  width = width - margin.left - margin.right;
  height = height - margin.top - margin.bottom;

d3.selectAll('svg').remove();
 let sortedData =  provData.sort((a,b)=>{
    let aResults = participantResults.find(d=>d.data.workerID == a.id)
    let bResults = participantResults.find(d=>d.data.workerID == b.id)

    if (!aResults || !bResults){
      return 0;
    }

    if (sortOrder){
      return aResults.data.averageAccuracy > bResults.data.averageAccuracy ? -1 : 1 

      // return aResults.data[sortOrder].answer.accuracy > bResults.data[sortOrder].answer.accuracy ? -1 : 1 
    } else{
 
      // return Date.parse(aResults.data['S-task01'].startTime) < Date.parse(bResults.data['S-task01'].startTime) ? -1 : 1 
      return aResults.data.averageAccuracy > bResults.data.averageAccuracy ? -1 : 1 
    }

  });
  
  sortedData.map((d,i)=>{
    let participantResult = participantResults.find(d=>d.data.workerID == provData[i].id)
    

    var svg = d3
    .select("body")
    .append('svg')
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

    if (participantResult){
      svg.append('rect').attr('class', participantResult.data['S-task01'].visType )
      .attr('x',margin.left-20)
      .attr('y',0)
      .attr('height',height + margin.top )
      .attr('width',5) //width  + 20 + margin.right);
    }

    svg = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      makePlot(provData,i, "longAction",width,height,svg,participantResult.data,sortOrder);
  
  })

  console.log(sortedData)

  
}

async function plotParticipantActions() {
  participant_actions = await d3.json(
    "results/pilot/JSON/participant_actions.json"
  );

  let validParticipants = participant_actions.filter(p => {
    let startTime = Date.parse(p.data.initialSetup);
    let endTime = Date.parse(p.data.update);

    let studyDuration = endTime - startTime;
    let pilotStartTime = Date.parse(
      "Tue Aug 20 2019 00:00:00 GMT-0600 (Mountain Daylight Time)"
    );

    return (
      isProlific(p.id) &&
      p.id !== "5d449accde2d3a001a707892" &&
      studyDuration > 10 * 60 * 1000 &&
      startTime >= pilotStartTime
    );
  });

  console.log(validParticipants)

  let eventTypes = await d3.json("js/events.json");

  //create events objects per participant;
  let events = [];

  validParticipants.map(participant => {
    participantEventArray = [];

    participant.data.provGraphs.map(action => {
      //see if this a single event, or the start/end of a long event;
      let event = eventTypes[action.event];

      if (event && event.type === "singleAction") {
        //create copy of event template
        let eventObj = JSON.parse(JSON.stringify(eventTypes[action.event]));
        eventObj.label = action.event;
        eventObj.time = action.time;
        participantEventArray.push(eventObj);
      } else {
        //at the start of an event;
        if (event && event.start.trim() == action.event.trim()) {
          let eventObj = JSON.parse(JSON.stringify(eventTypes[action.event]));
          eventObj.startTime = action.time;
          participantEventArray.push(eventObj);
        } else {
          //at the end of an event;
          //find the 'start' eventObj;
          let startObj = participantEventArray
            .filter(e => {
              let value =
                e.type === "longAction" &&
                Array.isArray(e.end) &&
                e.end.includes(action.event);
              return value;
            })
            .pop();
          startObj.endTime = action.time;
        }
      }
    });

    events.push({ id: participant.id, provEvents: participantEventArray });
    // console.log(participantEventArray.filter(e=>e.type === 'longAction' && e.endTime === undefined))
  });

   //add tooltip
   d3.select("body")
   .append("div")
   .attr("class", "tooltip")
   .style("opacity", 0);


  drawProvenance(events);
}
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
      let taskNames = {
        "S-task1": "S-task01",
        "S-task1A": "S-task02",
        "S-task3": "S-task03",
        "S-task4": "S-task04",
        "S-task4A": "S-task05",
        "S-task5": "S-task06",
        "S-task6": "S-task07",
        "S-task7": "S-task08",
        "S-task8": "S-task09",
        "S-task9": "S-task10",
        "S-task9A": "S-task11",
        "S-task11": "S-task12",
        "S-task12": "S-task13",
        "S-task12A": "S-task14",
        "S-task13": "S-task15",
        "S-taskExplore": "S-task16",
        "S-task10": "S-task-10"
      };

      let querySnapshot = await db.collection(collectionName).get();

      allData[collectionName] = [];
      querySnapshot.forEach(function(doc) {
        let data = doc.data();
        //create temporary keys
        Object.keys(data).map(key => {
          //rename tasks;
          delete data[key].taskID;
          if (taskNames[key]) {
            let tempKey = taskNames[key].split("-")[1];
            data[tempKey] = data[key];
            delete data[key];
          }
        });
        //replace with actual new keys
        Object.keys(data).map(key => {
          if (Object.values(taskNames).includes("S-" + key)) {
            data["S-" + key] = data[key];
            delete data[key];
          }
        });
        allData[collectionName].push({ id: doc.id, data });
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
    if (saveFlag) {
      return;
    }

    console.log("creating csvs");

    //create csv files for analysis
    let validParticipants = getProlificParticipants(allData.study_participants);

    let filteredCollections = ["results"];

    //saveKeys
    filteredCollections.map(async collection => {
      let validData = allData[collection].filter(p =>
        validParticipants.includes(p.id)
      );

      let participantInfo = allData["study_participants"].filter(p =>
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
            answer.accuracy = computeAccuracy(key, answer); // col for more nuanced score
            answer.correct = answer.accuracy === 1 ? 1 : 0; //col for boolean right/wrong
          }

          p.data[key].taskID = key;
        });

        //compute average accuracy for this participant;
        p.data.averageAccuracy =
          Object.keys(p.data).reduce((acc, key) => {
            return acc + p.data[key].answer.accuracy;
          }, 0) / Object.keys(p.data).length;

        p.data.workerID = p.id;
        delete p.id;

        p.data.overallMinutesToComplete = participantInfo.find(
          pt => pt.id === p.data.workerID
        ).data.minutesToComplete;

        //add demographic information for this participant;
        p.data.demographics = participantInfo.find(
          pt => pt.id === p.data.workerID
        ).data.demographics;
        p.data.overallFeedback = participantInfo.find(
          pt => pt.id === p.data.workerID
        ).data.feedback;

        return p.data;
      });

      if (validData.length > 0) {
        //create keys from users 1 and 2 (since they had different task lists)
        let csvKeys1 = Object.keys(flatten(flattenAnswers[0]));
        let csvKeys2 = Object.keys(flatten(flattenAnswers[1]));

        let csvKeys = csvKeys1.concat(
          csvKeys2.filter(key => !csvKeys1.includes(key))
        );

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

        // fill in blanks for tasks the user did not take ;
        let sorted = validData
          //sort by visType
          .sort((a, b) => (a.data["S-task01"].visType === "nodeLink" ? 1 : -1));

        let rHeaders = [
          "prolificId",
          "taskId",
          "visType",
          "taskType",
          "topology",
          "hypothesis_1",
          "hypothesis_2",
          "measure",
          "value"
        ];
        let rRows = [];

        // console.log(layout.elements.nodes)

        validData.map(participantData => {
          let id = participantData.data.workerID;

          Object.keys(participantData.data)
            .filter(key => key[0] === "S")
            .map(taskId => {
              let data = participantData.data[taskId];
              let visType = data.visType;
              let taskType = data.taxonomy.type;
              let topology = data.taxonomy.target;
              let hypothesis = data.hypothesis.split(",");
              let hypothesis_1 = hypothesis[0];
              let hypothesis_2 = hypothesis[1] ? hypothesis[1] : "";

              //create a row for every relevant value;
              data.answer.nodes
                .split(";")
                .map(n => n.trim())
                .map(node => {
                  rRows.push([
                    id,
                    taskId,
                    visType,
                    taskType,
                    topology,
                    hypothesis_1,
                    hypothesis_2,
                    "nodeAnswer",
                    node
                  ]);
                });

              data.answer.value
                .split(";")
                .map(n => n.trim())
                .map(v => {
                  if (v.length > 0) {
                    v = v.replace(/,/g, "");
                    v = v.replace(/\r?\n|\r/g, "");

                    rRows.push([
                      id,
                      taskId,
                      visType,
                      taskType,
                      topology,
                      hypothesis_1,
                      hypothesis_2,
                      "valueAnswer",
                      v
                    ]);
                  }
                });
              if (data.answer.radio) {
                rRows.push([
                  id,
                  taskId,
                  visType,
                  taskType,
                  topology,
                  hypothesis_1,
                  hypothesis_2,
                  "valueAnswer",
                  data.answer.radio
                ]);
              }

              {
                rRows.push([
                  id,
                  taskId,
                  visType,
                  taskType,
                  topology,
                  hypothesis_1,
                  hypothesis_2,
                  "accuracy",
                  data.answer.accuracy
                ]);
                rRows.push([
                  id,
                  taskId,
                  visType,
                  taskType,
                  topology,
                  hypothesis_1,
                  hypothesis_2,
                  "correct",
                  data.answer.correct
                ]);
                rRows.push([
                  id,
                  taskId,
                  visType,
                  taskType,
                  topology,
                  hypothesis_1,
                  hypothesis_2,
                  "difficulty",
                  data.feedback.difficulty
                ]);
                rRows.push([
                  id,
                  taskId,
                  visType,
                  taskType,
                  topology,
                  hypothesis_1,
                  hypothesis_2,
                  "confidence",
                  data.feedback.confidence
                ]);
                rRows.push([
                  id,
                  taskId,
                  visType,
                  taskType,
                  topology,
                  hypothesis_1,
                  hypothesis_2,
                  "minutesToComplete",
                  data.minutesToComplete
                ]);
              }
            });
        });

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

        csvKeys = csvKeys.map(k => k.split(".").pop());
        let csvData = [csvKeys].concat(csvValues);

        // saveCSV(csvData, collection + ".csv");

        // saveCSV([rHeaders].concat(rRows), collection + ".csv");
      }

      saveJSON(validData,'analysisData.json');
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
      return d3.max([0, score]);
    },
    "S-task06": function(answer) {
      //Robert 16112517
      let score = answer.ids
        .split(";")
        .reduce((acc, cValue) => (cValue == "16112517" ? acc + 1 : acc - 1), 0);
      return d3.max([0, score]);
    },
    "S-task07": function(answer) {
      return answer.radio == "European" ? 1 : 0;
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
      return answer.value >= 1500 && answer.value <= 2500 ? 1 : 0;
    },
    "S-task13": function(answer) {
      //EVis19, Mandy
      let correctAnswers = ["1085199426837188600", "1035496563743842300"];
      return scoreList(correctAnswers, answer);
    },
    "S-task14": function(answer) {
      //Rob, Micah
      let correctAnswers = ["208312922", "84043985"];
      return scoreList(correctAnswers, answer);
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
        correctAnswers.find(a => a === cValue)
          ? acc + 1 / correctAnswers.length
          : acc - 1 / correctAnswers.length,
      0
    );

    return d3.max([0, score]);
  }

  return answers[task](answerObj);
}

async function exportForVisone() {
  let graph = await d3.json("network_large_undirected_singleEdge.json");

  //create a barebones graph to import into Visone;
  let bareBonesGraph = { nodes: [], links: [] };

  graph.nodes.map(n =>
    bareBonesGraph.nodes.push({ id: n.id, name: n.shortName })
  );
  graph.links.map((l, i) => {
    let source = graph.nodes.find(n => n.id === l.source);
    let target = graph.nodes.find(n => n.id === l.target);
    bareBonesGraph.links.push({
      source: graph.nodes.indexOf(source),
      target: graph.nodes.indexOf(target),
      id: i
    });
  });

  saveJSON(bareBonesGraph, "layoutGraph.json");
}

async function importLayout() {
  let filenames = [
    "network_large_undirected_singleEdge.json",
    "network_large_undirected_multiEdge.json",
    "network_small_undirected_singleEdge.json"
  ];
  // let taskInfo = await d3.json('results/pilot/study.json');

  filenames.map(async (fname, i) => {
    let graph = await d3.json("results/pilot/" + fname);
    let layoutFile =
      i < 2
        ? "results/pilot/manual_layout_generic.json"
        : "results/pilot/small_manual_layout.json";

    let layout = await d3.json(layoutFile);

    graph.nodes.map(n => {
      // let layoutNode = layout.elements.nodes.find(l=>l.data.label === n.shortName);
      // n.x = layoutNode.position.x;
      // n.y = layoutNode.position.y;

      let layoutNode = layout.nodes.find(l => l.id === n.id);
      n.x = layoutNode.x;
      n.y = layoutNode.y;
    });
    saveJSON(graph, fname);
  });
}
