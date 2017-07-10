//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        CommerceBasePage: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceBasePage",
        WorkspaceHelper: "/sitecore/shell/client/Applications/MerchandisingManager/WorkspaceHelper"
    }
});

define(["sitecore", "CommerceBasePage", "jquery", "WorkspaceHelper"], function (Sitecore, cbp, $, WorkspaceHelper) {

    var productTabId = "{DFD09B88-76D8-4AC0-BA38-F1E886773175}";
    var categoryTabId = "{44FFA625-531A-459C-91B3-8C07005DF56F}";
    var catalogTabId = "{524233A7-3A33-47BF-908E-15229F8AC89F}";
    var customCatalogTabId = "{12803625-D46D-4811-8CD3-867DF2715D2E}";

    var queryCount = 0;
    var tabCount = 4;
    var shouldShowOrHideTabs = false;

    var Search = cbp.extend({
        workspace: null,
        tabStrip: null,
        initialized: function () {
            cbp.prototype.initialized.call(this);
            this.HelpProvider.set("isReady", true);
            this.HelpProvider.refresh();
            this.set("selectedTab", "{DFD09B88-76D8-4AC0-BA38-F1E886773175}");

            // Cache this for faster selector lookup
            var searchTabs = this.SearchTabs.viewModel.$el;
            this.tabStrip = $("ul.sc-tabcontrol-navigation", searchTabs).first();

            this.SearchBox.viewModel.$el.after("<textarea id='searchBoxExtended' class='extendedSearchbox' rows='8' cols='50' style='display:none'/>");
            this.SearchBox.viewModel.$el.keyup(this.showHideExtendedSearchArea);
            $('#searchBoxExtended').on('focusout', function () {
                $('#searchBoxExtended').hide();
            });
            this.SearchBox.viewModel.$el.focusin(function () {
                if ($("[data-sc-id=SearchBox]").val().length > 24) {
                    $('#searchBoxExtended').show();
                    $('#searchBoxExtended').focus();
                }
            });

            $('#searchBoxExtended').on('keyup', $.proxy(this.addEnterKeySearchBox, this));
            this.handleBrowserHistoryChange();
            var searchTerm = this.getSearchTermFromUrl();

            this.setHeaderTitle(searchTerm);
            this.SearchTabs.on("change:selectedTab", this.selectedTabChanged, this);

            this.FilterPanel.viewModel.$el.addClass("sc-CommercePanel");

            this.CatalogDataSource.on("change:totalItemCount", this.catalogCountChanged, this);
            this.CustomCatalogDataSource.on("change:totalItemCount", this.customCatalogCountChanged, this);
            this.CategoryDataSource.on("change:totalItemCount", this.categoryCountChanged, this);
            this.ProductDataSource.on("change:totalItemCount", this.productCountChanged, this);

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            // Initialize the workspace
            this.workspace = new WorkspaceHelper({ requestToken: ajaxToken });
            var self = this;
            this.workspace.getCount(function (data) {
                self.ProductActionControl.getAction("Workspace").counter(data.Count);
                self.CategoryActionControl.getAction("Workspace").counter(data.Count);
                self.CatalogActionControl.getAction("Workspace").counter(data.Count);
                self.CustomCatalogActionControl.getAction("Workspace").counter(data.Count);
            });

            // Set up scroll listeners.
            $(window).on("scroll", $.proxy(self.infiniteScrollCatalogs, self));
            $(window).on("scroll", $.proxy(self.infiniteScrollCategories, self));
            $(window).on("scroll", $.proxy(self.infiniteScrollProducts, self));
            $(window).on("scroll", $.proxy(self.infiniteScrollCustomCatalogs, self));

            // Set up result counts in tabs
            this.addSpansToTabs();

            // Check if this is a multi-sku search
            if (this.isMultiSkuSearchTerm()) {
                this.performMultiSkuSearch();
                this.setHeaderTitle(this.StringResourcesDictionary.get("SearchedMultipleSkus"));
                this.SearchBox.set("text", "");
            } else {
                this.performStandardSearch();
                this.SearchBox.set("text", searchTerm);
            }

            this.CategoryList.on("change:checkedItemIds", this.onSelectedCategoriesChanged, this);
            this.ProductList.on("change:checkedItemIds", this.onSelectedProductsChanged, this);
        },

        onSelectedCategoriesChanged: function () {
            this.CategoryActionControl.getAction("AddToWorkspace").isEnabled(this.isAnItemSelected(this.CategoryList));
        },

        onSelectedProductsChanged: function () {
            this.ProductActionControl.getAction("AddToWorkspace").isEnabled(this.isAnItemSelected(this.ProductList));
        },

        addSpansToTabs: function () {
            $("li[data-tab-id=\\{DFD09B88-76D8-4AC0-BA38-F1E886773175\\}] > a", this.tabStrip).append("<span class='badge'></span>"); // Products
            $("li[data-tab-id=\\{44FFA625-531A-459C-91B3-8C07005DF56F\\}] > a", this.tabStrip).append("<span class='badge'></span>"); // Categories 
            $("li[data-tab-id=\\{524233A7-3A33-47BF-908E-15229F8AC89F\\}] > a", this.tabStrip).append("<span class='badge'></span>"); // Catalog
            $("li[data-tab-id=\\{12803625-D46D-4811-8CD3-867DF2715D2E\\}] > a", this.tabStrip).append("<span class='badge'></span>"); // Custom Catalog
        },

        catalogCountChanged: function () {
            var count = this.CatalogDataSource.get("totalItemCount") > 99 ? "99+" : this.CatalogDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{524233A7-3A33-47BF-908E-15229F8AC89F\\}] > a > span", this.tabStrip).html(count);
        },

        customCatalogCountChanged: function () {
            var count = this.CustomCatalogDataSource.get("totalItemCount") > 99 ? "99+" : this.CustomCatalogDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{12803625-D46D-4811-8CD3-867DF2715D2E\\}] > a > span", this.tabStrip).html(count);
        },

        categoryCountChanged: function () {
            var count = this.CategoryDataSource.get("totalItemCount") > 99 ? "99+" : this.CategoryDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{44FFA625-531A-459C-91B3-8C07005DF56F\\}] > a > span", this.tabStrip).html(count);
        },

        productCountChanged: function () {
            var count = this.ProductDataSource.get("totalItemCount") > 99 ? "99+" : this.ProductDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{DFD09B88-76D8-4AC0-BA38-F1E886773175\\}] > a > span", this.tabStrip).html(count);
        },

        setHeaderTitle: function (searchTerm) {

            var youSearchedForFormat = this.StringResourcesDictionary.get("YouSearchedFor");
            var youSearchedForText = Sitecore.Helpers.string.format(youSearchedForFormat, searchTerm);
            this.HeaderTitle.set("text", youSearchedForText);
            this.TitleControl.set("text", youSearchedForText);
        },

        selectedTabChanged: function () {

            var selectedTabId = this.SearchTabs.get("selectedTab");
            this.set("selectedTab", selectedTabId);

            if (selectedTabId == productTabId) {

                this.CatalogList.set("isVisible", false);
                this.CustomCatalogList.set("isVisible", false);
                this.CategoryList.set("isVisible", false);
                this.ProductList.set("isVisible", true);

                this.CatalogFacets.set("isVisible", false);
                this.CustomCatalogFacets.set("isVisible", false);
                this.CategoryFacets.set("isVisible", false);
                this.ProductFacets.set("isVisible", true);

            } else if (selectedTabId == categoryTabId) {

                this.CatalogList.set("isVisible", false);
                this.CustomCatalogList.set("isVisible", false);
                this.CategoryList.set("isVisible", true);
                this.ProductList.set("isVisible", false);

                this.CatalogFacets.set("isVisible", false);
                this.CustomCatalogFacets.set("isVisible", false);
                this.CategoryFacets.set("isVisible", true);
                this.ProductFacets.set("isVisible", false);

            } else if (selectedTabId == catalogTabId) {

                this.CatalogList.set("isVisible", true);
                this.CustomCatalogList.set("isVisible", false);
                this.CategoryList.set("isVisible", false);
                this.ProductList.set("isVisible", false);

                this.CatalogFacets.set("isVisible", true);
                this.CustomCatalogFacets.set("isVisible", false);
                this.CategoryFacets.set("isVisible", false);
                this.ProductFacets.set("isVisible", false);

            } else if (selectedTabId == customCatalogTabId) {

                this.CatalogList.set("isVisible", false);
                this.CustomCatalogList.set("isVisible", true);
                this.CategoryList.set("isVisible", false);
                this.ProductList.set("isVisible", false);

                this.CatalogFacets.set("isVisible", false);
                this.CustomCatalogFacets.set("isVisible", true);
                this.CategoryFacets.set("isVisible", false);
                this.ProductFacets.set("isVisible", false);
            }
        },

        getSearchTermFromUrl: function () {
            var hashString = window.location.hash;
            if (hashString && hashString.length > 0) {
                return decodeURI(window.location.hash.substring(1));
            }

            return null;
        },

        setSearchTermInUrl: function (searchTerm) {
            window.location.hash = '#' + searchTerm;
        },

        search: function () {
            var searchText = this.SearchBox.get("text");

            if (searchText) {
                searchText = searchText.trim();

                if (searchText) {
                    this.setSearchTermInUrl(searchText);
                    this.setHeaderTitle(searchText);
                }
            }
        },

        handleBrowserHistoryChange: function () {
            var self = this;
            $(document).ready(function () {
                if (window.history && window.history.pushState) {
                    $(window).on('hashchange', function (e) {
                        if (self.isMultiSkuSearchTerm()) {
                            self.performMultiSkuSearch();
                        } else {
                            self.performStandardSearch();
                        }
                    });
                }
            });
        },

        showOrHideProductsTab: function () {
            var haveProducts = this.ProductDataSource.get("hasItems");
            var productsTab = $("li[data-tab-id='{DFD09B88-76D8-4AC0-BA38-F1E886773175}']", this.tabStrip);

            if (productsTab && haveProducts === true) {
                productsTab.show();
            } else {
                productsTab.hide();
            }

            queryCount++;

            if (queryCount >= tabCount && shouldShowOrHideTabs === true) {
                this.setSelectedTab();
            }
        },

        showOrHideCategoriesTab: function () {
            var haveCategories = this.CategoryDataSource.get("hasItems");
            var categoriesTab = $("li[data-tab-id='{44FFA625-531A-459C-91B3-8C07005DF56F}']", this.tabStrip);

            if (categoriesTab && haveCategories === true) {
                categoriesTab.show();
            } else {
                categoriesTab.hide();
            }

            queryCount++;

            if (queryCount >= tabCount && shouldShowOrHideTabs === true) {
                this.setSelectedTab();
            }
        },

        showOrHideCatalogsTab: function () {
            var haveCatalogs = this.CatalogDataSource.get("hasItems");
            var catalogsTab = $("li[data-tab-id='{524233A7-3A33-47BF-908E-15229F8AC89F}']", this.tabStrip);

            if (catalogsTab && haveCatalogs === true) {
                catalogsTab.show();
            } else {
                catalogsTab.hide();
            }

            queryCount++;

            if (queryCount >= tabCount && shouldShowOrHideTabs === true) {
                this.setSelectedTab();
            }
        },

        showOrHideCustomCatalogsTab: function () {
            var haveCustomCatalogs = this.CustomCatalogDataSource.get("hasItems");
            var customCatalogsTab = $("li[data-tab-id='{12803625-D46D-4811-8CD3-867DF2715D2E}']", this.tabStrip);

            if (customCatalogsTab && haveCustomCatalogs === true) {
                customCatalogsTab.show();
            } else {
                customCatalogsTab.hide();
            }

            queryCount++;

            if (queryCount >= tabCount && shouldShowOrHideTabs === true) {
                this.setSelectedTab();
            }
        },

        setSelectedTab: function () {
            var haveProducts = this.ProductDataSource.get("hasItems");
            var haveCategories = this.CategoryDataSource.get("hasItems");
            var haveCatalogs = this.CatalogDataSource.get("hasItems");
            var haveCustomCatalogs = this.CustomCatalogDataSource.get("hasItems");

            if (haveProducts) {
                this.SearchTabs.set("isVisible", true);
                this.SearchTabs.set("selectedTab", productTabId);
                this.selectedTabChanged();
                this.NoSearchResultsText.set("isVisible", false);
            } else if (haveCategories) {
                this.SearchTabs.set("isVisible", true);
                this.SearchTabs.set("selectedTab", categoryTabId);
                this.selectedTabChanged();
                this.NoSearchResultsText.set("isVisible", false);
            } else if (haveCatalogs) {
                this.SearchTabs.set("isVisible", true);
                this.SearchTabs.set("selectedTab", catalogTabId);
                this.selectedTabChanged();
                this.NoSearchResultsText.set("isVisible", false);
            } else if (haveCustomCatalogs) {
                this.SearchTabs.set("isVisible", true);
                this.SearchTabs.set("selectedTab", customCatalogTabId);
                this.selectedTabChanged();
                this.NoSearchResultsText.set("isVisible", false);
            } else {
                this.CatalogList.set("isVisible", false);
                this.CustomCatalogList.set("isVisible", false);
                this.CategoryList.set("isVisible", false);
                this.ProductList.set("isVisible", false);
                this.SearchTabs.set("isVisible", false);
                this.NoSearchResultsText.set("isVisible", true);
            }

            shouldShowOrHideTabs = false;
        },

        isProductsTabSelected: function () {
            return this.SearchTabs.get("selectedTab") == "{DFD09B88-76D8-4AC0-BA38-F1E886773175}";
        },

        isCategoriesTabSelected: function () {
            return this.SearchTabs.get("selectedTab") == "{44FFA625-531A-459C-91B3-8C07005DF56F}";
        },

        isCatalogsTabSelected: function () {
            return this.SearchTabs.get("selectedTab") == "{524233A7-3A33-47BF-908E-15229F8AC89F}";
        },

        isCustomCatalogsTabSelected: function () {
            return this.SearchTabs.get("selectedTab") == customCatalogTabId;
        },

        infiniteScrollProducts: function () {
            var isBusy = this.ProductDataSource.get("isBusy");
            var hasMoreItems = this.ProductDataSource.get("hasMoreItems");

            if (this.isProductsTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.ProductDataSource.next();
                }
            }
        },

        infiniteScrollCategories: function () {
            var isBusy = this.CategoryDataSource.get("isBusy");
            var hasMoreItems = this.CategoryDataSource.get("hasMoreItems");

            if (this.isCategoriesTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.CategoryDataSource.next();
                }
            }
        },

        infiniteScrollCatalogs: function () {
            var isBusy = this.CatalogDataSource.get("isBusy");
            var hasMoreItems = this.CatalogDataSource.get("hasMoreItems");

            if (this.isCatalogsTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.CatalogDataSource.next();
                }
            }
        },

        infiniteScrollCustomCatalogs: function () {
            var isBusy = this.CustomCatalogDataSource.get("isBusy");
            var hasMoreItems = this.CustomCatalogDataSource.get("hasMoreItems");

            if (this.isCustomCatalogsTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.CustomCatalogDataSource.next();
                }
            }
        },

        isMultiSkuSearchTerm: function () {
            var searchTerm = this.getSearchTermFromUrl();
            return (searchTerm && searchTerm.length > 0 && searchTerm.indexOf(",") > -1);
        },

        performMultiSkuSearch: function () {

            var searchTerm = this.getSearchTermFromUrl();

            // Initialize visibility for lists and facets
            this.CatalogList.set("isVisible", false);
            this.CustomCatalogList.set("isVisible", false);
            this.CategoryList.set("isVisible", true);
            this.ProductList.set("isVisible", true);

            this.CatalogFacets.set("isVisible", false);
            this.CustomCatalogFacets.set("isVisible", false);
            this.CategoryFacets.set("isVisible", true);
            this.ProductFacets.set("isVisible", true);

            // Set-up tab visibility-change handlers
            var self = this;
            this.ProductDataSource.setCompletedQueryCallback($.proxy(self.onProductMultiSkuSearchCompleted, self));
            this.CategoryDataSource.setCompletedQueryCallback($.proxy(self.onCategoryMultiSkuSearchCompleted, self));

            this.setTabVisibility(catalogTabId, false);
            this.setTabVisibility(customCatalogTabId, false);
            this.setTabVisibility(categoryTabId, false);

            this.SearchTabs.set("selectedTab", productTabId);
            this.selectedTabChanged();
            this.NoSearchResultsText.set("isVisible", false);

            var searchTerm = this.getSearchTermFromUrl();
            this.ProductDataSource.set("dataUrl", "/sitecore/shell/commerce/merchandising/CommerceSearch/GetProductsBySku");
            this.ProductDataSource.set("commerceItemType", "Product");
            this.ProductDataSource.set("isReady", true);
            this.ProductDataSource.set("searchTerm", searchTerm);

            this.CategoryDataSource.set("dataUrl", "/sitecore/shell/commerce/merchandising/CommerceSearch/GetCategoriesByName");
            this.CategoryDataSource.set("commerceItemType", "Product");
            this.CategoryDataSource.set("isReady", true);
            this.CategoryDataSource.set("searchTerm", searchTerm);
        },

        performStandardSearch: function () {
            // Initialize visibility for lists and facets
            this.CatalogList.set("isVisible", false);
            this.CustomCatalogList.set("isVisible", false);
            this.CategoryList.set("isVisible", false);
            this.ProductList.set("isVisible", true);

            this.CatalogFacets.set("isVisible", false);
            this.CustomCatalogFacets.set("isVisible", false);
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", true);

            // Set-up tab visibility-change handlers
            var self = this;

            this.ProductDataSource.setCompletedQueryCallback($.proxy(self.showOrHideProductsTab, self));
            this.CategoryDataSource.setCompletedQueryCallback($.proxy(self.showOrHideCategoriesTab, self));
            this.CatalogDataSource.setCompletedQueryCallback($.proxy(self.showOrHideCatalogsTab, self));
            this.CustomCatalogDataSource.setCompletedQueryCallback($.proxy(self.showOrHideCustomCatalogsTab, self));

            queryCount = 0;
            shouldShowOrHideTabs = true;

            var searchTerm = this.getSearchTermFromUrl();

            this.setHeaderTitle(searchTerm);
            this.SearchBox.set("text", searchTerm);

            this.CatalogDataSource.set("dataUrl", "/sitecore/shell/commerce/merchandising/CommerceSearch/GetContentSearchResultsForItemType");
            this.CatalogDataSource.set("commerceItemType", "Catalog");
            this.CatalogDataSource.set("isReady", true);
            this.CatalogDataSource.set("searchTerm", searchTerm);

            this.CustomCatalogDataSource.set("dataUrl", "/sitecore/shell/commerce/merchandising/CommerceSearch/GetContentSearchResultsForItemType");
            this.CustomCatalogDataSource.set("commerceItemType", "VirtualCatalog");
            this.CustomCatalogDataSource.set("isReady", true);
            this.CustomCatalogDataSource.set("searchTerm", searchTerm);

            this.CategoryDataSource.set("dataUrl", "/sitecore/shell/commerce/merchandising/CommerceSearch/GetContentSearchResultsForItemType");
            this.CategoryDataSource.set("commerceItemType", "Category");
            this.CategoryDataSource.set("isReady", true);
            this.CategoryDataSource.set("searchTerm", searchTerm);

            this.ProductDataSource.set("dataUrl", "/sitecore/shell/commerce/merchandising/CommerceSearch/GetContentSearchResultsForItemType");
            this.ProductDataSource.set("commerceItemType", "Product");
            this.ProductDataSource.set("isReady", true);
            this.ProductDataSource.set("searchTerm", searchTerm);
        },

        setTabVisibility: function (tabId, visible) {
            var tab = $("li[data-tab-id='" + tabId + "']", this.tabStrip);

            if (!tab) {
                return;
            }

            if (visible) {
                tab.show();
            } else {
                tab.hide();
            }
        },

        onProductMultiSkuSearchCompleted: function () {
            var resultItems = this.ProductDataSource.get("items");
            if (!resultItems || resultItems.length == 0) {
                this.SearchTabs.set("isVisible", false);
                this.ProductList.set("isVisible", false);
                this.setTabVisibility(productTabId, false);
            } else {
                this.SearchTabs.set("isVisible", true);
                this.ProductList.set("isVisible", true);
                this.setTabVisibility(productTabId, true);
            }

            this.multiSkuQueriesComplete();
        },

        onCategoryMultiSkuSearchCompleted: function () {
            var resultItems = this.CategoryDataSource.get("items");
            if (!resultItems || resultItems.length == 0) {
                this.setTabVisibility(categoryTabId, false);
                this.SearchTabs.set("isVisible", false);
                this.CategoryList.set("isVisible", false);
            } else {
                this.setTabVisibility(categoryTabId, true);
                this.SearchTabs.set("isVisible", true);
                this.CategoryList.set("isVisible", true);
            }

            this.multiSkuQueriesComplete();
        },

        multiSkuQueriesComplete: function () {
            var products = this.ProductDataSource.get("items");
            var categories = this.CategoryDataSource.get("items");

            var productsFound = (products && products.length > 0);
            var categoriesFound = (categories && categories.length > 0);

            this.NoSearchResultsText.set("isVisible", (!productsFound && !categoriesFound));
            this.SearchTabs.set("isVisible", (productsFound || categoriesFound));

            if (productsFound) {
                this.SearchTabs.set("selectedTab", productTabId);
            } else if (categoriesFound) {
                this.SearchTabs.set("selectedTab", categoryTabId);
            }
        }
    });

    return Search;
});