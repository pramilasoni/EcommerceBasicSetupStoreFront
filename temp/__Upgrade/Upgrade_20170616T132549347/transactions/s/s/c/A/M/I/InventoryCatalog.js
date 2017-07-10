//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        CommerceBasePage: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceBasePage"
    }
});

define(["sitecore", "CommerceBasePage"], function (Sitecore, cbp) {
    var InventoryCatalog = cbp.extend({
        tabStrip: null,
        initialized: function () {
            cbp.prototype.initialized.call(this);
            this.SearchBox.viewModel.$el.after("<textarea id='searchBoxExtended' class='extendedSearchbox' rows='8' cols='50' style='display:none'/>");
            this.SearchBox.viewModel.$el.keyup(this.showHideExtendedSearchArea);
            $('#searchBoxExtended').on('keyup', $.proxy(this.addEnterKeySearchBox, this));
            this.CatalogChildrenTabs.on("change:selectedTab", this.selectedTabChanged, this);
            this.CatalogsList.on("change:checkedItemIds", this.onSelectedCatalogsChanged, this);

            this.HelpProvider.set("isReady", true);
            this.HelpProvider.refresh();

            var itemId = CommerceUtilities.loadPageVar("itemId");
            this.set("target", itemId);
            this.HeaderTitleLabel.set("text", this.ResourcesStringDictionary.get("Inventory Catalog"));

            // Cache for faster selector lookup
            var inventoryCatalogTabs = this.CatalogChildrenTabs.viewModel.$el;
            this.tabStrip = $("ul.sc-tabcontrol-navigation", inventoryCatalogTabs).first();

            if (itemId) {
                this.getCatalog(itemId);

                this.CommerceFieldExpander.set("isVisible", true);
                this.CatalogChildrenTabs.set("selectedTab", "{EDAF15BA-BCD6-48F7-BB9F-64528B33CBAC}");
                $("li[data-tab-id=\\{EDAF15BA-BCD6-48F7-BB9F-64528B33CBAC\\}] > a", this.tabStrip).append("<label style=\"display:inline\"></label>");

                // Tab counts 
                this.addSpansToTab();

                this.InventoryCatalogName.set("isEnabled", false);
                this.set("selectedTab", this.CatalogChildrenTabs.get("selectedTab"));

                // initialize the catalogs data source and query
                this.CatalogsDataSource.set("isReady", true);
                this.CatalogsDataSource.set("commerceItemId", itemId);
                this.CatalogsDataSource.refresh();

                // Select the product catalog associations for this inventory catalog
                var self = this;
                setTimeout(function () {
                    var selectedCatalogs = [];
                    var catalogItems = self.CatalogsDataSource.get("items");
                    for (i = 0; i < catalogItems.length; i++) {
                        if (catalogItems[i].checked) {
                            selectedCatalogs.push(catalogItems[i]);
                        }
                    }

                    self.CatalogsList.viewModel.checkItems(selectedCatalogs);
                    self.updateSaveButton(false);
                }, 2000);
            } else {
                this.CommerceFieldExpander.set("isVisible", true);
                this.CatalogChildrenTabs.set("selectedTab", "{EDAF15BA-BCD6-48F7-BB9F-64528B33CBAC}");

                this.HeaderTitle.set("text", this.ItemTypeDictionary.get("Create Inventory Catalog"));
                this.TitleControl.set("text", this.ItemTypeDictionary.get("Create Inventory Catalog"));

                this.CatalogsDataSource.set("isReady", true);
                this.CatalogsDataSource.refresh();

                $("li[data-tab-id=\\{5051FA20-64A2-4BE9-A40A-EC4BC9A4A7CC\\}]", this.tabStrip).hide();
            }
        },

        disableIfAX: function () {
            $(".cs-basefields :input").prop("disabled", true);
            this.DetailsActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.CatalogsActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.InventoryCatalogDescription.set("isEnabled", false);

            $(".sc-CommerceDateTime :input").prop("disabled", true);
        },

        isDetailsTabSelected: function () {
            return this.CatalogChildrenTabs.get("selectedTab") == "{EDAF15BA-BCD6-48F7-BB9F-64528B33CBAC}";
        },

        isCatalogsTabSelected: function () {
            return this.CatalogChildrenTabs.get("selectedTab") == "{5051FA20-64A2-4BE9-A40A-EC4BC9A4A7CC}";
        },

        addSpansToTab: function () {
            $("li[data-tab-id=\\{5051FA20-64A2-4BE9-A40A-EC4BC9A4A7CC\\}] > a", this.tabStrip).append("<span class='badge'></span>");
        },

        selectedTabChanged: function () {
            this.set("selectedTab", this.CatalogChildrenTabs.get("selectedTab"));
            this.hideErrorMessage();

            if (this.get("selectedTab") == "{EDAF15BA-BCD6-48F7-BB9F-64528B33CBAC}") { // Details
                this.loadDetailsTab();
            } else if (this.get("selectedTab") == "{5051FA20-64A2-4BE9-A40A-EC4BC9A4A7CC}") { // Catalogs
                this.loadCatalogsTab();
            }
        },

        loadDetailsTab: function () {
            this.ReadOnlyDefaultFields.set("isVisible", true);
            this.CommerceFieldExpander.set("isVisible", true);

            this.DetailsActionControl.set("isVisible", true);
            this.CatalogsActionControl.set("isVisible", true);


            this.CatalogsList.set("isVisible", false);
        },

        loadCatalogsTab: function () {
            this.ReadOnlyDefaultFields.set("isVisible", false);
            this.CommerceFieldExpander.set("isVisible", false);
            this.DetailsActionControl.set("isVisible", true);
            this.CatalogsActionControl.set("isVisible", true);

            this.CatalogsList.set("isVisible", true);
        },

        getCatalog: function (itemId) {
            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceInventory/GetInventoryCatalogProperties",
                type: "POST",
                headers: ajaxToken,
                data: {
                    itemId: itemId
                },
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    this.loadCatalog(JSON.parse(data));
                }
            });
        },

        loadCatalog: function (catalog) {
            var catalogName = catalog.InventoryCatalogName;
            this.HeaderTitle.set("text", catalogName);
            this.TitleControl.set("text", catalogName);
            this.InventoryCatalogName.set("text", catalogName);
            this.InventoryCatalogDescription.set("text", catalog.InventoryCatalogDescription);
            this.CreatedDate.set("value", catalog.DateCreated);
            this.ModifiedDate.set("value", catalog.LastModified);
        },

        saveCatalog: function () {
            var id = this.get("target");
            if (id) {
                this.updateCatalog();
            } else {
                this.createCatalog();
            }
        },

        updateCatalog: function () {
            this.HeaderActionsMessageBar.removeMessages();
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.DetailsActionControl.getAction("Save").isEnabled(false);
                this.CatalogsActionControl.getAction("Save").isEnabled(false);
                this.InProgress.hide();
                this.updateTabIndicator();
                this.showRequiredFieldsMessages(invalidFieldNames);
                return;
            }

            this.displayInProgressMessage();

            var dataObject = {};
            dataObject.InventoryCatalogName = this.InventoryCatalogName.get("text") !== null ? this.InventoryCatalogName.get("text").trim() : "";
            dataObject.InventoryCatalogDescription = this.InventoryCatalogDescription.get("text") !== null ? this.InventoryCatalogDescription.get("text").trim() : "";
            dataObject.associatedCatalogs = this.getAssociatedCatalogs();
            var extended = this.InventoryFormRenderer.get("editFunctionBody");
            this.addRendererFieldsToObject(dataObject, extended);

            var self = this;
            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceInventory/Update",
                type: "POST",
                headers: ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();
                        this.updateSaveButton(false);
                        for (i = 0; i < data.Errors.length; i++) {
                            this.ErrorsMessageBar.addMessage("error", data.Errors[i].ErrorMessage);
                            $("[data-sc-id='" + data.Errors[i].ControlId + "']").addClass("sc-validation");
                            this.serverUpdateTabErrorIndicator(data.Errors[i].ControlId);
                        }
                        this.ErrorsMessageBar.set("isVisible", true);
                        $(".sc-validation").change(function () {
                            self.updateValidationError($(this));
                        });
                        $(".sc-validation.sc-datepicker").click(function () {
                            self.updateValidationError($(this));
                        });

                    } else {
                        this.setPageIsDirty(false);
                        this.hideInProgressMessage(true);
                    }
                }
            });
        },

        createCatalog: function () {
            this.HeaderActionsMessageBar.removeMessages();
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.DetailsActionControl.getAction("Save").isEnabled(false);
                this.CatalogsActionControl.getAction("Save").isEnabled(false);
                this.InProgress.hide();
                this.updateTabIndicator();
                this.showRequiredFieldsMessages(invalidFieldNames);
                return;
            }

            this.displayInProgressMessage();

            var dataObject = {};
            dataObject.InventoryCatalogName = this.InventoryCatalogName.get("text") !== null ? this.InventoryCatalogName.get("text").trim() : "";
            dataObject.InventoryCatalogDescription = this.InventoryCatalogDescription.get("text") !== null ? this.InventoryCatalogDescription.get("text").trim() : "";

            var extended = this.InventoryFormRenderer.get("editFunctionBody");
            this.addRendererFieldsToObject(dataObject, extended);
            var self = this;

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceInventory/Create",
                type: "POST",
                headers: ajaxToken,
                context: this,
                data: dataObject,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    self.HeaderActionsMessageBar.removeMessages();
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();
                        this.updateSaveButton(false);
                        for (i = 0; i < data.Errors.length; i++) {
                            this.ErrorsMessageBar.addMessage("error", data.Errors[i].ErrorMessage);
                            $("[data-sc-id='" + data.Errors[i].ControlId + "']").addClass("sc-validation");
                        }
                        this.ErrorsMessageBar.set("isVisible", true);
                        $(".sc-validation").change(function () {
                            self.updateValidationError($(this));
                        });
                        $(".sc-validation.sc-datepicker").click(function () {
                            self.updateValidationError($(this));
                        });
                    } else {
                        this.hideInProgressMessageCreate(true, "Inventory Catalog Created");
                        this.setPageIsDirty(false);
                        this.set("newTargetId", dataObject.InventoryCatalogName);
                        setTimeout($.proxy(self.redirectToSavedInventoryCatalog, this), 10000);
                    }
                }
            });
        },

        redirectToSavedInventoryCatalog: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/InventoryCatalog?itemId=' + this.get("newTargetId"));
        },

        hideErrorMessage: function () {
            this.ErrorsMessageBar.removeMessages();
            this.ErrorsMessageBar.set("isVisible", false);
        },

        getAssociatedCatalogs: function () {
            var checkedCatalogs = this.CatalogsList.get("checkedItems");
            var associatedCatalogs = "";
            for (i = 0; i < checkedCatalogs.length; i++) {
                if (associatedCatalogs) {
                    associatedCatalogs += "|" + checkedCatalogs[i].name;
                } else {
                    associatedCatalogs = checkedCatalogs[i].name;
                }
            }

            return associatedCatalogs;
        },

        updateTabIndicator: function () {
            var tabDetailsStatusElement = $("li[data-tab-id=\\{EDAF15BA-BCD6-48F7-BB9F-64528B33CBAC\\}] > a > label", this.tabStrip);
            if ($(".sc-validation").length > 0) {
                tabDetailsStatusElement.html("<div class='warning16'>");
            } else {
                tabDetailsStatusElement.html("");
            }
        },

        onSelectedCatalogsChanged: function () {
            this.hideErrorMessage();
            this.updateSaveButton(true);
        },

        updateSaveButton: function (status) {
            if (!this.isAXEnabled) {
                this.DetailsActionControl.getAction("Save").isEnabled(status);
                this.CatalogsActionControl.getAction("Save").isEnabled(status);
            }
        },

        updateValidationError: function (obj) {
            obj.removeClass("sc-validation");
            if ($(".sc-validation").length === 0) {
                this.updateSaveButton(true);
                this.updateTabIndicator();
                this.hideErrorMessage();
            }
        }
    });

    return InventoryCatalog;
});
