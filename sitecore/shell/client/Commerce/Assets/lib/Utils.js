//     Copyright (c) Sitecore Corporation 1999-2017
/*jshint sub:true*/
define(["sitecore"], function (Sitecore) {
    var CommerceUtils = Sitecore.Definitions.Models.Model.extend({
        EnvironmentListReady: false,
        EnvironmentName: null,
        Language: null,
        Currency: null,

        getQueryStringVariable: function (name) {
            return decodeURIComponent(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(name).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
        },

        navigateSearch: function (searchTerm) {
            window.location.href = "/sitecore/client/Applications/CustomerOrderManager/Search?searchTerm=" + searchTerm;
        },

        registerFormChangedEvent: function (form, page) {
            if (!form || !page) {
                return;
            }

            $("[data-sc-id='" + form.id + "'] :input").each(function () {
                var input = $(this);
                input.change(function () { page.IsDirty = true; });
            });
        },

        loadCommerceFoundationForm: function (parentSpeakItem, htmlElement, entityId, itemId, entityViewName, actionName, callback, entityView) {
            // Ensure the form is cleared if it has already been rendered
            this.unloadCommerceFoundationForm(parentSpeakItem, htmlElement);

            if (itemId === null) {
                itemId = "";
            }

            if (entityId === null) {
                entityId = "";
            }

            var url = "/sitecore/client/Commerce/DynamicRendering/CommerceFormPage?entityId=" + entityId + "&itemId=" + itemId + "&entityViewName=" + entityViewName + "&actionName=" + actionName;
            var ajaxToken = this.getDefaultRequestHeaders();

            $.ajax({
                url: url,
                type: "POST",
                data: { entityView: entityView },
                context: this,
                headers: ajaxToken,
                success: function (data) {
                    var elements = $(data);
                    var found = elements.filter('.sc-form')[0].outerHTML;
                    var options = { prepend: false, el: htmlElement, html: found };
                    parentSpeakItem.insertMarkups(found, options);

                    // Also inject data 
                    var d = elements.filter('[data-sc-id="CommerceFoundationFormHelper"]')[0].outerHTML;
                    var dataOptions = { prepend: false, el: htmlElement, html: d };
                    parentSpeakItem.insertMarkups(d, dataOptions, callback);
                }
            });
        },

        unloadCommerceFoundationForm: function (parentSpeakItem, formContainerElement) {
            if (parentSpeakItem.CommerceForm) {
                delete parentSpeakItem.CommerceForm;
            }

            if (parentSpeakItem.CommerceFoundationFormHelper) {
                delete parentSpeakItem.CommerceFoundationFormHelper;
            }

            $(formContainerElement).html("");
        },

        loadTemplateForm: function (parentSpeakItem, htmlElement, templateId, callback) {
            var url = "/sitecore/client/Commerce/DynamicRendering/TemplateFormPage?templateId=" + templateId;
            $.ajax({
                url: url,
                type: "GET",
                context: this,
                success: function (data) {
                    var elements = $(data);
                    var found = elements.filter('.sc-form')[0].outerHTML;
                    var options = { prepend: false, el: htmlElement, html: found };
                    parentSpeakItem.insertMarkups(found, options, callback);
                }
            });
        },

        getDefaultRequestHeaders: function () {
            var requestHeaders = {};

            var antiForgeryToken = this.getAntiForgeryToken();
            requestHeaders[antiForgeryToken.headerKey] = antiForgeryToken.value;

            // Add the requested headers for the Sitecore Commerce Services
            requestHeaders["Language"] = this.Language;
            requestHeaders["Currency"] = this.Currency;
            requestHeaders["Environment"] = this.EnvironmentName;

            return requestHeaders;
        },

        findAntiForgeryTokenValue: function () {
            var elements = document.querySelectorAll("input[name=__RequestVerificationToken]");
            if (!elements) {
                return;
            }
            if (elements.length === 0) {
                return;
            }
            return elements[0].value;
        },

        getAntiForgeryToken: function () {
            var formKey = "__RequestVerificationToken";
            var antiForgeryTokenValue = this.findAntiForgeryTokenValue();
            var token = {
                formKey: formKey,
                headerKey: "X-RequestVerificationToken",
                value: antiForgeryTokenValue
            };

            return token;
        },

        initializeEnvironmentList: function (page) {
            var ajaxToken = this.getDefaultRequestHeaders();
            var self = this;
            $.ajax({
                type: "POST",
                context: this,
                headers: ajaxToken,
                url: "/sitecore/shell/commerce/tools/CommerceEnvironment/GetEnvironmentList",
                success: function (data) {
                    page.EnvironmentsDataSource.Items = data.Items;
                    this.getValueInUserProfile(function (envData) {
                        self.EnvironmentListReady = true;
                        if (envData) {
                            var value = JSON.parse(envData);
                            self.EnvironmentName = value.Name;
                            page.EnvironmentsSwitcher.set("selectedItem", value);
                        }

                        page.EnvironmentsSwitcher.on("change:SelectedItem", $.proxy(self.onSelectedEnvironmentChanged, self));
                        $.event.trigger("environmentReady");

                    }, "BusinessTools", "EnvironmentId");
                },
                error: function (xhr, status, errorThrown) {
                    $('div[data-sc-id=GeneralErrorMessage] > div.sc-messageBar-messages-wrap > div > div > div.sc-messageBar-messageText-container > span.sc-messageBar-messageText').text(errorThrown);
                    $('div[data-sc-id=GeneralErrorMessage]').show();
                }
            });
        },

        onSelectedEnvironmentChanged: function (selectedItem) {
            // Only refresh the environment when the selection is changed
            if (selectedItem !== null && selectedItem !== undefined && selectedItem.Name !== "") {
                if (this.EnvironmentListReady === true && selectedItem.Name !== this.EnvironmentName) {
                    this.setValueInUserProfile("BusinessTools", "EnvironmentId", selectedItem.__properties);
                    this.EnvironmentName = selectedItem.Name;
                    $.event.trigger("environmentReady");
                }
            }
        },

        setValueInUserProfile: function (application, area, value) {
            var jsonValue = JSON.stringify(value);
            var ajaxToken = this.getDefaultRequestHeaders();
            $.ajax({
                type: "POST",
                context: this,
                dataType: "text",
                headers: ajaxToken,
                data: "application=" + application + "&area=" + area + "&environmentId=" + jsonValue,
                url: "/sitecore/shell/commerce/tools/CommerceEnvironment/SetEnvironmentInProfile"
            });
        },

        getValueInUserProfile: function (callback, application, area) {
            var ajaxToken = this.getDefaultRequestHeaders();
            $.ajax({
                type: "POST",
                context: this,
                dataType: "text",
                headers: ajaxToken,
                data: "application=" + application + "&area=" + area,
                url: "/sitecore/shell/commerce/tools/CommerceEnvironment/GetEnvironmentFromProfile",
                success: function (data) {
                    if (typeof (callback) == "function") {
                        callback(data);
                    }
                }
            });
        }
    });

    return CommerceUtils;
});
