var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = 960 - margin.right - margin.left,
    height = 800 - margin.top - margin.bottom;

var i = 0,
    duration = 750,
    root;

var tree = d3.layout.tree()
    .size([height, width]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

var svg = null;
var dialog;
var jsonAssetsArr;
var jsonWoArr;

$(document).ready(function() {

     $(function() {
          $("#sortable").sortable({handle: '.handle'});
          //$("#sortable").disableSelection();

          $("#sortable2").sortable({handle: '.handle'});
          // $("#sortable2").disableSelection();
     });

     dialog = $("#dialog").dialog({
          autoOpen: false,
          closeButtonInHeader: false,
          maxWidth: 700,
          // maxHeight: 700,
          //width: 'auto',
          //resizable: true,
          width: 500
     });

     svg = d3.select("#chart").append("svg")
         .attr("width", width + margin.right + margin.left)
         .attr("height", height + margin.top + margin.bottom)
          .append("g")
         .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



     YAML.load('yaml/tenant-assets.yaml', function(json) {
          var $assetTypes = $("#asset_types");
          var $non_BHATypes = $("#non_asset_bha_items");
          console.log(json);

          // initialization array 0-35
          for (var i = 0; i < json.asset_types.length; i++) {
               var asset = json.asset_types[i];
               for (var j = 0; j < json.work_order_types.length; j++) {
                    var woType = json.work_order_types[j];
                    if(woType.underscored && woType.underscored.startsWith(asset.prefix)) {
                         woType._asset = asset;
                    }
               }
          }
          // jsonAssetsArr = json.asset_types;
          jsonWoArr = json.work_order_types;

          function testing(){
               console.log("test");
          }

          var workFlow = {};
          var woTypes = {};
          var woTypesArr = json.work_order_types;
          for(var i=0; i< woTypesArr.length; i++) {
               var workOrder = woTypesArr[i];
               var typeName = "WorkOrder::" + workOrder["display_name"].replace(/ /g, "");
               workOrder._id = typeName;
               woTypes[typeName] = workOrder;
          }

          var smallArray = [];
          for(var i=0; i<36; i++) {
               smallArray.push(json.work_order_types[i]);
          }

          workFlowBuilder(workFlow, "Initializations", smallArray);//woTypesArr
          console.log(workFlow);
          setUpWorkFlow(workFlow);

          function isCircular(parent, id) {
               if (parent.id && parent.id == id) {
                    return true;
               }
               else if (parent.parent) {
                    return isCircular(parent.parent, id);
               }
               else {
                    return false;
               }
          }

          function workFlowBuilder(node, name, spawns) {
               node.name = name;
               if (spawns && spawns.length > 0) {
                    node.children = [];
                    for (var i=0; i<spawns.length; i++) {
                         var spawn = spawns[i];
                         var name = spawn["display_name"];
                         var child = {parent: node, id: spawn._id, wo: spawn};
                         var childSpawns = null;

                         if (spawn.spawns) {
                              childSpawns = [];
                              for (var si = 0; si<spawn.spawns.length; si++) {
                                   var childSpawn = spawn.spawns[si];
                                   childSpawns.push(woTypes[childSpawn.full_klass_name]);
                              }
                         }

                         if (!isCircular(node, child.id)){
                              workFlowBuilder(child, name, childSpawns);
                         }

                         node.children.push(child);
                    }
               }
          }

          function grandChild(key, value) {
               var valType = typeof value;
               if (valType == 'string' || valType == 'number' || valType == 'boolean') {
                    html += "<li>" + key + ": " + value + "</li>";
               }
               else if (valType == 'object') {
                    html += "<li>" + key + ": ";
                    html += "<ul>";
                    for (var key in value) {
                         grandChild(key, value[key]);
                    }
                    html += "</ul>";
                    html += "</li>";
               }
          }
          //var html = ""; //Not sure what this is for?

          random(json.asset_types, $('#sortable'));
          random(json.non_asset_bha_items, $('#sortable2'));
          function random(ran, id) {
               for (var i=0; i < ran.length; i++) {
                    var arrayLvl = ran[i];
                    html = "";
                    html += "<div class='itemBody'>"; //grid
                              html += "<h4 type='button' class='itemHeader handle'>" + arrayLvl["display_name"] + "</h4>";
                              html += "<ul class='outermostLayer'>"; //adding the collapse class will make this disapear
                                   for (var key in arrayLvl) {
                                        grandChild(key, arrayLvl[key]);
                                   }
                              html += "</ul>";
                    html += "</div>";
                    id.append(html); //id.append(html);
               }
          }

          var originalView = true;
          var $grid = null;
          $(".itemHeader").click(function(){
               console.log(originalView);
               console.log($(this).offset());
               $(this).parent().toggleClass('itemBodyBlock itemBody');
               $(this).next().toggleClass('outermostLayerBlock outermostLayer');
               $(this).next().children("ul > li").toggleClass('expansion');
               $(this).next().children().children().children().toggleClass('littleExpansion');
               $(this).next().children().children().toggleClass('grid');
               $(this).next().children().children().children().toggleClass('grid-item');

               if(originalView) {
                    $grid = $(this).next().children().children(".grid").masonry({
                         itemSelector: '.grid-item',
                    });
                    originalView = false;
               }
               else {
                    console.log("ran if false");
                    $grid.masonry('destroy');
                    originalView = true;
               }

               $('html, body').animate({
                    scrollTop: $(this).offset().top - 50
               }, 'fast');
          });
     });
});

function setUpWorkFlow(flowData) {

     root = flowData;
     root.x0 = height / 2;
     root.y0 = 0;

     function collapse(d) {
          if (d.children) {
               d._children = d.children;
               d._children.forEach(collapse);
               d.children = null;
          }
     }
     root.children.forEach(collapse);
     update(root);
}

function update(source) {

     // Compute the new tree layout.
     var nodes = tree.nodes(root).reverse(),
     links = tree.links(nodes);

     // Normalize for fixed-depth.
     nodes.forEach(function(d) { d.y = d.depth * 180; });//180

     // Update the nodes…
     var node = svg.selectAll("g.node")
     .data(nodes, function(d) { return d.id || (d.id = ++i); });

     // Enter any new nodes at the parent's previous position.
     var nodeEnter = node.enter().append("g")
     .attr("class", "node")
     .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
     .on("click", click);

     nodeEnter.append("circle")
     .attr("r", 1e-6)
     .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

     nodeEnter.append("text")
     .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
     .attr("dy", ".35em")
     .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
     .attr("data-id", function(d) { return d.id;})
     .attr("class", "itemNode")
     .text(function(d) { return d.name; })
     .style("fill-opacity", 1e-6)
     .on("click", itemClick);

     // Transition nodes to their new position.
     var nodeUpdate = node.transition()
     .duration(duration)
     .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

     nodeUpdate.select("circle")
     .attr("r", 4.5)
     .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; }); //"lightsteelblue" : "#fff";

     nodeUpdate.select("text")
     .style("fill-opacity", 1);

     // Transition exiting nodes to the parent's new position.
     var nodeExit = node.exit().transition()
     .duration(duration)
     .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
     .remove();

     nodeExit.select("circle")
     .attr("r", 1e-6);

     nodeExit.select("text")
     .style("fill-opacity", 1e-6);

     // Update the links…
     var link = svg.selectAll("path.link")
     .data(links, function(d) { return d.target.id; });

     // Enter any new links at the parent's previous position.
     link.enter().insert("path", "g")
     .attr("class", "link")
     .attr("d", function(d) {
          var o = {x: source.x0, y: source.y0};
          return diagonal({source: o, target: o});
     });

     // Transition links to their new position.
     link.transition()
     .duration(duration)
     .attr("d", diagonal);

     // Transition exiting nodes to the parent's new position.
     link.exit().transition()
     .duration(duration)
     .attr("d", function(d) {
     var o = {x: source.x, y: source.y};
          return diagonal({source: o, target: o});
     })
     .remove();

     // Stash the old positions for transition.
     nodes.forEach(function(d) {
          d.x0 = d.x;
          d.y0 = d.y;
     });
}

// Toggle children on click.
function click(d) {
     console.log(d);
     if (d.children) {
          d._children = d.children;
          d.children = null;
     }
     else {
          d.children = d._children;
          d._children = null;
          if (!d.children) {
               itemClick(d);
          }
     }
     update(d);
}

function itemClick(d) {
     $("#woDialTab").click().addClass(' active');
     var $appendie = $("#dialTab1");
     var $appendie2 = $("#dialTab2");
     $appendie2.empty();
     $appendie.empty();

     function grandChild(key, value) {
          var valType = typeof value;
          if (valType == 'string' || valType == 'number' || valType == 'boolean') {
               html += "<li>" + key + ": " + value + "</li>";
          }
          else if (valType == 'object') {
               html += "<li>" + key + ": ";
               html += "<ul>";
               for (var key in value) {
                    grandChild(key, value[key]);
               }
               html += "</ul>";
               html += "</li>";
          }
     }

     var html = "";//Again... Not sure what this is...

     function random(ran, id) {
          var arrayLvl = ran;

          html = "";
               html += "<div class='itemBodyWF'>"; //class='itemBody'
                         // html += "<h4 type='button' class='itemHeader'>" + arrayLvl["display_name"] + "</h4>";
                         html += "<ul class='outermostLayerWF'>"; //adding the collapse class will make this disapear
                              for (var key in arrayLvl) {
                                   grandChild(key, arrayLvl[key]);
                              }
                         html += "</ul>";
               html += "</div>";
          id.append(html);
     }

     dialog.open(d.name);
     random(d.wo._asset, $appendie);

     var propertyNames = Object.keys(d.wo);
     var noUnderscoreObj = {};
     propertyNames.forEach(function(index) {
          if (!index.startsWith("_")) {
               noUnderscoreObj[index] = d.wo[index];
          }
     });

     random(noUnderscoreObj, $appendie2);
}
