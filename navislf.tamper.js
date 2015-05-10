// ==UserScript==
// @name       NaviSLF
// @namespace  https://github.com/ekun/NaviSLF
// @homepage    https://github.com/ekun/NaviSLF
// @downloadURL https://raw.github.com/ekun/NaviToggl/master/navislf.tamper.js
// @updateURL   https://raw.github.com/ekun/NaviToggl/master/navislf.tamper.js
// @version    0.9.1
// @description  Imports SLF-bugzilla hours into Naviwep
// @match      https://naviwep.steria.no/NaviWEB/*
// @copyright  2014+, Marius Bækken Glittum
// @require     http://code.jquery.com/jquery-1.10.1.min.js
// @resource 	bootstrapCss	https://raw.githubusercontent.com/ekun/navislf/master/css/bootstrap.css
// @resource 	bootstrap2Css	https://raw.githubusercontent.com/ekun/navislf/master/css/bootstrap-theme.css
// ==/UserScript==
/*
 * Utvikler tar ikke ansvar for at timene blir feil i NaviWep 
 */

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str){
        return this.slice(0, str.length) == str;
    };
}

$.expr[":"].contains = $.expr.createPseudo(function(arg) {
    return function( elem ) {
        return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
});

function initPage(){
    killThoseEffingMenuAnimations();
    saneCellAlignment();

    if(document.location.pathname.endsWith("timereg_direct.aspx")) {
        getBugzillaHoursForWeek();
    }
}

(function(open) {
    XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
        this.addEventListener("readystatechange", function() {
            if(this.readyState === 4) {
                if(url.endsWith("timereg_direct.aspx")) {
                    GM_log('Getting Bugzilla-hours after pagechange.');
                    resetErrorField();
                    getBugzillaHoursForWeek();
                }
            }
        }, false);
        open.call(this, method, url, async, user, pass);
    };
})(XMLHttpRequest.prototype.open);

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
    GM_log('Located steria username: ' + username);
    GM_log('Detected date-range: '+startDate+ ' -> ' +endDate);

    if(username === "cfornes") {
        username = "camf";
    }
    if(username === "iholen") {
        username = "ikh";
    }

    storeFlexFromThisPeriode();
    addNaviSlfFlexField();

    GM_xmlhttpRequest({
        method: "GET",
        url: 'https://utv-appserver01.slf.dep.no/bugzfront/timer/weekly?user=' + username + '&start=' + startDate + '&end=' + endDate ,
        onload: function(response) {
            GM_log("Henter BUGZILLA-timer for perioden "+startDate+" til "+endDate+".");
            if(response.status == 200) {
                result = eval('(' + response.responseText + ')');

                details = result;

                for (var index in details) {
                    var project = details[index];
                    updateNaviwepField(project, dates);
                }
            } else {
                logHendelse("<p style='margin: 0; padding:0;'>Fikk ikke kontakt med Bugzfront for å hente timer.</p>");
            }
        }
    });
}


function storeFlexFromThisPeriode() {
    var dates = getDateRange();
    for (var i = 0; i < dates.length; i++) {
        var flexHoursForDay = Number($('.rgFooter:last td:eq('+(i+6)+')').text().replace(",", "."));
        var date = "" + dates[i];
        GM_setValue(date, flexHoursForDay);
    }
}

function getDateRange() {
    var days = $("a[title^='Date']" );
    var dates = new Array();
    for (var i = 0; i < days.length; i++) {
        dates[i] = days[i].title.substring(6);
    }

    return dates;
}

function addNaviSlfFlexField() {
    var flexField = $("[id$='NaviSlfFlexField']");
    if(flexField.length !== 0) {
        flexField.remove();
    }
    var htmlString = buildFlexFieldString();
    $('.rgFooter:last').after(htmlString);
}

function buildFlexFieldString() {
    var flexFieldString = "<tr class='rgFooter'>";
    var collumnCount = $('.rgFooter:first td').size();

    for(i = 0; i < collumnCount-1; i++) {
        if(i === 4) {
            flexFieldString += "<td style='font-weight:bold;'>Månedsflex:</td>";
        } else {
            flexFieldString += "<td style='font-weight:bold;'></td>";
        }
    }
    var hoursFlexAbleSelectedMonth = getFlexAbleHoursSelectedMonth();
    flexFieldString += "<td id='NaviSlfFlexField' align='right' style='font-weight:bold;'>"+hoursFlexAbleSelectedMonth+"</td>";
    flexFieldString += "</tr>";

    return flexFieldString;
}

function getFlexAbleHoursSelectedMonth() {
    var dates = getDateRange();
    var firstMonth = dates[0].substring(0, 6);
    var lastMonth = dates[0].substring(0, 6);
    var flexableHours = getFlexhoursFromMonth(firstMonth);;

    var flexString = "" + flexableHours;
    GM_log(firstMonth + " :: " + lastMonth)
    if(firstMonth !== lastMonth) {
        flexString = getMonthString(firstMonth.substring(4,6)) + ": " + flexableHours + ", ";
        flexString += getMonthString(lastMonth.substring(4,6)) + ": " + getFlexhoursFromMonth(lastMonth);
    }

    return flexString;
}

function getMonthString(monthString) {
    var month = new Array();
    month[01] = "Januar";
    month[02] = "Februar";
    month[03] = "March";
    month[04] = "April";
    month[05] = "May";
    month[06] = "June";
    month[07] = "July";
    month[08] = "August";
    month[09] = "September";
    month[10] = "October";
    month[11] = "November";
    month[12] = "December";
    return month[monthString];
}

function getFlexhoursFromMonth(month) {
    var flexableHours = 0;
    for(var i in GM_listValues()) {
        var valueName = GM_listValues()[i];
        if(valueName.startsWith(month)) {
            val = GM_getValue(valueName); 
            flexableHours = Number(Number(val) + Number(flexableHours));
        }
    }
    return flexableHours;
}

function updateNaviwepField(project, dates) {
    var projectName = project[0];
    var clientName = project[1];
    var hours = project[2];
    var date = project[3];
    var trInDom = $("tr:contains(" + projectName + ")");
    GM_log(date + ' :: Updating ' + projectName + ' for ' + clientName + ' with ' + hours + ' hours.');

    if(projectName === "MELK") {
        projectName = projectName + "):not(:contains(LDB)):not(:contains(Modernisering)";
    }

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
        projectNotFound(date, projectName, clientName, hours);
    }
}

function flexfieldExists() {
    var flexField = $("[id$='NaviSlfFlexField']");
    if(flexField.length == 0) {
        return false;
    }
    return true;
}

function saneCellAlignment(){
    $('span.riSingle').css('width','auto');
}

function projectNotFound(date, projectName, clientName, hours) {
    logHendelse("<p style='margin: 0; padding:0;'>"+date+" Fant ikke NaviWep prosjektet <b>"+projectName+"</b> med komponent <b>"+clientName+"</b>. ("+hours+"t)</p>");
}

function logHendelse(message) {
    var errorField = $("[id$='NaviSLFLogField']");

    if(errorField.length == 0) {
        $("[class='CurrentPeriod']").after("<div class='row' style='padding-top: 10px;'><div class='col-md-4' style='float: none; margin: 0 auto;'><div id='NaviSLFLogField' class='alert alert-danger'><strong>Feil</strong></div></div></div>");
        errorField = $("[id$='NaviSLFLogField']");
    }
    errorField.append(message);
}

function resetErrorField() {
    var errorField = $("[id$='NaviSLFLogField']");

    if(errorField.length > 0) {
        errorField.remove();
    }
}

function killThoseEffingMenuAnimations(){
    Telerik.Web.UI.AnimationSettings.prototype.get_type = function(){return 0;};
    Telerik.Web.UI.AnimationSettings.prototype.get_duration = function(){return 0;};
    Telerik.Web.UI.RadMenu.prototype.get_collapseDelay = function(){return 0;};
}  

initPage();
