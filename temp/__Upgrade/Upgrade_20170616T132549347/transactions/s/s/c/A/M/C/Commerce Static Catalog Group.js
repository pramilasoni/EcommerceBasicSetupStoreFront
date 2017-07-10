//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        CommerceBasePage: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceBasePage"
    }
});

define(["sitecore", "CommerceBasePage"], function (Sitecore, cbp) {
    var Commerce_Static_Catalog_Set = cbp.extend({
        itemsChecked: false,
        initialized: function () {
            cbp.prototype.initialized.call(this);
            var self = this;

            this.SearchBox.viewModel.$el.after("<textarea id='searchBoxExtended' class='extendedSearchbox' rows='8' cols='50' style='display:none'/>");
            this.SearchBox.viewModel.$el.keyup(this.showHideExtendedSearchArea);
            $('#searchBoxExtended').on('keyup', $.proxy(this.addEnterKeySearchBox, this));

            this.listenTo(_sc, 'sc-concurrency-override', this.overridePreviousChanges);
            this.listenTo(_sc, 'sc-concurrency-cancel', this.cancelChanges);

            this.HelpProvider.set("isReady", true);
            this.HelpProvider.refresh();
            this.set("selectedTab", "{10C8D72F-C2C6-4B4F-BD6D-42F93F0B8C68}");

            var catalogSetId = CommerceUtilities.loadPageVar("target");
            this.set("targetId", catalogSetId);
            this.CatalogDataSource.on("change:items", this.bindModifiedCatalogCollection, this);

            //For Concurrency Saving
            this.set("lastModified", null);
            this.set("overrideChanges", false);

            if (catalogSetId) {
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

                        self.HeaderTitleLabel.set("text", self.ItemTypeDictionary.get("StaticCatalogSet"));

                        var catalogStringArray = data.IncludedCatalogs.split("|");
                        self.set("selectedCatalogs", catalogStringArray);

                        self.CatalogDataSource.set("isReady", true);
                        self.CatalogDataSource.refresh();

                        //For Concurrency Saving
                        self.set("lastModified", data.LastModified);
                    }
                });
            } else {
                self.HeaderTitle.set("text", self.ItemTypeDictionary.get("Create Static Catalog Group"));
                self.TitleControl.set("text", self.ItemTypeDictionary.get("Create Static Catalog Group"));

                this.set("templateId", CommerceUtilities.loadPageVar("template"));
                this.set("parentId", CommerceUtilities.loadPageVar("parent"));

                self.CatalogDataSource.set("isReady", true);
                self.CatalogDataSource.refresh();
            }

            this.Catalogs.on("change:checkedItemIds", this.setDirty, this);
        },

        setDirty: function () {
            /*
            This is to deal with issue with checked items Id changing 
            */
            if (this.itemsChecked) {
                this.setPageIsDirty(true);
            } else {
                this.itemsChecked = true;
            }
        },

        disableIfAX: function () {
            $(".cs-basefields :input").prop("disabled", true);
            this.StaticGroupActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
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
                this.StaticGroupActionControl.getAction("Save").isEnabled(false);
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();
            var baseFields = this.StaticCatalogSet.get("editFunctionBody");
            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, baseFields);
            // Build and add catalog list. 
            var checkedCatalogs = this.Catalogs.get("checkedItemIds");
            var checkedCatalogString = "";
            for (i = 0; i < checkedCatalogs.length; i++) {
                if (checkedCatalogString !== "") {
                    checkedCatalogString += "|";
                }

                checkedCatalogString += checkedCatalogs[i];
            }

            var self = this;

            dataObject.itemId = this.get("targetId");
            dataObject.IncludedCatalogs = checkedCatalogString;

            //For Concurrency Saving
            dataObject.lastModified = this.get("lastModified");
            dataObject.overrideChanges = this.get("overrideChanges");

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceStaticCatalogGroup/Update",
                type: "POST",
                headers: ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();
                        var self = this;
                        this.StaticGroupActionControl.getAction("Save").isEnabled(false);

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

                        //For Concurrency Saving
                        this.set("overrideChanges", false);
                        if (data.Status.indexOf("success") === 0) {
                            this.set("lastModified", data.Status.split('|')[1]);
                        }
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
                this.StaticGroupActionControl.getAction("Save").isEnabled(false);
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();

            var baseFields = this.StaticCatalogSet.get("editFunctionBody");
            var dataObject = {};
            this.addRendererFieldsToObject(dataObject, baseFields);

            // Build and add catalog list. 
            var checkedCatalogs = this.Catalogs.get("checkedItemIds");
            var checkedCatalogString = "";
            for (i = 0; i < checkedCatalogs.length; i++) {
                if (checkedCatalogString !== "") {
                    checkedCatalogString += "|";
                }

                checkedCatalogString += checkedCatalogs[i];
            }

            var self = this;
            dataObject.IncludedCatalogs = checkedCatalogString;
            dataObject.templateId = this.get("templateId");
            dataObject.parentId = this.get("parentId");

            dataObject.name = this.Name.get("text") !== null ? this.Name.get("text").trim() : "";

            // Custom validation of name
            if (!this.isNameValid(dataObject.name)) {
                return;
            }

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceStaticCatalogGroup/Create",
                type: "POST",
                headers: ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    this.HeaderActionsMessageBar.removeMessages();
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
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/Commerce Static Catalog Group?target=' + this.get("newTargetId"));
        },

        updateValidationError: function (obj) {
            obj.removeClass("sc-validation");
            if ($(".sc-validation").length === 0) {
                if (!this.isAXEnabled) {
                    this.StaticGroupActionControl.getAction("Save").isEnabled(true);
                }
                this.hideHeaderActionsMessage();
            }
        },

        bindModifiedCatalogCollection: function () {
            var catalogs = this.CatalogDataSource.get("items");
            for (i = 0; i < catalogs.length; i++) {
                var currentItem = catalogs[i];
                currentItem.itemId = currentItem.catalogName;
            }

            this.Catalogs.set("items", catalogs);

            var catalogStringArray = this.get("selectedCatalogs");
            if (catalogStringArray) {
                var complexCatalogArray = [];
                for (var i = 0; i < catalogStringArray.length; i++) {
                    complexCatalogArray.push(catalogStringArray[i]);
                }

                this.Catalogs.viewModel.checkItems(complexCatalogArray);
            }
        },

        updateSaveButton: function (status) {
            if (!this.isAXEnabled) {
                this.StaticGroupActionControl.getAction("Save").isEnabled(status);
            }
        }
    });

    return Commerce_Static_Catalog_Set;
});