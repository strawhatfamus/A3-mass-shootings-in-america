import "regenerator-runtime/runtime";

var topology = require("./us-states.json");
var map, tooltip, info, view, zoom;
var width = 975,
  height = 610,
  focus = d3.select(null);
var defaultView = viewToString(0, 0, width, height);

var currentFilter;
var projection = d3
    .geoAlbersUsa()
    .scale(1300)
    .translate([487.5, 305]),
  path = d3.geoPath();

var data = require("./data.csv");
var smallest_year = 9999;
var largest_year = 0;

var allData = [];
var curData = [];
var year_to_data = {};
var coord_to_data = {};
var filters = {
  race: [],
  location_state: [],
  gender: [],
  weapon_type: [],
  mental: [],
  age: [],
  legal: [],
  location: [],
  type: [],
};

var selected_filters = {
  race: [],
  location_state: [],
  gender: [],
  weapon_type: [],
  mental: [],
  age: [],
  legal: [],
  location: [],
  type: [],
};
async function parseData() {
  await d3.csv(data, async function(row) {
    allData.push(row);
    if (year_to_data[row.year] === undefined) {
      year_to_data[row.year] = [row];
    } else {
      year_to_data[row.year].push(row);
    }
    smallest_year = Math.min(smallest_year, parseInt(row.year));
    largest_year = Math.max(largest_year, parseInt(row.year));
    if (!filters.race.includes(row.race)) {
      filters.race.push(row.race);
    } 
    let state = row.location.split(", ")[1];
    if (!filters.location_state.includes(state)) {
      filters.location_state.push(state);
    } 

    if (!filters.gender.includes(row.gender)) {
      filters.gender.push(row.gender);
    } 
    let weapons = row.weapon_type.split(";");
    weapons.forEach(weapon => {
      weapon = weapon.trim();
      if (!filters.weapon_type.includes(weapon)) {
        filters.weapon_type.push(weapon);
      } 
    });
    
    if (!filters.mental.includes(row.prior_signs_mental_health_issues)) {
      filters.mental.push(row.prior_signs_mental_health_issues);
    } 
    let rounded_age = Math.floor(parseInt(row.age_of_shooter)/ 10) * 10;
    if (!filters.age.includes(rounded_age)) {
      filters.age.push(rounded_age);
    } 
    if (!filters.legal.includes(row.weapons_obtained_legally)) {
      filters.legal.push(row.weapons_obtained_legally);
    } 
    if (!filters.type.includes(row.type)) {
      filters.type.push(row.type);
    } 
    if (!filters.location.includes(row.location_type)) {
      filters.location.push(row.location_type);
    } 
  });

}

function filterData(){
  if(curData === undefined){
    return [];
  }
  let filteredData = curData;
  
  filteredData = selected_filters.race.length > 0 ? filteredData.filter((row) => selected_filters.race.includes(row.race)) : filteredData;
  filteredData = selected_filters.location_state.length > 0 ? filteredData.filter((row) => selected_filters.location_state.includes(row.location.split(", ")[1])) : filteredData;
  filteredData = selected_filters.gender.length > 0 ? filteredData.filter((row) => selected_filters.gender.includes(row.gender)) : filteredData;
  filteredData = selected_filters.weapon_type.length > 0 ? filteredData.filter((row) => selected_filters.weapon_type.filter((val) => row.weapon_type.split(";").map(s => s.trim()).includes(val)).length > 0 ) : filteredData;
  filteredData = selected_filters.mental.length > 0 ? filteredData.filter((row) => selected_filters.mental.includes(row.prior_signs_mental_health_issues)) : filteredData;
  filteredData = selected_filters.age.length > 0 ? filteredData.filter((row) => selected_filters.age.includes(Math.floor(parseInt(row.age_of_shooter)/ 10) * 10)) : filteredData;
  filteredData = selected_filters.legal.length > 0 ? filteredData.filter((row) => selected_filters.legal.includes(row.weapons_obtained_legally)) : filteredData;
  filteredData = selected_filters.location.length > 0 ? filteredData.filter((row) => selected_filters.location.includes(row.location_type)) : filteredData;
  filteredData = selected_filters.type.length > 0 ? filteredData.filter((row) => selected_filters.type.includes(row.type)) : filteredData;

  return filteredData;
}


async function renderMap() {
  // Initialize svg object
  document.getElementById("map").innerHTML = "";
  let filteredData = filterData();
  console.log(filteredData)
  map = d3
    .select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", defaultView)
    .attr("preserveAspectRatio", "xMidYMid slice")
    .attr("id", "map")
    .append("g");

  tooltip = d3
    .select("#map")
    .append("div")
    .attr("class", "tooltip");

  info = d3
    .select("#map")
    .append("div")
    .attr("class", "info")
    .attr("height", "0px");

  zoom = d3
    .zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

  view = map
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all");
  map.call(zoom);

  // Adding usa border
  map
    .append("path")
    .attr("class", "map")
    .attr("d", path(topojson.feature(topology, topology.objects.nation)));

  // Adding state borders
  map
    .append("path")
    .attr("class", "map")
    .attr("d", path(topojson.feature(topology, topology.objects.states)));

  for (let i = 0; i < filteredData.length; i++) {
    let row = filteredData[i];
    let coord = [row.longitude, row.latitude];
    let x = projection(coord)[0],
      y = projection(coord)[1];

    // Adding circles
    map
      .append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", Math.sqrt(row.fatalities) * 2)
      .attr("fill", "red")
      .attr("opacity", 1)
      .attr("id", "point")
      .on("mouseover", function() {
        d3.select(this).attr("opacity", 0.6);
        tooltip
          .html(row.case)
          .style("left", d3.event.pageX + 5 + "px")
          .style("top", d3.event.pageY - 20 + "px")
          .style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 1);
        tooltip.html("").style("opacity", 0);
      })
      .on("click", handleClick);
    coord_to_data[(Math.round(x), Math.round(y))] = row;
  }
}

function handleClick() {
  if (this["id"] === "point") {
    let p = d3.select(this);
    let x = Math.round(p._groups[0][0]["cx"].baseVal.value),
      y = Math.round(p._groups[0][0]["cy"].baseVal.value);
    openPanel(coord_to_data[(x, y)]);
  }
}

function zoomed() {
  console.log("here");
  map.attr("transform", d3.event.transform);
}

function openPanel(pointData) {
  var externalLink = pointData.sources.split(";")[0];
  var w = 250,
    h = height;
  var embedd =
    "<iframe sandbox=allow-scripts width=" +
    w +
    " height= " +
    h +
    " src=" +
    externalLink +
    "</iframe>";

  info
    .html(embedd)
    .style("right", 0 + "%")
    .style("top", 80 + "px")
    .style("height", 0 + "px")
    .style("opacity", 0)
    .style("padding", "5px 5px 5px 5px")
    .transition()
    .duration(1000)
    .style("opacity", 0.9)
    .style("width", w + "px")
    .style("height", h + "px");
}

function viewToString(x1, y1, x2, y2) {
  return x1 + " " + y1 + " " + x2 + " " + y2;
}

async function initSlider() {
  var slider_label = document.getElementById("slider_year");
  var slider = document.getElementById("slider");
  var all_years = document.getElementById("all_years_button");

  all_years.addEventListener("click", function() {
    slider_label.innerText = "All years";
    curData = allData;
    document.getElementById("map").innerHTML = "";
    renderMap();
  });
  slider_label.innerText = "All years";
  slider.setAttribute("max", largest_year);
  slider.setAttribute("min", smallest_year);
  slider.addEventListener("change", function() {
    document.getElementById("slider_year").innerText = document.getElementById(
      "slider"
    ).value;
    let temp = year_to_data[document.getElementById("slider").value];
    if (temp === undefined) {
      curData = [];
    }
    curData = temp;
    document.getElementById("map").innerHTML = "";
    renderMap();
  });
}

async function initFilter(){
  var race_filter = document.getElementById("select_race");
  filters.race.forEach(element => {
    let option = document.createElement('option');
    option.setAttribute('value', element);
    option.innerText = element;
    race_filter.appendChild(option);
  });
  race_filter.addEventListener("change", function(){
    selected_filters.race = $(this).val();
    renderMap();
  });

  var location_state_filter = document.getElementById("select_state");
  filters.location_state.forEach(element => {
    let option = document.createElement('option');
    option.setAttribute('value', element);
    option.innerText = element;
    location_state_filter.appendChild(option);
  });
  location_state_filter.addEventListener("change", function(){
    selected_filters.location_state = $(this).val();
    renderMap();
  });

  var gender_filter = document.getElementById("select_gender");
  filters.gender.forEach(element => {
    let option = document.createElement('option');
    option.setAttribute('value', element);
    option.innerText = element;
    gender_filter.appendChild(option);
  });
  gender_filter.addEventListener("change", function(){
    selected_filters.gender = $(this).val();
    renderMap();
  });

  var weapon_type_filter = document.getElementById("select_weapon");
  filters.weapon_type.forEach(element => {
    let option = document.createElement('option');
    option.setAttribute('value', element);
    option.innerText = element;
    weapon_type_filter.appendChild(option);
  });
  weapon_type_filter.addEventListener("change", function(){
    selected_filters.weapon_type = $(this).val();
    renderMap();
  });

  var mental_filter = document.getElementById("select_mental");
  filters.mental.forEach(element => {
    let option = document.createElement('option');
    option.setAttribute('value', element);
    option.innerText = element;
    mental_filter.appendChild(option);
  });
  mental_filter.addEventListener("change", function(){
    selected_filters.mental = $(this).val();
    renderMap();
  });

  var age_filter = document.getElementById("select_age");
  filters.age.forEach(element => {
    let option = document.createElement('option');
    option.setAttribute('value', element);
    option.innerText = element;
    age_filter.appendChild(option);
  });
  age_filter.addEventListener("change", function(){
    selected_filters.age = $(this).val();
    renderMap();
  });

  var legal_filter = document.getElementById("select_legal");
  filters.legal.forEach(element => {
    let option = document.createElement('option');
    option.setAttribute('value', element);
    option.innerText = element;
    legal_filter.appendChild(option);
  });
  legal_filter.addEventListener("change", function(){
    selected_filters.legal = $(this).val();
    renderMap();
  });

  var location_filter = document.getElementById("select_location");
  filters.location.forEach(element => {
    let option = document.createElement('option');
    option.setAttribute('value', element);
    option.innerText = element;
    location_filter.appendChild(option);
  });
  location_filter.addEventListener("change", function(){
    selected_filters.location = $(this).val();
    renderMap();
  });

  var type_filter = document.getElementById("select_type");
  filters.type.forEach(element => {
    let option = document.createElement('option');
    option.setAttribute('value', element);
    option.innerText = element;
    type_filter.appendChild(option);
  });
  type_filter.addEventListener("change", function(){
    selected_filters.type = $(this).val();
    renderMap();
  });

  $('.selectpicker').selectpicker('refresh');

}

async function init() {
  await parseData();
  curData = allData;
  await renderMap();
  await initSlider();
}

init();
