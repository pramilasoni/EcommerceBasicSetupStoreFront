//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        CommerceBasePage: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceBasePage",
        WorkspaceHelper: "/sitecore/shell/client/Applications/MerchandisingManager/WorkspaceHelper"
    }
});

define(["sitecore", "CommerceBasePage", "jquery", "WorkspaceHelper"], function (Sitecore, cbp, $, WorkspaceHelper) {
    var Site = cbp.extend({
        workspace: null,
        tabStrip: null,
        initialized: function () {
            cbp.prototype.initialized.call(this);

            this.listenTo(_sc, 'sc-deleteselected', this.deleteSelectedCatalogs);
            this.listenTo(_sc, 'sc-hide-deletealert', this.hideDeleteAlert);

            this.SearchBox.viewModel.$el.focus();
            this.SearchBox.viewModel.$el.after("<textarea id='searchBoxExtended' class='extendedSearchbox' rows='8' cols='50' style='display:none'/>");
            this.SearchBox.viewModel.$el.keyup(this.showHideExtendedSearchArea);
            $('#searchBoxExtended').on('keyup', $.proxy(this.addEnterKeySearchBox, this));
            this.CatalogTabs.on("change:selectedTab", this.selectedTabChanged, this);
            this.CustomCatalogList.on("change:checkedItemIds", this.onSelectedVirtualCatalogsChanged, this);
            this.BaseCatalogList.on("change:checkedItemIds", this.onSelectedBaseCatalogsChanged, this);
            if (this.InventoryCatalogs) {
                this.InventoryCatalogs.on("change:checkedItemIds", this.onSelectedInventoryCatalogsChanged, this);
            }

            // Conditionally setting up checked item IDs only if the tab is available.
            if (this.CatalogSetList) {
                this.CatalogSetList.on("change:checkedItemIds", this.onSelectedCatalogSetsChanged, this);
            }

            this.CatalogTabs.set("selectedTab", "{31D4D370-C953-4CF5-A49C-357CC1978227}");
            this.set("selectedTab", this.CatalogTabs.get("selectedTab"));
            // Facet visibility
            this.BaseCatalogFacets.set("isVisible", true);
            this.CustomCatalogFacets.set("isVisible", false);

            var self = this;
            // Set up infinite scroll listeners
            $(window).on("scroll", $.proxy(self.infiniteScrollBaseCatalog, self));
            $(window).on("scroll", $.proxy(self.infiniteScrollVirtualCatalog, self));
            $(window).on("scroll", $.proxy(self.infiniteScrollCatalogSets, self));

            // Count initialization
            this.addSpansToTabs();
            this.BaseCatalogDataSource.on("change:totalItemCount", this.baseCatalogCountChanged, this);
            this.VirtualCatalogDataSource.on("change:totalItemCount", this.virtualCatalogCountChanged, this);
            // Does the user have access to Catalog Sets?
            if (this.CatalogSetsDataSource) {
                this.CatalogSetsDataSource.on("change:totalItemCount", this.catalogSetCountChanged, this);
            }

            if (this.InventoryCatalogDataSource) {
                this.InventoryCatalogDataSource.on("change:totalItemCount", this.inventoryCatalogCountChanged, this);
            }

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            // Initialize the workspace:
            this.workspace = new WorkspaceHelper({ requestToken: ajaxToken });

            // Cache this for faster selector lookup
            var siteTabs = this.CatalogTabs.viewModel.$el;
            this.tabStrip = $("ul.sc-tabcontrol-navigation", siteTabs).first();

            this.workspace.getCount(function (data) {
                self.BaseCatalogActionControl.getAction("Workspace").counter(data.Count);
                self.CustomCatalogActionControl.getAction("Workspace").counter(data.Count);
            });

            this.FilterPanel.viewModel.$el.addClass("sc-CommercePanel");

            // Initialize data sources
            this.BaseCatalogDataSource.set("isReady", true);
            this.BaseCatalogDataSource.refresh();

            this.VirtualCatalogDataSource.set("isReady", true);
            this.VirtualCatalogDataSource.refresh();

            this.AllVirtualCatalogsDataSource.set("isReady", true);
            this.AllVirtualCatalogsDataSource.refresh();

            this.HelpProvider.set("isReady", true);
            this.HelpProvider.refresh();

            var catalogSetTab = $("li[data-tab-id=\\{AF195AF3-A449-4610-AE39-50F62485B70E\\}]", this.tabStrip);
            if (catalogSetTab && catalogSetTab.is(":visible")) {
                this.CatalogSetsDataSource.set("isReady", true);
                this.CatalogSetsDataSource.refresh();
            }

            var inventoryTab = $("li[data-tab-id=\\{B5A7758D-020E-470C-8CB4-DCBA6117A482\\}]", this.tabStrip);
            if (inventoryTab && inventoryTab.is(":visible")) {
                this.InventoryCatalogDataSource.set("isReady", true);
                this.InventoryCatalogDataSource.refresh();
            }

            // Kick-off polling for virtual catalog status
            var refreshVirtualCatalogStatusMethod = $.proxy(this.refreshVirtualCatalogStatus, this);
            setTimeout(refreshVirtualCatalogStatusMethod, 3000);

            // Set list view mode
            var userListViewPreference = this.listViewMode;

            if (!userListViewPreference) {
                userListViewPreference = "DetailList";
            }

            this.setListViewMode(userListViewPreference);

            var previousTab = window.location.hash;

            if (previousTab !== "") {
                self.CatalogTabs.set("selectedTab", previousTab.substring(1, previousTab.length));
            }
        },

        hideDeleteAlert: function () {
            this.DeleteAlert.hide();
        },

        disableIfAX: function () {
            this.BaseCatalogActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.CustomCatalogActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            if (this.CatalogGroupActionControl){
                this.CatalogGroupActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            }

            if (this.InventoryCatalogActionControl) {
                this.InventoryCatalogActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            }
        },

        addSpansToTabs: function () {
            $("li[data-tab-id=\\{31D4D370-C953-4CF5-A49C-357CC1978227\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{78EAA872-E631-4D77-A53B-CD9B3E4EE485\\}] > a", this.tabStrip).append("<span class='badge'></span><label style=\"display:inline\"></label>");
            $("li[data-tab-id=\\{AF195AF3-A449-4610-AE39-50F62485B70E\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{B5A7758D-020E-470C-8CB4-DCBA6117A482\\}] > a", this.tabStrip).append("<span class='badge'></span>");
        },

        baseCatalogCountChanged: function () {
            var count = this.BaseCatalogDataSource.get("totalItemCount") > 99 ? "99+" : this.BaseCatalogDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{31D4D370-C953-4CF5-A49C-357CC1978227\\}] > a > span", this.tabStrip).html(count);
        },

        virtualCatalogCountChanged: function () {
            var count = this.VirtualCatalogDataSource.get("totalItemCount") > 99 ? "99+" : this.VirtualCatalogDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{78EAA872-E631-4D77-A53B-CD9B3E4EE485\\}] > a > span", this.tabStrip).html(count);
        },

        catalogSetCountChanged: function () {
            var count = this.CatalogSetsDataSource.get("totalItemCount") > 99 ? "99+" : this.CatalogSetsDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{AF195AF3-A449-4610-AE39-50F62485B70E\\}] > a > span", this.tabStrip).html(count);
        },

        inventoryCatalogCountChanged: function () {
            var count = this.InventoryCatalogDataSource.get("totalItemCount") > 99 ? "99+" : this.InventoryCatalogDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{B5A7758D-020E-470C-8CB4-DCBA6117A482\\}] > a > span", this.tabStrip).html(count);
        },

        selectedTabChanged: function () {
            var selectedtab = this.CatalogTabs.get("selectedTab");
            this.set("selectedTab", this.CatalogTabs.get("selectedTab"));
            this.hideErrorMessage();

            if (selectedtab == "{31D4D370-C953-4CF5-A49C-357CC1978227}") { // Catalog
                window.location.hash = '#{31D4D370-C953-4CF5-A49C-357CC1978227}';
                this.BaseCatalogList.set("isVisible", true);
                this.CustomCatalogList.set("isVisible", false);

                this.BaseCatalogActionControl.set("isVisible", true);
                this.CustomCatalogActionControl.set("isVisible", false);
                if (!this.isAXEnabled) {
                    this.BaseCatalogActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.BaseCatalogList));
                }
                // Facet visibility
                this.BaseCatalogFacets.set("isVisible", true);
                this.CustomCatalogFacets.set("isVisible", false);

                if (this.listViewMode == "TileList") {
                    this.BaseCatalogTileSortComboBox.set("isVisible", true);
                    this.CustomCatalogTileSortComboBox.set("isVisible", false);
                    if (this.CatalogGroupTileSortComboBox) {
                        this.CatalogGroupTileSortComboBox.set("isVisible", false);
                    }
                }

            } else if (selectedtab == "{78EAA872-E631-4D77-A53B-CD9B3E4EE485}") { // Virtual Catalog
                window.location.hash = '#{78EAA872-E631-4D77-A53B-CD9B3E4EE485}';
                this.BaseCatalogList.set("isVisible", false);
                this.CustomCatalogList.set("isVisible", true);
                this.BaseCatalogActionControl.set("isVisible", false);
                this.CustomCatalogActionControl.set("isVisible", true);
                if (!this.isAXEnabled) {
                    this.CustomCatalogActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.CustomCatalogList)); // Delete control
                }
                // Facet visibility
                this.BaseCatalogFacets.set("isVisible", false);
                this.CustomCatalogFacets.set("isVisible", true);

                if (this.listViewMode == "TileList") {
                    this.BaseCatalogTileSortComboBox.set("isVisible", false);
                    this.CustomCatalogTileSortComboBox.set("isVisible", true);
                    if (this.CatalogGroupTileSortComboBox) {
                        this.CatalogGroupTileSortComboBox.set("isVisible", false);
                    }
                }

            } else if (selectedtab == "{AF195AF3-A449-4610-AE39-50F62485B70E}") { // Catalog Sets
                window.location.hash = '#{AF195AF3-A449-4610-AE39-50F62485B70E}';
                this.BaseCatalogList.set("isVisible", false);
                this.CustomCatalogList.set("isVisible", false);
                this.BaseCatalogActionControl.set("isVisible", false);
                this.CustomCatalogActionControl.set("isVisible", false);

                // Only do this if the CatalogGroupActionControl is on the page. 
                if (this.CatalogGroupActionControl) {
                    if (!this.isAXEnabled) {
                        this.CatalogGroupActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.CatalogSetList));
                    }
                }

                // Facet visibility
                this.BaseCatalogFacets.set("isVisible", false);
                this.CustomCatalogFacets.set("isVisible", false);

                if (this.listViewMode == "TileList") {
                    this.BaseCatalogTileSortComboBox.set("isVisible", false);
                    this.CustomCatalogTileSortComboBox.set("isVisible", false);
                    if (this.CatalogGroupTileSortComboBox) {
                        this.CatalogGroupTileSortComboBox.set("isVisible", true);
                    }
                }

                // Set up Query Data Source Here
            } else if (selectedtab == "{B5A7758D-020E-470C-8CB4-DCBA6117A482}") { // Inventory
                window.location.hash = '#{B5A7758D-020E-470C-8CB4-DCBA6117A482}';
                this.BaseCatalogList.set("isVisible", false);
                this.CustomCatalogList.set("isVisible", false);
                this.BaseCatalogActionControl.set("isVisible", false);
                this.CustomCatalogActionControl.set("isVisible", false);

                if (this.InventoryCatalogActionControl) {
                    this.InventoryCatalogActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.InventoryCatalogs));
                }

                // Facet visibility
                this.BaseCatalogFacets.set("isVisible", false);
                this.CustomCatalogFacets.set("isVisible", false);

                this.BaseCatalogTileSortComboBox.set("isVisible", false);
                this.CustomCatalogTileSortComboBox.set("isVisible", false);
                if (this.CatalogGroupTileSortComboBox) {
                    this.CatalogGroupTileSortComboBox.set("isVisible", false);
                }
            }
        },

        toggleFilterPanel: function () {
            var isOpen = this.FilterPanel.get("isOpen");
            this.FilterPanel.set("isOpen", !isOpen);
        },

        updateCatalogGroupContextMenuAxis: function () {
            this.CatalogGroupContextMenu.set("axis", (clientX - 163).toString() + "px");
            this.CatalogGroupContextMenu.toggle();
        },

        isBaseCatalogTabSelected: function () {
            return this.CatalogTabs.get("selectedTab") == "{31D4D370-C953-4CF5-A49C-357CC1978227}";
        },

        isVirtualCatalogTabSelected: function () {
            return this.CatalogTabs.get("selectedTab") == "{78EAA872-E631-4D77-A53B-CD9B3E4EE485}";
        },

        isCatalogGroupsTabSelected: function () {
            return this.CatalogTabs.get("selectedTab") == "{AF195AF3-A449-4610-AE39-50F62485B70E}";
        },

        isInventoryCatalogTabSelected: function () {
            return this.CatalogTabs.get("selectedTab") == "{B5A7758D-020E-470C-8CB4-DCBA6117A482}";
        },

        infiniteScrollBaseCatalog: function () {
            var isBusy = this.BaseCatalogDataSource.get("isBusy");
            var hasMoreItems = this.BaseCatalogDataSource.get("hasMoreItems");

            if (this.isBaseCatalogTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.BaseCatalogDataSource.next();
                }
            }
        },

        infiniteScrollVirtualCatalog: function () {
            var isBusy = this.VirtualCatalogDataSource.get("isBusy");
            var hasMoreItems = this.VirtualCatalogDataSource.get("hasMoreItems");

            if (this.isVirtualCatalogTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.VirtualCatalogDataSource.next();
                }
            }
        },

        infiniteScrollCatalogSets: function () {
            var isBusy = this.CatalogSetsDataSource.get("isBusy");
            var hasMoreItems = this.CatalogSetsDataSource.get("hasMoreItems");

            if (this.isCatalogGroupsTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.CatalogSetsDataSource.next();
                }
            }
        },

        rebuildSelectedVirtualCatalogs: function () {
            var selectedVirtualCatalogs = this.CustomCatalogList.get("checkedItemIds");
            if (selectedVirtualCatalogs && selectedVirtualCatalogs.length > 0) {
                var virtualCatalogsDelimitedList = "";
                for (i = 0; i < selectedVirtualCatalogs.length; i++) {
                    var virtualCatalog = selectedVirtualCatalogs[i];

                    if (i > 0) {
                        virtualCatalogsDelimitedList += "|";
                    }

                    virtualCatalogsDelimitedList += virtualCatalog;
                }

                if (virtualCatalogsDelimitedList) {
                    var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
                    var ajaxToken = {};
                    ajaxToken[token.headerKey] = token.value;

                    $.ajax({
                        url: "/sitecore/shell/commerce/merchandising/CommerceCatalogAction/RebuildVirtualCatalogs",
                        type: "POST",
                        headers: ajaxToken,
                        data: {
                            virtualCatalogs: virtualCatalogsDelimitedList
                        },
                        context: this,
                        error: CommerceUtilities.IsAuthenticated,
                        success: function (data) {
                            var tabRebuildStatusElement = $("li[data-tab-id=\\{78EAA872-E631-4D77-A53B-CD9B3E4EE485\\}] > a > label", this.tabStrip);
                            tabRebuildStatusElement.html("<div class='beingRebuild' title='" + data.Message + "'></div>");
                            var virtualCatalogsPending = virtualCatalogsDelimitedList.split('|');

                            for (i = 0; i < virtualCatalogsPending.length; i++) {
                                var virtualCatalogId = virtualCatalogsPending[i] + "_statusElement";
                                var statusElement = document.getElementById(virtualCatalogId);
                                if (statusElement) {
                                    statusElement.innerHTML = "<sub><div class='beingRebuild' title='" + data.Message + "'></div></sub>";
                                }
                            }

                        }
                    });
                }
            }
        },

        onSelectedVirtualCatalogsChanged: function () {
            this.hideErrorMessage();
            var rebuildEnabled = this.isAnItemSelected(this.CustomCatalogList);
            if (!this.isAXEnabled) {
                this.CustomCatalogActionControl.getAction("Rebuild").isEnabled(rebuildEnabled); // Rebuild
                this.CustomCatalogActionControl.getAction("Delete").isEnabled(rebuildEnabled); // Delete
            }
        },

        onSelectedBaseCatalogsChanged: function () {
            this.hideErrorMessage();
            if (!this.isAXEnabled) {
                this.BaseCatalogActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.BaseCatalogList));
            }
        },

        onSelectedCatalogSetsChanged: function () {
            this.hideErrorMessage();

            // Check to see if this is on the page first to make sure the user has permission. 
            if (this.CatalogGroupActionControl) {
                if (!this.isAXEnabled) {
                    this.CatalogGroupActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.CatalogSetList));
                }
            }
        },

        deleteSelectedCatalogs: function () {
            if (this.isBaseCatalogTabSelected()) {
                this.deleteSelectedBaseCatalogs();
            } else if (this.isVirtualCatalogTabSelected()) {
                this.deleteSelectedVirtualCatalogs();
            } else if (this.isCatalogGroupsTabSelected()) {
                this.deleteSelectedCatalogSets();
            } else if (this.isInventoryCatalogTabSelected()) {
                this.deleteSelectedInventoryCatalogs();
            }
        },

        deleteSelectedBaseCatalogs: function () {
            var selectedBaseCatalogs = this.BaseCatalogList.get("checkedItemIds");
            if (selectedBaseCatalogs && selectedBaseCatalogs.length > 0) {
                var baseCatalogsDelimitedList = "";
                for (i = 0; i < selectedBaseCatalogs.length; i++) {
                    var baseCatalog = selectedBaseCatalogs[i];

                    if (i > 0) {
                        baseCatalogsDelimitedList += "|";
                    }

                    baseCatalogsDelimitedList += baseCatalog;
                }

                if (baseCatalogsDelimitedList) {
                    this.deleteRequestedCatalogs(baseCatalogsDelimitedList, this.BaseCatalogDataSource, this.BaseCatalogList);
                }
            }
        },

        deleteSelectedVirtualCatalogs: function () {
            var selectedCatalogs = this.CustomCatalogList.get("checkedItemIds");
            if (selectedCatalogs && selectedCatalogs.length > 0) {
                var catalogsDelimitedList = "";
                for (i = 0; i < selectedCatalogs.length; i++) {
                    var catalog = selectedCatalogs[i];

                    if (i > 0) {
                        catalogsDelimitedList += "|";
                    }

                    catalogsDelimitedList += catalog;
                }

                if (catalogsDelimitedList) {
                    this.deleteRequestedCatalogs(catalogsDelimitedList, this.VirtualCatalogDataSource, this.CustomCatalogList);
                }
            }
        },

        deleteSelectedCatalogSets: function () {
            // This function is not going to be called unless the buttons for catalog sets are on the page.
            var selectedCatalogSets = this.CatalogSetList.get("checkedItemIds");
            if (selectedCatalogSets && selectedCatalogSets.length > 0) {
                var catalogSetsDelimitedList = "";
                for (var i = 0; i < selectedCatalogSets.length; i++) {
                    var catalogSet = selectedCatalogSets[i];

                    if (i > 0) {
                        catalogSetsDelimitedList += "|";
                    }

                    catalogSetsDelimitedList += catalogSet;
                }

                if (catalogSetsDelimitedList) {
                    this.deleteRequestedCatalogs(catalogSetsDelimitedList, this.CatalogSetsDataSource, this.CatalogSetList);
                }
            }

        },

        deleteRequestedCatalogs: function (catalogsList, dataSource, listControl) {
            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCatalogAction/DeleteCatalogs",
                type: "POST",
                headers: ajaxToken,
                data: {
                    catalogsToDelete: catalogsList
                },
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    setTimeout($.proxy(this.DeleteAlert.hide(), this), 3000);
                    this.DeleteAlert.set("isVisible", false);

                    if (data.Message.length > 0) {
                        for (var i = 0; i < data.Message.length; i++) {
                            this.ErrorsMessageBar.addMessage("error", data.Message[i]);
                        }

                        this.ErrorsMessageBar.set("isVisible", true);
                    }

                    // Refresh the list after a brief wait for the index update
                    setTimeout(function () {
                        dataSource.refresh();

                        // Remove deleted catalogs from list control checked items 
                        // to prevent re-submission of deleted catalogs on next delete operation
                        if (listControl) {
                            var checkedCatalogs = listControl.get("checkedItemIds");
                            listControl.viewModel.uncheckItems(checkedCatalogs);
                        }
                    }, 2000);
                }
            });
        },

        createBaseCatalog: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/Catalog?create=true&template={93AF861A-B6F4-45BE-887D-D93D4B95B39D}&parent={08BFB57F-DAC9-4B11-90C5-5D19647899EF}');
        },

        createCustomCatalog: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/CustomCatalog?create=true&template={19988B71-6F3D-43EB-8253-E6D451878922}&parent={08BFB57F-DAC9-4B11-90C5-5D19647899EF}');
        },

        createStaticCatalogSet: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/Commerce Static Catalog Group?create=true&template={71C6AEE2-092E-47CE-9A6F-1A8B91BE4CA2}&parent={989DE08E-8360-44B0-B439-F37A9DCECADA}');
        },

        createDynamicCatalogSet: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/Commerce Dynamic Catalog Group?create=true&template={23AA0570-78BB-40BB-8DCF-DEF77500C669}&parent={989DE08E-8360-44B0-B439-F37A9DCECADA}');
        },

        createInventoryCatalog: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/InventoryCatalog?create=true&template={C5E8C469-5580-4755-93C5-F62E11D014A5}&parent={08BFB57F-DAC9-4B11-90C5-5D19647899EF}');
        },

        onSelectedInventoryCatalogsChanged: function () {
            this.hideErrorMessage();
            this.InventoryCatalogActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.InventoryCatalogs));
        },

        refreshVirtualCatalogStatus: function () {
            // Using a separate data source getting ids of virtual catalogs
            // for polling rebuild status. The datasource the list is bound to
            // might be filtered.
            var virtualCatalogs = this.AllVirtualCatalogsDataSource.get("items");

            if (virtualCatalogs && virtualCatalogs.length > 0) {
                var virtualCatalogsDelimitedList = "";
                for (i = 0; i < virtualCatalogs.length; i++) {
                    var virtualCatalog = virtualCatalogs[i].itemId;

                    if (i > 0) {
                        virtualCatalogsDelimitedList += "|";
                    }

                    virtualCatalogsDelimitedList += virtualCatalog;
                }

                var updateCatalogStatusIndicators = $.proxy(this.updateVirtualCatalogStatusIndicators, this);
                var refreshVirtualCatalogStatusMethod = $.proxy(this.refreshVirtualCatalogStatus, this);

                if (virtualCatalogsDelimitedList) {
                    var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
                    var ajaxToken = {};
                    ajaxToken[token.headerKey] = token.value;

                    $.ajax({
                        url: "/sitecore/shell/commerce/merchandising/CommerceCatalogAction/GetVirtualCatalogStatus",
                        type: "POST",
                        headers: ajaxToken,
                        data: {
                            virtualCatalogs: virtualCatalogsDelimitedList
                        },
                        context: this,
                        error: CommerceUtilities.IsAuthenticated,
                        success: function (data) {
                            updateCatalogStatusIndicators(data);
                            setTimeout(refreshVirtualCatalogStatusMethod, 3000);
                        }
                    });
                }
            }
        },

        updateVirtualCatalogStatusIndicators: function (catalogStatus) {
            if (catalogStatus && catalogStatus.length > 0) {
                var catalogsRequireRebuild = false;
                var needRebuildToolTip = this.ClientErrorMessages.get("Needs Rebuild");
                var beingRebuiltToolTip = this.ClientErrorMessages.get("Being Rebuilt");
                for (i = 0; i < catalogStatus.length; i++) {

                    var statusElementId = catalogStatus[i].CatalogId + "_statusElement";
                    var rebuildStatus = catalogStatus[i].RebuildStatus;
                    var statusHtml;

                    if (rebuildStatus == "NeedsRebuild") {
                        statusHtml = "<div class='needsRebuild' title='" + needRebuildToolTip + "' >";
                        catalogsRequireRebuild = true;
                    } else if (rebuildStatus == "BeingRebuilt" || rebuildStatus == "BeingRebuiltDirty") {
                        statusHtml = "<div class='beingRebuild' title='" + beingRebuiltToolTip + "'>";
                    } else {
                        statusHtml = ""; // Clear if rebuilt or ignore status
                    }

                    var statusElement = document.getElementById(statusElementId);
                    if (statusElement) {
                        statusElement.innerHTML = "<sub>" + statusHtml + "</sub>";
                    }
                }

                var tabRebuildStatusElement = $("li[data-tab-id=\\{78EAA872-E631-4D77-A53B-CD9B3E4EE485\\}] > a > label", this.tabStrip);

                if (catalogsRequireRebuild && tabRebuildStatusElement) {
                    tabRebuildStatusElement.html("<div class='warning16' title='" + needRebuildToolTip + "' >");
                } else {
                    tabRebuildStatusElement.html("");
                }
            }
        },

        deleteSelectedInventoryCatalogs: function () {
            var inventoryCatalogsToDelete = this.InventoryCatalogs.get("checkedItemIds");
            var catalogsDelimitedList = "";

            for (i = 0; i < inventoryCatalogsToDelete.length; i++) {
                if (catalogsDelimitedList) {
                    catalogsDelimitedList += "|" + inventoryCatalogsToDelete[i];
                } else {
                    catalogsDelimitedList = inventoryCatalogsToDelete[i];
                }
            }

            var self = this;

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceInventory/DeleteInventoryCatalogs",
                type: "POST",
                headers: ajaxToken,
                data: {
                    deletedInventoryCatalogs: catalogsDelimitedList
                },
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    self.DeleteAlert.hide();

                    if (data.Messages && data.Messages.length > 0) {
                        for (var i = 0; i < data.Messages.length; i++) {
                            self.ErrorsMessageBar.addMessage("error", data.Messages[i]);
                        }

                        self.ErrorsMessageBar.set("isVisible", true);
                    }

                    // Explicitly uncheck deleted catalogs to remove from ListControl collection
                    self.InventoryCatalogs.viewModel.uncheckItems(inventoryCatalogsToDelete);

                    // Refresh the list of inventory catalogs
                    self.InventoryCatalogDataSource.refresh();
                }
            });
        },

        hideErrorMessage: function () {
            this.ErrorsMessageBar.removeMessages();
            this.ErrorsMessageBar.set("isVisible", false);
        },

        setListViewMode: function (viewMode) {
            this.BaseCatalogList.set("view", viewMode);
            this.CustomCatalogList.set("view", viewMode);

            if (this.CatalogSetList) {
                this.CatalogSetList.set("view", viewMode);
            }

            if (this.InventoryCatalogs) {
                this.InventoryCatalogs.set("view", viewMode);
            }

            // Update the user preference
            this.setUsersListViewPreference(viewMode);

            if (this.listViewMode == "TileList") {
                // switch to default sorting
                this.BaseCatalogTileSortComboBox.trigger("change:selectedItem");
                this.CustomCatalogTileSortComboBox.trigger("change:selectedItem");

                if (this.CatalogGroupTileSortComboBox) {
                    this.CatalogGroupTileSortComboBox.trigger("change:selectedItem");
                }

                this.checkListViewItems(this.BaseCatalogList);
                this.checkListViewItems(this.CustomCatalogList);

                if (this.CatalogSetList) {
                    this.checkListViewItems(this.CatalogSetList);
                }

                if (this.InventoryCatalogs) {
                    this.checkListViewItems(this.InventoryCatalogs);
                }

                var selectedTab = this.CatalogTabs.get("selectedTab");
                var self = this;

                if (selectedTab == "{31D4D370-C953-4CF5-A49C-357CC1978227}") { // base catalog
                    this.BaseCatalogTileSortComboBox.set("isVisible", true);
                    this.CustomCatalogTileSortComboBox.set("isVisible", false);
                    if (this.CatalogGroupTileSortComboBox) {
                        this.CatalogGroupTileSortComboBox.set("isVisible", false);
                    }

                    this.BaseCatalogTileSortComboBox.on("change:selectedItem", function () {
                        var selectedItem = self.BaseCatalogTileSortComboBox.get("selectedItem");
                        self.BaseCatalogDataSource.set("sorting", selectedItem.DataField);
                    });
                } else if (selectedTab == "{78EAA872-E631-4D77-A53B-CD9B3E4EE485}") { // custom catalog
                    this.BaseCatalogTileSortComboBox.set("isVisible", false);
                    this.CustomCatalogTileSortComboBox.set("isVisible", true);
                    if (this.CatalogGroupTileSortComboBox) {
                        this.CatalogGroupTileSortComboBox.set("isVisible", false);
                    }

                    this.CustomCatalogTileSortComboBox.on("change:selectedItem", function () {
                        var selectedItem = self.CustomCatalogTileSortComboBox.get("selectedItem");
                        self.VirtualCatalogDataSource.set("sorting", selectedItem.DataField);
                    });

                } else if (selectedTab == "{AF195AF3-A449-4610-AE39-50F62485B70E}") { // catalog groups
                    this.BaseCatalogTileSortComboBox.set("isVisible", false);
                    this.CustomCatalogTileSortComboBox.set("isVisible", false);
                    if (this.CatalogGroupTileSortComboBox) {
                        this.CatalogGroupTileSortComboBox.set("isVisible", true);

                        this.CatalogGroupTileSortComboBox.on("change:selectedItem", function () {
                            var selectedItem = self.CatalogGroupTileSortComboBox.get("selectedItem");
                            self.CatalogSetsDataSource.set("sorting", selectedItem.DataField);
                        });
                    }
                } else {
                    this.BaseCatalogTileSortComboBox.set("isVisible", false);
                    this.CustomCatalogTileSortComboBox.set("isVisible", false);
                    if (this.CatalogGroupTileSortComboBox) {
                        this.CatalogGroupTileSortComboBox.set("isVisible", false);
                    }
                }
            } else {
                this.BaseCatalogTileSortComboBox.set("isVisible", false);
                this.CustomCatalogTileSortComboBox.set("isVisible", false);
                if (this.CatalogGroupTileSortComboBox) {
                    this.CatalogGroupTileSortComboBox.set("isVisible", false);
                }
            }
        }
    });

    return Site;
});

document.body.addEventListener("mousedown", defineClientX, false);
var clientX = null;
function defineClientX(e) {
    clientX = e.clientX;
}