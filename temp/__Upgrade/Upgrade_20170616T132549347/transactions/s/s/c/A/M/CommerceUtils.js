//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
var CommerceUtilities = CommerceUtilities || {};

CommerceUtilities.formatDateToLocale = function (elementId) {
    if (elementId) {
        var dateString = $(document.getElementById(elementId)).text();

        var formattedDate = CommerceUtilities.formatDateStringToLocale(dateString);

        $(document.getElementById(elementId)).text(formattedDate);
    }
},

CommerceUtilities.formatDateStringToLocale = function (dateString) {
    if (dateString) {
        // Expects date string to be in format yyyymmdd
        var year = dateString.substring(0, 4);
        var month = dateString.substring(4, 6);
        var day = dateString.substring(6);

        var date = new Date();
        date.setUTCFullYear(parseInt(year));
        date.setUTCMonth(parseInt(month) - 1);
        date.setUTCDate(parseInt(day));

        var formattedDate = date.toLocaleDateString();
        return formattedDate;
    }

    return null;
},

CommerceUtilities.formatInventoryDateString = function (dateString) {
    if (dateString) {
        // Expects date string to be in format yyyymmdd
        var year = dateString.substring(0, 4);
        var month = dateString.substring(4, 6);
        var day = dateString.substring(6);

        var formattedDate = month + "/" + day + "/" + year;
        return formattedDate;
    }

    return null;
},

CommerceUtilities.clickStream = function (elementId) {

    if (elementId) {
        var currentTarget = CommerceUtilities.loadPageVar("target");
        var currentPath = CommerceUtilities.loadPageVar("p");

        var base = "";

        if (currentPath) {
            base = $(document.getElementById(elementId)).attr('href') + "&p" + "=" + currentPath + "|" + elementId.split("_")[0];
        }
        else {
            if (!currentTarget) {
                base = $(document.getElementById(elementId)).attr('href') + "&p=" + elementId.split("_")[0];
            } else {
                var path = "";
                $(".commerce-breadcrumb").find("li").each(function () {
                    var hrefInToken = $(this).find("a").attr('href');
                    var targetInToken = CommerceUtilities.extractQuery(hrefInToken, "target");
                    var pathInToken = CommerceUtilities.extractQuery(hrefInToken, "p");
                    if (targetInToken) {
                        path += targetInToken + '|';
                    }
                    if (pathInToken) {
                        path += pathInToken + '|';
                    }

                });
                base = $(document.getElementById(elementId)).attr('href') + "&p=" + path + currentTarget + '|' + elementId.split("_")[0];
            }

        }

        $(document.getElementById(elementId)).attr('href', base);
        $(document.getElementById(elementId)).css('display', 'inline-block');
    }
}

CommerceUtilities.loadPageVar = function (sVar) {
    return unescape(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + escape(sVar).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

CommerceUtilities.extractQuery = function (url, sVar) {
    return unescape(url.replace(new RegExp("^(?:.*[&\\?]" + escape(sVar).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

CommerceUtilities.getQueryStringParameter = function (paramName) {
    return unescape(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + escape(paramName).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
}

CommerceUtilities.formatProcessStatus = function (status) {
    if (status == "Error") {
        $("span[title='" + status + "']").addClass("dash-error");
        $("span[title='" + status + "']").prev().addClass("red");
    } else {
        if (status.indexOf('%') != -1) {
            var percentage = status.replace("%", "");
            var num = parseInt(percentage);
            if (num < 100) {
                $("span[title='" + status + "']").addClass("dash-percent");
                $("span[title='" + status + "']").prev().addClass("green");
            }

        }
    }
}

CommerceUtilities.createDelimitedListFromArray = function (arr, delimiter) {

    var delimitedList = "";
    if (!delimiter) {
        delimiter = "|";
    }

    if (arr && arr.length > 0) {

        for (i = 0; i < arr.length; i++) {
            if (delimitedList) {
                delimitedList += delimiter + arr[i];
            } else {
                delimitedList = arr[i];
            }
        }
    }

    return delimitedList;
}

CommerceUtilities.joinDelimitedLists = function (list1, list2, delimiter) {

    var joinedList = "";
    if (!delimiter) {
        delimiter = "|";
    }

    if (list1) {
        if (list2) {
            joinedList = list1 + delimiter + list2;
        } else {
            joinedList = list1;
        }
    } else {
        if (list2) {
            joinedList = list2;
        }
    }

    return joinedList;
}

CommerceUtilities.extractPropertyValues = function (itemList, propertyName) {

    var propertyValues = [];
    if (itemList && itemList.length > 0) {
        for (i = 0; i < itemList.length; i++) {
            propertyValues.push(itemList[i][propertyName]);
        }
    }

    return propertyValues;
}

CommerceUtilities.getUsersListViewPreference = function () {
    var viewMode = CommerceUtilities.getCookie("listViewMode");
    if (!viewMode) {
        return "DetailList";
    }

    return viewMode;
}

CommerceUtilities.setUsersListViewPreference = function (viewMode) {
    this.listViewMode = viewMode;
    document.cookie = 'listViewMode=' + viewMode;
}

CommerceUtilities.getCookie = function (name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');

    for (i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }

    return null;
}

CommerceUtilities.IsAuthenticated = function (result, textStatus, errorThrown) {
    if (result.status === 401) {
        _sc.Helpers.session.unauthorized();
        return;
    }
}

CommerceUtilities.FixProductUrl = function (itemType, selector) {
    var url = $(document.getElementById(selector)).attr("href");
    if (itemType == "Product") {
        url = url.replace("Product", "ProductDetail");
        $(document.getElementById(selector)).attr("href", url + "#{5E0D90F9-78C8-4622-A289-4B0BD80F3AF2}");
    } else if (itemType == "Category") {
        $(document.getElementById(selector)).attr("href", url + "#{286B660C-7F15-4C2C-8F19-493AC294C0BA}");
    }
}

CommerceUtilities.getClientLanguage = function () {

    var language = CommerceUtilities.getCookie("commerceLang");
    var queryStringLang = CommerceUtilities.getQueryStringParameter("lang");

    if (queryStringLang) {
        language = queryStringLang;
    }

    return language;
}

CommerceUtilities.getClientRegionISO = function () {

    var regionISO = CommerceUtilities.getCookie("commerceRegionISO");
    return regionISO;
}

CommerceUtilities.ensureRegionCurrencyOverridesForLanguage = function (language) {

    var region = $.formatCurrency.regions[language];

    // The plug-in doesn't seem to respect the options overrides when region is
    // specified in the options
    if (region) {
        region.symbol = '';
        region.groupDigits = false;
    }
}

CommerceUtilities.formatElement = function (element) {
    var region = CommerceUtilities.getClientRegionISO();
    CommerceUtilities.ensureRegionCurrencyOverridesForLanguage(region);

    element.formatCurrency({ region: region, symbol: '', groupDigits: false });
}

CommerceUtilities.formatCurrencyElements = function () {

    var region = CommerceUtilities.getClientRegionISO();
    CommerceUtilities.ensureRegionCurrencyOverridesForLanguage(region);

    $("span[class=formatCurrency]").formatCurrency({ region: region, symbol: '', groupDigits: false });
}

CommerceUtilities.getCurrencyFormattedSpan = function (currencyValue) {

    var region = CommerceUtilities.getClientRegionISO();
    CommerceUtilities.ensureRegionCurrencyOverridesForLanguage(region);

    var formattedSpan = $("<span>" + currencyValue + "</span>");
    formattedSpan.formatCurrency({ region: region, symbol: '', groupDigits: false });
    return formattedSpan.html();
}

CommerceUtilities.getCurrencyFormatForRegion = function () {
    var regionCode = CommerceUtilities.getClientRegionISO();
    CommerceUtilities.ensureRegionCurrencyOverridesForLanguage(regionCode);
    var region = $.formatCurrency.regions[regionCode];
    return region;
}

CommerceUtilities.LinkAddRelationshipInputs = function (itemId, relationshipName) {
    var inputA1 = itemId + "_" + relationshipName + "_input_A1";
    var inputA2 = itemId + "_" + relationshipName + "_input_A2";
    var inputB = itemId + "_" + relationshipName + "_input_B";
    var match = $.map(cbp.RelationshipsPendingChangesList.get("items"), function (value, index) {
        if (value.targetItemId == itemId && value.relationshipName == relationshipName) {
            return value;
        }
    });
    $(document.getElementById(inputA1)).on("change paste keyup", function () {
        $(document.getElementById(inputA2)).val($(this).val());
        match[0].relationshipDescription = $(this).val();
    });
    $(document.getElementById(inputA2)).on("change paste keyup", function () {
        $(document.getElementById(inputA1)).val($(this).val());
        match[0].relationshipDescription = $(this).val();
    });
    $(document.getElementById(inputB)).on("change paste keyup", function () {
        match[0].secondaryDescription = $(this).val();
    });
}

CommerceUtilities.newTempGuid = function () {
    var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

    return guid;
}

CommerceUtilities.openRelationshipDialog = function (row, isProduct) {
    _sc.trigger("sc-cs-openrelationships", row, isProduct);
}

CommerceUtilities.openVariantDialog = function (row) {
    _sc.trigger("sc-cs-openvariants", row);
}