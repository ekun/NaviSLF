// ==UserScript==
// @name       NaviSLF
// @namespace  https://github.com/ekun/NaviSLF
// @homepage    https://github.com/ekun/NaviSLF
// @downloadURL https://raw.github.com/ekun/NaviToggl/master/navislf.tamper.js
// @updateURL   https://raw.github.com/ekun/NaviToggl/master/navislf.tamper.js
// @version    1.0.14
// @description  Imports SLF-bugzilla hours into Naviwep
// @match      https://naviwep.steria.no/NAVWeb/*
// @match      https://195.204.41.20/NAVWeb/*
// @include https://naviwep.steria.no/NaviWEB/*
// @copyright  2014+, Marius Bækken Glittum
// @require     http://code.jquery.com/jquery-1.10.1.min.js
// @resource 	bootstrapCss	https://raw.githubusercontent.com/ekun/navislf/master/css/bootstrap.css
// @resource 	bootstrap2Css	https://raw.githubusercontent.com/ekun/navislf/master/css/bootstrap-theme.css
// @grant GM_log
// @grant GM_getResourceText
// @grant GM_xmlhttpRequest
// @grant GM_addStyle
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_listValues
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

function addStyling() {
    var cssTxt  = GM_getResourceText("bootstrapCss");
    GM_addStyle (cssTxt);
    var css2Txt  = GM_getResourceText("bootstrap2Css");
    GM_addStyle (css2Txt);
}

function initPage(){
    addStyling();
    killThoseEffingMenuAnimations();
    sanePeriodNavigation();
    saneCellAlignment();
    $('.CurrentPeriod').after('<div class="content" style="margin: 5px 20px;"><div id="naviSlfCtrl" class="row" style="width: 100%;"></div></div>');

    renderToggleFetchingButton();

    if((document.location.pathname.endsWith("timereg_direct.aspx") || document.location.pathname.endsWith("NAVWeb/")) && GM_getValue('cfg.autoload', "true") === "true") {
        getBugzillaHoursForWeek();
    } else {
        addFetchHoursButton();
        addNaviSlfFlexField();
    }
}

function addFetchHoursButton() {
    $('#naviSlfCtrl').append('<input type="button" class="btn btn-primary" value="Hent timer fra Bugzilla" id="naviSLF_fetchHours" style="margin-left: 3px; font-size: 85%;">');
    $('#naviSLF_fetchHours').click(function() {
        getBugzillaHoursForWeek();
    });
}

function renderToggleFetchingButton() {
    var autoloadHours = GM_getValue('cfg.autoload', "true");
    var buttonText = autoloadHours === "true" ? "Deaktiver automatisk uthenting av timer" : "Aktiver automatisk uthenting av timer";
    $('#naviSlfCtrl').append('<input type="button" class="btn btn-default" value="'+buttonText+'" id="naviSLF_toggleFetchHours" style="margin-left: 3px; font-size: 85%;">');
    $('#naviSLF_toggleFetchHours').click(function() {
        var autoloadHours = GM_getValue('cfg.autoload', "true");
        if(autoloadHours === "true") {
            GM_setValue('cfg.autoload', "false");
            GM_log("Deaktiverer automatisk uthenting av timer");
            $(this).val("Aktiver automatisk uthenting av timer");
            addFetchHoursButton();
        } else {
            GM_setValue('cfg.autoload', "true");
            GM_log("Aktiverer automatisk uthenting av timer");
            $(this).val("Deaktiver automatisk uthenting av timer");
            $('#naviSLF_fetchHours').remove();
            getBugzillaHoursForWeek();
        }
    });
}

function currentPeriod() {
    var header = $("#ctl00_ContentPlaceHolder1_LBL_CurrentPeriod").text();
    return header.replace(/^.*(\d\d\.\d\d\.\d\d\d\d - \d\d\.\d\d\.\d\d\d\d).*$/, "$1");
}

function sanePeriodNavigation() {
    $(".CurrentPeriod")
        .prepend("<button type='button' id='prevPeriod'>◀</button>")
        .append("<button type='button' id='nextPeriod'>▶</button>")
    ;

    $("#prevPeriod").click(function () {
        var period = currentPeriod();
        var dropdown = $("#ctl00_ContentPlaceHolder1_PeriodDropdownList_Arrow").get(0);
        dropdown.click();
        var thisItem = $("li.rcbItem:contains('" + period + "')");
        thisItem.next().click();
    });

    $("#nextPeriod").click(function () {
        var period = currentPeriod();
        var dropdown = $("#ctl00_ContentPlaceHolder1_PeriodDropdownList_Arrow").get(0);
        dropdown.click();
        var thisItem = $("li.rcbItem:contains('" + period + "')");
        thisItem.prev().click();
    });
}

(function(open) {
    XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
        this.addEventListener("readystatechange", function() {
            if(this.readyState === 4) {
                if((url.endsWith("timereg_direct.aspx") || url.endsWith("NAVWeb/"))) {
                    resetErrorField();
                    if(GM_getValue('cfg.autoload', "true") === "true") {
                        GM_log('Getting Bugzilla-hours after pagechange.');
                        getBugzillaHoursForWeek();
                    }
                }
            }
        }, false);
        open.call(this, method, url, async, user, pass);
    };
})(XMLHttpRequest.prototype.open);

function getUsername() {
    var userString = $("[id$='UserInfo']").text();
    var username = userString.substring(userString.indexOf("(")+1, userString.indexOf(")")).toLowerCase();

    if(username === "eutsogn") {
        username = "egil.utsogn";
    }

    return username;
}

function getBugzillaHoursForWeek() {
    var dates = getDateRange();
    var startDate = dates[0].substring(0,4) + '-' + dates[0].substring(4,6) + '-' + dates[0].substring(6);
    var endDate = dates[(dates.length-1)].substring(0,4) + '-' + dates[(dates.length-1)].substring(4,6) + '-' + dates[(dates.length-1)].substring(6);

    var username = getUsername();
    GM_log('Located steria username: ' + username);
    GM_log('Detected date-range: '+startDate+ ' -> ' +endDate);

    GM_xmlhttpRequest({
        method: "GET",
        url: 'http://utv-appserver01.slf.dep.no:28888/bugzfront/timer/weekly?user=' + username + '&start=' + startDate + '&end=' + endDate ,
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
    storeFlexFromThisPeriode();
    addNaviSlfFlexField();
}


function storeFlexFromThisPeriode() {
    var dates = getDateRange();
    var username = getUsername();
    for (var i = 0; i < dates.length; i++) {
        var flexHoursForDay = Number($('.rgFooter:last td:eq('+(i+6)+')').text().replace(",", "."));
        var date = "" + dates[i];
        GM_setValue(username+"-"+date, flexHoursForDay);
    }
}

function getDateRange() {
    var days = $("a[title^='Date']" );
    var dates = [];
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
            flexFieldString += "<td style='font-weight:bold;'>Månedsflex (NaviSLF):</td>";
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
    var lastMonth = dates[dates.length-1].substring(0, 6);
    var flexableHours = getFlexhoursFromMonth(firstMonth);

    var flexString = "" + flexableHours;

    if(firstMonth !== lastMonth) {
        flexString = getMonthString(firstMonth.substring(4,6)) + ": " + flexableHours + ", ";
        flexString += getMonthString(lastMonth.substring(4,6)) + ": " + getFlexhoursFromMonth(lastMonth);
    }

    return flexString;
}

function getMonthString(monthString) {
    if(monthString.startsWith("0")) {
        monthString = monthString.substring(1,2);
    }
    var month = [];
    month[1] = "Januar";
    month[2] = "Februar";
    month[3] = "Mars";
    month[4] = "April";
    month[5] = "Mai";
    month[6] = "Juni";
    month[7] = "Juli";
    month[8] = "August";
    month[9] = "September";
    month[10] = "Oktober";
    month[11] = "November";
    month[12] = "Desember";
    return month[monthString];
}

function getFlexhoursFromMonth(month) {
    var flexableHours = 0;
    var username = getUsername();
    for(var i in GM_listValues()) {
        var valueName = GM_listValues()[i];
        if(valueName.startsWith(username+"-"+month)) {
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
        trInDom.css('background-color', '#d9edf7');
        var md = trInDom.find('input[id$="_RNTB_' + date + '"]');
        md.val(hours);
        md.width("100px");
    } else {
        projectNotFound(date, projectName, clientName, hours);
    }
}

function flexfieldExists() {
    var flexField = $("[id$='NaviSlfFlexField']");
    if(flexField.length === 0) {
        return false;
    }
    return true;
}

function saneCellAlignment(){
    $('span.riSingle').css('width','auto');
}

function projectNotFound(date, projectName, clientName, hours) {
    if(hours > 0) {
        logHendelse("<p style='margin: 0; padding:0;'>"+date+" Fant ikke NaviWep prosjektet <b>"+projectName+"</b> med komponent <b>"+clientName+"</b>. ("+hours+"t)</p>");
    }
}

function logHendelse(message) {
    var errorField = $("[id$='NaviSLFLogField']");

    if(errorField.length === 0) {
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
