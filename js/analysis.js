

//checks if member is is from prolific (only contains numbers)
function isProlific(id) {
  return mode === 'pilot' ? id[0] == "5" : id[0] === 'C'
  // return id[0] == "5";
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


function fetchData(){

  let collectionNames = [
    // "heuristics_participants",
    // "results",
    "provenance",
    // "trial_provenance",
    // "trial_results",
    // "participant_actions",
    // "study_participants"
  ];

  let allData = {};

  let allDocs = collectionNames.map(async collectionName => {

  let querySnapshot = await db.collection(collectionName).get();

  allData[collectionName] = [];
  querySnapshot.forEach(function(doc) {
    let data = doc.data();
    allData[collectionName].push({ id: doc.id, data });
  });

    saveJSON(
      JSON.stringify(allData[collectionName]),
      collectionName + ".json"
    );
  })


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

  x.domain([0,75*60*1000]);

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

    let resultsArray;
    if (participantResults){
      resultsArray = Object.entries(participantResults);
    }

    // console.log(provData[index].provEvents)

    //associate results data for each task
    provData[index].provEvents.map(e=>{
      if (e.label === "task" && resultsArray){

        // debugger;
        let data = resultsArray.filter(r=> r[0]===e.task)[0];
        // console.log(e,resultsArray,data)
        if (data){
          e.order = data[1].order;
          e.task = {id:data[0],data:data[1]};
        }         
      }
    })
   

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
        );

  let rectsEnter = rects
    .enter()
    .append("rect")
    .attr("class", "event")
    .style('opacity',d=>{      
      return d.task && d.task.id ? opacityScale(d.task.id.match(/\d+/g).map(Number)):''});

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
    .classed('wrong',d=>d.task && d.task.data && d.task.data.answer ? d.task.data.answer.correct == 0 : false)
    // .classed('sortedOn', d=>sortOrder && d.task && d.task.id == sortOrder)

    rects
    .on('mouseover',d=>{
      let tooltipContent;
      if (d.label == 'task'){
        tooltipContent =(d.task && d.task.id !== undefined ? '<strong>' + d.task.id + '</strong>' + '[' + d.task.data.answer.accuracy + ']' + '<br/>' +  d.task.data.prompt : '');

      } else {
        tooltipContent = d.label + ':' + (Math.round((Date.parse(d.endTime) - Date.parse(d.startTime))/1000/6)/10)  +  'min';
      }
      showTooltip(d.endTime ? tooltipContent : d.label)
    })
    .on("mouseout",hideTooltip)
    .on("click",d=>{
      if (d.order!==undefined){
        drawProvenance(d.task.id)
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

    participantGroups.append('text').attr('class','id')
    .text(d=>d.id)
    .attr('x',x.range()[1])
    .attr('y',y(1))
    .style('text-anchor','end')


    participantGroups.append('text').attr('class','visType')
    .text(participantResults ? (participantResults['S-task01'].visType == 'adjMatrix' ? 'AM' : 'NL') : 'NA')
    .attr('x',x.range()[0]-30)
    .attr('y',y(-.3))
    .style('text-anchor','end')

  let labels = participantGroups.selectAll(".label").data((d, i) =>
    d.provEvents
      .filter(e => e.type === type)
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
    .text(d => d.level == 0 && d.label !== 'browse away' ? d.label : '')


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

async function drawProvenance(sortOrder) {

     //add tooltip
     d3.select("body")
     .append("div")
     .attr("class", "tooltip")
     .style("opacity", 0);
  
  
    let provData = await d3.json(
      "results/" + mode + "/JSON/provenance_events.json"
    );
 

    participantResults = await d3.json(
      "results/" + mode + "/JSON/processed_results.json"
    );
     
  var margin = { top: 50, right: 15, bottom: 25, left: 150 };

  var height = 180;
  var width = (window.screen.availWidth - margin.left)/2;


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
      // let isANodeLink = aResults.data['S-task01'].visType === 'nodeLink';
      // let isBNodeLink = bResults.data['S-task01'].visType === 'nodeLink';

      // return (isANodeLink && isBNodeLink) ? 0 : isANodeLink ? -1 : 1

      return aResults.data.averageAccuracy > bResults.data.averageAccuracy ? -1 : 1 

      // return aResults.data[sortOrder].answer.accuracy > bResults.data[sortOrder].answer.accuracy ? -1 : 1 
    } else{
      // let isANodeLink = aResults.data['S-task01'].visType === 'nodeLink';
      // let isBNodeLink = bResults.data['S-task01'].visType === 'nodeLink';

      // return (isANodeLink && isBNodeLink) ? 0 : isANodeLink ? -1 : 1


 
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
      .attr('y',margin.top)
      .attr('height',height )
      .attr('width',5) //width  + 20 + margin.right);
    }

    svg = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      makePlot(provData,i, "longAction",width,height,svg,participantResult.data,sortOrder);
  
  })
  
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
