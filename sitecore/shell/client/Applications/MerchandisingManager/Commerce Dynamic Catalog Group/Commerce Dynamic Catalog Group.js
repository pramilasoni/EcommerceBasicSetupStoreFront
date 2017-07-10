//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        CommerceBasePage: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceBasePage"
    }
});

define(["sitecore", "CommerceBasePage"], function (Sitecore, cbp) {
    var catalogSetId = CommerceUtilities.loadPageVar("target");
    var Commerce_Dynamic_Catalog_Set = cbp.extend({
        initialized: function () {
            cbp.prototype.initialized.call(this);

            this.SearchBox.viewModel.$el.after("<textarea id='searchBoxExtended' class='extendedSearchbox' rows='8' cols='50' style='display:none'/>");
            this.SearchBox.viewModel.$el.keyup(this.showHideExtendedSearchArea);
            $('#searchBoxExtended').on('keyup', $.proxy(this.addEnterKeySearchBox, this));

            this.listenTo(_sc, 'sc-concurrency-override', this.overridePreviousChanges);
            this.listenTo(_sc, 'sc-concurrency-cancel', this.cancelChanges);

            this.set("targetId", catalogSetId);
            
            var self = this;

            this.HelpProvider.set("isReady", true);
            this.HelpProvider.refresh();
            this.set("selectedTab", "{4043C865-0416-482B-A634-B34322FFAD6F}");

            //For Concurrency Saving
            this.set("lastModified", null);
            this.set("overrideChanges", false);

            if (catalogSetId) {
                // Edit
                var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
                var ajaxToken = {};
                ajaxToken[token.headerKey] = token.value;

                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceSearch/GetItem",
                    type: "POST",
                    headers: ajaxToken,
                    context: this,
                    data: {
                        id: catalogSetId
                    },
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        self.HeaderTitle.set("text", data.DisplayName);
                        self.TitleControl.set("text", data.DisplayName);
                        self.set("itemPath", data.Path);

                        if (this.Name) {
                            this.Name.set("text", data.Name);
                            this.Name.set("isEnabled", false);
                        }

                        self.HeaderTitleLabel.set("text", self.ItemTypeDictionary.get("DynamicCatalogSet"));

                        // Set the list of Catalog Items
                        var catalogStringArray = data.IncludedCatalogs.split("|");
                        var complexCatalogArray = [];
                        for (i = 0; i < catalogStringArray.length; i++) {
                            complexCatalogArray[i] = { name: catalogStringArray[i], $icon: "" };
                        }

                        self.IncludedCatalogs.set("items", complexCatalogArray);

                        //For Concurrency Saving
                        self.set("lastModified", data.LastModified);
                    }
                });
            }
            else {
                // Create
                self.HeaderTitle.set("text", self.ItemTypeDictionary.get("Create Dynamic Catalog Group"));
                self.TitleControl.set("text", self.ItemTypeDictionary.get("Create Dynamic Catalog Group"));

                this.set("templateId", CommerceUtilities.loadPageVar("template"));
                this.set("parentId", CommerceUtilities.loadPageVar("parent"));
            }
        },

        disableIfAX: function () {
            $(".cs-basefields :input").prop("disabled", true);
            this.DynamicGroupActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            $(".sc-CommerceDateTime :input").prop("disabled", true);
        },

        saveCatalogGroup: function () {
            var id = this.get("targetId");
            if (id) {
                this.updateCatalogGroup();
            } else {
                this.createCatalogGroup();
            }
        },

        updateCatalogGroup: function () {
            this.hideHeaderActionsMessage();
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.DynamicGroupActionControl.getAction("Save").isEnabled(false);
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();

            var baseFields = this.DynamicCatalogSet.get("editFunctionBody");
            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, baseFields);

            var self = this;

            dataObject.itemId = this.get("targetId");

            //For Concurrency Saving
            dataObject.lastModified = this.get("lastModified");
            dataObject.overrideChanges = this.get("overrideChanges");

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceDynamicCatalogGroup/Update",
                type: "POST",
                headers: ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();
                        var self = this;
                        this.DynamicGroupActionControl.getAction("Save").isEnabled(false);

                        //For Concurrency Saving
                        this.set("overrideChanges", false);

                        for (i = 0; i < data.Errors.length; i++) {
                            this.HeaderActionsMessageBar.addMessage("error", data.Errors[i].ErrorMessage);
                            $("[data-sc-id='" + data.Errors[i].ControlId + "']").addClass("sc-validation");
                        }
                        this.HeaderActionsMessageBar.set("isVisible", true);
                        $(".sc-validation").change(function () {
                            self.updateValidationError($(this));
                        });
                        $(".sc-validation.sc-datepicker").click(function () {
                            self.updateValidationError($(this));
                        });
                    } else if (data.Status == "priorUpdate") {
                        this.hideInProgressMessage();
                        //For Concurrency Saving
                        this.ConcurrencyAlert.show();
                    } else {
                        this.hideInProgressMessage(true);
                        this.setPageIsDirty(false);
                        var self = this;
                        //For Concurrency Saving
                        this.set("overrideChanges", false);
                        if (data.Status.indexOf("success") === 0) {
                            this.set("lastModified", data.Status.split('|')[1]);
                        }

                        var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
                        var ajaxToken = {};
                        ajaxToken[token.headerKey] = token.value;

                        $.ajax({
                            url: "/sitecore/shell/commerce/merchandising/CommerceSearch/GetItem",
                            type: "POST",
                            headers: ajaxToken,
                            context: self,
                            data: {
                                id: catalogSetId
                            },
                            error: CommerceUtilities.IsAuthenticated,
                            success: function (data) {
                                // Set the list of Catalog Items
                                var catalogStringArray = data.IncludedCatalogs.split("|");
                                var complexCatalogArray = [];
                                for (i = 0; i < catalogStringArray.length; i++) {
                                    complexCatalogArray[i] = { name: catalogStringArray[i], $icon: "" };
                                }

                                self.IncludedCatalogs.set("items", complexCatalogArray);
                            }
                        });
                    }
                }
            });
        },

        //For Concurrency Saving
        cancelChanges: function () {
            window.location.reload();
            this.ConcurrencyAlert.hide();
        },

        //For Concurrency Saving
        overridePreviousChanges: function () {
            this.set("overrideChanges", true);
            this.updateCatalogGroup();
            this.ConcurrencyAlert.hide();
        },

        createCatalogGroup: function () {
            this.hideHeaderActionsMessage();
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.DynamicGroupActionControl.getAction("Save").isEnabled(false);
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();
            var baseFields = this.DynamicCatalogSet.get("editFunctionBody");
            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, baseFields);

            dataObject.templateId = this.get("templateId");
            dataObject.parentId = this.get("parentId");
            dataObject.name = this.Name.get("text") !== null ? this.Name.get("text").trim() : "";

            // Custom validation of name?
            if (!this.isNameValid(dataObject.name)) {
                return;
            }

            var self = this;

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceDynamicCatalogGroup/Create",
                type: "POST",
                headers: ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    self.HeaderActionsMessageBar.removeMessages();
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();                                               
                        for (var i = 0; i < data.Errors.length; i++) {
                            this.HeaderActionsMessageBar.addMessage("error", data.Errors[i].ErrorMessage);
                            $("[data-sc-id='" + data.Errors[i].ControlId + "']").addClass("sc-validation");
                        }
                        this.HeaderActionsMessageBar.set("isVisible", true);
                        $(".sc-validation").change(function () {
                            self.updateValidationError($(this));
                        });
                        $(".sc-validation.sc-datepicker").click(function () {
                            self.updateValidationError($(this));
                        });
                    } else {
                        this.hideInProgressMessageCreate(true, "Catalog Group Created");
                        this.setPageIsDirty(false);
                        this.set("newTargetId", data);                                        
                        setTimeout($.proxy(this.redirectToSavedCatalogGroup, this), 10000);
                    }
                }
            });
        },

        redirectToSavedCatalogGroup: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/Commerce Dynamic Catalog Group?target=' + this.get("newTargetId"));
        },

        updateValidationError: function (obj) {
            obj.removeClass("sc-validation");
            if ($(".sc-validation").length === 0) {
                this.DynamicGroupActionControl.getAction("Save").isEnabled(true);
                this.hideHeaderActionsMessage();
            }
        },

        updateSaveButton: function (status) {
            this.DynamicGroupActionControl.getAction("Save").isEnabled(status);
        }
    });

    return Commerce_Dynamic_Catalog_Set;
});