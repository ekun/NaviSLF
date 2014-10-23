// ==UserScript==
// @name       NaviSLF
// @namespace  https://github.com/ekun/NaviSLF
// @homepage    https://github.com/ekun/NaviSLF
// @downloadURL https://raw.github.com/ekun/NaviToggl/master/navislf.tamper.js
// @updateURL   https://raw.github.com/ekun/NaviToggl/master/navislf.tamper.js
// @version    0.7.6
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

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

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
				console.log('Getting Bugzilla-hours after pagechange.');
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
    console.log('Located steria username: ' + username);
    
    if(username === "cfornes") {
        username = "camf";
    }
    if(username === "iholen") {
        username = "ikh";
    }
    
    var bugzfrontBtn = $("[id$='NaviSlfBugzfrontBtn']");
    if(bugzfrontBtn.length == 0) {
    	$(".rmRootGroup").append("<li id='NaviSlfBugzfrontBtn' class='rmItem '>" +
		"<a href='http://utv-appserver01.slf.dep.no/bugzfront/timer/details?user=" + username + "&start=" + startDate + "&end=" + endDate +"' target=_BLANK class='rmLink rmRootLink' style='font-size:Medium;font-weight:normal;'><span class='rmText rmExpandDown'>Grunnlag fra Bugzilla</span></a>" +
		"</li>");
    }

    GM_xmlhttpRequest({
        method: "GET",
        url: 'https://utv-appserver01.slf.dep.no/bugzfront/timer/weekly?user=' + username + '&start=' + startDate + '&end=' + endDate ,
        onload: function(response) {
            console.log("Henter BUGZILLA-timer for perioden "+startDate+" til "+endDate+".");
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
    
    if(projectName === "MELK") {
	projectName = projectName + "):not(:contains(LDB)";
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
        projectNotFound(projectName, clientName, hours);
    }
}

function updateAdminNaviwepField(project, dates) {
    var projectName = project[0];
    var clientName = project[1];
    var hours = project[2];
    var date = project[3];
    var trInDom = $("tr:contains(" + projectName + ")");
    console.log(date + ' :: Updating ' + projectName + ' for ' + clientName + ' with ' + hours + ' hours.');
    
    if(projectName === "MELK") {
	projectName = projectName + "):not(:contains(LDB)";
    }
    
    if(clientName !== "Bugzilla") {
	trInDom = $("tr:contains(" + projectName + "):contains(" + clientName + ")");
    } else {
        trInDom = $("tr:contains(" + projectName + "):contains(Bugzilla):not(:contains(ikke Bugzilla))");
    }
    if(trInDom.length === 1) {
        trInDom.css('background-color', '#39b3d7');
        var md = trInDom.find('input[id$="_RNTB_' + date + '"]');
        var verdi = +(md.text());

        md.val(verdi+hours);
        md.width("100px");
    } else {
        projectNotFound(projectName, clientName, hours);
    }
}

function saneCellAlignment(){
    $('span.riSingle').css('width','auto');
}

function projectNotFound(projectName, clientName, hours) {
    logHendelse("<p style='margin: 0; padding:0;'>Fant ikke NaviWep prosjektet <b>"+projectName+"</b> med komponent <b>"+clientName+"</b>. ("+hours+"t)</p>");
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
