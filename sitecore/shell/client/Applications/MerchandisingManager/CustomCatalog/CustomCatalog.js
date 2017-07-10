//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        CommerceBasePage: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceBasePage",
        WorkspaceHelper: "/sitecore/shell/client/Applications/MerchandisingManager/WorkspaceHelper"
    }
});

define(["sitecore", "CommerceBasePage", "knockout", "WorkspaceHelper"], function (Sitecore, cbp, ko, WorkspaceHelper) {
    var catalogName = "";
    var CustomCatalog = cbp.extend({
        pendingRules: [],
        ajaxToken: {},
        rulesToAdd: [],
        currentAction: "",
        pickedItems: [],
        editRule: false,
        defaultCatalogLanguage: null,
        currentEditedMediaField: null,
        workspace: null,
        tabStrip: null,
        initialized: function () {
            this.disableLanguageIfRequired();
            cbp.prototype.initialized.call(this);
            var self = this;
            this.listenTo(_sc, 'sc-concurrency-override', this.overridePreviousChanges);
            this.listenTo(_sc, 'sc-concurrency-cancel', this.cancelChanges);
            this.listenTo(_sc, 'sc-deleteselected', this.deleteSelectedItems);
            this.listenTo(_sc, 'sc-hide-deletealert', this.hideDeleteAlert);

            this.PricingRulesDataSource.set("isReady", true);
            this.PricingRulesDataSource.refresh();

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            this.ajaxToken[token.headerKey] = token.value;

            // Cache for faster selector lookup
            var customCatalogTabs = this.VirtualCatalogChildrenTabs.viewModel.$el;
            this.tabStrip = $("ul.sc-tabcontrol-navigation", customCatalogTabs).first();

            // Initialize the workspace
            this.workspace = new WorkspaceHelper({ requestToken: this.ajaxToken });

            this.workspace.getCount(function (data) {
                self.CategoriesActionControl.getAction("Workspace").counter(data.Count);
                self.ProductsActionControl.getAction("Workspace").counter(data.Count);
            });

            this.HelpProvider.set("isReady", true);
            this.HelpProvider.refresh();

            this.SearchBox.viewModel.$el.after("<textarea id='searchBoxExtended' class='extendedSearchbox' rows='8' cols='50' style='display:none'/>");
            this.SearchBox.viewModel.$el.keyup(this.showHideExtendedSearchArea);
            $('#searchBoxExtended').on('keyup', $.proxy(this.addEnterKeySearchBox, this));
            this.VirtualCatalogChildrenTabs.on("change:selectedTab", this.selectedTabChanged, this);
            this.CategoriesList.on("change:checkedItemIds", this.onSelectedCategoriesChanged, this);
            this.ProductList.on("change:checkedItemIds", this.onSelectedProductsChanged, this);
            this.PendingRules.on("change:items", this.changePendingRuleVisibility, this);
            this.PricingRuleCombo.on("change:selectedValue", this.ruleChange, this);

            var virtualCatalogId = CommerceUtilities.loadPageVar("target");
            this.set("targetId", virtualCatalogId);

            var language = CommerceUtilities.loadPageVar("lang");

            if (!language) {
                language = cbp.prototype.getCookie("commerceLang");
            }

            if (language) {
                this.set("currentLanguage", language);
            } else {
                this.set("currentLanguage", "en-US");
            }

            if (virtualCatalogId) {

                // Edit
                this.LanguageDataSource.set("commerceItemId", virtualCatalogId);
                this.LanguageDataSource.set("isReady", true);
                this.LanguageDataSource.refresh();
                this.Language.on("change:items", this.setLanguage, this);

                //For Concurrency Saving
                this.set("lastModified", null);
                this.set("overrideChanges", false);

                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceSearch/GetItem",
                    type: "POST",
                    headers: this.ajaxToken,
                    context: this,
                    data: {
                        id: virtualCatalogId,
                        language: this.get("currentLanguage")
                    },
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        self.HeaderTitle.set("text", data.DisplayName);
                        self.TitleControl.set("text", data.CatalogName);
                        self.catalogName = data.CatalogName;
                        self.set("itemPath", data.Path);
                        self.defaultCatalogLanguage = data.DefaultLanguage;
                        self.HeaderTitleLabel.set("text", self.ItemTypeDictionary.get("Custom Catalog"));

                        // Initialize the default languages combo-box then keep
                        // it in sync with the currently selected languages in the language picker
                        $.ajax({
                            url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/GetCatalogLanguages",
                            type: "POST",
                            headers: this.ajaxToken,
                            data: { id: virtualCatalogId },
                            context: this,
                            error: CommerceUtilities.IsAuthenticated,
                            success: function (data) {
                                self.DefaultLanguageCombobox.set("items", data.Items);
                                self.initializeDefaultLanguageCombobox();
                            }
                        });

                        self.initializeQueryProviders();

                        var previousTab = window.location.hash;

                        if (previousTab === "") {
                            self.VirtualCatalogChildrenTabs.set("selectedTab", "{43E8760E-C4DF-4A90-BFF1-49B3B16C10B3}");
                            self.loadCategoryTab();
                        } else {
                            self.VirtualCatalogChildrenTabs.set("selectedTab", previousTab.substring(1, previousTab.length));
                        }

                        if (this.CurrencyComboBox) {
                            var currency = data.Currency;

                            $.ajax({
                                url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/GetAvailableCurrencies",
                                type: "POST",
                                headers: this.ajaxToken,
                                context: this,
                                error: CommerceUtilities.IsAuthenticated,
                                success: function (data) {
                                    this.CurrencyComboBox.set("items", data);
                                    this.CurrencyComboBox.set("selectedValue", currency);
                                }
                            });
                        }

                        //For Concurrency Saving
                        self.set("lastModified", data.LastModified);
                    }
                });

                this.set("selectedTab", this.VirtualCatalogChildrenTabs.get("selectedTab"));

                this.addSpansToTab();
                this.CategoriesDataSource.on("change:totalItemCount", this.categoriesCountChanged, this);
                this.ProductDataSource.on("change:totalItemCount", this.productCountChanged, this);
                this.RelatedCatalogDataSource.on("change:totalItemCount", this.relatedCatalogsCountChanged, this);

                $(window).on("scroll", $.proxy(self.infiniteScrollCategories, self));
                $(window).on("scroll", $.proxy(self.infiniteScrollProducts, self));
                $(window).on("scroll", $.proxy(self.infiniteScrollRelatedCatalogs, self));

                //Rules
                this.RulesSmartPanel.on("change:isOpen", this.toggleRuleSelection, this);
                this.RulesList.on("change:selectedItem", this.ruleSelected, this);

                $("li[data-tab-id=\\{1BB48D40-EA7C-4B39-A13C-FF003D6642F7\\}] > a", this.tabStrip).append("<span class='badge'></span><label style=\"display:inline\"></label>");

                // Kick-off polling for virtual catalog status
                var refreshVirtualCatalogStatusMethod = $.proxy(this.refreshVirtualCatalogStatus, this);
                setTimeout(refreshVirtualCatalogStatusMethod, 3000);

            } else { // Create 
                this.VirtualCatalogChildrenTabs.set("selectedTab", "{AA3208F5-FE49-4F2C-996B-1EAC70A00060}");
                self.HeaderTitle.set("text", self.ItemTypeDictionary.get("Create Custom Catalog"));
                self.TitleControl.set("text", self.ItemTypeDictionary.get("Create Custom Catalog"));

                this.wireUpCreateLanguage();

                this.Language.set("isVisible", false);

                var purgeDeletedItemsAction = this.DetailActionControl.getAction("Purge Deleted Items");
                if (purgeDeletedItemsAction && typeof purgeDeletedItemsAction != "undefined") {
                    purgeDeletedItemsAction.isVisible(false);
                }

                this.set("templateId", CommerceUtilities.loadPageVar("template"));
                this.set("parentId", CommerceUtilities.loadPageVar("parent"));

                $("li[data-tab-id=\\{43E8760E-C4DF-4A90-BFF1-49B3B16C10B3\\}]", this.tabStrip).hide();
                $("li[data-tab-id=\\{26C2FD83-6A60-4EBE-AFC1-3744D2244B08\\}]", this.tabStrip).hide();
                $("li[data-tab-id=\\{2BB9BD95-1AC0-45A4-81E4-1F2F5DB0D82F\\}]", this.tabStrip).hide();
                $("li[data-tab-id=\\{1BB48D40-EA7C-4B39-A13C-FF003D6642F7\\}]", this.tabStrip).hide();

                if (this.CurrencyComboBox) {
                    $.ajax({
                        url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/GetAvailableCurrencies",
                        type: "POST",
                        headers: this.ajaxToken,
                        context: this,
                        error: CommerceUtilities.IsAuthenticated,
                        success: function (data) {
                            data.unshift({ itemId: "" });
                            this.CurrencyComboBox.set("items", data);
                        }
                    });
                }
            }

            // Setup event handler for the select media event of media field 
            var selectMediaEventHandler = $.proxy(this.showMediaDialog, this);
            this.on("selectMediaEvent", selectMediaEventHandler, this);

            // Setup event handler for select media accept changes
            this.listenTo(_sc, 'sc-frame-message', this.mediaItemSelected);

            // Set list view mode
            var userListViewPreference = this.listViewMode;

            if (!userListViewPreference) {
                userListViewPreference = "DetailList";
            }

            this.setListViewMode(userListViewPreference);

            // Set up tile list sorting
            this.CategoryTileSortComboBox.on("change:selectedItem", function () {
                var selectedItem = self.CategoryTileSortComboBox.get("selectedItem");
                self.CategoriesDataSource.set("sorting", selectedItem.DataField);
            });

            this.ProductTileSortComboBox.on("change:selectedItem", function () {
                var selectedItem = self.ProductTileSortComboBox.get("selectedItem");
                self.ProductDataSource.set("sorting", selectedItem.DataField);
            });

            this.RelatedCatalogTileSortComboBox.on("change:selectedItem", function () {
                var selectedItem = self.RelatedCatalogTileSortComboBox.get("selectedItem");
                self.RelatedCatalogDataSource.set("sorting", selectedItem.DataField);
            });
        },

        disableLanguageIfRequired: function () {
            var control = $("select[data-sc-id='DefaultLanguageCombobox']");
            var parent = control.parent();
            var att = parent.attr("data-sc-enablechild");
            if (att != "True") {
                this.DefaultLanguageCombobox.set("isEnabled", false);
            }
        },

        hideDeleteAlert: function () {
            this.DeleteAlert.hide();
        },

        disableIfAX: function () {
            $(".cs-basefields :input").prop("disabled", true);
            this.CategoriesActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.DetailActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.RulesActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.RelatedCatalogsActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.ProductsActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");

            // Other controls
            this.DefaultLanguageCombobox.set("isEnabled", false);
            $(".sc-CommerceDateTime :input").prop("disabled", true);
        },

        ruleChange: function () {
            // If it's a pricing rule that doesn't need an amount, hide it. 
            if (this.PricingRuleCombo.get("selectedValue") == "NoPriceChange") {
                this.AmountTextBox.set("isVisible", false);
                this.AmountLabel.set("isVisible", false);
                this.AmountTextBox.set("text", null);
            } else {
                this.AmountTextBox.set("isVisible", true);
                this.AmountLabel.set("isVisible", true);
            }
        },

        showMediaDialog: function (mediaField) {
            this.currentEditedMediaField = mediaField;
            this.SelectMediaDialog.show();
        },

        updateContextMenuAxis: function () {
            this.RulesContextMenu.set("axis", (clientX - 163).toString() + "px");
            this.RulesContextMenu.toggle();
        },

        mediaItemSelected: function (selectedMediaItemId) {

            if (selectedMediaItemId && this.currentEditedMediaField) {
                var mediaField = this.currentEditedMediaField;
                mediaField.model.set("mediaItemId", selectedMediaItemId);
            }

            this.setPageIsDirty(true);
            this.SelectMediaDialog.hide();
            this.currentEditedMediaField = null;
        },

        changePendingRuleVisibility: function () {
            var items = this.PendingRules.get("items");
            this.PendingRulesExpander.set("isVisible", items.length > 0);
        },

        resetPrice: function () {
            var self = this;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCustomCatalog/ResetPrice",
                type: "POST",
                headers: this.ajaxToken,
                data: {
                    id: self.get("targetId")
                },
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    // Do something after price is reset, maybe set it to the new price on the screen
                }
            });
        },

        setLanguage: function () {
            this.determineLanguageToSet();
            var l = this.get("currentLanguage");
            this.Language.set("selectedValue", l);
            this.Language.on("change:selectedItemId", this.selectedLanguageChange, this);
        },

        selectedLanguageChange: function () {
            var currentPath = this.updateQueryStringParameter(window.location.href, "lang", this.Language.get("selectedValue"));
            try {
                window.location.href = currentPath;
            } catch (e) {
                // stay on page
            }
        },

        getCorrectPricingRule: function (amount, rule) {
            if (rule == "AddFixedAmount" && amount < 0) {
                return "Discount";
            } else if (rule == "PercentageMultiplier" && amount < 0) {
                return "Discount Percentage";
            }

            return rule;
        },

        ruleSelected: function () {
            var item = this.RulesList.get("selectedItem");

            if (item !== "") {
                var pricingRuleType = item.get("PricingRule");
                var title = " Configuration";
                if (pricingRuleType) {
                    this.RulesActionControl.getAction("Edit Rules").isEnabled(true);
                    title = item.get("PricingRule") + title;
                    this.RulesSmartPanelTitle.set("text", title);

                    this.BaseCatalogText.set("text", item.get("BaseCatalog"));
                    this.SelectItemText.set("text", item.get("ItemCategory"));
                    this.VariantIdText.set("text", item.get("VariantID"));

                    if (item.get("VariantID") !== "") {
                        this.VariantIdLabel.set("isVisible", true);
                    } else {
                        this.VariantIdLabel.set("isVisible", false);
                    }

                    if (item.get("ProgrammaticRuleType") == "Pricing") {
                        this.PricingRuleTypeLabel.set("isVisible", true);
                        this.PricingRuleCombo.set("isVisible", true);
                        this.AmountLabel.set("isVisible", true);
                        this.AmountTextBox.set("isVisible", true);
                        var correctPricingRule = this.getCorrectPricingRule(item.get("Amount"), item.get("ProgrammaticPricingRule"));

                        this.PricingRuleCombo.set("selectedValue", correctPricingRule);

                        if (correctPricingRule == "Discount" || correctPricingRule == "Discount Percentage") {
                            this.AmountTextBox.set("text", Math.abs(item.get("Amount")));
                        } else {
                            this.AmountTextBox.set("text", item.get("Amount"));
                        }
                    }
                } else {
                    this.RulesSmartPanel.set("isOpen", false);
                    this.RulesActionControl.getAction("Edit Rules").isEnabled(false);
                }

                // Enable Delete 
                this.RulesActionControl.getAction("Delete").isEnabled(true);
            } else {
                this.RulesSmartPanel.set("isOpen", false);
                this.RulesActionControl.getAction("Edit Rules").isEnabled(false);
                this.RulesActionControl.getAction("Save").isEnabled(true);
            }
        },

        cancelSmartPanel: function () {
            this.pendingRules = [];
            this.editRule = false;
            this.RulesSmartPanel.set("isOpen", false);
        },

        toggleRuleSelection: function () {
            if (!this.RulesSmartPanel.get("isOpen")) {
                this.RulesList.viewModel.$el.find(".active").trigger("click");
            }
        },

        toggleRulePanel: function () {
            var rulesPanelOpen = this.RulesSmartPanel.get("isOpen") === null ? false : this.RulesSmartPanel.get("isOpen");
            this.RulesSmartPanel.set("isOpen", !rulesPanelOpen);
            this.editRule = !this.editRule;
        },

        deleteRule: function () {
            var items = this.RulesList.get("items");

            var selectedItems = items.filter($.proxy(this.compareByItemId, this));
            var item = selectedItems[0];
            item.PendingOperation = "Remove";

            var filteredItems = items.filter($.proxy(this.compareRules, this));
            this.RulesList.set("items", filteredItems);

            this.rulesToAdd.push(item);
            this.rulesToAdd = this.rulesToAdd;

            this.PendingRules.set("items", "");
            this.PendingRules.set("items", this.rulesToAdd);

            this.setPageIsDirty(true);
        },

        compareRules: function (item) {
            var observableItem = this.RulesList.get("selectedItem").viewModel;

            if (observableItem.BaseCatalog._latestValue != item.BaseCatalog ||
                    observableItem.ItemCategory._latestValue != item.ItemCategory ||
                    observableItem.RuleType._latestValue != item.RuleType ||
                    observableItem.VariantID._latestValue != item.VariantID ||
                    observableItem.Amount._latestValue != item.Amount ||
                    observableItem.PricingRule._latestValue != item.PricingRule) {
                return true;
            }
        },

        initializeDefaultLanguageCombobox: function () {
            var catalogLanguages = this.DefaultLanguageCombobox.get("items");
            var defaultLanguageItem = null;

            if (catalogLanguages && catalogLanguages.length > 0) {
                for (i = 0; i < catalogLanguages.length; i++) {
                    if (catalogLanguages[i].language == this.defaultCatalogLanguage) {
                        defaultLanguageItem = catalogLanguages[i];
                        break;
                    }
                }

                if (defaultLanguageItem) {
                    if (this.DefaultLanguageCombobox) {
                        this.DefaultLanguageCombobox.set("selectedItem", defaultLanguageItem);
                    } else {
                        this.DefaultLanguageValueLabel.set("text", defaultLanguageItem.displayName)
                    }
                }
            }
        },

        infiniteScrollCategories: function () {
            var isBusy = this.CategoriesDataSource.get("isBusy");
            var hasMoreItems = this.CategoriesDataSource.get("hasMoreItems");

            if (this.isCategoryTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.CategoriesDataSource.next();
                }
            }
        },

        infiniteScrollProducts: function () {
            var isBusy = this.ProductDataSource.get("isBusy");
            var hasMoreItems = this.ProductDataSource.get("hasMoreItems");

            if (this.isProductTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.ProductDataSource.next();
                }
            }
        },

        infiniteScrollRelatedCatalogs: function () {
            var isBusy = this.RelatedCatalogDataSource.get("isBusy");
            var hasMoreItems = this.RelatedCatalogDataSource.get("hasMoreItems");

            if (this.isRelatedTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.RelatedCatalogDataSource.next();
                }
            }
        },

        isProductTabSelected: function () {
            return this.VirtualCatalogChildrenTabs.get("selectedTab") == "{26C2FD83-6A60-4EBE-AFC1-3744D2244B08}";
        },

        isCategoryTabSelected: function () {
            return this.VirtualCatalogChildrenTabs.get("selectedTab") == "{43E8760E-C4DF-4A90-BFF1-49B3B16C10B3}";
        },

        isRelatedTabSelected: function () {
            return this.VirtualCatalogChildrenTabs.get("selectedTab") == "{2BB9BD95-1AC0-45A4-81E4-1F2F5DB0D82F}";
        },

        selectedTabChanged: function () {
            this.set("selectedTab", this.VirtualCatalogChildrenTabs.get("selectedTab"));
            this.hideErrorMessage();

            if (this.get("selectedTab") == "{43E8760E-C4DF-4A90-BFF1-49B3B16C10B3}") { // Categories
                this.loadCategoryTab();
            }
            else if (this.get("selectedTab") == "{26C2FD83-6A60-4EBE-AFC1-3744D2244B08}") { // Products
                this.loadProductTab();
            }
            else if (this.get("selectedTab") == "{AA3208F5-FE49-4F2C-996B-1EAC70A00060}") { // Details
                this.loadDetailTab();
            }
            else if (this.get("selectedTab") == "{1BB48D40-EA7C-4B39-A13C-FF003D6642F7}") { // Rules
                this.loadRulesTab();
            }
            else if (this.get("selectedTab") == "{02FB0684-2A03-4055-9837-331950091802}") { // Languages
                this.loadLanguagesTab();
            }
            else if (this.get("selectedTab") == "{2BB9BD95-1AC0-45A4-81E4-1F2F5DB0D82F}") { // Related Catalogs
                this.loadRelatedCatalogsTab();
            }
        },

        loadDetailTab: function () {
            this.CategoriesList.set("isVisible", false);
            this.ProductList.set("isVisible", false);

            this.RelatedCatalogs.set("isVisible", false);

            this.detailsVisible();

            // Actions Controls
            this.RelatedCatalogsActionControl.set("isVisible", false);
            this.ProductsActionControl.set("isVisible", false);
            this.CategoriesActionControl.set("isVisible", false);
            this.DetailActionControl.set("isVisible", true);
            this.RulesActionControl.set("isVisible", false);

            // Facets
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", false);

            window.location.hash = '#{AA3208F5-FE49-4F2C-996B-1EAC70A00060}';

            this.CategoryTileSortComboBox.set("isVisible", false);
            this.ProductTileSortComboBox.set("isVisible", false);
            this.RelatedCatalogTileSortComboBox.set("isVisible", false);

            this.DetailListIconButton.set("isVisible", false);
            this.TileListIconButton.set("isVisible", false);
            this.Language.set("isVisible", true);
        },

        loadCategoryTab: function () {
            this.CategoriesList.set("isVisible", true);
            this.ProductList.set("isVisible", false);
            this.RelatedCatalogs.set("isVisible", false);
            this.detailsInVisible();

            // Actions Controls
            this.RelatedCatalogsActionControl.set("isVisible", false);
            this.ProductsActionControl.set("isVisible", false);
            this.CategoriesActionControl.set("isVisible", true);
            this.DetailActionControl.set("isVisible", false);
            this.RulesActionControl.set("isVisible", false);
            if (!this.isAXEnabled) {
                this.CategoriesActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.CategoriesList));
            }
            // Facets
            this.CategoryFacets.set("isVisible", true);
            this.ProductFacets.set("isVisible", false);

            window.location.hash = '#{43E8760E-C4DF-4A90-BFF1-49B3B16C10B3}';

            if (this.listViewMode == "TileList") {
                this.CategoryTileSortComboBox.set("isVisible", true);
                this.ProductTileSortComboBox.set("isVisible", false);
                this.RelatedCatalogTileSortComboBox.set("isVisible", false);
            }

            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);
            this.Language.set("isVisible", true);
        },

        loadProductTab: function () {
            this.CategoriesList.set("isVisible", false);
            this.ProductList.set("isVisible", true);
            this.RelatedCatalogs.set("isVisible", false);
            this.detailsInVisible();

            // Actions Controls
            this.RelatedCatalogsActionControl.set("isVisible", false);
            this.ProductsActionControl.set("isVisible", true);
            this.CategoriesActionControl.set("isVisible", false);
            this.DetailActionControl.set("isVisible", false);
            this.RulesActionControl.set("isVisible", false);
            if (!this.isAXEnabled) {
                this.ProductsActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.ProductList));
            }
            // Facets
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", true);

            window.location.hash = '#{26C2FD83-6A60-4EBE-AFC1-3744D2244B08}';

            if (this.listViewMode == "TileList") {
                this.CategoryTileSortComboBox.set("isVisible", false);
                this.ProductTileSortComboBox.set("isVisible", true);
                this.RelatedCatalogTileSortComboBox.set("isVisible", false);
            }

            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);
            this.Language.set("isVisible", true);
        },

        loadRulesTab: function () {
            this.CategoriesList.set("isVisible", false);
            this.ProductList.set("isVisible", false);
            this.RelatedCatalogs.set("isVisible", false);
            this.detailsInVisible();

            // Actions Controls
            this.RelatedCatalogsActionControl.set("isVisible", false);
            this.ProductsActionControl.set("isVisible", false);
            this.CategoriesActionControl.set("isVisible", false);
            this.DetailActionControl.set("isVisible", false);
            this.RulesActionControl.set("isVisible", true);

            if (this.RulesList.get("view") == "TileView") {
                this.RulesList.viewModel.$el.attr('style', 'margin-bottom:' + (-(this.RulesList.viewModel.$el.height() + 98)) + 'px');
            } else {
                this.RulesList.viewModel.$el.attr('style', 'margin-bottom:' + (-(this.RulesList.viewModel.$el.height() + 52)) + 'px');
            }
            // Set Delete enabled

            // Facets
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", false);

            window.location.hash = '#{1BB48D40-EA7C-4B39-A13C-FF003D6642F7}';

            this.CategoryTileSortComboBox.set("isVisible", false);
            this.ProductTileSortComboBox.set("isVisible", false);
            this.RelatedCatalogTileSortComboBox.set("isVisible", false);

            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);
            this.Language.set("isVisible", false);
        },

        loadRelatedCatalogsTab: function () {
            this.CategoriesList.set("isVisible", false);
            this.ProductList.set("isVisible", false);
            this.detailsInVisible();

            this.RelatedCatalogs.set("isVisible", true);

            // Actions Controls
            this.RelatedCatalogsActionControl.set("isVisible", true);
            this.ProductsActionControl.set("isVisible", false);
            this.CategoriesActionControl.set("isVisible", false);
            this.DetailActionControl.set("isVisible", false);
            this.RulesActionControl.set("isVisible", false);

            // Facets
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", false);

            window.location.hash = '#{2BB9BD95-1AC0-45A4-81E4-1F2F5DB0D82F}';

            if (this.listViewMode == "TileList") {
                this.CategoryTileSortComboBox.set("isVisible", false);
                this.ProductTileSortComboBox.set("isVisible", false);
                this.RelatedCatalogTileSortComboBox.set("isVisible", true);
            }

            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);
            this.Language.set("isVisible", true);
        },

        detailsVisible: function () {
            this.ReadOnlyDefaultFields.set("isVisible", true);
            this.CommerceFieldExpander.set("isVisible", true);
        },

        detailsInVisible: function () {
            this.ReadOnlyDefaultFields.set("isVisible", false);
            this.CommerceFieldExpander.set("isVisible", false);
        },

        initializeQueryProviders: function () {

            var virtualCatalogId = this.get("targetId");

            this.ProductDataSource.set("commerceItemId", virtualCatalogId);
            this.ProductDataSource.set("isReady", true);
            this.ProductDataSource.refresh();

            this.CategoriesDataSource.set("commerceItemId", virtualCatalogId);
            this.CategoriesDataSource.set("isReady", true);
            this.CategoriesDataSource.refresh();

            this.LanguagesDataSource.setCompletedQueryCallback($.proxy(this.initializeDefaultLanguageCombobox, this));
            this.LanguagesDataSource.set("commerceItemId", virtualCatalogId);
            this.LanguagesDataSource.set("isReady", true);
            this.LanguagesDataSource.refresh();

            this.RelatedCatalogDataSource.set("commerceItemId", virtualCatalogId);
            this.RelatedCatalogDataSource.set("isReady", true);
            this.RelatedCatalogDataSource.refresh();
        },

        addSpansToTab: function () {
            $("li[data-tab-id=\\{43E8760E-C4DF-4A90-BFF1-49B3B16C10B3\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{26C2FD83-6A60-4EBE-AFC1-3744D2244B08\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{2BB9BD95-1AC0-45A4-81E4-1F2F5DB0D82F\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{AA3208F5-FE49-4F2C-996B-1EAC70A00060\\}] > a", this.tabStrip).append("<label style=\"display:inline\"></label>");
        },

        categoriesCountChanged: function () {
            var count = this.CategoriesDataSource.get("totalItemCount") > 99 ? "99+" : this.CategoriesDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{43E8760E-C4DF-4A90-BFF1-49B3B16C10B3\\}] > a > span", this.tabStrip).html(count);
        },

        productCountChanged: function () {
            var count = this.ProductDataSource.get("totalItemCount") > 99 ? "99+" : this.ProductDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{26C2FD83-6A60-4EBE-AFC1-3744D2244B08\\}] > a > span", this.tabStrip).html(count);
        },

        relatedCatalogsCountChanged: function () {
            var count = this.RelatedCatalogDataSource.get("totalItemCount") > 99 ? "99+" : this.RelatedCatalogDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{2BB9BD95-1AC0-45A4-81E4-1F2F5DB0D82F\\}] > a > span", this.tabStrip).html(count);
        },

        toggleFilterPanel: function () {
            var filterPanelOpen = this.FilterPanel.get("isOpen") === null ? false : this.FilterPanel.get("isOpen");
            this.FilterPanel.set("isOpen", !filterPanelOpen);
        },

        onSelectedCategoriesChanged: function () {
            this.hideErrorMessage();
            if (!this.isAXEnabled) {
                this.CategoriesActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.CategoriesList));
            }
            this.CategoriesActionControl.getAction("AddToWorkspace").isEnabled(this.isAnItemSelected(this.CategoriesList));
        },

        onSelectedProductsChanged: function () {
            this.hideErrorMessage();
            if (!this.isAXEnabled) {
                this.ProductsActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.ProductList));
            }
            this.ProductsActionControl.getAction("AddToWorkspace").isEnabled(this.isAnItemSelected(this.ProductList));
        },

        saveCatalog: function () {
            var id = this.get("targetId");
            if (id && id !== "") {
                this.updateCatalog();
            }
            else {
                this.createCatalog();
            }
        },

        getEditedRules: function (item) {
            if (item.Edited) {
                return true;
            }

            return false;
        },

        updateCatalog: function () {
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.updateSaveButton(false);
                this.updateTabIndicator();
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();
            var d = this.Details.get("editFunctionBody");
            var baseFields = this.CustomCatalogBaseFields.get("editFunctionBody");
            var currentLanguage = this.get("currentLanguage");

            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, d);
            this.addRendererFieldsToObject(dataObject, baseFields);

            // Save the selected catalog languages
            var catalogLanguages = this.languageSelections;
            if (catalogLanguages && catalogLanguages.length > 0) {
                dataObject.languages = CommerceUtilities.createDelimitedListFromArray(catalogLanguages);
            }

            // Add default language
            dataObject.DefaultLanguage = this.DefaultLanguageCombobox.get("selectedItemId");
            dataObject.currentLanguage = currentLanguage;
            dataObject.itemId = this.get("targetId");

            if (this.CurrencyComboBox) {
                dataObject.Currency = this.CurrencyComboBox.get("selectedValue");
            }

            //For Concurrency Saving
            dataObject.lastModified = this.get("lastModified");
            dataObject.overrideChanges = this.get("overrideChanges");

            // Update rules.  
            var ruleString = "";
            for (i = 0; i < this.rulesToAdd.length; i++) {
                if (ruleString) {
                    ruleString += "|";
                }
                ruleString += ko.toJSON(this.rulesToAdd[i]);
            }

            dataObject.rulesToAddAndDelete = ruleString;

            var items = this.RulesList.get("items");
            var editedRules = items.filter($.proxy(this.getEditedRules, this));

            ruleString = "";
            for (i = 0; i < editedRules.length; i++) {
                if (ruleString) {
                    ruleString += "|";
                }
                ruleString += ko.toJSON(editedRules[i]);
            }

            dataObject.rulesToEdit = ruleString;
            var needsRebuild = dataObject.rulesToAddAndDelete.length > 0 || dataObject.rulesToEdit.length > 0;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCustomCatalog/Update",
                type: "POST",
                headers: this.ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();
                        var self = this;
                        this.updateSaveButton(false);

                        //For Concurrency Saving
                        this.set("overrideChanges", false);

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
                    } else if (data.Status == "priorUpdate") {
                        this.hideInProgressMessage();
                        //For Concurrency Saving
                        this.ConcurrencyAlert.show();
                    } else {
                        this.hideInProgressMessage(true);
                        var self = this;
                        this.setPageIsDirty(false);

                        //For Concurrency Saving
                        this.set("overrideChanges", false);
                        this.resetLists();
                        if (data.Status.indexOf("success") === 0) {
                            this.set("lastModified", data.Status.split('|')[1]);
                        }

                        if (needsRebuild) {
                            this.RebuildNeededDialog.show();
                        }

                        setTimeout(function () {
                            self.initializeQueryProviders();
                        }, 2000);
                    }
                }
            });
        },

        resetLists: function () {
            this.rulesToAdd = [];
            this.PendingRulesExpander.set("isVisible", false);
            this.CustomCatalogRuleProvider.getRules();
        },

        //For Concurrency Saving
        cancelChanges: function () {
            window.location.reload();
            this.ConcurrencyAlert.hide();
        },

        //For Concurrency Saving
        overridePreviousChanges: function () {
            this.set("overrideChanges", true);
            this.updateCatalog();
            this.ConcurrencyAlert.hide();
        },

        createCatalog: function () {
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.updateSaveButton(false);
                this.updateTabIndicator();
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();
            var d = this.Details.get("editFunctionBody");
            var baseFields = this.CustomCatalogBaseFields.get("editFunctionBody");

            var currentLanguage = this.get("currentLanguage");

            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, d);
            this.addRendererFieldsToObject(dataObject, baseFields);

            // Custom validation of CatalogName
            if (!this.isNameValid(dataObject.CatalogName)) {
                return;
            }

            // Add default language
            dataObject.defaultLanguageOnCreate = this.DefaultLanguageCombobox.get("selectedItemId");
            dataObject.currentLanguage = currentLanguage;
            // Save the selected catalog languages
            var catalogLanguages = this.languageSelections;
            if (catalogLanguages && catalogLanguages.length > 0) {
                dataObject.languages = CommerceUtilities.createDelimitedListFromArray(catalogLanguages);
            }

            if (this.CurrencyComboBox) {
                dataObject.Currency = this.CurrencyComboBox.get("selectedValue");
            }

            var self = this;
            dataObject.templateId = this.get("templateId");
            dataObject.parentId = this.get("parentId");
            dataObject.name = this.CatalogName.get("text") !== null ? this.CatalogName.get("text").trim() : "";

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCustomCatalog/Create",
                type: "POST",
                headers: this.ajaxToken,
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
                        $(".sc-validation").change(function () {
                            self.updateValidationError($(this));
                        });
                        $(".sc-validation.sc-datepicker").click(function () {
                            self.updateValidationError($(this));
                        });
                    } else {
                        this.hideInProgressMessageCreate(true, "Custom Catalog Created");
                        this.setPageIsDirty(false);
                        this.set("newTargetId", data);
                        setTimeout($.proxy(this.redirectToSavedCatalog, this), 10000);
                    }
                }
            });
        },

        redirectToCreateNewCategory: function () {
            var selectedItem = this.CategoryTemplateSubApp.CategoryTemplates.get("selectedItemId");
            if (selectedItem) {
                window.location.assign('/sitecore/client/Applications/MerchandisingManager/Category?create=true&template=' + selectedItem + '&parent=' + this.get("targetId"));
            }
        },

        redirectToSavedCatalog: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/CustomCatalog?target=' + this.get("newTargetId") + '#{AA3208F5-FE49-4F2C-996B-1EAC70A00060}');
        },

        deleteSelectedItems: function () {
            if (this.isCategoryTabSelected()) {
                this.deleteSelectedCategories();
            } else if (this.isProductTabSelected()) {
                this.deleteSelectedProducts();
            }
        },

        deleteSelectedCategories: function () {
            var selectedCategories = this.CategoriesList.get("checkedItemIds");
            if (selectedCategories && selectedCategories.length > 0) {
                var categoriesDelimitedList = "";
                for (i = 0; i < selectedCategories.length; i++) {
                    var category = selectedCategories[i];
                    if (i > 0) {
                        categoriesDelimitedList += "|";
                    }

                    categoriesDelimitedList += category;
                }

                if (categoriesDelimitedList) {
                    this.deleteRequestedCatalogItems(categoriesDelimitedList, this.CategoriesDataSource);
                }
            }
        },

        deleteSelectedProducts: function () {
            var selectedProducts = this.ProductList.get("checkedItemIds");
            if (selectedProducts && selectedProducts.length > 0) {
                var productsDelimitedList = "";
                for (i = 0; i < selectedProducts.length; i++) {
                    var product = selectedProducts[i];
                    if (i > 0) {
                        productsDelimitedList += "|";
                    }

                    productsDelimitedList += product;
                }

                if (productsDelimitedList) {
                    this.deleteRequestedCatalogItems(productsDelimitedList, this.ProductDataSource);
                }
            }
        },

        deleteRequestedCatalogItems: function (itemsList, dataSource) {

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCustomCatalog/Delete",
                type: "POST",
                headers: this.ajaxToken,
                data: {
                    itemsToDelete: itemsList
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
                    }, 2000);
                }
            });
        },

        purgeDeletedItems: function () {

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCustomCatalog/PurgeDeletedItems",
                type: "POST",
                headers: this.ajaxToken,
                data: {
                    catalogName: this.catalogName
                },
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    this.PurgeItemsAlert.hide();

                    this.HeaderActionsMessageBar.addMessage("notification", data.Message);
                    this.HeaderActionsMessageBar.set("isVisible", true);
                    setTimeout($.proxy(this.hideHeaderActionsMessage, this), 3000);
                }
            });
        },

        hideErrorMessage: function () {
            this.ErrorsMessageBar.removeMessages();
            this.ErrorsMessageBar.set("isVisible", false);
        },

        updateValidationError: function (obj) {
            obj.removeClass("sc-validation");
            if ($(".sc-validation").length === 0) {
                this.updateSaveButton(true);
                this.updateTabIndicator();
                this.hideErrorMessage();
            }
        },

        updateTabIndicator: function () {
            var tabDetailsStatusElement = $("li[data-tab-id=\\{AA3208F5-FE49-4F2C-996B-1EAC70A00060\\}] > a > label", this.tabStrip);
            if ($(".sc-validation").length > 0) {
                tabDetailsStatusElement.html("<div class='warning16'>");
            } else {
                tabDetailsStatusElement.html("");
            }
        },

        closingLanguagePicker: function () {
            this.LanguagePicker.hide();

            // User is dismissing changes so restore previous selections
            var checkedLanguages = this.SelectLanguagesSubApp.SelectLanguagesList.get("checkedItemIds");
            this.SelectLanguagesSubApp.SelectLanguagesList.viewModel.uncheckItems(checkedLanguages);
            this.SelectLanguagesSubApp.SelectLanguagesList.viewModel.checkItems(this.languageSelections);
        },

        savingLanguagePicker: function () {
            this.LanguagePicker.hide();

            // User is accepting changes so update current language selections
            this.languageSelections = this.SelectLanguagesSubApp.SelectLanguagesList.get("checkedItemIds");
            this.updateDefaultLanguages();
            this.setPageIsDirty(true);
        },

        updateDefaultLanguages: function () {
            if (this.DefaultLanguageCombobox) {
                var currentDefaultLanguageId = this.DefaultLanguageCombobox.get("selectedItemId");

                // Can't use languages loaded in language picker list because it may be filtered.
                // Alternatively, we could store a client-side list of all languages.
                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/GetLanguagesByLcids",
                    type: "POST",
                    headers: this.ajaxToken,
                    contentType: 'application/json',
                    data: JSON.stringify({ lcids: this.languageSelections }),
                    context: this,
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        this.DefaultLanguageCombobox.set("items", data.Items);
                        var defaultLanguageItem = null;
                        if (currentDefaultLanguageId && this.DefaultLanguageCombobox.get("items")) {
                            for (var i = 0; i < this.DefaultLanguageCombobox.get("items").length; i++) {
                                if (this.DefaultLanguageCombobox.get("items")[i].language == currentDefaultLanguageId) {
                                    defaultLanguageItem = this.DefaultLanguageCombobox.get("items")[i];
                                    break;
                                }
                            }

                            if (defaultLanguageItem) {
                                this.DefaultLanguageCombobox.set("selectedItem", defaultLanguageItem);
                            }
                        }
                    }
                });
            }
        },

        updateSaveButton: function (status) {
            if (this.CategoriesActionControl) {
                this.CategoriesActionControl.getAction("Save").isEnabled(status);
            }
            this.DetailActionControl.getAction("Save").isEnabled(status);
            if (this.ProductsActionControl) {
                this.ProductsActionControl.getAction("Save").isEnabled(status);
            }
            if (this.RulesActionControl) {
                this.RulesActionControl.getAction("Save").isEnabled(status);
            }
            if (this.RelatedCatalogsActionControl) {
                this.RelatedCatalogsActionControl.getAction("Save").isEnabled(status);
            }
        },

        // Rule creating and editing
        buildRulesFromSelectedItems: function () {
            var baseCatalogName = "";
            var itemCategoryName = "";
            var variantID = "";

            for (var i = 0; i < this.pickedItems.length; i++) {
                var pickedItem = this.pickedItems[i];

                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceSearch/GetItem",
                    type: "POST",
                    headers: this.ajaxToken,
                    context: this,
                    data: {
                        id: pickedItem.itemId,
                        language: this.get("currentLanguage")
                    },
                    async: false,
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        var newRule = {};

                        if (baseCatalogName.indexOf(data.CatalogDisplayName) == -1) {
                            if (baseCatalogName !== "") {
                                baseCatalogName += ";";
                            }

                            baseCatalogName += data.CatalogDisplayName;
                        }

                        if (!data.IsCatalog && itemCategoryName.indexOf(data.DisplayName) == -1) {
                            if (itemCategoryName !== "") {
                                itemCategoryName += ";";
                            }

                            itemCategoryName += data.DisplayName;
                        }

                        if (data.IsVariant && variantID.indexOf(data.Name) == -1) {
                            if (variantID !== "") {
                                variantID += ";";
                            }

                            variantID += data.Name;
                        }

                        newRule.PendingOperation = "Add";
                        newRule.BaseCatalog = data.CatalogName;
                        newRule.BaseCatalogDisplayName = data.CatalogDisplayName;

                        if (!data.IsCatalog) {
                            newRule.ItemCategoryDisplayName = data.DisplayName;
                            newRule.ItemCategory = data.Name;
                        }

                        if (data.IsProduct || data.IsVariant) {
                            newRule.ProgrammaticProductId = data.Name;
                        } else if (data.IsCategory) {
                            newRule.ProgrammaticCategory = data.Name;
                        }

                        if (data.IsVariant) {
                            newRule.VariantID = data.Name;
                        }

                        newRule.RuleType = "";
                        newRule.PricingRule = "";
                        newRule.Amount = "";

                        this.pendingRules.push(newRule);
                    }
                });
            }

            var displayData = {};
            displayData.baseCatalogName = baseCatalogName;
            displayData.itemCategoryName = itemCategoryName;
            displayData.variantID = variantID;

            return displayData;
        },

        setCatalogNameAndVariant: function (baseCatalog, itemCategoryName, variantId) {
            this.BaseCatalogText.set("text", baseCatalog);
            this.SelectItemText.set("text", itemCategoryName); // This needs to be the names of all the items.
            this.VariantIdText.set("text", variantId);

            if (variantId === "") {
                this.VariantIdLabel.set("isVisible", false);
                this.VariantIdText.set("isVisible", false);
            } else {
                this.VariantIdLabel.set("isVisible", true);
                this.VariantIdText.set("isVisible", true);
            }
        },

        setupPicker: function () {
            this.itemPickerCatalogFilter = null;

            // The catalogs displayed to the user for custom catalog rules must follow
            // specific business rules, so a different method is required.
            this.PickerPageSubApp.PickCatalogsDataSource.set("dataUrl", "/sitecore/shell/commerce/merchandising/commercesearch/GetEligibleCatalogsForCustomCatalog");
            var currentCatalogId = this.get("targetId");
            this.PickerPageSubApp.PickCatalogsDataSource.set("commerceItemId", currentCatalogId);

            this.setAllTabsPickerMode();
            // Clean up the price fields
            this.AmountTextBox.set("text", null);
            this.ItemPicker.show();
            this.PickerPageSubApp.PickerSearchBox.viewModel.$el.focus();
        },

        addExclusionRule: function () {
            this.RulesContextMenu.toggle();
            this.currentAction = "addExclusionRule";
            this.setupPicker();
        },

        addExclusionRuleItemSelected: function () {
            this.currentAction = "addExclusionRuleItemSelected";
            this.RulesSmartPanel.set("isOpen", true);
        },

        addExclusionRuleSmartPanel: function () {
            this.RulesSmartPanelTitle.set("text", this.CustomCatalogRules.get("Exclusion"));
            var displaydata = this.buildRulesFromSelectedItems();

            var baseCatalogName = displaydata.baseCatalogName;
            var itemCategoryName = displaydata.itemCategoryName;
            var variantID = displaydata.variantID;

            this.setCatalogNameAndVariant(baseCatalogName, itemCategoryName, variantID);

            // Pricing rule type
            this.PricingRuleTypeLabel.set("isVisible", false);
            this.PricingRuleCombo.set("isVisible", false);

            // amount
            this.AmountLabel.set("isVisible", false);
            this.AmountTextBox.set("isVisible", false);

            this.RulesSmartPanel.set("isOpen", true);
        },

        addInclusionRule: function () {
            this.currentAction = "addInclusionRule";
            this.RulesContextMenu.toggle();
            this.setupPicker();
        },

        addInclusionRuleItemSelected: function () {
            this.currentAction = "addInclusionRuleItemSelected";
            this.RulesSmartPanel.set("isOpen", true);
        },

        addInclusionRuleSmartPanel: function () {
            this.RulesSmartPanelTitle.set("text", this.CustomCatalogRules.get("Inclusion"));
            var displaydata = this.buildRulesFromSelectedItems();

            var baseCatalogName = displaydata.baseCatalogName;
            var itemCategoryName = displaydata.itemCategoryName;
            var variantID = displaydata.variantID;

            this.setCatalogNameAndVariant(baseCatalogName, itemCategoryName, variantID);

            if (variantID === "") {
                this.VariantIdLabel.set("isVisible", false);
                this.VariantIdText.set("isVisible", false);
            }

            // Pricing rule type
            this.PricingRuleTypeLabel.set("isVisible", false);
            this.PricingRuleCombo.set("isVisible", false);

            // amount
            this.AmountLabel.set("isVisible", false);
            this.AmountTextBox.set("isVisible", false);

            this.RulesSmartPanel.set("isOpen", true);
        },

        addFixedAmount: function () {
            this.currentAction = "addFixedAmount";
            this.RulesContextMenu.toggle();
            this.setupPicker();
        },

        addFixedAmountItemSelected: function () {
            this.currentAction = "addFixedAmountItemSelected";
            this.RulesSmartPanel.set("isOpen", true);
        },

        addFixedAmountSmartPanel: function () {
            this.RulesSmartPanelTitle.set("text", this.CustomCatalogRules.get("AddFixedAmount"));
            var displaydata = this.buildRulesFromSelectedItems();

            var baseCatalogName = displaydata.baseCatalogName;
            var itemCategoryName = displaydata.itemCategoryName;
            var variantID = displaydata.variantID;

            this.setCatalogNameAndVariant(baseCatalogName, itemCategoryName, variantID);

            if (variantID === "") {
                this.VariantIdLabel.set("isVisible", false);
                this.VariantIdText.set("isVisible", false);
            }

            // Pricing rule type
            this.PricingRuleTypeLabel.set("isVisible", true);
            this.PricingRuleCombo.set("isVisible", true);
            this.PricingRuleCombo.set("selectedValue", "AddFixedAmount");

            // amount
            this.AmountLabel.set("isVisible", true);
            this.AmountTextBox.set("isVisible", true);

            this.RulesSmartPanel.set("isOpen", true);
        },

        addPercentage: function () {
            this.currentAction = "addPercentage";
            this.RulesContextMenu.toggle();
            this.setupPicker();
        },

        addPercentageItemSelected: function () {
            this.currentAction = "addPercentageItemSelected";
            this.RulesSmartPanel.set("isOpen", true);
        },

        addPercentageSmartPanel: function () {
            this.RulesSmartPanelTitle.set("text", this.CustomCatalogRules.get("PercentageMultiplier"));
            var displaydata = this.buildRulesFromSelectedItems();

            var baseCatalogName = displaydata.baseCatalogName;
            var itemCategoryName = displaydata.itemCategoryName;
            var variantID = displaydata.variantID;

            this.setCatalogNameAndVariant(baseCatalogName, itemCategoryName, variantID);

            if (variantID === "") {
                this.VariantIdLabel.set("isVisible", false);
                this.VariantIdText.set("isVisible", false);
            }

            // Pricing rule type
            this.PricingRuleTypeLabel.set("isVisible", true);
            this.PricingRuleCombo.set("isVisible", true);
            this.PricingRuleCombo.set("selectedValue", "PercentageMultiplier");

            // amount
            this.AmountLabel.set("isVisible", true);
            this.AmountTextBox.set("isVisible", true);

            this.RulesSmartPanel.set("isOpen", true);
        },

        addDiscount: function () {
            this.currentAction = "discount";
            this.RulesContextMenu.toggle();
            this.setupPicker();
        },

        addDiscountItemSelected: function () {
            this.currentAction = "discountItemSelected";
            this.RulesSmartPanel.set("isOpen", true);
        },

        addDiscountSmartPanel: function () {
            this.RulesSmartPanelTitle.set("text", this.CustomCatalogRules.get("Discount"));
            var displaydata = this.buildRulesFromSelectedItems();

            var baseCatalogName = displaydata.baseCatalogName;
            var itemCategoryName = displaydata.itemCategoryName;
            var variantID = displaydata.variantID;

            this.setCatalogNameAndVariant(baseCatalogName, itemCategoryName, variantID);

            if (variantID === "") {
                this.VariantIdLabel.set("isVisible", false);
                this.VariantIdText.set("isVisible", false);
            }

            // Pricing rule type
            this.PricingRuleTypeLabel.set("isVisible", true);
            this.PricingRuleCombo.set("isVisible", true);
            this.PricingRuleCombo.set("selectedValue", "Discount");

            // amount
            this.AmountLabel.set("isVisible", true);
            this.AmountTextBox.set("isVisible", true);

            this.RulesSmartPanel.set("isOpen", true);
        },

        addDiscountPercentage: function () {
            this.currentAction = "discountPercentage";
            this.RulesContextMenu.toggle();
            this.setupPicker();
        },

        addDiscountPercentageItemSelected: function () {
            this.currentAction = "discountPercentageItemSelected";
            this.RulesSmartPanel.set("isOpen", true);
        },

        addDiscountPercentageSmartPanel: function () {
            this.RulesSmartPanelTitle.set("text", this.CustomCatalogRules.get("Discount Percentage"));
            var displaydata = this.buildRulesFromSelectedItems();

            var baseCatalogName = displaydata.baseCatalogName;
            var itemCategoryName = displaydata.itemCategoryName;
            var variantID = displaydata.variantID;

            this.setCatalogNameAndVariant(baseCatalogName, itemCategoryName, variantID);

            if (variantID === "") {
                this.VariantIdLabel.set("isVisible", false);
                this.VariantIdText.set("isVisible", false);
            }

            // Pricing rule type
            this.PricingRuleTypeLabel.set("isVisible", true);
            this.PricingRuleCombo.set("isVisible", true);
            this.PricingRuleCombo.set("selectedValue", "Discount Percentage");

            // amount
            this.AmountLabel.set("isVisible", true);
            this.AmountTextBox.set("isVisible", true);

            this.RulesSmartPanel.set("isOpen", true);
        },

        noChange: function () {
            this.currentAction = "noChange";
            this.RulesContextMenu.toggle();
            this.setupPicker();
        },

        noChangeItemSelected: function () {
            this.currentAction = "noChangeItemSelected";
            this.RulesSmartPanel.set("isOpen", true);
        },

        noChangeSmartPanel: function () {
            this.RulesSmartPanelTitle.set("text", this.CustomCatalogRules.get("NoPriceChange"));
            var displaydata = this.buildRulesFromSelectedItems();

            var baseCatalogName = displaydata.baseCatalogName;
            var itemCategoryName = displaydata.itemCategoryName;
            var variantID = displaydata.variantID;

            this.setCatalogNameAndVariant(baseCatalogName, itemCategoryName, variantID);

            if (variantID === "") {
                this.VariantIdLabel.set("isVisible", false);
                this.VariantIdText.set("isVisible", false);
            }

            // Pricing rule type
            this.PricingRuleTypeLabel.set("isVisible", true);
            this.PricingRuleCombo.set("isVisible", true);
            this.PricingRuleCombo.set("selectedValue", "NoPriceChange");

            // amount
            this.AmountLabel.set("isVisible", false);
            this.AmountTextBox.set("isVisible", false);

            this.RulesSmartPanel.set("isOpen", true);
        },

        setPrice: function () {
            this.currentAction = "setPrice";
            this.RulesContextMenu.toggle();
            this.setupPicker();
        },

        setPriceItemSelected: function () {
            this.currentAction = "setPriceItemSelected";
            this.RulesSmartPanel.set("isOpen", true);
        },

        setPriceSmartPanel: function () {
            var title = this.CustomCatalogRules.get("ReplacePrice");
            this.RulesSmartPanelTitle.set("text", title);
            var displaydata = this.buildRulesFromSelectedItems();

            var baseCatalogName = displaydata.baseCatalogName;
            var itemCategoryName = displaydata.itemCategoryName;
            var variantID = displaydata.variantID;

            this.setCatalogNameAndVariant(baseCatalogName, itemCategoryName, variantID);

            if (variantID === "") {
                this.VariantIdLabel.set("isVisible", false);
                this.VariantIdText.set("isVisible", false);
            }

            // Pricing rule type
            this.PricingRuleTypeLabel.set("isVisible", true);
            this.PricingRuleCombo.set("isVisible", true);
            this.PricingRuleCombo.set("selectedValue", "ReplacePrice");

            // amount
            this.AmountLabel.set("isVisible", true);
            this.AmountTextBox.set("isVisible", true);

            this.RulesSmartPanel.set("isOpen", true);
        },

        itemPickerAcceptChanges: function () {
            this.ItemPicker.hide();
            this.pickedItems = [];

            this.setPageIsDirty(true);
            var addedProducts = this.getItemPickerSelectedProducts();
            var addedCategories = this.getItemPickerSelectedCategories();
            var addedCatalogs = this.getItemPickerSelectedCatalogs();
            var addedVariants = this.getItemPickerSelectedVariants();


            for (var i = 0; i < addedProducts.length ; i++) {
                this.pickedItems.push(addedProducts[i]);
            }

            for (var i = 0; i < addedCategories.length ; i++) {
                this.pickedItems.push(addedCategories[i]);
            }

            for (var i = 0; i < addedCatalogs.length; i++) {
                this.pickedItems.push(addedCatalogs[i]);
            }

            for (var i = 0; i < addedVariants.length ; i++) {
                this.pickedItems.push(addedVariants[i]);
            }

            if (this.currentAction == "addExclusionRule") {
                this.addExclusionRuleSmartPanel();
            } else if (this.currentAction == "addInclusionRule") {
                this.addInclusionRuleSmartPanel();
            } else if (this.currentAction == "addFixedAmount") {
                this.addFixedAmountSmartPanel();
            } else if (this.currentAction == "addPercentage") {
                this.addPercentageSmartPanel();
            } else if (this.currentAction == "discount") {
                this.addDiscountSmartPanel();
            } else if (this.currentAction == "discountPercentage") {
                this.addDiscountPercentageSmartPanel();
            } else if (this.currentAction == "noChange") {
                this.noChangeSmartPanel();
            } else if (this.currentAction == "setPrice") {
                this.setPriceSmartPanel();
            }
        },

        compareByItemId: function (item) {
            var ruleInList = this.RulesList.get("selectedItem");

            if (ruleInList.get("itemId") == item.itemId) {
                return true;
            }

            return false;
        },

        acceptRules: function () {
            if (this.editRule) {
                var ruleInList = this.RulesList.get("selectedItem");

                var items = this.RulesList.get("items");
                var selectedItems = items.filter($.proxy(this.compareByItemId, this));
                var item = selectedItems[0];

                if (!item.OrgAmount) {
                    item.OrgAmount = ruleInList.get("Amount");
                    item.OrgPricingRule = ruleInList.get("ProgrammaticPricingRule");
                    ruleInList.set("OrgAmount", ruleInList.get("Amount"));
                    ruleInList.set("OrgPricingRule", ruleInList.get("ProgrammaticPricingRule"));
                }

                ruleInList.set("Amount", this.AmountTextBox.get("text"));
                ruleInList.set("ProgrammaticPricingRule", this.PricingRuleCombo.get("selectedValue"));
                ruleInList.set("PricingRule", this.PricingRuleType.get(this.PricingRuleCombo.get("selectedValue")));
                ruleInList.set("Edited", true);

                item.Amount = this.AmountTextBox.get("text");
                item.ProgrammaticPricingRule = this.PricingRuleCombo.get("selectedValue");
                item.PricingRule = this.PricingRuleType.get(this.PricingRuleCombo.get("selectedValue"));
                item.Edited = true;

                this.RulesSmartPanel.set("isOpen", false);
            } else {
                for (var i = 0; i < this.pendingRules.length; i++) {
                    this.modifyRuleBasedOnInput(this.pendingRules[i]);
                }

                this.validateRules();
            }

            this.setPageIsDirty(true);
        },

        modifyRuleBasedOnInput: function (rule) {
            if (this.currentAction == "addExclusionRule") {
                rule.RuleType = "Exclusion";
                rule.ProgrammaticRuleType = "Exclusion";
                rule.PricingRule = "";
                rule.Amount = "";
            } else if (this.currentAction == "addInclusionRule") {
                rule.RuleType = "Inclusion";
                rule.ProgrammaticRuleType = "Inclusion";
                rule.PricingRule = "";
                rule.Amount = "";
            } else {
                rule.RuleType = "Pricing";
                rule.ProgrammaticRuleType = "Pricing";
                rule.PricingRule = this.PricingRuleType.get(this.PricingRuleCombo.get("selectedValue"));
                rule.Amount = this.AmountTextBox.get("text");
                rule.ProgrammaticPricingRule = this.PricingRuleCombo.get("selectedValue");
            }
        },

        itemPickerClose: function () {
            this.ItemPicker.hide();
        },
        // End rule creating and editing

        determineLanguageToSet: function () {

            var language = CommerceUtilities.loadPageVar("lang");

            if (!language) {
                language = cbp.prototype.getCookie("commerceLang");
            }

            if (language) {

                var cultures = this.Language.get("items");

                if (cultures === null || cultures.length === 0) {
                    return;
                }

                var cultureFound = false;
                var catalogLanguage = "";

                for (i = 0; i < cultures.length; i++) {
                    if (cultures[i].language == language) {
                        cultureFound = true;
                        break;
                    }
                }

                if (!cultureFound) {
                    for (i = 0; i < cultures.length; i++) {
                        var languagePart = cultures[i].language.substring(0, 2);
                        if (languagePart == language) {
                            catalogLanguage = cultures[i].language;
                            break;
                        }
                    }
                }

                if (cultureFound) {
                    this.set("currentLanguage", language);
                } else {
                    if (catalogLanguage) {
                        this.set("currentLanguage", catalogLanguage);
                    } else {
                        this.set("currentLanguage", "en-US");
                    }
                }
            }
            else {
                this.set("currentLanguage", "en-US");
            }
        },

        validateRules: function () {

            var rules = this.pendingRules;
            var conflictingRuleExistsMessage = this.ClientErrorMessages.get("Custom Catalog Conflicting Rule");
            var conflictingRulePendingMessage = this.ClientErrorMessages.get("Custom Catalog Conflicting Rule Pending");

            if (!rules || rules.length === 0) {
                return;
            }

            var self = this;

            // Validate that the pending list of rules to be added
            // does not contain conflicting rules
            if (this.rulesToAdd) {
                var invalidPendingRules = [];
                for (i = 0; i < rules.length; i++) {
                    for (j = 0; j < this.rulesToAdd.length; j++) {
                        if (rules[i].RuleType == "Exclusion") {

                            if (rules[i].BaseCatalog == this.rulesToAdd[j].BaseCatalog &&
                              rules[i].ItemCategory == this.rulesToAdd[j].ItemCategory &&
                              rules[i].VariantId == this.rulesToAdd[j].VariantId) {

                                invalidPendingRules.push(i);
                                break;
                            }

                        } else {
                            if (rules[i].BaseCatalog == this.rulesToAdd[j].BaseCatalog &&
                                rules[i].ItemCategory == this.rulesToAdd[j].ItemCategory &&
                                rules[i].VariantId == this.rulesToAdd[j].VariantId &&
                                this.rulesToAdd[j].RuleType == "Exclusion") {

                                invalidPendingRules.push(i);
                                break;
                            }
                        }
                    }
                }

                if (invalidPendingRules.length > 0) {
                    var tempArray = [];
                    for (i = 0; i < rules.length; i++) {
                        var ruleAtIndexValid = true;
                        for (j = 0; j < invalidPendingRules.length; j++) {
                            if (i == invalidPendingRules[j]) {
                                ruleAtIndexValid = false;
                                break;
                            }
                        }

                        if (ruleAtIndexValid) {
                            tempArray.push(rules[i]);
                        }
                    }

                    rules = tempArray;
                    this.HeaderActionsMessageBar.removeMessages();
                    this.HeaderActionsMessageBar.addMessage("notification", conflictingRulePendingMessage);
                    this.HeaderActionsMessageBar.set("isVisible", true);
                    setTimeout(function () {
                        self.HeaderActionsMessageBar.set("isVisible", false);
                    },
                    10000);

                    this.pendingRules = rules;
                }
            }

            if (rules.length > 0) {
                var customCatalogId = CommerceUtilities.loadPageVar("target");

                var serializedRules = "";

                for (var i = 0; i < rules.length; i++) {
                    if (serializedRules) {
                        serializedRules += "|";
                    }
                    serializedRules += ko.toJSON(rules[i]);
                }

                var dataObject = {
                    itemId: customCatalogId,
                    rulesToValidate: serializedRules
                };

                var validRules = [];

                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceCustomCatalog/ValidatePendingRules",
                    type: "POST",
                    headers: this.ajaxToken,
                    data: dataObject,
                    context: this,
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        if (data.Status != "success") {

                            var message = conflictingRuleExistsMessage;

                            for (i = 0; i < data.InvalidRules.length; i++) {

                                if (rules[i].ItemCategory) {
                                    message += rules[i].ItemCategory;
                                } else {
                                    message += rules[i].BaseCatalog;
                                }

                                if (i != data.InvalidRules.length - 1) {
                                    message += ", ";
                                }
                            }

                            for (i = 0; i < rules.length; i++) {
                                var ruleValid = true;
                                for (j = 0; j < data.InvalidRules.length; j++) {
                                    if (i == data.InvalidRules[j]) {
                                        ruleValid = false;
                                        break;
                                    }
                                }

                                if (ruleValid) {
                                    validRules.push(rules[i]);
                                }
                            }

                            this.pendingRules = validRules;

                            this.HeaderActionsMessageBar.removeMessages();
                            this.HeaderActionsMessageBar.addMessage("notification", message);
                            this.HeaderActionsMessageBar.set("isVisible", true);

                            setTimeout(function () {
                                self.HeaderActionsMessageBar.set("isVisible", false);
                            }, 10000);

                            this.onRuleValidationCompleted();
                        } else {
                            this.onRuleValidationCompleted();
                        }
                    }
                });
            } else {

                this.onRuleValidationCompleted();
            }
        },

        onRuleValidationCompleted: function () {
            this.rulesToAdd = this.rulesToAdd.concat(this.pendingRules);
            this.pendingRules = [];
            this.RulesSmartPanel.set("isOpen", false);
            this.PendingRules.set("items", this.rulesToAdd);
        },

        rebuild: function () {
            var customCatalogId = this.get("targetId");

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCatalogAction/RebuildVirtualCatalogs",
                type: "POST",
                headers: this.ajaxToken,
                data: {
                    virtualCatalogs: customCatalogId
                },
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    alert(data.Message);
                }
            });
        },

        userRebuildsOnPrompt: function () {
            this.RebuildNeededDialog.hide();
            this.rebuild();
        },

        refreshVirtualCatalogStatus: function () {

            var catalogId = this.get("targetId");
            var updateCatalogStatusIndicators = $.proxy(this.updateVirtualCatalogStatusIndicators, this);
            var refreshVirtualCatalogStatusMethod = $.proxy(this.refreshVirtualCatalogStatus, this);

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCatalogAction/GetVirtualCatalogStatus",
                type: "POST",
                headers: ajaxToken,
                data: {
                    virtualCatalogs: catalogId
                },
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    updateCatalogStatusIndicators(data);
                    setTimeout(refreshVirtualCatalogStatusMethod, 3000);
                }
            });
        },

        updateVirtualCatalogStatusIndicators: function (catalogStatus) {
            if (catalogStatus && catalogStatus.length > 0) {
                var catalogsRequireRebuild = false;
                var needRebuildToolTip = this.ClientErrorMessages.get("Needs Rebuild");
                var beingRebuiltToolTip = this.ClientErrorMessages.get("Being Rebuilt");

                // Only one item in this response
                var statusHtml;
                if (catalogStatus[0].RebuildStatus == "NeedsRebuild") {
                    statusHtml = "<div class='needsRebuild' title='" + needRebuildToolTip + "' >";
                } else if (catalogStatus[0].RebuildStatus == "NeedsRebuild") {
                    statusHtml = "<div class='beingRebuild' title='" + beingRebuiltToolTip + "'>";
                } else {
                    statusHtml = "";
                }

                var tabRebuildStatusElement = $("li[data-tab-id=\\{1BB48D40-EA7C-4B39-A13C-FF003D6642F7\\}] > a > label", this.tabStrip);
                tabRebuildStatusElement.html(statusHtml);
            }
        },

        setListViewMode: function (viewMode) {
            this.CategoriesList.set("view", viewMode);
            this.ProductList.set("view", viewMode);
            this.RelatedCatalogs.set("view", viewMode);
            this.RulesList.set("view", viewMode);

            // Update the user preference
            this.setUsersListViewPreference(viewMode);

            if (this.listViewMode == "TileList") {

                // switch to default sorting
                this.CategoryTileSortComboBox.trigger("change:selectedItem");
                this.ProductTileSortComboBox.trigger("change:selectedItem");
                this.RelatedCatalogTileSortComboBox.trigger("change:selectedItem");

                this.checkListViewItems(this.CategoriesList);
                this.checkListViewItems(this.ProductList);

                if (this.isCategoryTabSelected()) {
                    this.CategoryTileSortComboBox.set("isVisible", true);
                    this.ProductTileSortComboBox.set("isVisible", false);
                    this.RelatedCatalogTileSortComboBox.set("isVisible", false);
                } else if (this.isProductTabSelected()) {
                    this.CategoryTileSortComboBox.set("isVisible", false);
                    this.ProductTileSortComboBox.set("isVisible", true);
                    this.RelatedCatalogTileSortComboBox.set("isVisible", false);
                } else if (this.isRelatedTabSelected()) {
                    this.CategoryTileSortComboBox.set("isVisible", false);
                    this.ProductTileSortComboBox.set("isVisible", false);
                    this.RelatedCatalogTileSortComboBox.set("isVisible", true);
                } else {
                    this.CategoryTileSortComboBox.set("isVisible", false);
                    this.ProductTileSortComboBox.set("isVisible", false);
                    this.RelatedCatalogTileSortComboBox.set("isVisible", false);
                }
            } else {
                this.CategoryTileSortComboBox.set("isVisible", false);
                this.ProductTileSortComboBox.set("isVisible", false);
                this.RelatedCatalogTileSortComboBox.set("isVisible", false);
            }
        }
    });

    return CustomCatalog;
});

document.body.addEventListener("mousedown", defineClientX, false);
var clientX = null;
function defineClientX(e) {
    clientX = e.clientX;
}