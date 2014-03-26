// ==UserScript==
// @name       NaviSLF
// @namespace  https://github.com/ekun/NaviSLF
// @downloadURL https://raw.github.com/ekun/NaviToggl/master/navislf.tamper.js
// @version    0.1.2
// @description  imports SLF-bugzilla hours into Naviwep
// @match      https://naviwep.steria.no/NaviWEB/timereg_direct.aspx
// @copyright  2014+, Marius Nedal Glittum
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
    var endDate = dates[(dates.length-1)].substring(0,4) + '-' + dates[(dates.length-1)].substring(4,6) + '-' + dates[(dates.length-1)].substring(6);
    var userString = $("[id$='UserInfo']").text();
    var username = userString.substring(userString.indexOf("(")+1, userString.indexOf(")")).toLowerCase();
    console.log('Located steria username: ' + username);

    GM_xmlhttpRequest({
        method: "GET",
        url: 'https://utv-appserver01.slf.dep.no/bugzfront/timer/weekly?user=' + username + '&start=' + startDate + '&end=' + endDate ,
        onload: function(response) {
            result = eval('(' + response.responseText + ')');

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

    return dates;
}

function updateNaviwepField(project, dates) {
    var projectName = project[0];
    var clientName = project[1];
    var hours = project[2];
    var date = project[3];
    var trInDom = $("tr:contains(" + projectName + ")");
    console.log(date + ' :: Updating ' + projectName + ' for ' + clientName + ' with ' + hours + ' hours.');

    if(trInDom.length >= 2) {
      trInDom = $("tr:contains(" + projectName + "):contains(" + clientName + ")");
    }
    if(trInDom.length === 0 || trInDom.length >= 2) {
        trInDom = $("tr:contains(" + projectName + "):not(:contains(ikke Bugzilla))");
    }
    if(trInDom.length >= 1) {
        trInDom.css('background-color', '#39b3d7');
        var md = trInDom.find('input[id$="_RNTB_' + date + '"]');
        md.val(hours);
        md.width("100px");
    } else {
        console.error('Could not find project ' + projectName);
    }
}

initPage();
