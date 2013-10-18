var traceDataList = {};

var traceDataHash = {};
var traceLinkHash = {};

var minData = {};
var maxData = {};

// Records for each context key all the values ever observed for it
var allCtxtVals = {};

// Maps each trace/context key and value to its type:
// string - generic type elements of which are ordered lexically
// number
var traceValType = {};
var ctxtValType = {};

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function traceRecord(traceLabel, traceVals, traceValLinks, contextVals, viz) {
  // If this is the first time we've added a record to this trace
  if(!traceDataList.hasOwnProperty(traceLabel)) {
    traceDataList[traceLabel] = [];
    traceDataHash[traceLabel] = {};
    traceLinkHash[traceLabel] = {};
  }
  
  // Initialize the minimum and maximum for each key
  for(ctxtKey in contextVals) { if(contextVals.hasOwnProperty(ctxtKey)) {
    if(!minData.hasOwnProperty(ctxtKey)) minData[ctxtKey] = 1e100;
    if(!maxData.hasOwnProperty(ctxtKey)) maxData[ctxtKey] = -1e100;
  } }
  
  for(traceKey in traceVals) { if(traceVals.hasOwnProperty(traceKey)) {
    if(!minData.hasOwnProperty(traceKey)) minData[traceKey] = 1e100;
    if(!maxData.hasOwnProperty(traceKey)) maxData[traceKey] = -1e100;
  } }

  // Update the info on the type of trace and context keys
  for(ctxtKey in contextVals) { if(contextVals.hasOwnProperty(ctxtKey)) {
    updateKeyValType(ctxtValType, ctxtKey, contextVals[ctxtKey]);
  } }
  for(traceKey in traceVals) { if(traceVals.hasOwnProperty(traceKey)) {
    updateKeyValType(traceValType, traceKey, traceVals[traceKey]);
  } }
  
  // Create an object that contains the data of the current observation
  var allVals = {};
  if(viz == 'table' || viz == 'lines' || viz == 'decTree' || viz == 'heatmap') {
    
    // Add the data
    for(ctxtKey in contextVals) { if(contextVals.hasOwnProperty(ctxtKey)) {
      allVals[ctxtKey] = contextVals[ctxtKey];
      if(parseInt(minData[ctxtKey]) > parseInt(contextVals[ctxtKey])) minData[ctxtKey] = contextVals[ctxtKey];
      if(parseInt(maxData[ctxtKey]) < parseInt(contextVals[ctxtKey])) maxData[ctxtKey] = contextVals[ctxtKey];
    } }
    for(traceKey in traceVals) { if(traceVals.hasOwnProperty(traceKey)) {
      allVals[traceKey] = traceVals[traceKey];
      if(parseInt(minData[traceKey]) > parseInt(traceVals[traceKey])) minData[traceKey] = traceVals[traceKey];
      if(parseInt(maxData[traceKey]) < parseInt(traceVals[traceKey])) maxData[traceKey] = traceVals[traceKey];
    } }
  }
  
  if(viz == 'heatmap') {
    for(ctxtKey in contextVals) { if(contextVals.hasOwnProperty(ctxtKey)) {
      if(allCtxtVals[ctxtKey] == undefined) { allCtxtVals[ctxtKey] = {}; }
      allCtxtVals[ctxtKey][contextVals[ctxtKey]] = 1;
    } }
  }
  
  traceDataList[traceLabel].push(allVals);
  
  addDataHash(traceDataHash[traceLabel], traceVals, contextVals);
  addDataHash(traceLinkHash[traceLabel], traceValLinks, contextVals);
}

// Given a mapping of trace/context keys to the types of their values,
// updates the mapping that, taking the next observation of the value into account 
function updateKeyValType(typemap, key, val) {
  if(isNumber(val)) {
    // If we don't yet know this key's type, initialize it to "number"
    if(!(key in typemap)) typemap[key]="number";
    // If we currently believe the key's type is something other than "number", set it to "string" since it includes all possibilities
    else if(typemap[key]!="number") typemap[key]="string";
  }
  // Since we don't know the type of this key, set it to "string" (overwrites any prior setting)
  typemap[val]="string";
}

// Given the type of a given key, returns an appropriate comparison function to use when sorting
// instances of the key
function getCompareFunc(keyType) {
  if(keyType == "number")
    return function(a, b) { return a-b; }
  else
    return function(a, b) { return a<b; }
}

function addDataHash(dataHash, traceVals, contextVals) {
  // Set ctxt to be a sorted array of the contextVals keys
  var ctxt = [];
  for(ctxtKey in contextVals) { if(contextVals.hasOwnProperty(ctxtKey)) { ctxt.push(ctxtKey); } }
  ctxt.sort();
  
  var subTDH = dataHash;
  for(var i=0; i<ctxt.length; i++) {
    if(subTDH[contextVals[ctxt[i]]] == undefined) { subTDH[contextVals[ctxt[i]]]={}; }
    subTDH = subTDH[contextVals[ctxt[i]]];
  }
  subTDH["data"] = traceVals;
}

function getDataHash(dataHash, contextVals) {
  // Set ctxt to be a sorted array of the contextVals keys
  var ctxt = [];
  for(ctxtKey in contextVals) { if(contextVals.hasOwnProperty(ctxtKey)) { ctxt.push(ctxtKey); } }
  ctxt.sort();

  var subTDH = dataHash;  
  for(var i=0; i<ctxt.length; i++) {
    if(subTDH[contextVals[ctxt[i]]] == undefined) { return undefined; }
    subTDH = subTDH[contextVals[ctxt[i]]];
  }
  if(subTDH["data"] == undefined) { return undefined; }
  return subTDH["data"];
}

var displayTraceCalled = {};
function displayTrace(traceLabel, blockID, contextAttrs, traceAttrs, viz) {
  if(viz == 'table') {
    var ctxtCols = [];
    for(i in contextAttrs)
      ctxtCols.push({key:contextAttrs[i], label:contextAttrs[i], sortable:true});
    
    var traceCols = [];
    for(i in traceAttrs)
      traceCols.push({key:traceAttrs[i], label:traceAttrs[i], sortable:true});
    
    YUI().use("datatable-sort", function (Y) {
        // A table from data with keys that work fine as column names
        var traceTable = new Y.DataTable({
            columns: [ {label:"Context", children:ctxtCols},
                       {label:"Trace",   children:traceCols} ],
            data   : traceDataList[traceLabel],
            caption: traceLabel
        });
        
        traceTable.render("#div"+blockID);
      });
  } else if(viz == 'lines') {
    var minVal=1e100, maxVal=-1e100;
    for(i in traceAttrs) { 
        if(minVal>minData[traceAttrs[i]]) 
          minVal=minData[traceAttrs[i]]; }
    for(o in traceAttrs) { 
        if(maxVal<minData[traceAttrs[i]]) 
          maxVal=maxData[traceAttrs[i]]; }
    
    // Create a div in which to place this context attribute's line graph 
    YUI().use("charts", function (Y) {
        var myAxes = {
            values:{
                keys:traceAttrs,
                type:"numeric",
                minimum:minVal,
                maximum:maxVal
            }
        };
      
        // A table from data with keys that work fine as column names
        var traceChart = new Y.Chart({
            type: "line",
            dataProvider: traceDataList[traceLabel],
            categoryKey: contextAttrs[0],
            seriesKeys: traceAttrs,
            axes:myAxes,
            render: "#div"+blockID+"_"+contextAttrs[0]
        });
      });
  } else if(viz == 'decTree') {
    //if(!displayTraceCalled.hasOwnProperty(traceLabel)) {
    traceDataList[traceLabel] = _(traceDataList[traceLabel]);
    var model = id3(traceDataList[traceLabel], traceAttrs[0], contextAttrs);
    //alert(document.getElementById("div"+blockID).innerHTML)
    // Create a div in which to place this attribute's decision tree
    //document.getElementById("div"+blockID).innerHTML += traceAttrs[0]+"<div id='div"+blockID+":"+traceAttrs[0]+"'></div>";
    drawGraph(model,"div"+blockID+"_"+traceAttrs[0]);
  } else if(viz == 'heatmap') {
    // Array of keys of the context variables. Only the first two are used.
    var ctxtKeys = [];
    for(ctxtKey in allCtxtVals) { if(allCtxtVals.hasOwnProperty(ctxtKey)) {
      ctxtKeys.push(ctxtKey);
    } }
    
    // Array of all the values of the first context key, in sorted order
    var ctxt0KeyVals = [];
    for(ctxt0Key in allCtxtVals[ctxtKeys[0]]) { if(allCtxtVals[ctxtKeys[0]].hasOwnProperty(ctxt0Key)) { ctxt0KeyVals.push(ctxt0Key); } }
    ctxt0KeyVals.sort(getCompareFunc(ctxtValType[ctxtKeys[0]]));

    // Array of all the values of the second context key, in sorted order
    var ctxt1KeyVals = [];
    for(ctxt1Key in allCtxtVals[ctxtKeys[1]]) { if(allCtxtVals[ctxtKeys[1]].hasOwnProperty(ctxt1Key)) { ctxt1KeyVals.push(ctxt1Key); } }
    ctxt1KeyVals.sort(getCompareFunc(ctxtValType[ctxtKeys[1]]));
    
    // Create the gradient to be used to color the tiles
    var numColors = 1000;
    var colors = gradientFactory.generate({
        from: "#0000FF",
        to: "#FF0000",
        stops: numColors
    });
    // The values of attributes will be placed into numColors buckets, each marked with a different color.
    // This is the size of each bucket for each trace attribute
    var valBucketSize = [];
    
    // Prepare the data array that holds the info on the heatmaps to be shown (top-level of array, one 
    // sub-array per entry in traceAttrs) and the individual tiles in each heatmap (second-level array,
    // one entry for each pair of items in ctxt0KeyVals and ctxt1KeyVals)
    var data = [];
    for(traceAttrIdx in traceAttrs) { 
      valBucketSize[traceAttrIdx] = (maxData[traceAttrs[traceAttrIdx]] - minData[traceAttrs[traceAttrIdx]])/numColors;

      // attrData records the row and column of each tile in its heatmap (separate heatmap for each trace attribute), 
      // along with the index of the trace attribute in traceAttrs.
      var attrData = [];
      for(k1 in ctxt1KeyVals) {
      for(k0 in ctxt0KeyVals) {
        var contextVals = {};
        contextVals[ctxtKeys[0]] = ctxt0KeyVals[k0];
        contextVals[ctxtKeys[1]] = ctxt1KeyVals[k1];
        
        var traceVals = getDataHash(traceDataHash[traceLabel], contextVals);
        var traceLinks = getDataHash(traceLinkHash[traceLabel], contextVals);
        // If there is a record for this combination of context key values, add it to the dataset
        if(traceVals && traceLinks)
          attrData.push({row: k1, 
                         col:k0, 
                         traceAttrIdx:traceAttrIdx,
                         traceVals:traceVals, 
                         traceLinks:traceLinks});
      } }
      
      // Add the data for the current trace attribute to the dataset
      data.push(attrData);
    }
    var tileWidth=20;
    var tileHeight=20;
    var titleHeight=20;
    var titleGap=5;
    
    var container = 
           d3.select("#div"+blockID).selectAll("svg")
                  .data(data)
                .enter()
                .append("svg")
                  .attr("width",  tileWidth*ctxt0KeyVals.length)
                  .attr("height", titleHeight + titleGap + tileHeight*ctxt0KeyVals.length)
                  .attr("x", 0)
                  .attr("y", 1000);
    
    var title = container.append("text")
               .text(function(d, i) { /*alert(traceAttrs[i]);*/return traceAttrs[i]; })
               .attr("text-anchor", "middle")
               .attr("x", (tileWidth*ctxt0KeyVals.length)/2)
               .attr("y", titleHeight)
               .attr("fill", "#000000")
               .attr("font-family", "sans-serif")
               .attr("font-size", titleHeight+"px");
    //titleHeight = title.node().getBBox()["height"];
    
    container.selectAll("g")
                 .data(function(d, i) { return data[i]; })
      .enter()
      .append("g")
        .attr("width",  tileWidth)
        .attr("height", tileHeight)
        .attr("transform", function(d) { return "translate("+(d["col"]*tileWidth)+","+(d["row"]*tileHeight+titleHeight+titleGap)+")"; })
      .append("rect")
        .attr("width",  tileWidth)
        .attr("height", tileHeight)
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", function(d, i) {
          var valBucket = Math.floor((d["traceVals"][traceAttrs[d["traceAttrIdx"]]] - minData[traceAttrs[d["traceAttrIdx"]]]) / valBucketSize[d["traceAttrIdx"]]);
          return colors[Math.min(valBucket, colors.length-1)];
          })
        .on("click", function(d) {
          eval(d["traceLinks"][traceAttrs[d["traceAttrIdx"]]]);
          return true;
          });
         
  }
  
  displayTraceCalled = true;
}

