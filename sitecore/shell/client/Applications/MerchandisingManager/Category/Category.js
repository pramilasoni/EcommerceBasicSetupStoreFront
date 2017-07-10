//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        CommerceBasePage: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceBasePage",
        Linq: "/sitecore/shell/client/Applications/MerchandisingManager/linq",
        WorkspaceHelper: "/sitecore/shell/client/Applications/MerchandisingManager/WorkspaceHelper"
    }
});

define(["sitecore", "CommerceBasePage", "Linq", "WorkspaceHelper"], function (Sitecore, cbp, Linq, WorkspaceHelper) {
    var isUpdate = false;
    var Category = cbp.extend({
        pendingProductChanges: [],
        pendingCategoryChanges: [],
        pendingRelationshipChanges: [],
        currentCatalog: null,
        currentRelationshipName: null,
        defaultCategoryOnLoad: "",
        currentEditedMediaField: null,
        editedRelationships: [],
        workspace: null,
        tabStrip: null,
        initialized: function () {
            cbp.prototype.initialized.call(this);

            this.listenTo(_sc, 'sc-concurrency-override', this.overridePreviousChanges);
            this.listenTo(_sc, 'sc-concurrency-cancel', this.cancelChanges);

            this.set("itemHasLayout", "false");
            this.SearchBox.viewModel.$el.after("<textarea id='searchBoxExtended' class='extendedSearchbox' rows='8' cols='50' style='display:none'/>");
            this.SearchBox.viewModel.$el.keyup(this.showHideExtendedSearchArea);
            $('#searchBoxExtended').on('keyup', $.proxy(this.addEnterKeySearchBox, this));
            this.ChildrenTabs.on("change:selectedTab", this.selectedTabChanged, this);

            this.on("change:itemHasLayout", this.updatePreviewButton, this);

            this.HelpProvider.set("isReady", true);
            this.HelpProvider.refresh();

            var self = this;
            this.detailsVisibleProperty(false);
            var categoryId = CommerceUtilities.loadPageVar("target");
            // Select Media Dialog
            this.listenTo(_sc, 'sc-frame-message', this.addMedia);

            if (categoryId) {
                // Edit
                this.doesItemHaveLayout();
                this.set("targetId", categoryId);

                //For Concurrency Saving
                this.set("lastModified", null);
                this.set("overrideChanges", false);

                // Set the language
                var language = CommerceUtilities.loadPageVar("lang");

                if (!language) {
                    language = cbp.prototype.getCookie("commerceLang");
                }

                if (language) {
                    this.set("currentLanguage", language);
                } else {
                    this.set("currentLanguage", "en-US");
                }

                this.LanguageDataSource.set("commerceItemId", categoryId);
                this.LanguageDataSource.set("isReady", true);
                this.LanguageDataSource.refresh();
                this.Languages.on("change:items", this.setLanguage, this);

                this.set("categoriesLoaded", false);
                this.set("productsLoaded", false);

                var productsLoadedCallback = $.proxy(this.productDataSourceChange, this);
                var categoriesLoadedCallback = $.proxy(this.categoryDataSourceChange, this);
                var parentsLoadedCallback = $.proxy(this.parentsDataSourceChange, this);
                var relationshipsLoadedCallback = $.proxy(this.relationshipsDataSourceChange, this);

                this.ProductDataSource.setCompletedQueryCallback(productsLoadedCallback);
                this.CategoryDataSource.setCompletedQueryCallback(categoriesLoadedCallback);
                this.ParentsDataSource.setCompletedQueryCallback(parentsLoadedCallback);
                this.RelationshipsDataSource.setCompletedQueryCallback(relationshipsLoadedCallback);

                // Facet visibility
                this.CategoryFacets.set("isVisible", true);
                this.ProductFacets.set("isVisible", false);

                var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
                var ajaxToken = {};
                ajaxToken[token.headerKey] = token.value;

                // Cache this for faster selector lookup
                var categoryTabs = this.ChildrenTabs.viewModel.$el;
                this.tabStrip = $("ul.sc-tabcontrol-navigation", categoryTabs).first();

                // Initialize the workspace:
                this.workspace = new WorkspaceHelper({ requestToken: ajaxToken });

                this.workspace.getCount(function (data) {
                    self.CategoryActionControl.getAction("Workspace").counter(data.Count);
                    self.ProductActionControl.getAction("Workspace").counter(data.Count);
                    self.DetailActionControl.getAction("Workspace").counter(data.Count);
                });


                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceSearch/GetItem",
                    type: "POST",
                    headers: ajaxToken,
                    context: this,
                    data: {
                        id: categoryId,
                        language: this.get("currentLanguage")
                    },
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        if (data.InMaterializedCatalog) {
                            this.disableActions = true;
                            this.disableIfAX();
                        }

                        self.HeaderTitle.set("text", data.DisplayName);
                        self.TitleControl.set("text", data.DisplayName);
                        self.set("itemPath", data.Path);
                        self.defaultCategoryOnLoad = data.PrimaryParentCategory;
                        self.CommerceImages.set("displayName", data.DisplayName);
                        self.CommerceImages.set("images", data.Images);

                        self.HeaderTitleLabel.set("text", self.ItemTypeDictionary.get("category"));
                        self.initializeQueryProviders();

                        var previousTab = window.location.hash;

                        if (previousTab === "") {
                            self.ChildrenTabs.set("selectedTab", "{C1443AB3-0595-4DC6-8767-7CEBFB5EA545}");
                        } else {
                            self.ChildrenTabs.set("selectedTab", previousTab.substring(1, previousTab.length));
                        }

                        self.currentCatalog = data.CatalogName;

                        //For Concurrency Saving
                        self.set("lastModified", data.LastModified);
                    }
                });

                // Set up tab counts
                this.addSpansToTabs();
                this.ParentsDataSource.on("change:totalItemCount", this.parentsCountChanged, this);
                this.RelationshipsDataSource.on("change:totalItemCount", this.relationshipCountChanged, this);
                this.CategoryDataSource.on("change:totalItemCount", this.categoryCountChanged, this);
                this.ProductDataSource.on("change:totalItemCount", this.productCountChanged, this);
                this.set("selectedTab", this.ChildrenTabs.get("selectedTab"));
                // Set up infinite scroll listeners
                $(window).on("scroll", $.proxy(self.infiniteScrollSubCategories, self));
                $(window).on("scroll", $.proxy(self.infiniteScrollProducts, self));
                $(window).on("scroll", $.proxy(self.infiniteScrollParents, self));
                $(window).on("scroll", $.proxy(self.infiniteScrollRelationships, self));

                this.FilterPanel.viewModel.$el.addClass("sc-CommercePanel");

                // Select Media from BaseUrl
                this.BaseUrlTextBox.viewModel.$el.keyup(this.updateBaseUrlPreview);
                this.BaseUrlTextBox.viewModel.$el.focusout(this.updateBaseUrlPreview);

                // Pending changes lists
                this.ProductPendingChangesList.set("items", this.pendingProductChanges);
                this.ProductPendingChangesList.on("change:items", this.pendingProductChangesItemsChanged, this);
                this.CategoryPendingChangesList.set("items", this.pendingCategoryChanges);
                this.CategoryPendingChangesList.on("change:items", this.pendingCategoryChangesItemsChanged, this);
                this.RelationshipsPendingChangesList.set("items", this.pendingRelationshipChanges);
                this.RelationshipsPendingChangesList.on("change:items", this.pendingRelationshipChangesItemsChanged, this);

                this.RelationshipsList.on("change:checkedItemIds", this.relationshipsListCheckedItemsChanged, this);
                this.RelationshipsList.on("change:selectedItem", this.relationshipsSelectedItemChanged, this);
                this.CategoryList.on("change:checkedItemIds", this.onSelectedCategoriesChanged, this);
                this.ProductList.on("change:checkedItemIds", this.onSelectedProductsChanged, this);
            } else {
                // Create
                this.ChildrenTabs.set("selectedTab", "{06252F47-CB5B-49ED-8813-4F9DFD5F5714}");
                self.HeaderTitle.set("text", self.ItemTypeDictionary.get("Create Category"));
                self.TitleControl.set("text", self.ItemTypeDictionary.get("Create Category"));

                this.set("templateId", CommerceUtilities.loadPageVar("template"));
                this.set("parentId", CommerceUtilities.loadPageVar("parent"));

                // Hide language selector on create                
                self.Languages.set("isVisible", false);

                $("li[data-tab-id=\\{C1443AB3-0595-4DC6-8767-7CEBFB5EA545\\}]", this.tabStrip).hide(); // Subcategories 
                $("li[data-tab-id=\\{254761AD-D396-45A7-83FD-C0654CB32B55\\}]", this.tabStrip).hide(); // Products
                $("li[data-tab-id=\\{A21D2D90-0932-4A03-BD62-F09446806AF3\\}]", this.tabStrip).hide(); // Parents
                $("li[data-tab-id=\\{286B660C-7F15-4C2C-8F19-493AC294C0BA\\}]", this.tabStrip).hide(); // Relationships
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
                self.CategoryDataSource.set("sorting", selectedItem.DataField);
            });

            this.ProductTileSortComboBox.on("change:selectedItem", function () {
                var selectedItem = self.ProductTileSortComboBox.get("selectedItem");
                self.ProductDataSource.set("sorting", selectedItem.DataField);
            });

            this.ParentTileSortComboBox.on("change:selectedItem", function () {
                var selectedItem = self.ParentTileSortComboBox.get("selectedItem");
                self.ParentsDataSource.set("sorting", selectedItem.DataField);
            });
        },

        disableIfAX: function () {
            $(".cs-basefields :input").prop("disabled", true);
            this.ProductActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.RelationshipActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.DetailActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.ParentActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.CategoryActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");

            if (this.DefaultCategoryComboBox){
                this.DefaultCategoryComboBox.set("isEnabled", false);
            }

            $(".sc-CommerceDateTime :input").prop("disabled", true);
        },

        showMediaDialog: function (mediaField) {
            this.currentEditedMediaField = mediaField;
            this.SelectMediaDialogWindow.show();
        },

        updateContextMenuAxis: function () {
            this.RelationshipsContextMenu.set("axis", (clientX - 163).toString() + "px");
            this.RelationshipsContextMenu.toggle();
        },

        mediaItemSelected: function (selectedMediaItemId) {

            if (this.currentEditedMediaField) {

                var mediaField = this.currentEditedMediaField;
                mediaField.model.set("mediaItemId", selectedMediaItemId);
            }

            this.setPageIsDirty(true);
            this.SelectMediaDialogWindow.hide();
            this.currentEditedMediaField = null;
        },

        updatePreviewButton: function () {
            var itemHasLayout = this.get("itemHasLayout");
            if (itemHasLayout == "true") {
                this.DetailActionControl.getAction("Live Preview").isVisible(true);
            } else {
                this.DetailActionControl.getAction("Live Preview").isVisible(false);
            }
        },

        openProductsDialog: function () {
            this.MoreProductsDialog.show();
        },

        openCategoriesDialog: function () {
            this.MoreCategoriesDialog.show();
        },

        setLanguage: function () {
            this.determineLanguageToSet();
            var l = this.get("currentLanguage");
            this.Languages.set("selectedValue", l);
            this.Languages.on("change:selectedItemId", this.selectedLanguageChange, this);
        },

        selectedLanguageChange: function () {
            var currentPath = this.updateQueryStringParameter(window.location.href, "lang", this.Languages.get("selectedValue"));
            try {
                window.location.href = currentPath;
            } catch (e) {
                // stay on page
            }
        },

        addSpansToTabs: function () {
            $("li[data-tab-id=\\{C1443AB3-0595-4DC6-8767-7CEBFB5EA545\\}] > a", this.tabStrip).append("<span class='badge'></span>"); // Subcategories 
            $("li[data-tab-id=\\{254761AD-D396-45A7-83FD-C0654CB32B55\\}] > a", this.tabStrip).append("<span class='badge'></span>"); // Products
            $("li[data-tab-id=\\{A21D2D90-0932-4A03-BD62-F09446806AF3\\}] > a", this.tabStrip).append("<span class='badge'></span>"); // Parents
            $("li[data-tab-id=\\{286B660C-7F15-4C2C-8F19-493AC294C0BA\\}] > a", this.tabStrip).append("<span class='badge'></span>"); // Relationships
            $("li[data-tab-id=\\{06252F47-CB5B-49ED-8813-4F9DFD5F5714\\}] > a", this.tabStrip).append("<label style=\"display:inline\"></label>"); // Details 
        },

        relationshipCountChanged: function () {
            var count = this.RelationshipsDataSource.get("totalItemCount") > 99 ? "99+" : this.RelationshipsDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{286B660C-7F15-4C2C-8F19-493AC294C0BA\\}] > a > span", this.tabStrip).html(count);
        },

        parentsCountChanged: function () {
            var count = this.ParentsDataSource.get("totalItemCount") > 99 ? "99+" : this.ParentsDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{A21D2D90-0932-4A03-BD62-F09446806AF3\\}] > a > span", this.tabStrip).html(count);
        },

        categoryCountChanged: function () {
            var count = this.CategoryDataSource.get("totalItemCount") > 99 ? "99+" : this.CategoryDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{C1443AB3-0595-4DC6-8767-7CEBFB5EA545\\}] > a > span", this.tabStrip).html(count);
        },

        productCountChanged: function () {
            var count = this.ProductDataSource.get("totalItemCount") > 99 ? "99+" : this.ProductDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{254761AD-D396-45A7-83FD-C0654CB32B55\\}] > a > span", this.tabStrip).html(count);
        },

        // Tab functions
        isSubcategoriesTabSelected: function () {
            return this.ChildrenTabs.get("selectedTab") == "{C1443AB3-0595-4DC6-8767-7CEBFB5EA545}";
        },

        isProductTabSelected: function () {
            return this.ChildrenTabs.get("selectedTab") == "{254761AD-D396-45A7-83FD-C0654CB32B55}";
        },

        isParentsTabSelected: function () {
            return this.ChildrenTabs.get("selectedTab") == "{A21D2D90-0932-4A03-BD62-F09446806AF3}";
        },

        isRelationshipsTabSelected: function () {
            return this.ChildrenTabs.get("selectedTab") == "{286B660C-7F15-4C2C-8F19-493AC294C0BA}";
        },

        isDetailsTabSelected: function () {
            return this.ChildrenTabs.get("selectedTab") == "{06252F47-CB5B-49ED-8813-4F9DFD5F5714}";
        },
        // End tab function

        selectedTabChanged: function () {
            this.set("selectedTab", this.ChildrenTabs.get("selectedTab"));
            isUpdate = false;

            if (this.get("selectedTab") == "{C1443AB3-0595-4DC6-8767-7CEBFB5EA545}") { // Categories
                this.loadCategoryTab();
                
                if (!this.isAXEnabled) {
                    this.CategoryActionControl.getAction("Remove").isEnabled(this.isAnItemSelected(this.CategoryList));
                }
                if (this.listViewMode == "TileList") {
                    this.CategoryTileSortComboBox.set("isVisible", true);
                    this.ProductTileSortComboBox.set("isVisible", false);
                    this.ParentTileSortComboBox.set("isVisible", false);
                }

            } else if (this.get("selectedTab") == "{254761AD-D396-45A7-83FD-C0654CB32B55}") { // Products
                this.loadProductTab();
                if (!this.isAXEnabled) {
                    this.ProductActionControl.getAction("Remove").isEnabled(this.isAnItemSelected(this.ProductList));
                }
                if (this.listViewMode == "TileList") {
                    this.CategoryTileSortComboBox.set("isVisible", false);
                    this.ProductTileSortComboBox.set("isVisible", true);
                    this.ParentTileSortComboBox.set("isVisible", false);
                }

            } else if (this.get("selectedTab") == "{06252F47-CB5B-49ED-8813-4F9DFD5F5714}") { // Details
                this.loadDetailsTab();

                this.CategoryTileSortComboBox.set("isVisible", false);
                this.ProductTileSortComboBox.set("isVisible", false);
                this.ParentTileSortComboBox.set("isVisible", false);

            } else if (this.get("selectedTab") == "{A21D2D90-0932-4A03-BD62-F09446806AF3}") { // Parents
                this.loadParents();

                if (this.listViewMode == "TileList") {
                    this.CategoryTileSortComboBox.set("isVisible", false);
                    this.ProductTileSortComboBox.set("isVisible", false);
                    this.ParentTileSortComboBox.set("isVisible", true);
                }

            } else if (this.get("selectedTab") == "{286B660C-7F15-4C2C-8F19-493AC294C0BA}") { // Relationships
                this.loadRelationships();
                if (!this.isAXEnabled) {
                    this.RelationshipActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.RelationshipsList));
                }
                this.CategoryTileSortComboBox.set("isVisible", false);
                this.ProductTileSortComboBox.set("isVisible", false);
                this.ParentTileSortComboBox.set("isVisible", false);
            }
        },

        // Load tabs
        loadDetailsTab: function () {
            this.CategoryList.set("isVisible", false);
            this.PendingCategoryChangesExpander.set("isVisible", false);
            this.ProductList.set("isVisible", false);
            this.PendingProductChangesExpander.set("isVisible", false);
            this.RelationshipsList.set("isVisible", false);
            this.PendingRelationshipChangesExpander.set("isVisible", false);
            this.ParentsList.set("isVisible", false);

            this.detailsVisibleProperty(true);
            this.selectActionControl("detail");

            this.Languages.set("isVisible", true);

            // Hide the Tile/List Buttons
            this.DetailListIconButton.set("isVisible", false);
            this.TileListIconButton.set("isVisible", false);

            // Facet visibility
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", false);

            //CommerceItem
            $(".cs-commerceitem").show();

            //ContextMenus
            this.AddNewCategoryContextMenu.set("isVisible", false);
            this.AddNewProductContextMenu.set("isVisible", false);

            window.location.hash = '#{06252F47-CB5B-49ED-8813-4F9DFD5F5714}';
        },

        loadParents: function () {
            this.CategoryList.set("isVisible", false);
            this.PendingCategoryChangesExpander.set("isVisible", false);
            this.ProductList.set("isVisible", false);
            this.PendingProductChangesExpander.set("isVisible", false);
            this.RelationshipsList.set("isVisible", false);
            this.PendingRelationshipChangesExpander.set("isVisible", false);
            this.ParentsList.set("isVisible", true);

            this.detailsVisibleProperty(false);
            this.selectActionControl("parent");

            this.Languages.set("isVisible", false);

            // Show the Tile/List Buttons
            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);

            // Facet visibility
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", false);

            //CommerceItem
            $(".cs-commerceitem").hide();

            //ContextMenus
            this.AddNewCategoryContextMenu.set("isVisible", false);
            this.AddNewProductContextMenu.set("isVisible", false);

            window.location.hash = '#{A21D2D90-0932-4A03-BD62-F09446806AF3}';
        },

        loadRelationships: function () {
            this.CategoryList.set("isVisible", false);
            this.PendingCategoryChangesExpander.set("isVisible", false);
            this.ProductList.set("isVisible", false);
            this.PendingProductChangesExpander.set("isVisible", false);
            this.RelationshipsList.set("isVisible", true);

            // Show pending relationship changes conditionally
            var showPendingRelationshipChanges = false;
            var relationshipChanges = this.RelationshipsPendingChangesList.get("items");
            if (relationshipChanges && relationshipChanges.length > 0) {
                showPendingRelationshipChanges = true;
            }
            this.PendingRelationshipChangesExpander.set("isVisible", showPendingRelationshipChanges);

            this.ParentsList.set("isVisible", false);

            this.detailsVisibleProperty(false);
            this.selectActionControl("relationship");

            this.Languages.set("isVisible", true);

            // Show the Tile/List Buttons
            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);

            // Facet visibility
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", false);

            //CommerceItem
            $(".cs-commerceitem").hide();

            //ContextMenus
            this.AddNewCategoryContextMenu.set("isVisible", false);
            this.AddNewProductContextMenu.set("isVisible", false);

            window.location.hash = '#{286B660C-7F15-4C2C-8F19-493AC294C0BA}';
        },

        loadCategoryTab: function () {
            this.CategoryList.set("isVisible", true);
            // Show category changes if there are any.
            this.pendingCategoryChangesItemsChanged();
            this.ProductList.set("isVisible", false);
            this.PendingProductChangesExpander.set("isVisible", false);
            this.RelationshipsList.set("isVisible", false);
            this.PendingRelationshipChangesExpander.set("isVisible", false);
            this.ParentsList.set("isVisible", false);

            this.detailsVisibleProperty(false);
            this.selectActionControl("category");

            this.Languages.set("isVisible", false);

            // Show the Tile/List Buttons
            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);

            // Facet visibility
            this.CategoryFacets.set("isVisible", true);
            this.ProductFacets.set("isVisible", false);

            //CommerceItem
            $(".cs-commerceitem").hide();

            //ContextMenus
            this.AddNewCategoryContextMenu.set("isVisible", false);
            this.AddNewProductContextMenu.set("isVisible", false);

            window.location.hash = '#{C1443AB3-0595-4DC6-8767-7CEBFB5EA545}';
        },

        loadProductTab: function () {
            this.CategoryList.set("isVisible", false);
            this.PendingCategoryChangesExpander.set("isVisible", false);
            this.ProductList.set("isVisible", true);

            // Show the pending product changes expander if changes have been made
            this.pendingProductChangesItemsChanged();
            this.RelationshipsList.set("isVisible", false);
            this.PendingRelationshipChangesExpander.set("isVisible", false);
            this.ParentsList.set("isVisible", false);

            this.detailsVisibleProperty(false);
            this.selectActionControl("product");

            this.Languages.set("isVisible", false);

            // Show the Tile/List Buttons
            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);

            // Facet visibility
            this.CategoryFacets.set("isVisible", false);
            this.ProductFacets.set("isVisible", true);

            //CommerceItem
            $(".cs-commerceitem").hide();

            //ContextMenus
            this.AddNewCategoryContextMenu.set("isVisible", false);
            this.AddNewProductContextMenu.set("isVisible", false);

            window.location.hash = '#{254761AD-D396-45A7-83FD-C0654CB32B55}';
        },
        // End load tabs

        initializeQueryProviders: function () {

            var categoryId = this.get("targetId");

            this.ParentsDataSource.set("commerceItemId", categoryId);
            this.ParentsDataSource.set("isReady", true);
            this.ParentsDataSource.refresh();

            this.RelationshipsDataSource.set("commerceItemId", categoryId);
            this.RelationshipsDataSource.set("language", this.get("currentLanguage"));
            this.RelationshipsDataSource.set("isReady", true);
            this.RelationshipsDataSource.refresh();

            this.CategoryDataSource.set("commerceItemId", categoryId);
            this.CategoryDataSource.set("isReady", true);
            this.CategoryDataSource.refresh();

            this.ProductDataSource.set("commerceItemId", categoryId);
            this.ProductDataSource.set("isReady", true);
            this.ProductDataSource.refresh();
        },

        detailsVisibleProperty: function (val) {
            this.ReadOnlyDefaultFields.set("isVisible", val);
            this.ExtendedFields.set("isVisible", val);
            this.CommerceImages.set("isVisible", val);
        },

        productDataSourceChange: function () {
            this.set("productsLoaded", true);
            this.set("productSearchBusy", false);

            var categoriesLoaded = this.get("categoriesLoaded");
            if (categoriesLoaded) {
                this.evalTabs();
            }
        },

        categoryDataSourceChange: function () {
            this.set("categoriesLoaded", true);
            this.set("categorySearchBusy", false);

            var productsLoaded = this.get("productsLoaded");
            if (productsLoaded) {
                this.evalTabs();
            }
        },

        parentsDataSourceChange: function () {
            this.set("parentSearchBusy", false);
            var parentCategoryItems = this.ParentsDataSource.get("items");
            if (this.DefaultCategoryComboBox) {
                var noPrimaryParentDisplayText = this.NoPrimaryParentText.get("text");
                if (parentCategoryItems) {
                    var noPrimaryParentItem = {
                        itemId: "noParent",
                        _displayname: noPrimaryParentDisplayText,
                        $icon: ""
                    };

                    parentCategoryItems.push(noPrimaryParentItem);
                    this.DefaultCategoryComboBox.set("items", parentCategoryItems);

                    if (this.defaultCategoryOnLoad) {
                        this.DefaultCategoryComboBox.set("selectedValue", this.defaultCategoryOnLoad);
                    } else {
                        // Need token to represent null/empty value as we cannot
                        // set the combo box selected value to null/empty.
                        this.DefaultCategoryComboBox.set("selectedValue", "noParent");
                    }
                }
            } else {
                if (parentCategoryItems) {
                    for (i = 0; i < parentCategoryItems.length; i++) {
                        if (parentCategoryItems[i].itemId == this.defaultCategoryOnLoad) {
                            this.DefaultCategoryText.set("text", parentCategoryItems[i]._displayname);
                            break;
                        }
                    }
                }
            }
        },

        relationshipsDataSourceChange: function () {
            this.set("relationshipSearchBusy", false);
        },

        evalTabs: function () {
            if (isUpdate || window.location.hash) {
                // don't change tab after update or if the tab is set in the url
                return;
            }

            var categoryItems = this.CategoryDataSource.get("items");
            var productItems = this.ProductDataSource.get("items");

            if ((categoryItems === null || categoryItems.length) === 0 && (productItems !== null && productItems.length > 0)) {
                this.ChildrenTabs.set("selectedTab", "{254761AD-D396-45A7-83FD-C0654CB32B55}");
            }
        },

        openItemPicker: function () {
            this.setDefaultPickerMode();
            this.ItemPicker.show();
            this.PickerPageSubApp.PickerSearchBox.viewModel.$el.focus();
        },

        openItemPickerInCategoryMode: function () {
            this.itemPickerCatalogFilter = this.currentCatalog;
            this.setCategoryOnlyPickerMode();
            this.setItemPickerHeaderTitle();
            this.ItemPicker.show();
            this.PickerPageSubApp.PickerSearchBox.viewModel.$el.focus();
        },

        openItemPickerInProductMode: function () {
            this.itemPickerCatalogFilter = this.currentCatalog;
            this.setProductOnlyPickerMode();
            this.setItemPickerHeaderTitle();
            this.ItemPicker.show();
            this.PickerPageSubApp.PickerSearchBox.viewModel.$el.focus();
        },

        addCrossSell: function () {
            this.addRelationship("CrossSell", "Cross-Sell");
        },

        addUpSell: function () {
            this.addRelationship("UpSell", "Up-Sell");
        },

        // NOTE: This function is obsolete. Use CommerceBasePage.addRelationship.
        addRelationShip: function (relationShipName, relationShipLabel) {
            this.addRelationship(relationShipName, relationShipLabel);
        },

        selectActionControl: function (actionName) {
                if (actionName == "none") {
                    this.CategoryActionControl.set("isVisible", false);
                    this.ProductActionControl.set("isVisible", false);
                    this.RelationshipActionControl.set("isVisible", false);
                    this.DetailActionControl.set("isVisible", false);
                    this.ParentActionControl.set("isVisible", false);
                } else if (actionName == "category") {
                    this.CategoryActionControl.set("isVisible", true);
                    this.ProductActionControl.set("isVisible", false);
                    this.RelationshipActionControl.set("isVisible", false);
                    this.DetailActionControl.set("isVisible", false);
                    this.ParentActionControl.set("isVisible", false);
                } else if (actionName == "product") {
                    this.ProductActionControl.set("isVisible", true);

                    this.CategoryActionControl.set("isVisible", false);
                    this.RelationshipActionControl.set("isVisible", false);
                    this.DetailActionControl.set("isVisible", false);
                    this.ParentActionControl.set("isVisible", false);
                } else if (actionName == "relationship") {
                    this.RelationshipActionControl.set("isVisible", true);

                    this.CategoryActionControl.set("isVisible", false);
                    this.ProductActionControl.set("isVisible", false);
                    this.DetailActionControl.set("isVisible", false);
                    this.ParentActionControl.set("isVisible", false);
                } else if (actionName == "detail") {
                    this.DetailActionControl.set("isVisible", true);

                    this.CategoryActionControl.set("isVisible", false);
                    this.ProductActionControl.set("isVisible", false);
                    this.RelationshipActionControl.set("isVisible", false);
                    this.ParentActionControl.set("isVisible", false);
                } else if (actionName == "parent") {
                    this.ParentActionControl.set("isVisible", true);

                    this.CategoryActionControl.set("isVisible", false);
                    this.ProductActionControl.set("isVisible", false);
                    this.RelationshipActionControl.set("isVisible", false);
                    this.DetailActionControl.set("isVisible", false);
                }
        },

        setItemPickerHeaderTitle: function (relationshipName) {
            if (relationshipName) {
                var titleFormat = this.ResourcesDictionary.get("ChooseRelationship");
                var titleText = Sitecore.Helpers.string.format(titleFormat, relationshipName, this.HeaderTitleLabel.get("text"), this.HeaderTitle.get("text"));
                $(".sc-dialogWindow-header-title").html(titleText);
            } else {
                var titleFormat = this.ResourcesDictionary.get("ChooseAssociation");
                var titleText = Sitecore.Helpers.string.format(titleFormat, this.HeaderTitleLabel.get("text"), this.HeaderTitle.get("text"));
                $(".sc-dialogWindow-header-title").html(titleText);
            }
        },

        toggleFilterPanel: function () {
            var isOpen = this.FilterPanel.get("isOpen");
            this.FilterPanel.set("isOpen", !isOpen);
        },

        infiniteScrollSubCategories: function () {
            var isBusy = this.CategoryDataSource.get("isBusy");
            var hasMoreItems = this.CategoryDataSource.get("hasMoreItems");

            if (this.isSubcategoriesTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.CategoryDataSource.next();
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

        infiniteScrollParents: function () {
            var isBusy = this.ParentsDataSource.get("isBusy");
            var hasMoreItems = this.ParentsDataSource.get("hasMoreItems");

            if (this.isParentsTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.ParentsDataSource.next();
                }
            }
        },

        infiniteScrollRelationships: function () {
            var isBusy = this.RelationshipsDataSource.get("isBusy");
            var hasMoreItems = this.RelationshipsDataSource.get("hasMoreItems");

            if (this.isRelationshipsTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.RelationshipsDataSource.next();
                }
            }
        },

        saveCategory: function () {
            var id = this.get("targetId");
            if (id) {
                isUpdate = true;
                this.updateCategory();
            } else {
                this.createCategory();
            }
        },

        updateCategory: function () {
            this.hideHeaderActionsMessage();
            var validationMessages = [];
            if (!this.validateRequiredFields(validationMessages)) {
                this.updateSaveButton(false);
                this.updateTabIndicator();
                this.showRequiredFieldsMessages(validationMessages);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();

            var d = this.FormRenderer.get("editFunctionBody");
            var baseFields = this.CategoryBaseFields.get("editFunctionBody");
            var currentLanguage = this.get("currentLanguage");

            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, d);
            if (!this.isAXEnabled) {
                this.addRendererFieldsToObject(dataObject, baseFields);
            }

            dataObject.images = this.CommerceImages.get("images");
            dataObject.currentLanguage = currentLanguage;

            //For Concurrency Saving
            dataObject.lastModified = this.get("lastModified");
            dataObject.overrideChanges = this.get("overrideChanges");

            if (this.DefaultCategoryComboBox) {
                var primaryParent = this.DefaultCategoryComboBox.get("selectedValue");
                if (primaryParent == "noParent") {
                    dataObject.primaryParentCategory = "";
                } else {
                    dataObject.primaryParentCategory = primaryParent;
                }
            }

            dataObject.addedProducts = this.getPendingProductOperations("Add");
            dataObject.addedCategories = this.getPendingCategoryOperations("Add");
            dataObject.removedProducts = this.getPendingProductOperations("Remove");
            dataObject.removedCategories = this.getPendingCategoryOperations("Remove");
            dataObject.addedRelationships = this.getPendingRelationshipOperations("Add");
            dataObject.deletedRelationships = this.getPendingRelationshipOperations("Delete");
            dataObject.editedRelationships = this.getPendingRelationshipOperations("Edit");

            var self = this;

            dataObject.itemId = this.get("targetId");
            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCategory/Update",
                type: "POST",
                headers: ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    var self = this;
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();
                        this.updateSaveButton(false);

                        //For Concurrency Saving
                        this.set("overrideChanges", false);

                        for (i = 0; i < data.Errors.length; i++) {
                            this.HeaderActionsMessageBar.addMessage("error", data.Errors[i].ErrorMessage);
                            $("[data-sc-id='" + data.Errors[i].ControlId + "']").addClass("sc-validation");
                            this.serverUpdateTabErrorIndicator(data.Errors[i].ControlId);
                        }
                        this.HeaderActionsMessageBar.set("isVisible", true);
                        $(".sc-validation").change(function () {
                            self.updateValidationError($(this));
                        });
                        $(".sc-validation.sc-datepicker").click(function () {
                            self.updateValidationError($(this));
                        });
                    } else if (data.Status == "priorUpdate") {
                        //For Concurrency Saving
                        this.ConcurrencyAlert.show();
                        this.hideInProgressMessage();
                    } else {
                        this.setPageIsDirty(false);
                        this.hideInProgressMessage(true);

                        this.ProductPendingChangesList.set("items", []);
                        this.CategoryPendingChangesList.set("items", []);
                        this.RelationshipsPendingChangesList.set("items", []);
                        this.ProductPendingChangesList.set("checkedItemIds", []);
                        this.CategoryPendingChangesList.set("checkedItemIds", []);
                        this.RelationshipsPendingChangesList.set("checkedItemIds", []);
                        this.pendingProductChanges = [];
                        this.pendingCategoryChanges = [];
                        this.pendingRelationshipChanges = [];

                        // Clear any exclusions on the data source
                        this.ProductDataSource.set("exclusions", "");
                        this.CategoryDataSource.set("exclusions", "");
                        this.RelationshipsDataSource.set("exclusions", "");

                        //For Concurrency Saving
                        this.set("overrideChanges", false);
                        if (data.Status.indexOf("success") === 0) {
                            this.set("lastModified", data.Status.split('|')[1]);
                        }

                        // Refresh the lists after a brief wait for the index update
                        setTimeout(function () {
                            self.CategoryDataSource.refresh();
                            self.ProductDataSource.refresh();
                            self.RelationshipsDataSource.refresh();
                        }, 2000);

                        if (data.RebuildRequired === true) {
                            var rebuildRequiredMessage = self.ClientErrorMessages.get("Custom Catalog Rebuild Required");
                            self.HeaderActionsMessageBar.removeMessages();
                            self.HeaderActionsMessageBar.addMessage("notification", rebuildRequiredMessage);
                            self.HeaderActionsMessageBar.set("isVisible", true);
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
            this.updateCategory();
            this.ConcurrencyAlert.hide();
        },

        createCategory: function () {
            this.hideHeaderActionsMessage();
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.updateSaveButton(false);
                this.updateTabIndicator();
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.hideHeaderActionsMessage();
            this.displayInProgressMessage();
            var d = this.FormRenderer.get("editFunctionBody");
            var baseFields = this.CategoryBaseFields.get("editFunctionBody");

            var currentLanguage = this.get("currentLanguage");

            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, d);
            this.addRendererFieldsToObject(dataObject, baseFields);

            dataObject.images = this.CommerceImages.get("images");
            dataObject.currentLanguage = currentLanguage;
            dataObject.templateId = this.get("templateId");
            dataObject.parentId = this.get("parentId");
            dataObject.name = this.Name.get("text") !== null ? this.Name.get("text").trim() : "";

            // Custom validation of name
            if (!this.isNameValid(dataObject.name)) {
                return;
            }

            var self = this;

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceCategory/Create",
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
                        this.hideInProgressMessageCreate(true, "Category Created");
                        this.setPageIsDirty(false);
                        this.set("newTargetId", data);                                              
                        setTimeout($.proxy(this.redirectToSavedCategory, this), 10000);
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

        redirectToSavedCategory: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/Category?target=' + this.get("newTargetId") + '#{06252F47-CB5B-49ED-8813-4F9DFD5F5714}');
        },

        updateValidationError: function (obj) {
            obj.removeClass("sc-validation");
            if ($(".sc-validation").length === 0) {
                this.updateSaveButton(true);
                this.updateTabIndicator();
                this.hideHeaderActionsMessage();
            }
        },

        itemPickerAcceptChanges: function () {
            this.ItemPicker.hide();

            var addedProducts = this.getItemPickerSelectedProducts();
            var addedCategories = this.getItemPickerSelectedCategories();

            if (this.currentRelationshipName) {

                var showWarning = false;
                var showTriedToAddParentWarning = false;
                var self = this;
                var attemptedCategoryAdds = addedCategories.length;
                var attemptedProductAdds = addedProducts.length;

                addedProducts = addedProducts.filter($.proxy(this.targetIsNotParent, this));
                addedCategories = addedCategories.filter($.proxy(this.targetIsNotParent, this));

                if (attemptedCategoryAdds > addedCategories.length || attemptedProductAdds > addedProducts.length) {
                    showTriedToAddParentWarning = true;
                }

                attemptedCategoryAdds = addedCategories.length;
                attemptedProductAdds = addedProducts.length;

                addedProducts = addedProducts.filter($.proxy(this.relationshipDoesNotExist, this));
                addedCategories = addedCategories.filter($.proxy(this.relationshipDoesNotExist, this));

                if (attemptedCategoryAdds > addedCategories.length || attemptedProductAdds > addedProducts.length) {
                    showWarning = true;
                }

                // do add relationship and clear flag
                var addedProductRelationships = [];
                var addedCategoryRelationships = [];
                var productListItems = [];
                var categoryListItems = [];

                for (i = 0; i < addedProducts.length; i++) {
                    // verify this hasn't already been added to pending changes
                    var alreadyInList = false;
                    for (j = 0; j < this.pendingRelationshipChanges.length; j++) {
                        if (this.pendingRelationshipChanges[j].targetItemId == addedProducts[i].itemId && this.pendingRelationshipChanges[j].relationshipName == this.currentRelationshipName) {
                            alreadyInList = true;
                            break;
                        }
                    }

                    if (!alreadyInList) {
                        var relationship = addedProducts[i].itemId + ";Product;" + this.currentRelationshipName;
                        addedProductRelationships.push(relationship);

                        var listItem = {
                            targetItemId: addedProducts[i].itemId,
                            pendingOperation: "Add",
                            relationshipName: this.currentRelationshipName,
                            relationshipTargetType: "Product",
                            displayName: addedProducts[i]._displayname,
                            relationshipDescription: ""
                        };

                        productListItems.push(listItem);
                    } else {
                        showWarning = true;
                    }
                }

                for (i = 0; i < addedCategories.length; i++) {
                    // verify this hasn't already been added to pending changes
                    var alreadyInList = false;
                    for (j = 0; j < this.pendingRelationshipChanges.length; j++) {
                        if (this.pendingRelationshipChanges[j].targetItemId == addedCategories[i].itemId && this.pendingRelationshipChanges[j].relationshipName == this.currentRelationshipName) {
                            alreadyInList = true;
                            break;
                        }
                    }

                    if (!alreadyInList) {
                        var relationship = addedCategories[i].itemId + ";Category;" + this.currentRelationshipName;
                        addedCategoryRelationships.push(relationship);

                        var categoryListItem = {
                            targetItemId: addedCategories[i].itemId,
                            pendingOperation: "Add",
                            relationshipName: this.currentRelationshipName,
                            relationshipTargetType: "Category",
                            displayName: addedCategories[i]._displayname,
                            relationshipDescription: ""
                        };

                        categoryListItems.push(categoryListItem);
                    } else {
                        showWarning = true;
                    }
                }

                if (showWarning) {
                    self.AddWarningMessageBar.set("isVisible", true);
                    setTimeout(function () {
                        self.AddWarningMessageBar.set("isVisible", false);
                    }, 3000);
                }

                if (showTriedToAddParentWarning) {
                    self.ErrorsMessageBar.set("isVisible", true);
                    var errorMessage = this.ClientErrorMessages.get("AddToParent");
                    self.ErrorsMessageBar.addMessage("warning", errorMessage);
                    setTimeout(function () {
                        self.ErrorsMessageBar.set("isVisible", false);
                    }, 3000);
                }

                var pendingRelationshipItems = this.RelationshipsPendingChangesList.get("items");
                var newPendingItems = pendingRelationshipItems.concat(productListItems).concat(categoryListItems);
                this.RelationshipsPendingChangesList.set("items", newPendingItems);
                this.pendingRelationshipChanges = newPendingItems;

                this.setPageIsDirty(true);

                this.currentRelationshipName = null;
            }
            else {
                // Server-side validation of pending adds
                // Remaining code for adding children to list is in this.processPendingAddValidationResponse
                var addedProductIds = CommerceUtilities.extractPropertyValues(addedProducts, "itemId");
                var addedCategoryIds = CommerceUtilities.extractPropertyValues(addedCategories, "itemId");
                var productsToValidate = CommerceUtilities.createDelimitedListFromArray(addedProductIds, null);
                var categoriesToValidate = CommerceUtilities.createDelimitedListFromArray(addedCategoryIds, null);
                var pendingAddsToValidate = CommerceUtilities.joinDelimitedLists(productsToValidate, categoriesToValidate, null);

                if (!pendingAddsToValidate) {
                    return;
                }

                this.serverValidatePendingAdds(pendingAddsToValidate);
            }
        },

        itemPickerClose: function () {
            this.ItemPicker.hide();
        },

        getPendingProductOperations: function (operation) {
            var pendingProductIds = "";
            for (i = 0; i < this.pendingProductChanges.length; i++) {
                if (this.pendingProductChanges[i].pendingOperation == operation) {
                    if (pendingProductIds) {
                        pendingProductIds += "|" + this.pendingProductChanges[i].itemId;
                    } else {
                        pendingProductIds = this.pendingProductChanges[i].itemId;
                    }
                }
            }

            return pendingProductIds;
        },

        getPendingCategoryOperations: function (operation) {
            var pendingCategoryIds = "";
            for (i = 0; i < this.pendingCategoryChanges.length; i++) {
                if (this.pendingCategoryChanges[i].pendingOperation == operation) {
                    if (pendingCategoryIds) {
                        pendingCategoryIds += "|" + this.pendingCategoryChanges[i].itemId;
                    } else {
                        pendingCategoryIds = this.pendingCategoryChanges[i].itemId;
                    }
                }
            }

            return pendingCategoryIds;
        },

        getPendingRelationshipOperations: function (operation) {
            var pendingRelationshipOps = "";
            if (operation == "Add") {
                for (i = 0; i < this.pendingRelationshipChanges.length; i++) {
                    if (this.pendingRelationshipChanges[i].pendingOperation == operation) {
                        if (pendingRelationshipOps) {
                            pendingRelationshipOps += "|";
                        }

                        var targetItemId = this.pendingRelationshipChanges[i].targetItemId;
                        var itemType = this.pendingRelationshipChanges[i].relationshipTargetType;
                        var relationshipName = this.pendingRelationshipChanges[i].relationshipName;
                        var relationshipDescription = this.pendingRelationshipChanges[i].relationshipDescription;
                        var createTwoWay = this.pendingRelationshipChanges[i].twoWay == undefined ? "false" : this.pendingRelationshipChanges[i].twoWay;
                        var secondaryDescription = this.pendingRelationshipChanges[i].secondaryDescription;

                        // itemId here is the target item id
                        pendingRelationshipOps += targetItemId + ";" + itemType + ";" + relationshipName + ";" + relationshipDescription + ";" + createTwoWay + ";" + secondaryDescription;
                    }
                }
            }
            if (operation == "Delete") {
                for (i = 0; i < this.pendingRelationshipChanges.length; i++) {
                    if (this.pendingRelationshipChanges[i].pendingOperation == operation) {
                        if (pendingRelationshipOps) {
                            pendingRelationshipOps += "|";
                        }

                        var targetItemId = this.pendingRelationshipChanges[i].targetItemId;
                        var itemType = this.pendingRelationshipChanges[i].relationshipTargetType;
                        var relationshipName = this.pendingRelationshipChanges[i].relationshipName;
                        var createTwoWay = this.pendingRelationshipChanges[i].twoWay == undefined ? "false" : this.pendingRelationshipChanges[i].twoWay;

                        // itemId here is the target item id
                        pendingRelationshipOps += targetItemId + ";" + itemType + ";" + relationshipName + ";" + createTwoWay;
                    }
                }
            }
            else if (operation == "Edit") {
                for (i = 0; i < this.editedRelationships.length; i++) {
                    if (pendingRelationshipOps) {
                        pendingRelationshipOps += "|";
                    }

                    var targetItemId = this.editedRelationships[i].targetItemId;
                    var itemType = this.editedRelationships[i].itemType;
                    var relationshipName = this.editedRelationships[i].relationshipName;
                    var relationshipDescription = this.editedRelationships[i].relationshipDescription;

                    // itemId here is the target item id
                    pendingRelationshipOps += targetItemId + ";" + itemType + ";" + relationshipName + ";" + relationshipDescription;
                }
            }
            return pendingRelationshipOps;
        },

        pendingProductChangesItemsChanged: function () {
            var showProductChangesExpander = false;
            if (this.ProductPendingChangesList && this.ProductPendingChangesList.get("items").length > 0) {
                showProductChangesExpander = true;
            }

            this.PendingProductChangesExpander.set("isVisible", showProductChangesExpander);
        },

        pendingCategoryChangesItemsChanged: function () {
            var showCategoryChangesExpander = false;
            if (this.CategoryPendingChangesList && this.CategoryPendingChangesList.get("items").length > 0) {
                showCategoryChangesExpander = true;
            }

            this.PendingCategoryChangesExpander.set("isVisible", showCategoryChangesExpander);
        },

        pendingRelationshipChangesItemsChanged: function () {
            var self = this;
            var showRelationshipChangesExpander = false;

            if (this.RelationshipsPendingChangesList && this.RelationshipsPendingChangesList.get("items").length > 0) {
                showRelationshipChangesExpander = true;
            }

            this.PendingRelationshipChangesExpander.set("isVisible", showRelationshipChangesExpander);

            var newRelationships = this.RelationshipsPendingChangesList.get("items");
            for (i = 0; i < newRelationships.length; i++) {
                if (newRelationships[i].pendingOperation == "Add") {
                    var elementId = newRelationships[i].targetItemId;
                    var descriptionTextBox = $(document.getElementById(elementId));
                    var updateRelationshipDescriptionDelegate = $.proxy(this.updatePendingRelationshipDescription, this);
                    descriptionTextBox.change(updateRelationshipDescriptionDelegate);
                } else {
                    var elementId = newRelationships[i].targetItemId + "_span";
                    var descriptionSpan = $(document.getElementById(elementId));
                    descriptionSpan.empty().html(newRelationships[i].relationshipDescription);
                }
            }
        },

        updatePendingRelationshipDescription: function (e) {
            var targetItemId = e.target.id;
            var relationships = this.RelationshipsPendingChangesList.get("items");

            for (i = 0; i < relationships.length; i++) {
                var itemId = relationships[i].targetItemId;
                if (itemId == targetItemId) {
                    relationships[i].relationshipDescription = $(e.target).val();
                    break;
                }
            }
        },

        removeSelectedProducts: function () {
            var selectedProducts = this.ProductList.get("checkedItems");
            var removedProducts = [];
            var productItems = this.ProductDataSource.get("items");
            var cleanedItems = [];

            if (selectedProducts && selectedProducts.length > 0) {
                for (i = 0; i < selectedProducts.length; i++) {
                    var product = {};
                    product.itemId = selectedProducts[i].itemId;
                    product._displayname = selectedProducts[i]._displayname;
                    product.pendingOperation = "Remove"; 
                    removedProducts[i] = product;
                }

                var selected = Enumerable.From(selectedProducts);
                for (i = 0; i < productItems.length; i++) {
                    var matches = selected.Where(function (x) { return x.itemId == productItems[i].itemId }).ToArray();
                    if (matches.length === 0) {
                        cleanedItems.push(productItems[i]);
                    }
                }

                // Update the ProductDataSource exclusions with the pending remove operations
                var removedProductIds = CommerceUtilities.extractPropertyValues(removedProducts, "itemId");
                var removedProductsDelimited = CommerceUtilities.createDelimitedListFromArray(removedProductIds);
                var exclusions = CommerceUtilities.joinDelimitedLists(this.ProductDataSource.get("exclusions"), removedProductsDelimited);
                this.ProductDataSource.set("exclusions", exclusions);

                this.pendingProductChanges = this.pendingProductChanges.concat(removedProducts);
                this.ProductPendingChangesList.set("items", this.pendingProductChanges);
                this.ProductDataSource.set("items", cleanedItems);
                this.ProductList.set("checkedItems", []);

                this.setPageIsDirty(true);
            }
        },

        removeSelectedCategories: function () {
            var selectedCategories = this.CategoryList.get("checkedItems");
            var removedCategories = [];
            var categoryItems = this.CategoryDataSource.get("items");
            var cleanedItems = [];

            if (selectedCategories && selectedCategories.length > 0) {
                for (i = 0; i < selectedCategories.length; i++) {
                    var category = {};
                    category.itemId = selectedCategories[i].itemId;
                    category._displayname = selectedCategories[i]._displayname;
                    category.pendingOperation = "Remove"; 
                    removedCategories[i] = category;
                }

                var selected = Enumerable.From(selectedCategories);
                for (i = 0; i < categoryItems.length; i++) {
                    var matches = selected.Where(function (x) { return x.itemId == categoryItems[i].itemId }).ToArray();
                    if (matches.length === 0) {
                        cleanedItems.push(categoryItems[i]);
                    }
                }

                // Update the CategoryDataSource exclusions with the pending remove operations
                var removedCategoryIds = CommerceUtilities.extractPropertyValues(removedCategories, "itemId");
                var removedCategoriesDelimited = CommerceUtilities.createDelimitedListFromArray(removedCategoryIds);
                var exclusions = CommerceUtilities.joinDelimitedLists(this.CategoryDataSource.get("exclusions"), removedCategoriesDelimited);
                this.CategoryDataSource.set("exclusions", exclusions);

                this.pendingCategoryChanges = this.pendingCategoryChanges.concat(removedCategories);
                this.CategoryPendingChangesList.set("items", this.pendingCategoryChanges);
                this.CategoryDataSource.set("items", cleanedItems);
                this.CategoryList.set("checkedItems", []);

                this.setPageIsDirty(true);
            }
        },

        processPendingAddValidationResponse: function (validationResponse) {

            var addedProducts = this.getItemPickerSelectedProducts();
            var addedCategories = this.getItemPickerSelectedCategories();
            var showWarningMessage = false;

            if (validationResponse) {

                if (!validationResponse.OperationValid) {
                    for (i = 0; i < addedProducts.length; i++) {
                        var itemId = addedProducts[i].itemId;
                        for (j = 0; j < validationResponse.InvalidAdds.length; j++) {
                            if (itemId == validationResponse.InvalidAdds[j]) {
                                // The current item already exists in the category
                                // Remove it from the items to be added to the pending list
                                addedProducts.splice(i, 1);
                                // Correct the counter
                                i--;
                            }
                        }
                    }

                    for (i = 0; i < addedCategories.length; i++) {
                        var itemId = addedCategories[i].itemId;
                        for (j = 0; j < validationResponse.InvalidAdds.length; j++) {
                            if (itemId == validationResponse.InvalidAdds[j]) {
                                // The current item already exists in the category
                                // Remove it from the items to be added to the pending list
                                addedCategories.splice(i, 1);
                                // Correct the counter
                                i--;
                            }
                        }
                    }

                    showWarningMessage = true;
                }
            }

            var validProductAdds = [];
            var validCategoryAdds = [];

            // Prevent adding same item multiple times
            if (addedProducts && addedProducts.length > 0) {
                for (i = 0; i < addedProducts.length; i++) {
                    var alreadyPending = false;
                    for (j = 0; j < this.pendingProductChanges.length; j++) {
                        if (addedProducts[i].itemId == this.pendingProductChanges[j].itemId) {
                            alreadyPending = true;
                            showWarningMessage = true;
                            break;
                        }
                    }

                    if (!alreadyPending) {
                        validProductAdds.push(addedProducts[i]);
                    }
                }
            }

            var pendingCategoryAdds = Enumerable.From(this.pendingCategoryChanges);
            if (addedCategories && addedCategories.length > 0) {
                for (i = 0; i < addedCategories.length; i++) {
                    var alreadyPending = false;
                    for (j = 0; j < this.pendingCategoryChanges.length; j++) {
                        if (addedCategories[i].itemId == this.pendingCategoryChanges[j].itemId) {
                            alreadyPending = true;
                            showWarningMessage = true;
                            break;
                        }
                    }

                    if (!alreadyPending) {
                        validCategoryAdds.push(addedCategories[i]);
                    }
                }
            }

            this.pendingProductChanges = this.pendingProductChanges.concat(validProductAdds);
            this.pendingCategoryChanges = this.pendingCategoryChanges.concat(validCategoryAdds);
            this.ProductPendingChangesList.set("items", this.pendingProductChanges);
            this.CategoryPendingChangesList.set("items", this.pendingCategoryChanges);
            var self = this;

            this.setPageIsDirty(true);

            if (showWarningMessage) {
                this.AddWarningMessageBar.set("isVisible", true);
                setTimeout(function () {
                    self.AddWarningMessageBar.set("isVisible", false);
                }, 15000);
            }
        },

        serverValidatePendingAdds: function (pendingAdds) {
            var categoryId = CommerceUtilities.loadPageVar("target");
            var self = this;

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/ValidatePendingCategoryAdds",
                type: "POST",
                headers: ajaxToken,
                data: {
                    pendingAdds: pendingAdds,
                    id: categoryId
                },
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    self.processPendingAddValidationResponse(data);
                }
            });
        },

        deleteSelectedRelationships: function () {
            var selectedRelationships = this.RelationshipsList.get("checkedItems");
            var listItems = [];
            var newExclusions = [];
            if (selectedRelationships && selectedRelationships.length > 0) {
                for (i = 0; i < selectedRelationships.length; i++) {

                    if (this.pendingRelationshipChanges && this.pendingRelationshipChanges.length > 0) {
                        var pendingMatches = this.pendingRelationshipChanges.filter(function (relationship) {
                            return selectedRelationships[i].RelationshipName == relationship.relationshipName &&
                                selectedRelationships[i].TargetItemId == relationship.targetItemId &&
                                relationship.pendingOperation == "Delete";
                        });

                        if (pendingMatches && pendingMatches.length > 0) {
                            continue;
                        }
                    }

                    var listItem = {
                        targetItemId: selectedRelationships[i].TargetItemId,
                        pendingOperation: "Delete",
                        relationshipName: selectedRelationships[i].RelationshipName,
                        relationshipTargetType: selectedRelationships[i].TargetItemType,
                        displayName: selectedRelationships[i]["__Display name"],
                        relationshipDescription: selectedRelationships[i].RelationshipDescription
                    };

                    listItems.push(listItem);
                    newExclusions.push(selectedRelationships[i].itemId);
                }

                this.setPageIsDirty(true);

                var newPendingChanges = this.pendingRelationshipChanges.concat(listItems);
                this.RelationshipsPendingChangesList.set("items", newPendingChanges);
                this.pendingRelationshipChanges = newPendingChanges;
                var currentRelationshipExclusions = this.RelationshipsDataSource.get("exclusions");
                var newExclusionsDelimited = CommerceUtilities.createDelimitedListFromArray(newExclusions);
                var exclusions = CommerceUtilities.joinDelimitedLists(this.RelationshipsDataSource.get("exclusions"), newExclusionsDelimited);
                this.RelationshipsDataSource.set("exclusions", exclusions);

                // Requery the datasource to exclude pending deletes
                this.RelationshipsDataSource.refresh();
            }
        },

        relationshipsListCheckedItemsChanged: function () {
            if (!this.isAXEnabled) {
                this.RelationshipActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.RelationshipsList));
            }
        },

        onSelectedCategoriesChanged: function () { 
            if (!this.isAXEnabled) {
                this.CategoryActionControl.getAction("Remove").isEnabled(this.isAnItemSelected(this.CategoryList));
            }
            this.CategoryActionControl.getAction("AddToWorkspace").isEnabled(this.isAnItemSelected(this.CategoryList));
        },

        onSelectedProductsChanged: function () {         
            if (!this.isAXEnabled) {
                this.ProductActionControl.getAction("Remove").isEnabled(this.isAnItemSelected(this.ProductList));
            }
            this.ProductActionControl.getAction("AddToWorkspace").isEnabled(this.isAnItemSelected(this.ProductList));
        },

        updateSaveButton: function (status) {
            if (this.CategoryActionControl) {
                this.CategoryActionControl.getAction("Save").isEnabled(status);
            }
            this.DetailActionControl.getAction("Save").isEnabled(status);
            if (this.ParentActionControl) {
                this.ParentActionControl.getAction("Save").isEnabled(status);
            }
            if (this.ProductActionControl) {
                this.ProductActionControl.getAction("Save").isEnabled(status);
            }
            if (this.RelationshipActionControl) {
                this.RelationshipActionControl.getAction("Save").isEnabled(status);
            }
        },

        updateTabIndicator: function () {
            var tabDetailsStatusElement = $("li[data-tab-id=\\{06252F47-CB5B-49ED-8813-4F9DFD5F5714\\}] > a > label", this.tabStrip);
            if ($(".sc-validation").length > 0) {
                tabDetailsStatusElement.html("<div class='warning16'>");
            } else {
                tabDetailsStatusElement.html("");
            }
        },

        relationshipDoesNotExist: function (item) {

            var existingRelationships = this.RelationshipsDataSource.get("items");
            for (i = 0; i < existingRelationships.length; i++) {
                if (item.itemId == existingRelationships[i].targetItemId &&
                    this.currentRelationshipName == existingRelationships[i].relationshipName) {
                    return false;
                }
            }

            return true;
        },

        relationshipsSelectedItemChanged: function () {

            var selectedRelationship = this.RelationshipsList.get("selectedItem");
            if (!selectedRelationship) {
                return;
            }

            var rowModel = selectedRelationship.viewModel;
            this.RelationshipNameTextBox.set("text", rowModel.RelationshipName());
            this.RelationshipTargetNameTextBox.set("text", rowModel["__Display name"]());
            this.RelationshipTargetTypeTextBox.set("text", rowModel.TargetItemType());
            this.RelationshipDescriptionTextArea.set("text", rowModel.RelationshipDescription());

            this.RelationshipPanel.set("isOpen", true);
        },

        acceptRelationshipChanges: function () {
            var selectedRelationship = this.RelationshipsList.get("selectedItem");
            if (!selectedRelationship) {
                return;
            }

            var relationshipModel = selectedRelationship.viewModel;
            relationshipModel.RelationshipDescription(this.RelationshipDescriptionTextArea.get("text"));
            this.updateEditedRelationships(relationshipModel);

            this.RelationshipPanel.set("isOpen", false);
        },

        updateEditedRelationships: function (relationship) {
            var updated = false;
            for (i = 0; i < this.editedRelationships.length; i++) {
                if (this.editedRelationships[i].targetItemId == relationship.TargetItemId() &&
                    this.editedRelationships[i].relationshipName == relationship.RelationshipName()) {

                    this.editedRelationships[i].relationshipDescription = relationship.RelationshipDescription();
                    updated = true;
                    break;
                }
            }

            if (!updated) {
                var editedRelationship = {
                    targetItemId: relationship.TargetItemId(),
                    relationshipName: relationship.RelationshipName(),
                    relationshipDescription: relationship.RelationshipDescription(),
                    itemType: relationship.TargetItemType()
                };

                this.editedRelationships.push(editedRelationship);
            }

            this.setPageIsDirty(true);
        },

        closeRelationshipPanel: function () {
            this.RelationshipPanel.set("isOpen", false);
        },

        determineLanguageToSet: function () {

            var language = CommerceUtilities.loadPageVar("lang");

            if (!language) {
                language = cbp.prototype.getCookie("commerceLang");
            }

            if (language) {

                var cultures = this.Languages.get("items");

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
            this.CategoryList.set("view", viewMode);
            this.ProductList.set("view", viewMode);
            this.ParentsList.set("view", viewMode);
            this.RelationshipsList.set("view", viewMode);

            // Update the user preference
            this.setUsersListViewPreference(viewMode);

            if (this.listViewMode == "TileList") {
                // switch to default sorting
                this.CategoryTileSortComboBox.trigger("change:selectedItem");
                this.ProductTileSortComboBox.trigger("change:selectedItem");
                this.ParentTileSortComboBox.trigger("change:selectedItem");

                this.checkListViewItems(this.CategoryList);
                this.checkListViewItems(this.ProductList);
                this.checkListViewItems(this.RelationshipsList);

                if (this.isSubcategoriesTabSelected()) {
                    this.CategoryTileSortComboBox.set("isVisible", true);
                    this.ProductTileSortComboBox.set("isVisible", false);
                    this.ParentTileSortComboBox.set("isVisible", false);
                } else if (this.isProductTabSelected()) { // product
                    this.CategoryTileSortComboBox.set("isVisible", false);
                    this.ProductTileSortComboBox.set("isVisible", true);
                    this.ParentTileSortComboBox.set("isVisible", false);
                } else if (this.isParentsTabSelected()) { // parents
                    this.CategoryTileSortComboBox.set("isVisible", false);
                    this.ProductTileSortComboBox.set("isVisible", false);
                    this.ParentTileSortComboBox.set("isVisible", true);
                } else {
                    this.CategoryTileSortComboBox.set("isVisible", false);
                    this.ProductTileSortComboBox.set("isVisible", false);
                    this.ParentTileSortComboBox.set("isVisible", false);
                }
            } else {
                this.CategoryTileSortComboBox.set("isVisible", false);
                this.ProductTileSortComboBox.set("isVisible", false);
                this.ParentTileSortComboBox.set("isVisible", false);
            }
        },
    });

    return Category;
});

document.body.addEventListener("mousedown", defineClientX, false);
var clientX = null;
function defineClientX(e) {
    clientX = e.clientX;
}