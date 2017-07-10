//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        CommerceBasePage: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceBasePage",
        WorkspaceHelper: "/sitecore/shell/client/Applications/MerchandisingManager/WorkspaceHelper",
    }
});

define(["sitecore", "CommerceBasePage", "WorkspaceHelper"], function (Sitecore, cbp, WorkspaceHelper) {
    var catalogName = "";
    var Catalog = cbp.extend({
        defaultCatalogLanguage: null,
        currentEditedMediaField: null,
        ajaxToken: {},
        workspace: null,
        tabStrip: null,
        initialized: function () {
            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            this.disableLanguageIfRequired();
            this.listenTo(_sc, 'sc-concurrency-override', this.overridePreviousChanges);
            this.listenTo(_sc, 'sc-concurrency-cancel', this.cancelChanges);
            this.listenTo(_sc, 'sc-deleteselected', this.deleteSelectedCatalogItems);
            this.listenTo(_sc, 'sc-hide-deletealert', this.hideDeleteAlert);

            this.ajaxToken[token.headerKey] = token.value;
            cbp.prototype.initialized.call(this);
            this.SearchBox.viewModel.$el.after("<textarea id='searchBoxExtended' class='extendedSearchbox' rows='8' cols='50' style='display:none'/>");
            this.SearchBox.viewModel.$el.keyup(this.showHideExtendedSearchArea);
            $('#searchBoxExtended').on('keyup', $.proxy(this.addEnterKeySearchBox, this));
            this.CatalogChildrenTabs.on("change:selectedTab", this.selectedTabChanged, this);
            this.CategoriesList.on("change:checkedItemIds", this.onSelectedCategoriesChanged, this);
            this.ProductList.on("change:checkedItemIds", this.onSelectedProductsChanged, this);
            this.HeaderTitleLabel.set("text", this.ItemTypeDictionary.get("catalog"));

            this.HelpProvider.set("isReady", true);
            this.HelpProvider.refresh();

            var catalogId = CommerceUtilities.loadPageVar("target");

            this.set("targetId", catalogId);

            //For Concurrency Saving
            this.set("lastModified", null);
            this.set("overrideChanges", false);

            var self = this;

            // Cache for faster selector lookup
            var catalogTabs = this.CatalogChildrenTabs.viewModel.$el;
            this.tabStrip = $("ul.sc-tabcontrol-navigation", catalogTabs).first();

            // Initialize the workspace helper
            this.workspace = new WorkspaceHelper({ requestToken: this.ajaxToken });

            this.workspace.getCount(function (data) {
                self.CategoryActionControl.getAction("Workspace").counter(data.Count);
                self.ProductActionControl.getAction("Workspace").counter(data.Count);
            });

            if (catalogId) {
                this.DetailLanguageSource.set("commerceItemId", catalogId);
                this.DetailLanguageSource.set("isReady", true);
                this.DetailLanguageSource.refresh();
                this.Language.on("change:items", this.setLanguage, this);

                // Get the Sitecore item that represents this catalog and set the default fields
                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceSearch/GetItem",
                    type: "POST",
                    context: this,
                    headers: this.ajaxToken,
                    data: {
                        id: catalogId,
                        language: this.get("currentLanguage")
                    },
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        self.HeaderTitle.set("text", data.DisplayName);
                        self.TitleControl.set("text", data.CatalogName);
                        self.catalogName = data.CatalogName;
                        self.set("itemPath", data.Path);
                        self.defaultCatalogLanguage = data.DefaultLanguage;

                        // Initialize the default languages combo-box then keep
                        // it in sync with the currently selected languages in the language picker
                        $.ajax({
                            url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/GetCatalogLanguages",
                            type: "POST",
                            headers: this.ajaxToken,
                            data: { id: catalogId },
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
                            self.CatalogChildrenTabs.set("selectedTab", "{1F1452B2-802F-4338-B373-15AB356A6CB2}");
                            self.loadCategoryTab();
                        } else {
                            self.CatalogChildrenTabs.set("selectedTab", previousTab.substring(1, previousTab.length));
                        }

                        if (self.DefaultLanguageValueLabel) {
                            self.DefaultLanguageValueLabel.set("text", data.DefaultLanguage);
                        }

                        if (this.ProductIdComboBox) {
                            var productIdProperty = data.ProductIdProperty;

                            $.ajax({
                                url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/GetEligibleProductIdProperties",
                                type: "POST",
                                headers: this.ajaxToken,
                                context: this,
                                error: CommerceUtilities.IsAuthenticated,
                                success: function (data) {
                                    this.ProductIdComboBox.set("items", data);
                                    this.ProductIdComboBox.set("selectedValue", productIdProperty);
                                    this.ProductIdComboBox.set("isEnabled", false);
                                }
                            });
                        }

                        if (this.VariantIdComboBox) {
                            var variantIdProperty = data.VariantIdProperty;

                            $.ajax({
                                url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/GetEligibleVariantIdProperties",
                                type: "POST",
                                headers: this.ajaxToken,
                                context: this,
                                error: CommerceUtilities.IsAuthenticated,
                                success: function (data) {
                                    this.VariantIdComboBox.set("items", data);
                                    this.VariantIdComboBox.set("selectedValue", variantIdProperty);
                                    this.VariantIdComboBox.set("isEnabled", false);
                                }
                            });
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

                        if (this.CatalogName) {
                            this.CatalogName.set("text", data.CatalogName);
                            this.CatalogName.set("isEnabled", false);
                        }

                        //For Concurrency Saving
                        self.set("lastModified", data.LastModified);
                    }
                });

                this.set("selectedTab", this.CatalogChildrenTabs.get("selectedTab"));
            } else {
                self.CatalogChildrenTabs.set("selectedTab", "{9D372FA0-AFA2-4F9B-93A6-0CE3A4513BFB}");
                self.HeaderTitle.set("text", self.ItemTypeDictionary.get("Create Base Catalog"));
                self.TitleControl.set("text", self.ItemTypeDictionary.get("Create Base Catalog"));

                // Hide the language switcher
                this.Language.set("isVisible", false); 

                this.set("templateId", CommerceUtilities.loadPageVar("template"));
                this.set("parentId", CommerceUtilities.loadPageVar("parent"));

                // Query single language for DetailLangaugeProvider
                this.wireUpCreateLanguage();
                
                $("li[data-tab-id=\\{1F1452B2-802F-4338-B373-15AB356A6CB2\\}]", this.tabStrip).hide();
                $("li[data-tab-id=\\{554A096C-F3B5-4D9C-A9B9-10FFC6290E78\\}]", this.tabStrip).hide();
                $("li[data-tab-id=\\{6A6B0977-89C2-48F7-A6EF-39982C6AB83E\\}]", this.tabStrip).hide();

                if (this.ProductIdComboBox) {
                    
                    $.ajax({
                        url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/GetEligibleProductIdProperties",
                        type: "POST",
                        headers: this.ajaxToken,
                        context: this,
                        error: CommerceUtilities.IsAuthenticated,
                        success: function (data) {
                            data.unshift({ itemId: "" });
                            this.ProductIdComboBox.set("items", data);
                        }
                    });
                }

                if (this.VariantIdComboBox) {
                    
                    $.ajax({
                        url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/GetEligibleVariantIdProperties",
                        type: "POST",
                        headers: this.ajaxToken,
                        context: this,
                        error: CommerceUtilities.IsAuthenticated,
                        success: function (data) {
                            data.unshift({ itemId: "" });
                            this.VariantIdComboBox.set("items", data);
                        }
                    });
                }

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
            // Tab counts 
            this.addSpansToTab();
            this.CategoriesDataSource.on("change:totalItemCount", this.categoriesCountChanged, this);
            this.ProductDataSource.on("change:totalItemCount", this.productCountChanged, this);
            this.DependentCatalogsDataSource.on("change:totalItemCount", this.dependentCountChanged, this);

            // Set up infinite scroll listeners
            $(window).on("scroll", $.proxy(self.infiniteScrollDependentCatalogs, self));
            $(window).on("scroll", $.proxy(self.infiniteScrollCategories, self));
            $(window).on("scroll", $.proxy(self.infiniteScrollProducts, self));

            this.FilterPanel.viewModel.$el.addClass("sc-CommercePanel");

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

            this.DependentCatalogTileSortComboBox.on("change:selectedItem", function () {
                var selectedItem = self.DependentCatalogTileSortComboBox.get("selectedItem");
                self.DependentCatalogsDataSource.set("sorting", selectedItem.DataField);
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

            this.CategoryActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.DependentCatalogActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.ProductActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.DetailActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.LanguageActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");

            // Other controls
            this.DefaultLanguageCombobox.set("isEnabled", false);
            $(".sc-CommerceDateTime :input").prop("disabled", true);
        },

        showMediaDialog: function (mediaField) {
            this.currentEditedMediaField = mediaField;
            this.SelectMediaDialog.show();
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

        setLanguage: function () {
            this.determineLanguageToSet(this.Language);

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
                    this.DefaultLanguageCombobox.set("selectedItem", defaultLanguageItem);
                }
            }
        },

        infiniteScrollDependentCatalogs: function () {
            var isBusy = this.DependentCatalogsDataSource.get("isBusy");
            var hasMoreItems = this.DependentCatalogsDataSource.get("hasMoreItems");

            if (this.isDependentCatalogTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.DependentCatalogsDataSource.next();
                }
            }
        },

        infiniteScrollCategories: function () {
            var isBusy = this.CategoriesDataSource.get("isBusy");
            var hasMoreItems = this.CategoriesDataSource.get("hasMoreItems");

            if (this.isCategoriesTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.CategoriesDataSource.next();
                }
            }
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

        isDependentCatalogTabSelected: function () {
            return this.CatalogChildrenTabs.get("selectedTab") == "{6A6B0977-89C2-48F7-A6EF-39982C6AB83E}";
        },

        isCategoriesTabSelected: function () {
            return this.CatalogChildrenTabs.get("selectedTab") == "{1F1452B2-802F-4338-B373-15AB356A6CB2}";
        },

        isProductsTabSelected: function () {
            return this.CatalogChildrenTabs.get("selectedTab") == "{554A096C-F3B5-4D9C-A9B9-10FFC6290E78}";
        },

        addSpansToTab: function () {
            $("li[data-tab-id=\\{1F1452B2-802F-4338-B373-15AB356A6CB2\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{554A096C-F3B5-4D9C-A9B9-10FFC6290E78\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{6A6B0977-89C2-48F7-A6EF-39982C6AB83E\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{9D372FA0-AFA2-4F9B-93A6-0CE3A4513BFB\\}] > a", this.tabStrip).append("<label style=\"display:inline\"></label>");
        },

        categoriesCountChanged: function () {
            var count = this.CategoriesDataSource.get("totalItemCount") > 99 ? "99+" : this.CategoriesDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{1F1452B2-802F-4338-B373-15AB356A6CB2\\}] > a > span", this.tabStrip).html(count);
        },

        productCountChanged: function () {
            var count = this.ProductDataSource.get("totalItemCount") > 99 ? "99+" : this.ProductDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{554A096C-F3B5-4D9C-A9B9-10FFC6290E78\\}] > a > span", this.tabStrip).html(count);
        },

        dependentCountChanged: function () {
            var count = this.DependentCatalogsDataSource.get("totalItemCount") > 99 ? "99+" : this.DependentCatalogsDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{6A6B0977-89C2-48F7-A6EF-39982C6AB83E\\}] > a > span", this.tabStrip).html(count);
        },

        selectedTabChanged: function () {
            this.set("selectedTab", this.CatalogChildrenTabs.get("selectedTab"));
            this.hideErrorMessage();

            if (this.get("selectedTab") == "{1F1452B2-802F-4338-B373-15AB356A6CB2}") { // Categories
                this.loadCategoryTab();
            } else if (this.get("selectedTab") == "{554A096C-F3B5-4D9C-A9B9-10FFC6290E78}") { // Products
                this.loadProductTab();
            } else if (this.get("selectedTab") == "{9D372FA0-AFA2-4F9B-93A6-0CE3A4513BFB}") { // Details
                this.loadDetailTab();
            } else if (this.get("selectedTab") == "{6A6B0977-89C2-48F7-A6EF-39982C6AB83E}") { // Dependent Catalogs
                this.loadDependentCatalogsTab();
            }
        },

        loadDetailTab: function () {
            this.CategoriesList.set("isVisible", false);
            this.ProductList.set("isVisible", false);
            this.ReadOnlyDefaultFields.set("isVisible", true);
            this.CommerceFieldExpander.set("isVisible", true);

            this.LanguageActionControl.set("isVisible", false);
            this.DetailActionControl.set("isVisible", true);
            
            // Hide the other action controls
            this.DependentCatalogActionControl.set("isVisible", false);
            this.ProductActionControl.set("isVisible", false);
            this.CategoryActionControl.set("isVisible", false);

            this.DependentCatalogsList.set("isVisible", false);

            this.Language.set("isVisible", true);

            // Hide the Tile/List Buttons
            this.DetailListIconButton.set("isVisible", false);
            this.TileListIconButton.set("isVisible", false);

            // Facets
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", false);

            window.location.hash = '#{9D372FA0-AFA2-4F9B-93A6-0CE3A4513BFB}';

            this.CategoryTileSortComboBox.set("isVisible", false);
            this.ProductTileSortComboBox.set("isVisible", false);
            this.DependentCatalogTileSortComboBox.set("isVisible", false);
        },

        loadCategoryTab: function () {
            this.CategoriesList.set("isVisible", true);
            this.ProductList.set("isVisible", false);
            this.ReadOnlyDefaultFields.set("isVisible", false);
            this.CommerceFieldExpander.set("isVisible", false);

            this.LanguageActionControl.set("isVisible", false);
            this.CategoryActionControl.set("isVisible", true);
            
            // Hide other action controls
            this.DependentCatalogActionControl.set("isVisible", false);
            this.ProductActionControl.set("isVisible", false);
            this.DetailActionControl.set("isVisible", false);
            if (!this.isAXEnabled) {
                this.CategoryActionControl.getAction("Delete").isVisible(true); // Delete item
                this.CategoryActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.CategoriesList)); // Delete item
            }
            this.DependentCatalogsList.set("isVisible", false);

            this.Language.set("isVisible", false);

            // Show the Tile/List Buttons
            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);

            // Facets
            this.CategoryFacets.set("isVisible", true);
            this.ProductFacets.set("isVisible", false);
            window.location.hash = '#{1F1452B2-802F-4338-B373-15AB356A6CB2}';

            if (this.listViewMode == "TileList") {
                this.CategoryTileSortComboBox.set("isVisible", true);
                this.ProductTileSortComboBox.set("isVisible", false);
                this.DependentCatalogTileSortComboBox.set("isVisible", false);
            }
        },

        loadProductTab: function () {
            this.CategoriesList.set("isVisible", false);
            this.ProductList.set("isVisible", true);
            this.ReadOnlyDefaultFields.set("isVisible", false);
            this.CommerceFieldExpander.set("isVisible", false);

            this.LanguageActionControl.set("isVisible", false);
            this.ProductActionControl.set("isVisible", true);
            
            // Hide the other action controls
            this.CategoryActionControl.set("isVisible", false);
            this.DetailActionControl.set("isVisible", false);
            this.DependentCatalogActionControl.set("isVisible", false);

            if (!this.isAXEnabled) {
                this.ProductActionControl.getAction("Delete").isVisible(true); // Delete 
                this.ProductActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.ProductList)); // Delete 
            }
            this.DependentCatalogsList.set("isVisible", false);

            this.Language.set("isVisible", false);

            // Show the Tile/List Buttons
            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);

            // Facets
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", true);
            window.location.hash = '#{554A096C-F3B5-4D9C-A9B9-10FFC6290E78}';

            if (this.listViewMode == "TileList") {
                this.CategoryTileSortComboBox.set("isVisible", false);
                this.ProductTileSortComboBox.set("isVisible", true);
                this.DependentCatalogTileSortComboBox.set("isVisible", false);
            }
        },

        loadDependentCatalogsTab: function () {
            this.CategoriesList.set("isVisible", false);
            this.ProductList.set("isVisible", false);
            this.ReadOnlyDefaultFields.set("isVisible", false);
            this.CommerceFieldExpander.set("isVisible", false);

            this.LanguageActionControl.set("isVisible", false);
            this.DependentCatalogActionControl.set("isVisible", true);

            //Hide the rest of the action controls
            this.CategoryActionControl.set("isVisible", false);
            this.CategoryActionControl.set("isVisible", false);
            this.DetailActionControl.set("isVisible", false);

            this.DependentCatalogsList.set("isVisible", true);

            this.Language.set("isVisible", false);

            // Show the Tile/List Buttons
            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);

            // Facets
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", false);
            window.location.hash = '#{6A6B0977-89C2-48F7-A6EF-39982C6AB83E}';

            if (this.listViewMode == "TileList") {
                this.CategoryTileSortComboBox.set("isVisible", false);
                this.ProductTileSortComboBox.set("isVisible", false);
                this.DependentCatalogTileSortComboBox.set("isVisible", true);
            }
        },

        initializeQueryProviders: function () {

            var catalogId = this.get("targetId");

            this.CategoriesDataSource.set("commerceItemId", catalogId);
            this.CategoriesDataSource.set("isReady", true);
            this.CategoriesDataSource.refresh();

            this.ProductDataSource.set("commerceItemId", catalogId);
            this.ProductDataSource.set("isReady", true);
            this.ProductDataSource.refresh();

            this.DependentCatalogsDataSource.set("commerceItemId", catalogId);
            this.DependentCatalogsDataSource.set("isReady", true);
            this.DependentCatalogsDataSource.refresh();
        },

        onSelectedCategoriesChanged: function () {
            this.hideErrorMessage();
            if (!this.isAXEnabled) {
                this.CategoryActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.CategoriesList));
            }
             this.CategoryActionControl.getAction("AddToWorkspace").isEnabled(this.isAnItemSelected(this.CategoriesList));
            },

        onSelectedProductsChanged: function () {
            this.hideErrorMessage();
            if (!this.isAXEnabled) {
                this.ProductActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.ProductList));
            }
            this.ProductActionControl.getAction("AddToWorkspace").isEnabled(this.isAnItemSelected(this.ProductList));
        },

        toggleFilterPanel: function () {
            var filterPanelOpen = this.FilterPanel.get("isOpen") === null ? false : this.FilterPanel.get("isOpen");
            this.FilterPanel.set("isOpen", !filterPanelOpen);
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

        saveCatalog: function () {
            var id = this.get("targetId");
            if (id && id !== "") {
                this.updateCatalog();
            }
            else {
                this.createCatalog();
            }
        },

        createCatalog: function () {
            this.hideErrorMessage();
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.InProgress.hide();
                this.updateSaveButton(false);
                this.updateTabIndicator();
                this.showRequiredFieldsMessages(invalidFieldNames);
                return;
            }

            this.displayInProgressMessage();
            var d = this.FormRenderer.get("editFunctionBody");
            var baseFields = this.CatalogBaseFields.get("editFunctionBody");

            var currentLanguage = this.get("currentLanguage");

            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, d);
            if (!this.isAXEnabled) {
                this.addRendererFieldsToObject(dataObject, baseFields);
            }

            // Custom validation of CatalogName
            if (!this.isNameValid(dataObject.CatalogName)) {
                return;
            }

            dataObject.currentLanguage = currentLanguage;
            dataObject.defaultLanguageOnCreate = this.DefaultLanguageCombobox.get("selectedItemId");

            var catalogLanguages = this.languageSelections;
            if (catalogLanguages && catalogLanguages.length > 0) {
                dataObject.languages = CommerceUtilities.createDelimitedListFromArray(catalogLanguages);
            }

            if (this.ProductIdComboBox) {
                dataObject.ProductId = this.ProductIdComboBox.get("selectedValue");
            }

            if (this.VariantIdComboBox) {
                dataObject.VariantId = this.VariantIdComboBox.get("selectedValue");
            }

            if (this.CurrencyComboBox) {
                dataObject.Currency = this.CurrencyComboBox.get("selectedValue");
            }

            dataObject.templateId = this.get("templateId");
            dataObject.parentId = this.get("parentId");
            dataObject.name = this.CatalogName.get("text") !== null ? this.CatalogName.get("text").trim() : "";
            var self = this;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCatalog/Create",
                type: "POST",
                headers: this.ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    // Handle failure cases
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();                       
                        this.HeaderActionsMessageBar.removeMessages();
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
                        this.hideInProgressMessageCreate(true, "Base Catalog Created");
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

        redirectToCreateNewProduct: function () {
            var selectedItem = this.ProductTemplateSubApp.ProductTemplates.get("selectedItemId");
            if (selectedItem) {
                window.location.assign('/sitecore/client/Applications/MerchandisingManager/ProductDetail?create=true&template=' + selectedItem + '&parent=' + this.get("targetId"));
            }
        },

        redirectToSavedCatalog: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/Catalog?target=' + this.get("newTargetId") + '#{9D372FA0-AFA2-4F9B-93A6-0CE3A4513BFB}');
        },

        updateCatalog: function () {
            this.hideErrorMessage();
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.updateSaveButton(false);
                this.updateTabIndicator();
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();
            var d = this.FormRenderer.get("editFunctionBody");
            var baseFields = this.CatalogBaseFields.get("editFunctionBody");
            var currentLanguage = this.get("currentLanguage");

            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, d);
            this.addRendererFieldsToObject(dataObject, baseFields);

            dataObject.currentLanguage = currentLanguage;
            dataObject.DefaultLanguage = this.DefaultLanguageCombobox.get("selectedItemId");

            if (this.CurrencyComboBox) {
                dataObject.Currency = this.CurrencyComboBox.get("selectedValue");
            }

            //For Concurrency Saving
            dataObject.lastModified = this.get("lastModified");
            dataObject.overrideChanges = this.get("overrideChanges");

            // Save the selected catalog languages
            var catalogLanguages = this.languageSelections;
            if (catalogLanguages && catalogLanguages.length > 0) {
                dataObject.languages = CommerceUtilities.createDelimitedListFromArray(catalogLanguages);
            }

            dataObject.itemId = this.get("targetId");

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCatalog/Update",
                type: "POST",
                headers: this.ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();
                        var self = this;
                        self.updateSaveButton(false);

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
                        var self = this;
                        this.hideInProgressMessage(true);
                        this.setPageIsDirty(false);

                        //For Concurrency Saving
                        this.set("overrideChanges", false);
                        if (data.Status.indexOf("success") === 0) {
                            this.set("lastModified", data.Status.split('|')[1]);
                        }

                        setTimeout(function () {
                            self.initializeQueryProviders();
                        }, 2000);
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
            this.updateCatalog();
            this.ConcurrencyAlert.hide();
        },

        deleteSelectedCatalogItems: function () {
            if (this.isCategoriesTabSelected()) {
                this.deleteSelectedCategories();
            } else if (this.isProductsTabSelected()) {
                this.deleteSelectedProducts();
            }
        },

        deleteSelectedCategories: function () {
            this.deleteRequestedCatalogItems(this.CategoriesList, this.CategoriesDataSource);
        },

        deleteSelectedProducts: function () {
            this.deleteRequestedCatalogItems(this.ProductList, this.ProductDataSource);
        },

        deleteRequestedCatalogItems: function (itemListControl, dataSource) {

            var selectedItems = itemListControl.get("checkedItemIds");

            if (selectedItems && selectedItems.length > 0) {
                var itemsDelimitedList = "";
                for (i = 0; i < selectedItems.length; i++) {
                    var catalogItemId = selectedItems[i];
                    if (i > 0) {
                        itemsDelimitedList += "|";
                    }

                    itemsDelimitedList += catalogItemId;
                }

                if (!itemsDelimitedList) {
                    return;
                }

                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceCatalog/Delete",
                    type: "POST",
                    headers: this.ajaxToken,
                    data: {
                        itemsToDelete: itemsDelimitedList
                    },
                    context: this,
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        setTimeout($.proxy(this.DeleteAlert.hide(), this), 3000);
                        this.DeleteAlert.set("isVisible", false);

                        if (data.Message.length > 0) {
                            for (i = 0; i < data.Message.length; i++) {
                                this.ErrorsMessageBar.addMessage("error", data.Message[i]);
                            }

                            this.ErrorsMessageBar.set("isVisible", true);

                        }

                        // Refresh the list after a brief wait for the index update
                        setTimeout(function () {
                            dataSource.refresh();
                            // Clear the checked items collection of the list control to
                            // prevent re-submission of deleted items.
                            itemListControl.viewModel.uncheckItems(selectedItems);
                        }, 1000);
                    }
                });
            }
        },

        purgeDeletedItems: function () {
            
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCatalog/PurgeDeletedItems",
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

        updateSaveButton: function (status) {
            if (this.CategoryActionControl) {
                this.CategoryActionControl.getAction("Save").isEnabled(status);
            }
            if (this.DependentCatalogActionControl) {
                this.DependentCatalogActionControl.getAction("Save").isEnabled(status);
            }
            this.DetailActionControl.getAction("Save").isEnabled(status);
            if (this.ProductActionControl) {
                this.ProductActionControl.getAction("Save").isEnabled(status);
            }
        },

        updateTabIndicator: function () {
            var tabDetailsStatusElement = $("li[data-tab-id=\\{9D372FA0-AFA2-4F9B-93A6-0CE3A4513BFB\\}] > a > label");
            if ($(".sc-validation").length > 0) {
                tabDetailsStatusElement.html("<div class='warning16'>");
            } else {
                tabDetailsStatusElement.html("");
            }
        },

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

        setListViewMode: function (viewMode) {
            this.CategoriesList.set("view", viewMode);
            this.ProductList.set("view", viewMode);
            this.DependentCatalogsList.set("view", viewMode);

            // Update the user preference
            this.setUsersListViewPreference(viewMode);

            if (this.listViewMode == "TileList") {
                // switch to default sorting
                this.CategoryTileSortComboBox.trigger("change:selectedItem");
                this.ProductTileSortComboBox.trigger("change:selectedItem");
                this.DependentCatalogTileSortComboBox.trigger("change:selectedItem");

                this.checkListViewItems(this.CategoriesList);
                this.checkListViewItems(this.ProductList);

                if (this.isCategoriesTabSelected()) {
                    this.CategoryTileSortComboBox.set("isVisible", true);
                    this.ProductTileSortComboBox.set("isVisible", false);
                    this.DependentCatalogTileSortComboBox.set("isVisible", false);
                } else if (this.isProductsTabSelected()) {
                    this.CategoryTileSortComboBox.set("isVisible", false);
                    this.ProductTileSortComboBox.set("isVisible", true);
                    this.DependentCatalogTileSortComboBox.set("isVisible", false);
                } else if (this.isDependentCatalogTabSelected()) {
                    this.CategoryTileSortComboBox.set("isVisible", false);
                    this.ProductTileSortComboBox.set("isVisible", false);
                    this.DependentCatalogTileSortComboBox.set("isVisible", true);
                } else {
                    this.CategoryTileSortComboBox.set("isVisible", false);
                    this.ProductTileSortComboBox.set("isVisible", false);
                    this.DependentCatalogTileSortComboBox.set("isVisible", false);
                }
            } else {
                this.CategoryTileSortComboBox.set("isVisible", false);
                this.ProductTileSortComboBox.set("isVisible", false);
                this.DependentCatalogTileSortComboBox.set("isVisible", false);
            }
        }
    });

    return Catalog;
});