// ==UserScript==
// @name       NaviSLF
// @namespace  https://github.com/ekun/NaviSLF
// @homepage    https://github.com/ekun/NaviSLF
// @downloadURL https://raw.github.com/ekun/NaviToggl/master/navislf.tamper.js
// @updateURL   https://raw.github.com/ekun/NaviToggl/master/navislf.tamper.js
// @version    0.4.5
// @description  Imports SLF-bugzilla hours into Naviwep
// @match      https://naviwep.steria.no/NaviWEB/*
// @copyright  2014+, Marius Nedal Glittum
// @require     http://code.jquery.com/jquery-1.10.1.min.js
// @resource 	bootstrapCss	https://raw.githubusercontent.com/ekun/navislf/master/css/bootstrap.css
// @resource 	bootstrap2Css	https://raw.githubusercontent.com/ekun/navislf/master/css/bootstrap-theme.css
// ==/UserScript==
/*
 * Utvikler tar ikke ansvar for at timene blir feil i NaviWep 
 */

if ( !String.prototype.contains ) {
    String.prototype.contains = function() {
        return String.prototype.indexOf.apply( this, arguments ) !== -1;
    };
}

String.prototype.appearsIn = function() {
    return String.prototype.indexOf.apply( arguments[0], this ) !== -1;
};

function initPage(){
    killThoseEffingMenuAnimations();

    if(("/period_direct.aspx".appearsIn(document.location.pathname)) {
       getBugzillaHoursForWeek();
    }
}


function getBugzillaHoursForWeek() {
    var cssTxt  = GM_getResourceText("bootstrapCss");
    GM_addStyle (cssTxt);
    var css2Txt  = GM_getResourceText("bootstrap2Css");
    GM_addStyle (css2Txt);
    
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
            if(response.status == 200) {
                result = eval('(' + response.responseText + ')');
    
                details = result;
    
                for (var index in details) {
                    var project = details[index];
                    updateNaviwepField(project, dates);
                }
            } else {
				logHendelse("<p style='margin: 0; padding:0;'>Fikk ikke kontakt med Bugzilla.</p>");
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

    if(clientName !== "Bugzilla") {
      trInDom = $("tr:contains(" + projectName + "):contains(" + clientName + ")");
    } else {
        trInDom = $("tr:contains(" + projectName + "):contains(Bugzilla):not(:contains(ikke Bugzilla))");
    }
    if(trInDom.length === 1) {
        trInDom.css('background-color', '#39b3d7');
        var md = trInDom.find('input[id$="_RNTB_' + date + '"]');
        md.val(hours);
        md.width("100px");
    } else {
        projectNotFound(projectName, clientName);
    }
}

function projectNotFound(projectName, clientName) {
    logHendelse("<p style='margin: 0; padding:0;'>Fant ikke NaviWep prosjekt for <b>"+projectName+":"+clientName+"</b></p>");
}

function logHendelse(message) {
    var errorField = $("[id$='NaviSLFLogField']");
    
    if(errorField.length == 0) {
        $("[class='CurrentPeriod']").after("<div class='row' style='padding-top: 10px;'><div class='col-md-4' style='float: none; margin: 0 auto;'><div id='NaviSLFLogField' class='alert alert-danger'><strong>Feil</strong></div></div></div>");
        errorField = $("[id$='NaviSLFLogField']");
    }
    errorField.append(message);
}

function killThoseEffingMenuAnimations(){
    Telerik.Web.UI.AnimationSettings.prototype.get_type = function(){return 0;}
    Telerik.Web.UI.AnimationSettings.prototype.get_duration = function(){return 0;}
    Telerik.Web.UI.RadMenu.prototype.get_collapseDelay = function(){return 0;}
}  

initPage();
