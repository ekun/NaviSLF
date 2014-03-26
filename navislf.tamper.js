// ==UserScript==
// @name       NaviToggl2
// @namespace  https://github.com/erlendve/NaviToggl
// @downloadURL https://raw.github.com/erlendve/NaviToggl/master/navitoggl.tamper.js
// @version    0.1
// @description  imports toggl.com weekly hours into Naviwep
// @match      https://naviwep.steria.no/NaviWEB/timereg_direct.aspx
// @copyright  2014+, Erlend Vestad
// @require     http://code.jquery.com/jquery-1.10.1.min.js
// ==/UserScript==

if ( !String.prototype.contains ) {
    String.prototype.contains = function() {
        return String.prototype.indexOf.apply( this, arguments ) !== -1;
    };
}

String.prototype.appearsIn = function() {
    return String.prototype.indexOf.apply( arguments[0], this ) !== -1;
};

function onPeriodChange(handler){
    $(".CurrentPeriod").on("DOMNodeInserted", function(e){
        if (e.target.id == "ctl00_ContentPlaceHolder1_LBL_Approved"){
            handler();
        }
    });
}

function initPage(){
    if ("/period_direct.aspx".appearsIn(document.location.pathname)){
        initPeriodDirectView();
    }

    getWeekFromToggl();
}


function initPeriodDirectView(){
    //onPeriodChange(getWeekFromToggl);
    //getWeekFromToggl();
}

function getWeekFromToggl() {
    var dates = getDateRange();
    var startDate = dates[0].substring(0,4) + '-' + dates[0].substring(4,6) + '-' + dates[0].substring(6);
    console.log("startdate= " + dates[0].substring(0,4) + '-' + dates[0].substring(4,6) + '-' + dates[0].substring(6));

    GM_xmlhttpRequest({
        method: "GET",
        url: 'http://localhost:8080/untitled/timer/weekly?dates='+dates,
        onload: function(response) {
            //alert(response.responseText);
            console.log(eval('(' + response.responseText + ')'));
            result = eval('(' + response.responseText + ')');
            //console.log(result.data[0][1].details);
            details = result;

            for (var index in details) {
                var project = details[index];
                updateNaviwepField(project, dates);
            }
        }
    });
}

function getDateRange() {
    var days = $("a[title^='Date']" );
    var dates = new Array();
    for (var i = 0; i < days.length; i++) {
        dates[i] = days[i].title.substring(6);
    }
    console.log(dates);
    return dates;
}

function updateNaviwepField(project, dates) {
    var projectName = project[0];
    if(projectName === "Teknisk-plattform") projectName = projectName.replace("-", " ")
    var clientName = project[1];
    var hours = project[2];
    var date = project[3];
    var trInDom = $("tr:contains(" + projectName + ")");
    console.log('Updating ' + projectName + ' for ' + clientName + ' with ' + hours ' hours.');

    if(trInDom.length > 1) {
      trInDom = $("tr:contains(" + clientName + ")").css('background-color', '#39b3d7');
    } else if(trInDom.length === 0) {
        console.log('Could not find project ' + projectName);
        return ;
    }
    trInDom.css('background-color', '#39b3d7');
    var md = trInDom.find('input[id$="_RNTB_' + date + '"]');
    md.val(hours);
    md.width("100px");
}

initPage();

//$('#contentDiv').click(function() {if (!meny.isOpen())meny.close();});
