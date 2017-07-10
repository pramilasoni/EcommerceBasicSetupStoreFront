//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        CommerceBasePage: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceBasePage",
        WorkspaceHelper: "/sitecore/shell/client/Applications/MerchandisingManager/WorkspaceHelper",
        Sequencing: "/sitecore/shell/client/Applications/MerchandisingManager/Sequencing"
    }
});

define(["sitecore", "CommerceBasePage", "WorkspaceHelper", "Sequencing"], function (Sitecore, cbp, WorkspaceHelper, sequence) {
    var catalogName = "";
    var Workspace = cbp.extend({
        ajaxToken: {},
        workspace: null,
        selectedCategories: 0,
        selectedProducts: 0,
        relationshipType: "",
        styleLookup: [],
        deletePointer: null,
        initializingRelationshipsDialog: false,
        initializingVariantsDialog: false,
        tempDeletedRelationships: {},
        deletedRelationships: {},
        tempCreatedRelationships: {},
        createdRelationships: {},
        tempEditedVariantSharedFields: {},
        tempEditedProductRelationshipSharedFields: {},
        tempEditedCategoryRelationshipSharedFields: {},
        editedVariantSharedFields: {},
        editedProductRelationshipSharedFields: {},
        editedCategoryRelationshipSharedFields: {},
        dialogToRestore: null,
        productIndexBeingValidated: null,
        categoryIndexBeingValidated: null,
        activeElement: null,
        addClearStylesCallback: null,
        initialized: function () {
            cbp.prototype.initialized.call(this);
            this.HelpProvider.set("isReady", true);
            this.HelpProvider.refresh();
            this.set("selectedTab", "{4178FB21-7991-4F75-8868-9F949B8170B3}");
            this.listenTo(_sc, 'sc-deleteselected', this.deleteSelected);
            this.listenTo(_sc, 'sc-hide-deletealert', this.hideDeleteAlert);
            this.listenTo(_sc, 'sc-hide-promptsavechangesdialog', this.hidePromptSaveChangesDialog);
            this.listenTo(_sc, 'sc-cs-openrelationships', this.openRelationshipForValidation);
            this.listenTo(_sc, 'sc-cs-openvariants', this.openVariantsForValidation);

            // We need to initialize a single proxy to this function because of the
            // slick grid's subscribe/unsubscribe model and the correct resolution of this
            this.addClearStylesCallback = $.proxy(this.addClearStyleContent, this);

            this.set("isDirty", false);
            this.set("currentProduct", 0);
            this.set("currentProductFamily", 0);
            this.set("currentCategory", 0);
            this.set("currentError", 0);
            this.set("numberOfErrors", 0);
            this.set("currentLang", "");
            this.set("incrementCounter", true);

            this.on("change:currentError", this.setErrorButtonState, this);

            this.set("errorsInPage", { "CategoryTab": {}, "ProductTab": {} });

            this.SearchBox.viewModel.$el.after("<textarea id='searchBoxExtended' class='extendedSearchbox' rows='8' cols='50' style='display:none'/>");
            this.SearchBox.viewModel.$el.keyup(this.showHideExtendedSearchArea);
            $('#searchBoxExtended').on('keyup', $.proxy(this.addEnterKeySearchBox, this));

            this.AllColumns.set("configId", "{995BD98F-B709-439C-AE34-3369F4AD70C6}");
            this.AllColumns.set("isReady", true);
            this.AllColumns.refresh();

            this.ProductsAllColumns.set("configId", "{995BD98F-B709-439C-AE34-3369F4AD70C6}");
            this.ProductsAllColumns.set("isReady", true);
            this.ProductsAllColumns.refresh();

            this.CategoriesAllColumns.set("configId", "{995BD98F-B709-439C-AE34-3369F4AD70C6}");
            this.CategoriesAllColumns.set("isReady", true);
            this.CategoriesAllColumns.refresh();

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            this.ajaxToken[token.headerKey] = token.value;

            this.workspace = new WorkspaceHelper({ requestToken: this.ajaxToken });
            var self = this;

            this.ProductsSlickGrid.on("selectedRowChanged", this.productSelectedRowChanged, this);
            this.CategoriesSlickGrid.on("selectedRowChanged", this.categorySelectedRowChanged, this);

            this.RemoveProductRelationship.set("isEnabled", false);
            this.RemoveCategoryRelationship.set("isEnabled", false);
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.on("selectedRowChanged", this.productRelationshipSelectionChanged, this);
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.on("selectedRowChanged", this.categoryRelationshipSelectionChanged, this);

            var workspaceName = "Default";
            var productsControlFolder = self.ProductsSlickGrid.get("controlMappings");
            var categoryControlFolder = self.CategoriesSlickGrid.get("controlMappings");

            this.workspace.getWorkspaceLanguages(function (data) {
                self.ProductLanguagesComboBox.set("items", data.Items);

                // Set up the dialogs combo boxes
                self.LanguagesProductRel.set("items", data.Items);
                self.LanguagesProductRel.on("change:selectedValue", $.proxy(self.onProductRelationshipsLanguageChanged, self));
                // Variant dialog combo box
                self.Languages.set("items", data.Items);
                self.Languages.on("change:selectedValue", $.proxy(self.onVariantLanguageChanged, self));

                var defaultLanguage = self.getInitialLanguage(data.Items);

                // If present in the dropdown the default language will be selected, otherwise the dropdown
                // will be set to the first value
                if (defaultLanguage) {
                    self.ProductLanguagesComboBox.set("selectedValue", defaultLanguage);
                }

                self.ProductLanguagesComboBox.on("change:selectedValue", $.proxy(self.getWorkspaceProducts, self));

                // As per business requirements, hide the language picker if there are no languages (empty workspace)
                self.ProductLanguagesComboBox.set("isVisible", data.Items.length > 0);

                // Request the workspace items once the languages are known.
                self.getWorkspaceProducts();
            }, "Product", workspaceName);

            this.workspace.getWorkspaceLanguages(function (data) {
                self.CategoryLanguagesComboBox.set("items", data.Items);
                self.LanguagesRel.set("items", data.Items);
                self.LanguagesRel.on("change:selectedValue", $.proxy(self.onCategoryRelationshipsLanguageChanged, self));
                var defaultLanguage = self.getInitialLanguage(data.Items);

                // If present in the dropdown the default language will be selected, otherwise the dropdown
                // will be set to the first value
                if (defaultLanguage) {
                    self.CategoryLanguagesComboBox.set("selectedValue", defaultLanguage);
                }

                self.CategoryLanguagesComboBox.on("change:selectedValue", $.proxy(self.getWorkspaceCategories, self));

                // As per business requirements, hide the language picker if there are no languages (empty workspace)
                self.CategoryLanguagesComboBox.set("isVisible", data.Items.length > 0);

                // Request the workspace items once the languages are known.
                self.getWorkspaceCategories();

            }, "Category", workspaceName);

            $("li[data-tab-id=\\{4178FB21-7991-4F75-8868-9F949B8170B3\\}] > a").append("<span class='badge'></span>");
            $("li[data-tab-id=\\{80903895-822C-48AA-B6C8-6833AF398103\\}] > a").append("<span class='badge'></span>");

            this.on("change:isDirty", this.updateIsDirty, this);

            this.on("change:currentProduct", this.enableProductButtons, this);
            this.on("change:currentProductFamily", this.enableProductFamilyButtons, this);
            this.on("change:currentCategory", this.enableCategoryButtons, this);

            this.ProductsSlickGrid.on("rowCountChanged", this.productCountChanged, this);
            this.CategoriesSlickGrid.on("rowCountChanged", this.categoryCountChanged, this);

            this.CategoriesSlickGrid.on("change:hasChanges", this.categoryItemChanged, this);
            this.ProductsSlickGrid.on("change:hasChanges", this.productItemChanged, this);
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.on("change:hasChanges", this.productRelationshipItemChanged, this);
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.on("change:hasChanges", this.categoryRelationshipItemChanged, this);
            this.VariantsDialog.VariantsSlickGrid.on("change:hasChanges", this.variantItemChanged, this);

            this.WorkspaceTabs.on("change:selectedTab", this.selectedTabChanged, this);

            // Listen for shared field edit events
            $(document).on("onSlickGridSharedFieldEdited", $.proxy(this.onSharedFieldEdited, this));

            $(window).resize(function () {
                var width = self.WorkspaceTabs.viewModel.$el.width();
                $('#' + self.ProductsSlickGrid.get("gridId")).css("width", width);
                if (self.ProductsSlickGrid.get("grid") != null) {
                    self.ProductsSlickGrid.get("grid").resizeCanvas();
                }
                $('#' + self.CategoriesSlickGrid.get("gridId")).css("width", width);
                if (self.CategoriesSlickGrid.get("grid") != null) {
                    self.CategoriesSlickGrid.get("grid").resizeCanvas();
                }
                var width2 = self.ProductRelationshipsWindow.viewModel.$el.width();
                $('#' + self.ProductRelationshipsDialog.ProductRelationshipsGrid.get("gridId")).css("width", width2);
                if (self.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid") != null) {
                    self.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid").resizeCanvas();
                }
                var width3 = self.CategoryRelationshipsWindow.viewModel.$el.width();
                $('#' + self.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("gridId")).css("width", width3);
                if (self.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid") != null) {
                    self.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid").resizeCanvas();
                }
                var width4 = self.VariantsWindow.viewModel.$el.width();
                $('#' + self.VariantsDialog.VariantsSlickGrid.get("gridId")).css("width", width4);
                if (self.VariantsDialog.VariantsSlickGrid.get("grid") != null) {
                    self.VariantsDialog.VariantsSlickGrid.get("grid").resizeCanvas();
                }
            });
        },

        disableIfAX: function () {
            $(".cs-basefields :input").prop("disabled", true);

            //this.Save_Products.set("isEnabled", false);
            this.RemoveProductRelationship.set("isEnabled", false);
            this.AddProductRelationship.set("isEnabled", false);
            this.DownProductRelationship.set("isEnabled", false);
            this.UpProductRelationship.set("isEnabled", false);
           // this.Save_Categories.set("isEnabled", false);
            this.CategoryColumnPickerButton.set("isEnabled", false);
            this.RemoveCategoryRelationship.set("isEnabled", false);
            this.AddCategoryRelationship.set("isEnabled", false);
            this.DownCategoryRelationship.set("isEnabled", false);
            this.UpCategoryRelationship.set("isEnabled", false);

            $(".sc-CommerceDateTime :input").prop("disabled", true);
        },

        openVariantsForValidation: function (row) {
            this.productIndexBeingValidated = row;
            this.getVariants(row);
        },

        openRelationshipForValidation: function (row, isProduct) {
            if (isProduct) {
                this.productIndexBeingValidated = row;
                this.getProductRelationships(row);
            } else {
                this.categoryIndexBeingValidated = row;
                this.getCategoryRelationships(row);
            }
        },

        setErrorButtonState: function () {
            if (this.get("currentError") == 1) {
                this.PrevIssue.set("isEnabled", false);
            } else {
                this.PrevIssue.set("isEnabled", true);
            }

            if (this.get("currentError") == this.get("errorsInPage").Errors.length) {
                this.NextIssue.set("isEnabled", false);
            } else {
                this.NextIssue.set("isEnabled", true);
            }
        },

        productRelationshipSelectionChanged: function () {
            var selected = this.ProductRelationshipsDialog.ProductRelationshipsGrid.selectedIndicies().length;
            var length = this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("items").length;
            var selectedIndex = this.ProductRelationshipsDialog.ProductRelationshipsGrid.selectedIndicies()[0];
            if (!this.isAXEnabled) {
                this.RemoveProductRelationship.set("isEnabled", selected > 0);
                if (selected == 1 && selectedIndex == 0 && length > 1) {
                    this.UpProductRelationship.set("isEnabled", false);
                    this.DownProductRelationship.set("isEnabled", true);
                } else if (selected == 1 && selectedIndex + 1 == length) {
                    if (length > 1) {
                        this.UpProductRelationship.set("isEnabled", true);
                    } else {
                        this.UpProductRelationship.set("isEnabled", false);
                    }

                    this.DownProductRelationship.set("isEnabled", false);
                } else if (selected == 1 && selectedIndex > 0 && selectedIndex != length) {
                    this.UpProductRelationship.set("isEnabled", true);
                    this.DownProductRelationship.set("isEnabled", true);
                } else {
                    this.UpProductRelationship.set("isEnabled", false);
                    this.DownProductRelationship.set("isEnabled", false);
                }
            }
        },

        categoryRelationshipSelectionChanged: function () {
            var selected = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.selectedIndicies().length;
            var length = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("items").length;
            var selectedIndex = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.selectedIndicies()[0];
            if (!this.isAXEnabled) {
                this.RemoveCategoryRelationship.set("isEnabled", selected > 0);
                if (selected == 1 && selectedIndex == 0 && length > 1) {
                    this.UpCategoryRelationship.set("isEnabled", false);
                    this.DownCategoryRelationship.set("isEnabled", true);
                } else if (selected == 1 && selectedIndex + 1 == length) {
                    if (length > 1) {
                        this.UpCategoryRelationship.set("isEnabled", true);
                    } else {
                        this.UpCategoryRelationship.set("isEnabled", false);
                    }

                    this.DownCategoryRelationship.set("isEnabled", false);
                } else if (selected == 1 && selectedIndex > 0 && selectedIndex != length) {
                    this.UpCategoryRelationship.set("isEnabled", true);
                    this.DownCategoryRelationship.set("isEnabled", true);
                }
                else {
                    this.UpCategoryRelationship.set("isEnabled", false);
                    this.DownCategoryRelationship.set("isEnabled", false);
                }
            }
        },

        moveProductUp: function () {
            var self = this;
            var indiciesAsArray = this.ProductRelationshipsDialog.ProductRelationshipsGrid.selectedIndicies();
            var selectedIndex = indiciesAsArray[0];
            var items = this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("items");
            var selectedItem = items[selectedIndex];
            var itemAbove = items[selectedIndex - 1];

            var selectedItemRank = selectedItem.Rank;
            selectedItem.Rank = itemAbove.Rank;
            itemAbove.Rank = selectedItemRank;

            selectedItem.isDirty = true;
            itemAbove.isDirty = true;

            //// Now bubble up event to set shared fields
            $(document).trigger("onSlickGridSharedFieldEdited", [{ item: selectedItem, column: "Rank", gridInstance: self.ProductRelationshipsDialog.ProductRelationshipsGrid }]);
            $(document).trigger("onSlickGridSharedFieldEdited", [{ item: itemAbove, column: "Rank", gridInstance: self.ProductRelationshipsDialog.ProductRelationshipsGrid }]);

            var seq = new sequence();
            seq.arrayMove(items, selectedIndex, selectedIndex - 1);

            this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("items", []);
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("items", items);

            // Change the selected index
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid").setSelectedRows([selectedIndex - 1]);
        },

        moveCategoryUp: function () {
            var self = this;
            var indiciesAsArray = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.selectedIndicies();
            var selectedIndex = indiciesAsArray[0];
            var items = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("items");
            var selectedItem = items[selectedIndex];
            var itemAbove = items[selectedIndex - 1];

            var selectedItemRank = selectedItem.Rank;
            selectedItem.Rank = itemAbove.Rank;
            itemAbove.Rank = selectedItemRank;

            selectedItem.isDirty = true;
            itemAbove.isDirty = true;

            $(document).trigger("onSlickGridSharedFieldEdited", [{ item: selectedItem, column: "Rank", gridInstance: self.CategoryRelationshipsDialog.CategoryRelationshipsGrid }]);
            $(document).trigger("onSlickGridSharedFieldEdited", [{ item: itemAbove, column: "Rank", gridInstance: self.CategoryRelationshipsDialog.CategoryRelationshipsGrid }]);

            var seq = new sequence();
            seq.arrayMove(items, selectedIndex, selectedIndex - 1);

            // Cheat 
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("items", []);
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("items", items);

            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid").setSelectedRows([selectedIndex - 1]);
        },

        moveProductDown: function () {
            var self = this;
            var indiciesAsArray = this.ProductRelationshipsDialog.ProductRelationshipsGrid.selectedIndicies();
            var selectedIndex = indiciesAsArray[0];
            var items = this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("items");
            var selectedItem = items[selectedIndex];
            var itemBelow = items[selectedIndex + 1];

            var selectedItemRank = selectedItem.Rank;
            selectedItem.Rank = itemBelow.Rank;
            itemBelow.Rank = selectedItemRank;

            selectedItem.isDirty = true;
            itemBelow.isDirty = true;

            $(document).trigger("onSlickGridSharedFieldEdited", [{ item: selectedItem, column: "Rank", gridInstance: self.ProductRelationshipsDialog.ProductRelationshipsGrid }]);
            $(document).trigger("onSlickGridSharedFieldEdited", [{ item: itemBelow, column: "Rank", gridInstance: self.ProductRelationshipsDialog.ProductRelationshipsGrid }]);

            var seq = new sequence();
            seq.arrayMove(items, selectedIndex, selectedIndex + 1);

            // Cheat 
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("items", []);
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("items", items);

            this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid").setSelectedRows([selectedIndex + 1]);
        },

        moveCategoryDown: function () {
            var self = this;
            var indiciesAsArray = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.selectedIndicies();
            var selectedIndex = indiciesAsArray[0];
            var items = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("items");
            var selectedItem = items[selectedIndex];
            var itemBelow = items[selectedIndex + 1];

            var selectedItemRank = selectedItem.Rank;
            selectedItem.Rank = itemBelow.Rank;
            itemBelow.Rank = selectedItemRank;

            selectedItem.isDirty = true;
            itemBelow.isDirty = true;

            $(document).trigger("onSlickGridSharedFieldEdited", [{ item: selectedItem, column: "Rank", gridInstance: self.CategoryRelationshipsDialog.CategoryRelationshipsGrid }]);
            $(document).trigger("onSlickGridSharedFieldEdited", [{ item: itemBelow, column: "Rank", gridInstance: self.CategoryRelationshipsDialog.CategoryRelationshipsGrid }]);

            var seq = new sequence();
            seq.arrayMove(items, selectedIndex, selectedIndex + 1);

            // Cheat 
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("items", []);
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("items", items);

            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid").setSelectedRows([selectedIndex + 1]);
        },

        updateIsDirty: function () {
            // Take the value of the observable and stick it in the base property so that 
            // the navigate away code still works
            this.isDirty = this.get("isDirty");

            // Update the buttons
            this.Save_Products.set("isEnabled", this.isDirty);
            this.Save_Categories.set("isEnabled", this.isDirty);
            if (!this.isDirty) {
                // Update the field on the grids
                this.ProductsSlickGrid.set("hasChanges", false);
                this.CategoriesSlickGrid.set("hasChanges", false);
            }
        },

        getWorkspaceProducts: function () {
            // The initial product language will either be the logged in language or the first 
            // available from the drop down
            var productLanguage = this.ProductLanguagesComboBox.get("selectedValue");
            var productsControlFolder = this.ProductsSlickGrid.get("controlMappings");

            var self = this;

            // Check to see if the grid already has the language loaded.
            // If so, just switch to it. Otherwise, load the items in that language and set them in the grid.
            if (this.ProductsSlickGrid.hasLanguage(productLanguage)) {

                this.ProductsSlickGrid.setLanguage(productLanguage);
                this.SetSupportedLanguageStyle();
            } else {
                this.workspace.getItems(function (data) {
                    self.ProductsSlickGrid.setDataItems(data.Items, productLanguage);
                    // The grid's rowCountChanged event may not fire until grid has completed loading. 
                    // For page-load, explicitly update the item counts on the tabs.
                    var itemCount = data.Items ? data.Items.length : 0;
                    self.productCountChanged(itemCount);
                    var width = self.WorkspaceTabs.viewModel.$el.width();
                    $('#' + self.ProductsSlickGrid.get("gridId")).css("width", width);
                    if (self.ProductsSlickGrid.get("grid") != null) {
                        self.ProductsSlickGrid.get("grid").resizeCanvas();
                    }
                    self.SetSupportedLanguageStyle();
                }, "Product", "Default", productsControlFolder, productLanguage);
            }

            this.addRemoveStylesOnLanguageChange(productLanguage, "Product");
        },

        getWorkspaceCategories: function () {
            // The initial product language will either be the logged in language or the first 
            // available from the drop down
            var categoryLanguage = this.CategoryLanguagesComboBox.get("selectedValue");
            var categoriesControlFolder = this.CategoriesSlickGrid.get("controlMappings");

            var self = this;

            // Check to see if the grid already has the language loaded.
            // If so, just switch to it. Otherwise, load the items in that language and set them in the grid.
            if (this.CategoriesSlickGrid.hasLanguage(categoryLanguage)) {

                this.CategoriesSlickGrid.setLanguage(categoryLanguage);
                this.SetSupportedLanguageStyle();
            } else {
                this.workspace.getItems(function (data) {
                    self.CategoriesSlickGrid.setDataItems(data.Items, categoryLanguage);
                    // The grid's rowCountChanged event may not fire until grid has completed loading. 
                    // For page-load, explicitly update the item counts on the tabs.
                    var itemCount = data.Items ? data.Items.length : 0;
                    self.categoryCountChanged(itemCount);
                    var width = self.WorkspaceTabs.viewModel.$el.width();
                    $('#' + self.CategoriesSlickGrid.get("gridId")).css("width", width);
                    if (self.CategoriesSlickGrid.get("grid") != null) {
                        self.CategoriesSlickGrid.get("grid").resizeCanvas();
                    }
                    self.SetSupportedLanguageStyle();
                }, "Category", "Default", categoriesControlFolder, categoryLanguage);
            }
            this.addRemoveStylesOnLanguageChange(categoryLanguage, "Category");
        },

        selectedTabChanged: function (sender) {
            var selected = this.WorkspaceTabs.get("selectedTab");
            this.set("selectedTab", selected);
            var width = this.WorkspaceTabs.viewModel.$el.width();
            if (selected == "{4178FB21-7991-4F75-8868-9F949B8170B3}") {

                $('#' + this.ProductsSlickGrid.get("gridId")).css("width", width);
                var productsSlickGrid = this.ProductsSlickGrid.get("grid");
                if (productsSlickGrid) {
                    productsSlickGrid.autosizeColumns();
                    productsSlickGrid.resizeCanvas();
                }
            } else {

                $('#' + this.CategoriesSlickGrid.get("gridId")).css("width", width);
                var categoriesSlickGrid = this.CategoriesSlickGrid.get("grid");
                if (categoriesSlickGrid) {
                    categoriesSlickGrid.autosizeColumns();
                    categoriesSlickGrid.resizeCanvas();
                }
            }
        },

        categoryItemChanged: function (sender, hasChanges) {
            if (this.CategoriesSlickGrid.get("hasChanges") == true) {
                this.set("isDirty", true);
            }
        },

        productItemChanged: function (sender, hasChanges) {
            if (this.ProductsSlickGrid.get("hasChanges") == true) {
                this.set("isDirty", true);
            }
        },

        productRelationshipItemChanged: function (sender, hasChanges) {
            if (this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("hasChanges") == true) {
                this.set("isDirty", true);
            }
        },

        categoryRelationshipItemChanged: function (sender, hasChanges) {
            if (this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("hasChanges") == true) {
                this.set("isDirty", true);
            }
        },

        variantItemChanged: function (sender, hasChanges) {
            if (this.VariantsDialog.VariantsSlickGrid.get("hasChanges") == true) {
                this.set("isDirty", true);
            }
        },

        updateCategoryContextMenuAxis: function () {
            this.CategoryRelationshipContextMenu.set("axis", (this.AddCategoryRelationship.viewModel.$el.position().left - 138) + "px")
            this.CategoryRelationshipContextMenu.toggle();
        },

        updateProductContextMenuAxis: function () {
            this.ProductRelationshipContextMenu.set("axis", (this.AddProductRelationship.viewModel.$el.position().left - 138) + "px")
            this.ProductRelationshipContextMenu.toggle();
        },

        addCategoryCrossSell: function () {
            this.addCategoryRelationShip("CrossSell");
        },

        addCategoryUpSell: function () {
            this.addCategoryRelationShip("UpSell");
        },

        addProductCrossSell: function () {
            this.addProductRelationShip("CrossSell");
        },

        addProductUpSell: function () {
            this.addProductRelationShip("UpSell");
        },

        addCategoryRelationShip: function (relationShipName) {
            this.relationshipType = "Category";
            this.itemPickerCatalogFilter = null;
            this.currentRelationshipName = relationShipName;
            this.setDefaultPickerMode();
            this.ItemPicker.show();
            this.CategoryRelationshipContextMenu.toggle();
            this.PickerPageSubApp.PickerSearchBox.viewModel.$el.focus();
        },

        addProductRelationShip: function (relationShipName) {
            this.relationshipType = "Product";
            this.itemPickerCatalogFilter = null;
            this.currentRelationshipName = relationShipName;
            this.setDefaultPickerMode();
            this.ItemPicker.show();
            this.ProductRelationshipContextMenu.toggle();
            this.PickerPageSubApp.PickerSearchBox.viewModel.$el.focus();
        },

        itemPickerClose: function () {
            this.ItemPicker.hide();
            if (this.relationshipType == "Product") {
                this.ProductRelationshipsWindow.show();
            } else {
                this.CategoryRelationshipsWindow.show();
            }
        },

        itemPickerAcceptChanges: function () {
            this.ItemPicker.hide();
            var canReadWrite = { 'CanRead': 'true', 'CanWrite': 'true' };
            var security = { 'IsReciprocal': canReadWrite, 'RelationshipName': canReadWrite, 'RelationshipDescription': canReadWrite, };

            if (this.relationshipType == "Product") {
                this.ProductRelationshipsWindow.show();
                var dataView = this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("dataView");
                var addedProducts = this.getItemPickerSelectedProducts();
                var addedCategories = this.getItemPickerSelectedCategories();
                var selectedRows = this.ProductsSlickGrid.selectedIndicies();
                var currentLanguage = this.LanguagesProductRel.get("selectedValue");
                var currentlySelectedProduct = this.ProductsSlickGrid.getDataItems(currentLanguage)[selectedRows[this.get("currentProduct")]];

                if (addedProducts.length > 0) {
                    for (var i = 0; i < addedProducts.length; i++) {
                        var createdRelationshipToProduct = this.getRelationshipObject(addedProducts[i], security, "Product");
                        createdRelationshipToProduct.Rank = this.getNextRankForProductRelationships();
                        currentlySelectedProduct.TempRelationships.push(createdRelationshipToProduct);
                        if (!this.tempCreatedRelationships[currentlySelectedProduct.itemId]) {
                            this.tempCreatedRelationships[currentlySelectedProduct.itemId] = [];
                        }

                        // We only want one to have the created flag set to true - use a copy to 
                        // update the other languages and set its create flag to false.
                        var createdRelationshipToProductCopy = $.extend(true, {}, createdRelationshipToProduct);
                        createdRelationshipToProductCopy["__New"] = false;
                        this.tempCreatedRelationships[currentlySelectedProduct.itemId].push(createdRelationshipToProductCopy);
                    }
                }

                if (addedCategories.length > 0) {
                    for (var i = 0; i < addedCategories.length; i++) {
                        var createdRelationshipToCategory = this.getRelationshipObject(addedCategories[i], security, "Category");
                        createdRelationshipToCategory.Rank = this.getNextRankForProductRelationships();
                        currentlySelectedProduct.TempRelationships.push(createdRelationshipToCategory);
                        if (!this.tempCreatedRelationships[currentlySelectedProduct.itemId]) {
                            this.tempCreatedRelationships[currentlySelectedProduct.itemId] = [];
                        }

                        // We only want one to have the created flag set to true - use a copy to 
                        // update the other languages and set its create flag to false.
                        var createdRelationshipToCategoryCopy = $.extend(true, {}, createdRelationshipToCategory);
                        createdRelationshipToCategoryCopy["__New"] = false;
                        this.tempCreatedRelationships[currentlySelectedProduct.itemId].push(createdRelationshipToCategoryCopy);
                    }
                }

                if (addedProducts.length > 0 || addedCategories.length > 0) {
                    // Update the dialog slick grid
                    this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("items", []);
                    this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("items", currentlySelectedProduct.TempRelationships);
                    currentlySelectedProduct.isDirty = true;
                }

                // Get the rows to apply the combobox style
                this.applyComboboxStyle(this.ProductRelationshipsDialog.ProductRelationshipsGrid);
                $('#' + this.ProductRelationshipsDialog.ProductRelationshipsGrid.viewModel.gridId()).css("width", this.ProductRelationshipsWindow.viewModel.$el.width());
                this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid").resizeCanvas();
                this.ProductsSlickGrid.set("hasChanges", true);

            } else {
                this.CategoryRelationshipsWindow.show();
                var dataView = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("dataView");

                var selectedRows = this.CategoriesSlickGrid.selectedIndicies();
                var currentLanguage = this.LanguagesRel.get("selectedValue");
                var currentlySelectedCategory = this.CategoriesSlickGrid.getDataItems(currentLanguage)[selectedRows[this.get("currentCategory")]];

                var addedProducts = this.getItemPickerSelectedProducts();
                var addedCategories = this.getItemPickerSelectedCategories();

                if (addedProducts.length > 0) {
                    for (var i = 0; i < addedProducts.length; i++) {
                        var createdRelationshipToProduct = this.getRelationshipObject(addedProducts[i], security, "Product");
                        createdRelationshipToProduct.Rank = this.getNextRankForCategoryRelationships();
                        currentlySelectedCategory.TempRelationships.push(createdRelationshipToProduct);
                        if (!this.tempCreatedRelationships[currentlySelectedCategory.itemId]) {
                            this.tempCreatedRelationships[currentlySelectedCategory.itemId] = [];
                        }

                        // We only want one to have the created flag set to true - use a copy to 
                        // update the other languages and set its create flag to false.
                        var createdRelationshipToProductCopy = $.extend(true, {}, createdRelationshipToProduct);
                        createdRelationshipToProductCopy["__New"] = false;
                        this.tempCreatedRelationships[currentlySelectedCategory.itemId].push(createdRelationshipToProductCopy);
                    }
                }

                if (addedCategories.length > 0) {
                    for (var i = 0; i < addedCategories.length; i++) {
                        var createdRelationshipToCategory = this.getRelationshipObject(addedCategories[i], security, "Category");
                        createdRelationshipToCategory.Rank = this.getNextRankForCategoryRelationships();
                        currentlySelectedCategory.TempRelationships.push(createdRelationshipToCategory);
                        if (!this.tempCreatedRelationships[currentlySelectedCategory.itemId]) {
                            this.tempCreatedRelationships[currentlySelectedCategory.itemId] = [];
                        }

                        // We only want one to have the created flag set to true - use a copy to 
                        // update the other languages and set its create flag to false.
                        var createdRelationshipToCategoryCopy = $.extend(true, {}, createdRelationshipToCategory);
                        createdRelationshipToCategoryCopy["__New"] = false;
                        this.tempCreatedRelationships[currentlySelectedCategory.itemId].push(createdRelationshipToCategoryCopy);
                    }
                }

                if (addedProducts.length > 0 || addedCategories.length > 0) {
                    this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("items", []);
                    this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("items", currentlySelectedCategory.TempRelationships);
                    currentlySelectedCategory.isDirty = true;
                }

                // Get the rows to apply the combobox style
                this.applyComboboxStyle(this.CategoryRelationshipsDialog.CategoryRelationshipsGrid);
                $('#' + this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.viewModel.gridId()).css("width", this.CategoryRelationshipsWindow.viewModel.$el.width());
                this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid").resizeCanvas();
                this.CategoriesSlickGrid.set("hasChanges", true);
            }

            this.set("isDirty", true);
        },

        applyComboboxStyle: function (grid) {
            var slickg = grid.get("grid");
            for (var i = 0; i < grid.get("items").length; i++) {
                if (grid.get("items")[i].id != undefined) {
                    var cssObject = {};
                    cssObject[i] = {};
                    cssObject[i]["IsReciprocal"] = "combo-style";
                    cssObject[i]["RelationshipName"] = "combo-style";
                    slickg.setCellCssStyles("relationship-" + slickg.getContainerNode().id + "-" + i, cssObject)
                }
            }
        },

        getNextRankForProductRelationships: function () {
            var items = this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("items");
            return this.maxRank(items) + 1;
        },

        getNextRankForCategoryRelationships: function () {
            var items = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("items");
            return this.maxRank(items) + 1;
        },

        maxRank: function (items) {
            var values = items.map(function (el) {
                return el["Rank"];
            });

            var num = Math.max.apply(Math, values);
            if (num == Number.NEGATIVE_INFINITY) {
                return 0;
            }

            return num;
        },

        getRelationshipObject: function (added, security, type) {
            var id = CommerceUtilities.newTempGuid();
            var relationship = {
                'SupportsRequestedLanguage': true,
                'CatalogName': added.catalogName,
                '{00000000-0000-0000-0000-000000000000}': added.name,
                'IsReciprocal': 'One-way',
                'RelationshipDescription': '',
                'RelationshipName': this.currentRelationshipName,
                'TargetCatalogDisplayName': added.catalogDisplayName,
                'TargetItemType': type,
                '_Security': security,
                '__Display name': added._displayname,
                'targetItemId': added.itemId,
                '__New': true,
                'itemId': id,
                'id': id
            }

            return relationship;
        },

        productCountChanged: function (count) {
            $("li[data-tab-id=\\{4178FB21-7991-4F75-8868-9F949B8170B3\\}] > a > span.badge:not(.error-badge)").html(count);
        },

        categoryCountChanged: function (count) {
            $("li[data-tab-id=\\{80903895-822C-48AA-B6C8-6833AF398103\\}] > a > span.badge:not(.error-badge)").html(count);
        },

        enableProductButtons: function () {
            var sel = this.ProductsSlickGrid.selectedIndicies();
            var currentPF = this.get("currentProduct");
            if (currentPF == 0 && sel.length == 1) {
                this.PrevProductRelationship.set("isEnabled", false);
                this.NextProductRelationship.set("isEnabled", false);
            }

            if (currentPF > 0 && currentPF < sel.length - 1) {
                this.PrevProductRelationship.set("isEnabled", true);
                this.NextProductRelationship.set("isEnabled", true);
            }

            if (currentPF > 0 && currentPF == sel.length - 1) {
                this.PrevProductRelationship.set("isEnabled", true);
                this.NextProductRelationship.set("isEnabled", false);
            }

            if (currentPF == 0 && sel.length > 1) {
                this.PrevProductRelationship.set("isEnabled", false);
                this.NextProductRelationship.set("isEnabled", true);
            }
        },

        enableProductFamilyButtons: function () {
            var sel = this.productFamilyIndicies();
            var currentPF = this.get("currentProductFamily");
            if (currentPF == 0 && sel.length == 1) {
                this.PrevVariant.set("isEnabled", false);
                this.NextVariant.set("isEnabled", false);
            }

            if (currentPF > 0 && currentPF < sel.length - 1) {
                this.PrevVariant.set("isEnabled", true);
                this.NextVariant.set("isEnabled", true);
            }

            if (currentPF > 0 && currentPF == sel.length - 1) {
                this.PrevVariant.set("isEnabled", true);
                this.NextVariant.set("isEnabled", false);
            }

            if (currentPF == 0 && sel.length > 1) {
                this.PrevVariant.set("isEnabled", false);
                this.NextVariant.set("isEnabled", true);
            }
        },

        enableCategoryButtons: function () {
            var sel = this.CategoriesSlickGrid.selectedIndicies();
            var currentPF = this.get("currentCategory");
            if (currentPF == 0 && sel.length == 1) {
                this.PrevCategoryRelationship.set("isEnabled", false);
                this.NextCategoryRelationship.set("isEnabled", false);
            }

            if (currentPF > 0 && currentPF < sel.length - 1) {
                this.PrevCategoryRelationship.set("isEnabled", true);
                this.NextCategoryRelationship.set("isEnabled", true);
            }

            if (currentPF > 0 && currentPF == sel.length - 1) {
                this.PrevCategoryRelationship.set("isEnabled", true);
                this.NextCategoryRelationship.set("isEnabled", false);
            }

            if (currentPF == 0 && sel.length > 1) {
                this.PrevCategoryRelationship.set("isEnabled", false);
                this.NextCategoryRelationship.set("isEnabled", true);
            }
        },

        productSelectedRowChanged: function () {
            this.selectedProducts = this.ProductsSlickGrid.selectedIndicies().length;
            this.enableOrDisableVariantsButton();
            this.enableOrDisableProductRelationshipsButton();
            this.enableOrDisableRemoveProducts();
        },

        categorySelectedRowChanged: function () {
            this.selectedCategories = this.CategoriesSlickGrid.selectedIndicies().length;
            this.enableOrDisableCategoryRelationshipsButton();
            this.enableOrDisableRemoveCategories();
        },

        enableOrDisableRemoveCategories: function () {
            if (this.selectedCategories > 0) {
                this.Remove_Categories.set("isEnabled", true);
            } else {
                this.Remove_Categories.set("isEnabled", false);
            }
        },

        enableOrDisableRemoveProducts: function () {
            if (this.selectedProducts > 0) {
                this.Remove_Products.set("isEnabled", true);
            } else {
                this.Remove_Products.set("isEnabled", false);
            }
        },

        enableOrDisableVariantsButton: function () {
            this.Variants_Products.set("isEnabled", false);
            if (this.selectedProducts > 0) {
                var self = this;
                var selectedItems = this.ProductsSlickGrid.selectedItems();
                selectedItems.forEach(function (entry) {
                    if (entry._IsProductFamily) {
                        self.Variants_Products.set("isEnabled", true);
                    }
                });
            }
        },

        enableOrDisableProductRelationshipsButton: function () {
            var selectedProductRows = this.ProductsSlickGrid.selectedIndicies().length;
            this.Relationships_Products.set("isEnabled", selectedProductRows > 0);
        },

        enableOrDisableCategoryRelationshipsButton: function () {
            var selectedCategoryRows = this.CategoriesSlickGrid.selectedIndicies().length;
            this.Relationships_Categories.set("isEnabled", selectedCategoryRows > 0);
        },

        hasErrors: function (tab, type) {
            if (this.get("errorsInPage")["Errors"] != undefined || this.get("errorsInPage")["Errors"] > 0) {
                var errors = this.get("errorsInPage")["Errors"];
                for (var i = 0; i < errors.length; i++) {
                    if (errors[i].type == tab) {
                        if (errors[i].group == type) {
                            return true;
                        }
                    }
                }
            }
            return false;
        },

        // selectedIndex is passed as an optional param to allow overriding in the case of validation. 
        getVariants: function (selectedIndex) {
            this.activeElement = document.activeElement;
            this.VariantsWindow.show();
            var selectedLanguage = this.ProductLanguagesComboBox.get("selectedValue");

            // Prevent the event handler from doing anything while we're just initializing the dialog
            this.initializingVariantsDialog = true;
            this.Languages.set("selectedValue", selectedLanguage);
            this.initializingVariantsDialog = false;

            $('#' + this.VariantsDialog.VariantsSlickGrid.viewModel.gridId()).css("width", this.VariantsWindow.viewModel.$el.width());
            this.VariantsDialog.VariantsSlickGrid.get("grid").resizeCanvas();

            var self = this;

            if (this.ProductsSlickGrid.hasLanguage(selectedLanguage) == false) {
                // We haven't loaded the parents for the variant in the requested language,
                // so load that language into the workspace now
                this.workspace.getItems(function (data) {

                    // Add the loaded items to the main workspace without switching the language
                    self.ProductsSlickGrid.addDataItems(data.Items, selectedLanguage);
                    self.loadVariantsForCurrentProduct(selectedIndex);

                }, "Product", workspaceName, controlFolder, selectedLanguage);
            } else {
                self.loadVariantsForCurrentProduct(selectedIndex);
            }

            var selectedRows = this.productFamilyIndicies();
            this.PrevVariant.set("isEnabled", false);
            if (selectedRows.length > 1) {
                this.NextVariant.set("isEnabled", true);
            } else {
                this.NextVariant.set("isEnabled", false);
            }

            if (selectedIndex == undefined) {
                window.setTimeout(function () {
                    self.ProductVarColumnPickerButton.viewModel.$el.focus();
                }, 300);
            }
        },

        // selectedIndex is passed as an option argument for overriding the currently selected index
        getProductRelationships: function (selectedIndex) {
            this.activeElement = document.activeElement;
            this.ProductRelationshipsWindow.show();
            var selectedLanguage = this.ProductLanguagesComboBox.get("selectedValue");

            // Prevent the event handler from doing anything while we're just initializing the dialog
            this.initializingRelationshipsDialog = true;
            this.LanguagesProductRel.set("selectedValue", selectedLanguage);
            this.initializingRelationshipsDialog = false;

            $('#' + this.ProductRelationshipsDialog.ProductRelationshipsGrid.viewModel.gridId()).css("width", this.ProductRelationshipsWindow.viewModel.$el.width());
            //this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid").resizeCanvas();

            var workspaceName = "Default";
            var entityType = "Product";
            var controlFolder = this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("controlMappings");
            var self = this;

            if (this.ProductsSlickGrid.hasLanguage(selectedLanguage) == false) {
                // We haven't loaded the parents for the relationship in the requested language,
                // so load that language into the workspace now
                this.workspace.getItems(function (data) {
                    // Add the loaded items to the main workspace without switching the language
                    self.ProductsSlickGrid.addDataItems(data.Items, selectedLanguage);
                    self.loadRelationshipsForCurrentProduct(selectedIndex);

                }, "Product", workspaceName, controlFolder, selectedLanguage);
            } else {
                self.loadRelationshipsForCurrentProduct(selectedIndex);
            }

            var selectedRows = this.ProductsSlickGrid.selectedIndicies();
            this.PrevProductRelationship.set("isEnabled", false);
            if (selectedRows.length > 1) {
                this.NextProductRelationship.set("isEnabled", true);
            } else {
                this.NextProductRelationship.set("isEnabled", false);
            }

            if (selectedIndex == undefined) {
                window.setTimeout(function () {
                    self.ProductRelColumnPickerButton.viewModel.$el.focus();
                }, 300);
            }
        },

        // selectedIndex is an optional parameter to allow overriding the selection during validation
        getCategoryRelationships: function (selectedIndex, parentId) {
            this.activeElement = document.activeElement;
            this.CategoryRelationshipsWindow.show();
            var selectedLanguage = this.CategoryLanguagesComboBox.get("selectedValue");

            // Prevent the event handler from doing anything while we're just initializing the dialog
            this.initializingRelationshipsDialog = true;
            this.LanguagesRel.set("selectedValue", selectedLanguage);
            this.initializingRelationshipsDialog = false;

            $('#' + this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.viewModel.gridId()).css("width", this.CategoryRelationshipsWindow.viewModel.$el.width());
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid").resizeCanvas();

            var workspaceName = "Default";
            var entityType = "Category";
            var controlFolder = this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("controlMappings");
            var self = this;

            if (this.CategoriesSlickGrid.hasLanguage(selectedLanguage) == false) {
                // We haven't loaded the parents for the relationship in the requested language,
                // so load that language into the workspace now
                this.workspace.getItems(function (data) {

                    // Add the loaded items to the main workspace without switching the language
                    self.CategoriesSlickGrid.addDataItems(data.Items, selectedLanguage);
                    self.loadRelationshipsForCurrentCategory(selectedIndex);

                }, "Category", workspaceName, controlFolder, selectedLanguage);
            } else {
                self.loadRelationshipsForCurrentCategory(selectedIndex);
            }

            var selectedRows = this.CategoriesSlickGrid.selectedIndicies();
            this.PrevCategoryRelationship.set("isEnabled", false);
            if (selectedRows.length > 1) {
                this.NextCategoryRelationship.set("isEnabled", true);
            } else {
                this.NextCategoryRelationship.set("isEnabled", false);
            }

            if (selectedIndex == undefined) {
                window.setTimeout(function () {
                    self.CategoryRelColumnPickerButton.viewModel.$el.focus();
                }, 300);
            }
        },

        getIDOfCurrentlySelectedCategory: function (selectedIndex) {
            var selectedLanguage = this.LanguagesRel.get("selectedValue");
            var selectedIndices = this.CategoriesSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentCategory")];
            if (selectedIndex >= 0) {
                currentSelectedIndex = selectedIndex;
            }

            var category = this.CategoriesSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];
            return category.itemId;
        },

        getIDOfCurrentlySelectedProduct: function (selectedIndex) {
            var currentLanguage = this.LanguagesProductRel.get("selectedValue");
            var selectedIndices = this.ProductsSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentProduct")];
            if (selectedIndex >= 0) {
                currentSelectedIndex = selectedIndex;
            }

            var product = this.ProductsSlickGrid.getDataItems(currentLanguage)[currentSelectedIndex];

            return product.itemId;
        },

        getIDOfCurrentlySelectedProductForVariant: function (selectedIndex) {
            var currentLanguage = this.Languages.get("selectedValue");
            var selectedIndices = this.ProductsSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentProduct")];
            if (selectedIndex >= 0) {
                currentSelectedIndex = selectedIndex;
            }

            var product = this.ProductsSlickGrid.getDataItems(currentLanguage)[currentSelectedIndex];

            return product.itemId;
        },

        // parentId is a field for when doing validation of specific items.
        dialogHasErrors: function (grid, parentId) {
            if (this.get("errorsInPage").Errors != undefined) {
                var gridName = grid.get("grid").getContainerNode().id;
                var group = null;
                var type = "";
                switch (gridName) {
                    case "CategoryRelationshipsGridGrid":
                        group = "Relationship";
                        type = "CategoryTab";
                        break;
                    case "ProductRelationshipsGridGrid":
                        group = "Relationship";
                        type = "ProductTab";
                        break;
                    case "VariantsSlickGridGrid":
                        group = "Variant";
                        type = "ProductTab";
                        break;
                }

                var matchedErrors = $.grep(this.get("errorsInPage").Errors, function (e) {
                    return e.group == group && e.type == type && e.parentId == parentId;
                });

                if (matchedErrors.length > 0) {
                    window.setTimeout(function () {
                        var cell = grid.get("grid").getColumnIndex(matchedErrors[0].column);
                        var row = grid.get("dataView").getRowById(matchedErrors[0].itemId);
                        grid.get("grid").gotoCell(row, cell, true);
                    }, 300);
                }

                this.clearAllGridStyles(grid.get("grid"));
                for (var i = 0; i < matchedErrors.length; i++) {
                    var currentError = matchedErrors[i];
                    var row = grid.get("dataView").getRowById(currentError.itemId);
                    var columnName = currentError.column;
                    var lang = currentError.lang;
                    var cssClass = "error-highlight";
                    var cssObject = {};
                    cssObject[row] = {};
                    cssObject[row][columnName] = cssClass;
                    var cssStyleKey = "";
                    cssStyleKey = "error_" + group + "_" + row + "_" + columnName + "_" + lang;
                    grid.get("grid").removeCellCssStyles(cssStyleKey);
                    this.addGridStyleToLookup(cssStyleKey);
                    grid.get("grid").addCellCssStyles(cssStyleKey, cssObject);
                }

                var error = this.get("errorsInPage")["Errors"][this.get("currentError") - 1];
                if (error != undefined && error.parentID == parentId) {
                    var errorRow = grid.get("dataView").getRowById(error.itemId);
                    var cell = grid.get("grid").getColumnIndex(error.column);
                    grid.get("grid").gotoCell(errorRow, cell, true);
                }
            }
        },

        clearAllGridStyles: function (grid) {
            this.styleLookup.forEach(function (entry) {
                grid.removeCellCssStyles(entry);
            });
        },

        addGridStyleToLookup: function (styleKey) {
            this.styleLookup.push(styleKey);
        },

        getProductColumnPicker: function () {
            if (this.get("isDirty")) {
                this.promptUserToSaveChanges();
                return;
            }

            this.ColumnPicker_Product.set("selectedColumns", []);
            this.ColumnPicker_Product.set("selectedColumns", this.ProductsSlickGrid.get("selectedColumns"));
            this.ColumnPicker_Product.viewModel.cleanAvailableColumns();
            this.ProductColumnPickerWindow.show();
        },

        getCategoryColumnPicker: function () {
            if (this.get("isDirty")) {
                this.promptUserToSaveChanges();
                return;
            }

            this.ColumnPicker_Category.set("selectedColumns", []);
            this.ColumnPicker_Category.set("selectedColumns", this.CategoriesSlickGrid.get("selectedColumns"));
            this.ColumnPicker_Category.viewModel.cleanAvailableColumns();
            this.CategoryColumnPickerWindow.show();
        },

        getVariantsColumnPicker: function () {
            if (this.get("isDirty")) {
                this.promptUserToSaveChanges();
                return;
            }

            // Get the currently displayed product variants and see if any uncommitted changes have been made
            var selectedLanguage = this.Languages.get("selectedValue");
            var selectedIndices = this.productFamilyIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentProductFamily")];
            var product = this.ProductsSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];

            var unsavedVariantChanges = false;
            if (product.TempVariants && product.TempVariants.length > 0) {
                for (var i = 0; i < product.TempVariants.length; i++) {
                    if (product.TempVariants[i].isDirty) {
                        unsavedVariantChanges = true;
                        break;
                    }
                }
            }

            if (unsavedVariantChanges) {
                this.dialogToRestore = "Variants";
                this.promptUserToSaveChanges();
                return;
            }

            this.VariantColumnPicker.set("selectedColumns", []);
            this.VariantColumnPicker.set("selectedColumns", this.VariantsDialog.VariantsSlickGrid.get("selectedColumns"));
            this.VariantColumnPicker.viewModel.cleanAvailableColumns();
            this.VariantColumnPickerDialogWindow.show();
        },

        getProductRelationshipsColumnPicker: function () {
            if (this.get("isDirty")) {
                this.promptUserToSaveChanges();
                return;
            }

            // Get the currently displayed product relationships and see if any uncommitted changes have been made
            var selectedLanguage = this.LanguagesProductRel.get("selectedValue");
            var selectedIndicies = this.ProductsSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndicies[this.get("currentProduct")];
            var product = this.ProductsSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];

            var unsavedRelationshipChanges = false;
            if (product.TempRelationships && product.TempRelationships.length > 0) {
                for (var i = 0; i < product.TempRelationships.length; i++) {
                    if (product.TempRelationships[i].isDirty) {
                        unsavedRelationshipChanges = true;
                        break;
                    }
                }
            }

            if (unsavedRelationshipChanges) {
                this.dialogToRestore = "ProductRelationships";
                this.promptUserToSaveChanges();
                return;
            }

            this.ProductRelationshipColumnPicker.set("selectedColumns", []);
            this.ProductRelationshipColumnPicker.set("selectedColumns", this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("selectedColumns"));
            this.ProductRelationshipColumnPicker.viewModel.cleanAvailableColumns();
            this.ProductRelColumnPickerWindow.show();
        },

        getCategoryRelationshipsColumnPicker: function () {
            if (this.get("isDirty")) {
                this.promptUserToSaveChanges();
                return;
            }

            // Get the currently displayed category relationships and see if any uncommitted changes have been made
            var selectedLanguage = this.LanguagesRel.get("selectedValue");
            var selectedIndicies = this.CategoriesSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndicies[this.get("currentProduct")];
            var category = this.CategoriesSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];

            var unsavedRelationshipChanges = false;
            if (category.TempRelationships && category.TempRelationships.length > 0) {
                for (var i = 0; i < category.TempRelationships.length; i++) {
                    if (category.TempRelationships[i].isDirty) {
                        unsavedRelationshipChanges = true;
                        break;
                    }
                }
            }

            if (unsavedRelationshipChanges) {
                this.dialogToRestore = "CategoryRelationships";
                this.promptUserToSaveChanges();
                return;
            }

            this.CategoryRelationshipColumnPicker.set("selectedColumns", []);
            this.CategoryRelationshipColumnPicker.set("selectedColumns", this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("selectedColumns"));
            this.CategoryRelationshipColumnPicker.viewModel.cleanAvailableColumns();
            this.CategoryRelColumnPickerWindow.show();
        },

        closeProductColumnPicker: function () {
            var columns = this.ColumnPicker_Product.get("newColumns");
            if (columns.length > 0) {
                var viewSelectedColumns = this.ColumnPicker_Product.viewModel.$el.children().children("ul.sc-selectedColumn-list").children();
                var matchedColumns = this.ColumnPicker_Product.get("selectedColumns");
                for (var i = 0; i < columns.length; i++) {
                    viewSelectedColumns.remove("[sc-li-id='" + columns[i].itemId + "']");
                    $.each(this.ColumnPicker_Product.get("selectedColumns"), function (index, e) {
                        if (e.itemId == columns[i].itemId) {
                            matchedColumns.splice(index, 1);
                            return false;
                        }
                    });

                }
                this.ColumnPicker_Product.viewModel.$el.find(".sc-selectedColumn-list").empty();
                this.ProductsSlickGrid.set("selectedColumns", []);
                this.ColumnPicker_Product.set("selectedColumns", [])
                this.ProductsSlickGrid.set("selectedColumns", matchedColumns);
                this.ColumnPicker_Product.set("selectedColumns", matchedColumns);
                this.ColumnPicker_Product.set("newColumns", []);

            }

            var removedColumns = this.ColumnPicker_Product.get("removedColumns");
            if (removedColumns.length > 0) {
                for (var i = 0; i < removedColumns.length; i++) {
                    this.ColumnPicker_Product.get("selectedColumns").splice(removedColumns[i].oldIndex, 0, removedColumns[i]);
                }
                this.ColumnPicker_Product.set("removedColumns", []);
            }

            this.ProductColumnPickerWindow.hide();
        },

        closeCategoryColumnPicker: function () {
            var columns = this.ColumnPicker_Category.get("newColumns");
            if (columns.length > 0) {
                var viewSelectedColumns = this.ColumnPicker_Category.viewModel.$el.children().children("ul.sc-selectedColumn-list").children();
                var matchedColumns = this.ColumnPicker_Category.get("selectedColumns");
                for (var i = 0; i < columns.length; i++) {
                    viewSelectedColumns.remove("[sc-li-id='" + columns[i].itemId + "']");
                    $.each(this.ColumnPicker_Category.get("selectedColumns"), function (index, e) {
                        if (e.itemId == columns[i].itemId) {
                            matchedColumns.splice(index, 1);
                            return false;
                        }
                    });

                }
                this.ColumnPicker_Category.viewModel.$el.find(".sc-selectedColumn-list").empty();
                this.CategoriesSlickGrid.set("selectedColumns", []);
                this.ColumnPicker_Category.set("selectedColumns", [])
                this.CategoriesSlickGrid.set("selectedColumns", matchedColumns);
                this.ColumnPicker_Category.set("selectedColumns", matchedColumns);
                this.ColumnPicker_Category.set("newColumns", []);
            }
            var removedColumns = this.ColumnPicker_Category.get("removedColumns");
            if (removedColumns.length > 0) {
                for (var i = 0; i < removedColumns.length; i++) {
                    this.ColumnPicker_Category.get("selectedColumns").splice(removedColumns[i].oldIndex, 0, removedColumns[i]);
                }
                this.ColumnPicker_Category.set("removedColumns", []);
            }
            this.CategoryColumnPickerWindow.hide();
        },

        closeProductRelationshipColumnPicker: function () {
            var columns = this.ProductRelationshipColumnPicker.get("newColumns");
            if (columns.length > 0) {
                var viewSelectedColumns = this.ProductRelationshipColumnPicker.viewModel.$el.children().children("ul.sc-selectedColumn-list").children();
                var matchedColumns = this.ProductRelationshipColumnPicker.get("selectedColumns");
                for (var i = 0; i < columns.length; i++) {
                    viewSelectedColumns.remove("[sc-li-id='" + columns[i].itemId + "']");
                    $.each(this.ProductRelationshipColumnPicker.get("selectedColumns"), function (index, e) {
                        if (e.itemId == columns[i].itemId) {
                            matchedColumns.splice(index, 1);
                            return false;
                        }
                    });

                }
                this.ProductRelationshipColumnPicker.viewModel.$el.find(".sc-selectedColumn-list").empty();
                this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("selectedColumns", []);
                this.ProductRelationshipColumnPicker.set("selectedColumns", [])
                this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("selectedColumns", matchedColumns);
                this.ProductRelationshipColumnPicker.set("selectedColumns", matchedColumns)
                this.ProductRelationshipColumnPicker.set("newColumns", []);
            }

            var removedColumns = this.ProductRelationshipColumnPicker.get("removedColumns");
            if (removedColumns.length > 0) {
                for (var i = 0; i < removedColumns.length; i++) {
                    this.ProductRelationshipColumnPicker.get("selectedColumns").splice(removedColumns[i].oldIndex, 0, removedColumns[i]);
                }
                this.ProductRelationshipColumnPicker.set("removedColumns", []);
            }
            this.ProductRelColumnPickerWindow.hide();
            this.ProductRelationshipsWindow.show();
        },

        closeCategoryRelationshipColumnPicker: function () {
            var columns = this.CategoryRelationshipColumnPicker.get("newColumns");
            if (columns.length > 0) {
                var viewSelectedColumns = this.CategoryRelationshipColumnPicker.viewModel.$el.children().children("ul.sc-selectedColumn-list").children();
                var matchedColumns = this.CategoryRelationshipColumnPicker.get("selectedColumns");
                for (var i = 0; i < columns.length; i++) {
                    viewSelectedColumns.remove("[sc-li-id='" + columns[i].itemId + "']");
                    $.each(this.CategoryRelationshipColumnPicker.get("selectedColumns"), function (index, e) {
                        if (e.itemId == columns[i].itemId) {
                            matchedColumns.splice(index, 1);
                            return false;
                        }
                    });

                }
                this.CategoryRelationshipColumnPicker.viewModel.$el.find(".sc-selectedColumn-list").empty();
                this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("selectedColumns", []);
                this.CategoryRelationshipColumnPicker.set("selectedColumns", [])
                this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("selectedColumns", matchedColumns);
                this.CategoryRelationshipColumnPicker.set("selectedColumns", matchedColumns);
                this.CategoryRelationshipColumnPicker.set("newColumns", []);
            }

            var removedColumns = this.CategoryRelationshipColumnPicker.get("removedColumns");
            if (removedColumns.length > 0) {
                for (var i = 0; i < removedColumns.length; i++) {
                    this.CategoryRelationshipColumnPicker.get("selectedColumns").splice(removedColumns[i].oldIndex, 0, removedColumns[i]);
                }
                this.CategoryRelationshipColumnPicker.set("removedColumns", []);
            }
            this.CategoryRelColumnPickerWindow.hide();
            this.CategoryRelationshipsWindow.show();
        },

        closeVariantColumnPicker: function () {
            var columns = this.VariantColumnPicker.get("newColumns");
            if (columns.length > 0) {
                var viewSelectedColumns = this.VariantColumnPicker.viewModel.$el.children().children("ul.sc-selectedColumn-list").children();
                var matchedColumns = this.VariantColumnPicker.get("selectedColumns");
                for (var i = 0; i < columns.length; i++) {
                    viewSelectedColumns.remove("[sc-li-id='" + columns[i].itemId + "']");
                    $.each(this.VariantColumnPicker.get("selectedColumns"), function (index, e) {
                        if (e.itemId == columns[i].itemId) {
                            matchedColumns.splice(index, 1);
                            return false;
                        }
                    });

                }
                this.VariantColumnPicker.viewModel.$el.find(".sc-selectedColumn-list").empty();
                this.VariantsDialog.VariantsSlickGrid.set("selectedColumns", []);
                this.VariantColumnPicker.set("selectedColumns", [])
                this.VariantsDialog.VariantsSlickGrid.set("selectedColumns", matchedColumns);
                this.VariantColumnPicker.set("selectedColumns", matchedColumns);
                this.VariantColumnPicker.set("newColumns", []);
            }

            var removedColumns = this.VariantColumnPicker.get("removedColumns");
            if (removedColumns.length > 0) {
                for (var i = 0; i < removedColumns.length; i++) {
                    this.VariantColumnPicker.get("selectedColumns").splice(removedColumns[i].oldIndex, 0, removedColumns[i]);
                }

                this.VariantColumnPicker.set("removedColumns", []);
            }
            this.VariantColumnPickerDialogWindow.hide();
            this.VariantsWindow.show();
        },

        refreshWorkspaceProducts: function () {
            // When refreshing data because a column was added, we must refresh the current language
            // and clear all other downloaded languages because their data is now stale.
            this.productSelectedRowChanged();
            this.productRelationshipSelectionChanged();
            this.ProductsSlickGrid.clearDataItems();

            var self = this;
            var productLanguage = this.ProductLanguagesComboBox.get("selectedValue");
            var productsControlFolder = this.ProductsSlickGrid.get("controlMappings");

            this.workspace.getItems(function (data) {
                self.ProductsSlickGrid.setDataItems(data.Items, productLanguage);

                // The grid's rowCountChanged event may not fire until grid has completed loading. 
                // For page-load, explicitly update the item counts on the tabs.
                var itemCount = data.Items ? data.Items.length : 0;
                self.productCountChanged(itemCount);

                var width = self.WorkspaceTabs.viewModel.$el.width();
                $('#' + self.ProductsSlickGrid.get("gridId")).css("width", width);

                if (self.ProductsSlickGrid.get("grid") != null) {
                    self.ProductsSlickGrid.get("grid").resizeCanvas();
                }

            }, "Product", "Default", productsControlFolder, productLanguage);
        },

        refreshWorkspaceCategories: function () {
            // When refreshing data because a column was added, we must refresh the current language
            // and clear all other downloaded languages because their data is now stale.
            this.categorySelectedRowChanged();
            this.categoryRelationshipSelectionChanged();
            this.CategoriesSlickGrid.clearDataItems();

            var self = this;
            var categoryLanguage = this.CategoryLanguagesComboBox.get("selectedValue");
            var categoriesControlFolder = this.CategoriesSlickGrid.get("controlMappings");

            this.workspace.getItems(function (data) {

                self.CategoriesSlickGrid.setDataItems(data.Items, categoryLanguage);

                // The grid's rowCountChanged event may not fire until grid has completed loading. 
                // For page-load, explicitly update the item counts on the tabs.
                var itemCount = data.Items ? data.Items.length : 0;
                self.categoryCountChanged(itemCount);

                var width = self.WorkspaceTabs.viewModel.$el.width();
                $('#' + self.CategoriesSlickGrid.get("gridId")).css("width", width);
                if (self.CategoriesSlickGrid.get("grid") != null) {
                    self.CategoriesSlickGrid.get("grid").resizeCanvas();
                }
            }, "Category", "Default", categoriesControlFolder, categoryLanguage);
        },

        refreshVariants: function () {
            var self = this;
            var workspaceName = "Default";
            var controlMappings = self.VariantsDialog.VariantsSlickGrid.get("controlMappings");
            var selectedIndices = this.productFamilyIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentProductFamily")];
            var selectedLanguage = this.Languages.get("selectedValue");
            var currentProduct = this.ProductsSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];

            // Any previously loaded variants are now stale so blow them away
            self.clearAllProductVariants();

            // Reload the current variant
            this.workspace.getVariants(function (data, item) {
                item["Variants"] = data.Items;
                item["TempVariants"] = $.extend(true, [], item.Variants);
                self.VariantsDialog.VariantsSlickGrid.set("items", []);
                self.VariantsDialog.VariantsSlickGrid.set("items", item.TempVariants);
                $('#' + self.VariantsDialog.VariantsSlickGrid.viewModel.gridId()).css("width", self.VariantsWindow.viewModel.$el.width());
                self.VariantsDialog.VariantsSlickGrid.get("grid").resizeCanvas();

            }, currentProduct, workspaceName, controlMappings);
        },

        refreshProductRelationships: function () {
            // Any previously loaded relationships are now stale so blow them away
            var self = this;
            self.clearAllProductRelationships();

            var selectedLanguage = this.LanguagesProductRel.get("selectedValue");
            var controlFolder = this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("controlMappings");

            // Now get the item in the selected language
            var selectedIndices = this.ProductsSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentProduct")];
            var product = this.ProductsSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];

            this.workspace.getRelationships(function (data) {
                product.Relationships = data.Items;
                product.TempRelationships = $.extend(true, [], product.Relationships);
            }, product, "Default", "Relationship", controlFolder, selectedLanguage);

            this.DownProductRelationship.set("isEnabled", false);
            this.UpProductRelationship.set("isEnabled", false);
            this.RemoveProductRelationship.set("isEnabled", false);
        },

        refreshCategoryRelationships: function () {
            // Any previously loaded relationships are now stale so blow them away
            var self = this;
            self.clearAllCategoryRelationships();

            var selectedLanguage = this.LanguagesRel.get("selectedValue");
            var controlFolder = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("controlMappings");

            // Now get the item in the selected language
            var selectedIndices = this.CategoriesSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentCategory")];
            var category = this.CategoriesSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];

            this.workspace.getRelationships(function (data) {
                category.Relationships = data.Items;
                category.TempRelationships = $.extend(true, [], category.Relationships);
            }, category, "Default", "Relationship", controlFolder, selectedLanguage);

            this.DownCategoryRelationship.set("isEnabled", false);
            this.UpCategoryRelationship.set("isEnabled", false);
            this.RemoveCategoryRelationship.set("isEnabled", false);
        },

        clearAllProductVariants: function () {
            var self = this;
            var loadedLanguages = this.ProductsSlickGrid.getLanguages();
            $.each(loadedLanguages, function (index, languageName) {
                var dataItems = self.ProductsSlickGrid.getDataItems(languageName);
                for (var i = 0; i < dataItems.length; i++) {
                    if (dataItems[i].Variants) {
                        delete dataItems[i].Variants;
                    }

                    if (dataItems[i].TempVariants) {
                        delete dataItems[i].TempVariants;
                    }
                }
            });
        },

        clearAllProductRelationships: function () {
            var self = this;
            var loadedLanguages = this.ProductsSlickGrid.getLanguages();
            $.each(loadedLanguages, function (index, languageName) {
                var dataItems = self.ProductsSlickGrid.getDataItems(languageName);
                for (var i = 0; i < dataItems.length; i++) {
                    if (dataItems[i].Relationships) {
                        delete dataItems[i].Relationships;
                    }

                    if (dataItems[i].TempRelationships) {
                        delete dataItems[i].TempRelationships;
                    }
                }
            });
        },

        clearAllCategoryRelationships: function () {
            var self = this;
            var loadedLanguages = this.CategoriesSlickGrid.getLanguages();
            $.each(loadedLanguages, function (index, languageName) {
                var dataItems = self.CategoriesSlickGrid.getDataItems(languageName);
                for (var i = 0; i < dataItems.length; i++) {
                    if (dataItems[i].Relationships) {
                        delete dataItems[i].Relationships;
                    }

                    if (dataItems[i].TempRelationships) {
                        delete dataItems[i].TempRelationships;
                    }
                }
            });
        },

        acceptProductRelationshipColumnPicker: function () {
            this.ProductRelColumnPickerWindow.hide();
            this.ProductRelationshipsWindow.show();
            var columns = this.ProductRelationshipColumnPicker.get("selectedColumns");
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("selectedColumns", []);
            this.ProductRelationshipColumnPicker.set("selectedColumns", []);
            this.ProductRelationshipColumnPicker.viewModel.$el.find(".sc-selectedColumn-list").empty();
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("selectedColumns", columns);
            this.ProductRelationshipColumnPicker.set("selectedColumns", columns);
            this.ProductRelationshipColumnPicker.set("removedColumns", []);
            this.ProductRelationshipColumnPicker.set("newColumns", []);
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.saveSelectedColumns(columns, $.proxy(this.refreshProductRelationships, this));
        },

        acceptCategoryRelationshipColumnPicker: function () {
            this.CategoryRelColumnPickerWindow.hide();
            this.CategoryRelationshipsWindow.show();
            var columns = this.CategoryRelationshipColumnPicker.get("selectedColumns");
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("selectedColumns", []);
            this.CategoryRelationshipColumnPicker.set("selectedColumns", []);
            this.CategoryRelationshipColumnPicker.viewModel.$el.find(".sc-selectedColumn-list").empty();
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("selectedColumns", columns);
            this.CategoryRelationshipColumnPicker.set("selectedColumns", columns);
            this.CategoryRelationshipColumnPicker.set("removedColumns", []);
            this.CategoryRelationshipColumnPicker.set("newColumns", []);
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.saveSelectedColumns(columns, $.proxy(this.refreshCategoryRelationships, this));
        },

        acceptVariantColumns: function () {
            this.VariantColumnPickerDialogWindow.hide();
            this.VariantsWindow.show();
            var columns = this.VariantColumnPicker.get("selectedColumns");
            this.VariantsDialog.VariantsSlickGrid.set("selectedColumns", []);
            this.VariantColumnPicker.set("selectedColumns", []);
            this.VariantColumnPicker.viewModel.$el.find(".sc-selectedColumn-list").empty();
            this.VariantsDialog.VariantsSlickGrid.set("selectedColumns", columns);
            this.VariantColumnPicker.set("selectedColumns", columns);
            this.VariantColumnPicker.set("removedColumns", []);
            this.VariantColumnPicker.set("newColumns", []);
            this.VariantsDialog.VariantsSlickGrid.saveSelectedColumns(columns, $.proxy(this.refreshVariants, this));
        },

        saveCategoriesColumns: function () {
            this.CategoryColumnPickerWindow.hide();
            var columns = this.ColumnPicker_Category.get("selectedColumns");
            this.CategoriesSlickGrid.set("selectedColumns", []);
            this.ColumnPicker_Category.set("selectedColumns", []);
            this.ColumnPicker_Category.viewModel.$el.find(".sc-selectedColumn-list").empty();
            this.CategoriesSlickGrid.set("selectedColumns", columns);
            this.ColumnPicker_Category.set("selectedColumns", columns);
            this.ColumnPicker_Category.set("removedColumns", []);
            this.ColumnPicker_Category.set("newColumns", []);
            this.CategoriesSlickGrid.saveSelectedColumns(columns, $.proxy(this.refreshWorkspaceCategories, this));
        },

        saveProductsColumns: function () {
            this.ProductColumnPickerWindow.hide();
            var columns = this.ColumnPicker_Product.get("selectedColumns");
            this.ProductsSlickGrid.set("selectedColumns", []);
            this.ColumnPicker_Product.set("selectedColumns", []);
            this.ColumnPicker_Product.viewModel.$el.find(".sc-selectedColumn-list").empty();
            this.ProductsSlickGrid.set("selectedColumns", columns);
            this.ColumnPicker_Product.set("selectedColumns", columns);
            this.ColumnPicker_Product.set("removedColumns", []);
            this.ColumnPicker_Product.set("newColumns", []);

            this.ProductsSlickGrid.saveSelectedColumns(columns, $.proxy(this.refreshWorkspaceProducts, this));
        },

        getVariantFieldNameByIdFromColumns: function (id) {
            var columns = Enumerable.From(this.VariantsDialog.VariantsSlickGrid.get("grid").getColumns());
            return columns.Single(function (x) { return x.id == id });
        },

        saveExtension: function (rowItem, rowModelForSave) {
            /*
            Iterate through rowItem.Relationships
            For each one that is dirty we need to do pretty well what we do in getPayloadForSave
            */
            if (rowItem.Relationships) {
                for (var i = 0; i < rowItem.Relationships.length; i++) {
                    var tempItem = rowItem.Relationships[i];

                    if (tempItem.__New) {
                        var createRelationshipModel = {
                            ItemId: tempItem.itemId,
                            TargetItemId: tempItem.targetItemId,
                            RelationshipName: tempItem.RelationshipName,
                            IsReciprocal: tempItem.IsReciprocal,
                            Description: tempItem.RelationshipDescription,
                            Rank: tempItem.Rank
                        };

                        if (!rowModelForSave.CreateRelationships) {
                            rowModelForSave.CreateRelationships = [];
                        }

                        rowModelForSave.CreateRelationships.push(createRelationshipModel);
                    }
                    else if (tempItem.isDirty) {
                        var relationshipModel = {
                            ItemId: tempItem.itemId,
                            RelationshipName: tempItem.RelationshipName,
                            TargetItemId: tempItem.targetItemId,
                            Description: tempItem["RelationshipDescription"],
                            Rank: tempItem.Rank
                        };

                        if (!rowModelForSave.EditRelationships) {
                            rowModelForSave.EditRelationships = [];
                        }

                        rowModelForSave.EditRelationships.push(relationshipModel);
                    }
                }
            }

            // Variants 
            if (rowItem.Variants) {
                for (var i = 0; i < rowItem.Variants.length; i++) {
                    var tempVariant = rowItem.Variants[i];
                    if (tempVariant.isDirty) {
                        var variantModel = {
                            // Add required fields
                            ItemId: tempVariant.itemId,
                            Fields: []
                        };

                        if (tempVariant.DirtyFields) {
                            for (var j = 0; j < tempVariant.DirtyFields.length; j++) {
                                var dirtyField = tempVariant.DirtyFields[j];
                                var selectedColumn = this.getVariantFieldNameByIdFromColumns(dirtyField);
                                variantModel.Fields.push({ FieldIdentifier: dirtyField, FieldValue: tempVariant[selectedColumn.field] });
                            }
                        }

                        if (!rowModelForSave.EditVariants) {
                            rowModelForSave.EditVariants = [];
                        }

                        rowModelForSave.EditVariants.push(variantModel);
                    }
                }
            }

            // Need to add delete
            if (rowItem.DeleteRelationships) {
                for (var i = 0; i < rowItem.DeleteRelationships.length; i++) {
                    var tempDeleteItem = rowItem.DeleteRelationships[i];
                    var deleteModel = {
                        ItemId: tempDeleteItem.itemId,
                        RelationshipName: tempDeleteItem.RelationshipName,
                        TargetItemId: tempDeleteItem.targetItemId,
                        TargetClassType: tempDeleteItem.TargetItemType
                    };

                    if (!rowModelForSave.DeleteRelationships) {
                        rowModelForSave.DeleteRelationships = [];
                    }

                    rowModelForSave.DeleteRelationships.push(deleteModel)
                }
            }
        },

        saveWorkspace: function () {
            this.displayInProgressMessage();
            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;
            var self = this;

            this.CategoriesSlickGrid.get("grid").navigateNext();
            this.CategoriesSlickGrid.get("grid").navigatePrev();
            this.CategoriesSlickGrid.get("grid").resetActiveCell();
            var categoryItemsToSave = this.CategoriesSlickGrid.getPayloadForSave(this.saveExtension);
            var categoryBulkEditUpdateRequest = {};
            categoryBulkEditUpdateRequest.ItemsToSaveByLanguage = categoryItemsToSave;

            this.ProductsSlickGrid.get("grid").navigateNext();
            this.ProductsSlickGrid.get("grid").navigatePrev();
            this.ProductsSlickGrid.get("grid").resetActiveCell();
            var productItemsToSave = this.ProductsSlickGrid.getPayloadForSave($.proxy(this.saveExtension, this));
            var productBulkEditUpdateRequest = {};
            productBulkEditUpdateRequest.ItemsToSaveByLanguage = productItemsToSave;

            if ($("div[data-sc-id=MessageRowPanel]").css("display") == "block") {
                $("div[data-sc-id=MessageRowPanel]").css("display", "none");
                $("div[data-sc-id=MessageRowPanel]").css("color", "#e70000");
                $("div[data-sc-id=MessageRowPanel]").css("backgroundColor", "#ffd9d9");
                $("button[data-sc-id=PrevIssue]").css("backgroundColor", "#e70000)");
                $("button[data-sc-id=NextIssue]").css("backgroundColor", "#e70000");
            }

            $(".error-highlight").removeClass("error-highlight");
            $(".cell-cleared").removeClass("cell-cleared");

            $.when(
                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/Workspace/SaveWorkspace",
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    headers: ajaxToken,
                    data: JSON.stringify(categoryBulkEditUpdateRequest),
                    context: this,
                    error: function () {
                        CommerceUtilities.IsAuthenticated
                    }

                }),

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/SaveWorkspace",
                type: "POST",
                contentType: "application/json; charset=utf-8",
                headers: ajaxToken,
                data: JSON.stringify(productBulkEditUpdateRequest),
                context: this,
                error: CommerceUtilities.IsAuthenticated
            })
                ).done(function (categoryResponse, productResponse) {
                    self.InProgress.hide();
                    if (categoryResponse[0].Status == "failure" || productResponse[0].Status == "failure") {
                        // Clear checkbox selections since that leads to confusion about what dialog is open
                        self.set("incrementCounter", true);
                        self.CategoriesSlickGrid.unselectAll();
                        self.ProductsSlickGrid.unselectAll();
                        self.set("currentError", 0);
                        self.set("numberOfErrors", 0);
                        self.cleanClearedStyles();
                        self.set("errorsInPage", { "CategoryTab": {}, "ProductTab": {} });
                        self.displayErrors(categoryResponse, "CategoryTab");
                        self.displayErrors(productResponse, "ProductTab");
                        self.set("currentError", 0);
                        self.joinErrorsCurrentLang();
                        $("div[data-sc-id=MessageRowPanel]").css("display", "block");
                        self.nextError();
                    } else {
                        self.displaySaveMessage();

                        var userWarnings = [];
                        if (categoryResponse[0].Warnings.length > 0) {
                            userWarnings = userWarnings.concat(categoryResponse[0].Warnings);
                        }

                        if (productResponse[0].Warnings.length > 0) {
                            userWarnings = userWarnings.concat(productResponse[0].Warnings);
                        }

                        if (userWarnings.length > 0) {
                            for (var i = 0; i < userWarnings.length; i++) {
                                self.HeaderActionsMessageBar.addMessage("notification", userWarnings[i]);
                            }

                            self.HeaderActionsMessageBar.set("isVisible", true);
                            setTimeout(function () { self.HeaderActionsMessageBar.set("isVisible", false); }, 20000);
                        }

                        self.set("isDirty", false);

                        if (categoryResponse.length > 0 && categoryResponse[0].Status == "success") {
                            self.CategoriesSlickGrid.clearState($.proxy(self.extendedFieldsToClear, self));
                        }

                        if (productResponse.length > 0 && productResponse[0].Status == "success") {
                            self.ProductsSlickGrid.clearState($.proxy(self.extendedFieldsToClear, self));
                        }

                        self.clearLookup(self.deletedRelationships);
                        self.clearLookup(self.createdRelationships);
                        self.clearLookup(self.editedVariantSharedFields);
                        self.clearLookup(self.editedProductRelationshipSharedFields);
                        self.clearLookup(self.editedCategoryRelationshipSharedFields);
                    }
                });
        },

        cleanClearedStyles: function () {
            var errors = this.get("errorsInPage").Errors;
            if (errors != undefined) {
                for (var i = 0; i < errors.length; i++) {
                    this.ProductsSlickGrid.get("grid").removeCellCssStyles(errors[i].cssStyleKey);
                    this.CategoriesSlickGrid.get("grid").removeCellCssStyles(errors[i].cssStyleKey);
                    this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid").removeCellCssStyles(errors[i].cssStyleKey);
                    this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid").removeCellCssStyles(errors[i].cssStyleKey);
                    this.VariantsDialog.VariantsSlickGrid.get("grid").removeCellCssStyles(errors[i].cssStyleKey);
                }
            }
        },

        extendedFieldsToClear: function (rowItem) {
            delete rowItem.TempRelationships;
            delete rowItem.Relationships;
            delete rowItem.Variants;
            delete rowItem.TempVariants;
            delete rowItem.TempDeleteRelationships;
            delete rowItem.DeleteRelationships;
        },

        displayErrors: function (response, type) {
            var self = this;
            var slickgrid;
            var relationshipsGrid;
            var variantsGrid;
            var tab;
            var grid;
            if (type == "ProductTab") {
                slickgrid = this.ProductsSlickGrid;
                tab = $("li[data-tab-id=\\{4178FB21-7991-4F75-8868-9F949B8170B3\\}] > a");
                relationshipsGrid = this.ProductRelationshipsDialog.ProductRelationshipsGrid;
                variantsGrid = this.VariantsDialog.VariantsSlickGrid;

                variantsGrid.get("grid").onCellChange.unsubscribe(this.addClearStylesCallback);
                variantsGrid.get("grid").onCellChange.subscribe(this.addClearStylesCallback);

                grid = slickgrid.get("grid");
            } else if (type == "CategoryTab") {
                slickgrid = this.CategoriesSlickGrid;
                tab = $("li[data-tab-id=\\{80903895-822C-48AA-B6C8-6833AF398103\\}] > a");
                relationshipsGrid = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid;
                grid = slickgrid.get("grid");
            }

            grid.onCellChange.unsubscribe(this.addClearStylesCallback);
            grid.onCellChange.subscribe(this.addClearStylesCallback);

            relationshipsGrid.get("grid").onCellChange.unsubscribe(this.addClearStylesCallback);
            relationshipsGrid.get("grid").onCellChange.subscribe(this.addClearStylesCallback);

            if (response[0].Status == "failure") {
                if (response[0].ErrorsByLanguage.length > 0) {
                    var tabErrors
                    var errorsByLang = {};
                    for (var i = 0; i < response[0].ErrorsByLanguage.length; i++) {
                        var lang = response[0].ErrorsByLanguage[i].Language;
                        var errors = response[0].ErrorsByLanguage[i].Errors;
                        var errCount = 0;
                        var rowErrors = {};
                        errorsByLang[lang] = {};
                        errorsByLang[lang]["ToFix"] = 0;
                        errorsByLang[lang]["Errors"] = []

                        for (var i2 = 0; i2 < errors.length; i2++) {
                            var itemId = errors[i2].ItemId;
                            var messages = errors[i2].Messages;

                            for (var i3 = 0; i3 < messages.length; i3++) {
                                this.verifyNewColumns(messages[i3], type);
                                var row;
                                var group;
                                var childGrid;
                                // Get the row in the grid so we can add the button
                                // I don't think that this is going to work since the items in the grid are already gone.
                                switch (messages[i3].Group) {
                                    case "Relationship":
                                        childGrid = relationshipsGrid.get("grid");
                                        group = messages[i3].Group;
                                        break;
                                    case "Variant":
                                        childGrid = variantsGrid.get("grid");
                                        group = messages[i3].Group;
                                        break;
                                    case null:
                                        row = slickgrid.get("dataView").getRowById(itemId);
                                        group = "General" + type;
                                        break;
                                }

                                var message = messages[i3].ErrorMessage;
                                // The ControlId for Relationships only supports Description?? What about errors on create.
                                var columnName = messages[i3].ControlId;

                                if (row != undefined) {
                                    rowErrors[row] = {};
                                    var cssClass = "error-highlight";
                                    rowErrors[row][columnName] = cssClass;
                                    var cssObject = {};
                                    cssObject[row] = {};
                                    cssObject[row][columnName] = cssClass;
                                }

                                var cssStyleKey = "";

                                if (messages[i3].Group == "Variant" || messages[i3].Group == "Relationship") {
                                    var row2 = slickgrid.get("dataView").getRowById(messages[i3].ParentId);
                                    var columnName2 = messages[i3].Group + "Errors";

                                    var cssClass = "error-highlight error-icon";
                                    var cssObject2 = {};
                                    cssObject2[row2] = {};
                                    cssObject2[row2][columnName2] = cssClass;
                                    var cssStyleKey2 = "error_" + "General" + type + "_" + row2 + "_" + columnName2 + "_" + lang;

                                    // remove the styles setting from here. 
                                    grid.removeCellCssStyles(cssStyleKey2);
                                    grid.addCellCssStyles(cssStyleKey2, cssObject2);

                                    errorsByLang[lang]["Errors"].push({ "row": 0, "itemId": itemId, "column": columnName, "message": message, "type": type, "parentId": messages[i3].ParentId, "group": messages[i3].Group, "lang": lang, "cssStyleKey": cssStyleKey, "cssObject": cssObject });
                                    errCount++;

                                } else {
                                    cssStyleKey = "error_" + group + "_" + row + "_" + columnName + "_" + lang;
                                    grid.removeCellCssStyles(cssStyleKey);
                                    grid.addCellCssStyles(cssStyleKey, cssObject);
                                    errorsByLang[lang]["Errors"].push({ "row": row, "column": columnName, "message": message, "type": type, "parentId": messages[i3].ParentId, "group": messages[i3].Group, "lang": lang, "cssStyleKey": cssStyleKey, "cssObject": cssObject });
                                    errCount++;
                                }
                            }
                        }

                        // Check if we are using CSS property
                        errorsByLang[lang]["CSS"] = rowErrors;
                        errorsByLang[lang]["ToFix"] = errCount;
                        var prevNum = this.get("numberOfErrors");
                        this.set("numberOfErrors", errCount + prevNum);
                    }

                    var numberOfErrors = 0;
                    $.each(errorsByLang, function (key, value) {
                        numberOfErrors += value.ToFix
                    });

                    errorsByLang["ToFix"] = numberOfErrors;

                    tab.children().remove(".error-badge");

                    var errorsInTabTooltip = this.ClientErrorMessages.get("Items with errors in tab");
                    tab.append("<span title='" + errorsInTabTooltip + "' class='badge error-badge'>" + numberOfErrors + "</span>");

                    this.get("errorsInPage")[type] = errorsByLang;
                }
            }
        },

        buildCellCssStyle: function (arg) {
            var itemId = arg.item.itemId;
            var row = arg.row.toString();
            var column = arg.grid.getColumns()[arg.cell].id;
            var currentGridName = arg.grid.getContainerNode().id;
            var type = "";
            var group = null;
            var self = this;
            var index = null;
            var lang = "";

            switch (currentGridName) {
                case "CategoriesSlickGridGrid":
                    type = "CategoryTab";
                    lang = this.CategoryLanguagesComboBox.get("selectedValue");
                    break;
                case "ProductsSlickGridGrid":
                    type = "ProductTab";
                    lang = this.ProductLanguagesComboBox.get("selectedValue");
                    break;
                case "CategoryRelationshipsGridGrid":
                    group = "Relationship";
                    type = "CategoryTab";
                    lang = this.LanguagesRel.get("selectedValue");
                    break;
                case "ProductRelationshipsGridGrid":
                    group = "Relationship";
                    type = "ProductTab";
                    lang = this.LanguagesProductRel.get("selectedValue");
                    break;
                case "VariantsSlickGridGrid":
                    group = "Variant";
                    type = "ProductTab";
                    lang = this.Languages.get("selectedValue");
                    break;
            }

            var matchedError = $.grep(self.get("errorsInPage").Errors, function (e, n) {
                if (e.column == column && (e.row == row || e.itemId == itemId) && e.lang == lang && e.group == group && e.type == type) {
                    index = n;
                    return e;
                };
            });

            matchedError[0]["errorNumber"] = index + 1;
            self.set("currentError", index + 1);
            return matchedError[0];
        },

        addRemoveStylesOnLanguageChange: function (lang, type) {
            // Here we sitch the styles. We set the errors styles according to language change
            // Need to remove all the styles from other languages
            // Set the styles for the current language
            this.set("currentLang", lang);
            if (this.get("errorsInPage")["Errors"] != undefined || this.get("errorsInPage")["Errors"] > 0) {

                var grid = this.ProductsSlickGrid.get("grid");
                switch (type) {
                    case "Product": grid = this.ProductsSlickGrid.get("grid");
                        break;
                    case "Category": grid = this.CategoriesSlickGrid.get("grid");
                        break;
                    case "ProductRelationship": grid = this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid");
                        break;
                    case "CategoryRelationship": grid = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid");
                        break;
                    case "ProductVariant": grid = this.VariantsDialog.VariantsSlickGrid.get("grid");
                        break;

                }

                var errors = this.get("errorsInPage")["Errors"];
                for (var i = 0; i < errors.length; i++) {
                    grid.removeCellCssStyles(errors[i].cssStyleKey);
                }

                for (var i = 0; i < errors.length; i++) {
                    if (errors[i].lang == lang) {
                        grid.addCellCssStyles(errors[i].cssStyleKey, errors[i].cssObject);
                    }
                }
            }

        },

        // Rename function to joinErrors
        joinErrorsCurrentLang: function () {
            var productTab = this.get("errorsInPage")["ProductTab"];
            var categoryTab = this.get("errorsInPage")["CategoryTab"];
            var productErrors = [];
            var categoryErrors = [];
            var productNumber = 0;
            var categoryNumber = 0;

            if (productTab != undefined && productTab.ToFix != 0 && productTab.ToFix != undefined) {
                $.each(productTab, function (key, value) {
                    if (value.Errors != undefined) {
                        productErrors = productErrors.concat(value.Errors);
                    }
                });
                productNumber = productTab.ToFix;
            }

            if (categoryTab != undefined && categoryTab.ToFix != 0 && categoryTab.ToFix != undefined) {
                $.each(categoryTab, function (key, value) {
                    if (value.Errors != undefined) {
                        categoryErrors = categoryErrors.concat(value.Errors);
                    }
                });
                categoryNumber = categoryTab.ToFix;
            }

            productTabBadge = $("li[data-tab-id=\\{4178FB21-7991-4F75-8868-9F949B8170B3\\}] > a");
            productTabBadge.children().remove(".error-badge");

            var errorsInTabTooltip = this.ClientErrorMessages.get("Items with errors in tab");
            productTabBadge.append("<span title='" + errorsInTabTooltip + "' class='badge error-badge'>" + (productNumber == 0 ? "" : productNumber) + "</span>");

            categorytabBadge = $("li[data-tab-id=\\{80903895-822C-48AA-B6C8-6833AF398103\\}] > a");
            categorytabBadge.children().remove(".error-badge");
            categorytabBadge.append("<span title='" + errorsInTabTooltip + "' class='badge error-badge'>" + (categoryNumber == 0 ? "" : categoryNumber) + "</span>");

            this.get("errorsInPage")["ToFix"] = productNumber + categoryNumber;
            this.get("errorsInPage")["Errors"] = productErrors.concat(categoryErrors);
        },

        nextError: function () {
            var currentErrors = this.get("errorsInPage");
            var messageNumber = 0;
            var message;

            if ((this.get("currentError") + 1) <= this.get("numberOfErrors")) {
                if (this.get("incrementCounter")) {
                    this.set("currentError", this.get("currentError") + 1);
                }

                this.set("incrementCounter", true);
                var error = currentErrors["Errors"][this.get("currentError") - 1];
                this.ActionMessage.set("text", error.message);
                this.IssuesNum.set("text", "Issue " + this.get("currentError"));

                if (this.get("numberOfErrors") == 0) {
                    var issuesFixedMessage = this.ClientErrorMessages.get("All issues have been addressed");
                    this.IssuesToFix.set("text", issuesFixedMessage);
                } else {
                    var issuesToFixMessage = this.ClientErrorMessages.get("Issues to fix");
                    this.IssuesToFix.set("text", this.get("numberOfErrors") + " " + issuesToFixMessage);
                }

                this.navigateToError(error);
            } else if (this.get("currentError") == this.get("numberOfErrors")) {
                var error = currentErrors["Errors"][this.get("currentError") - 1];
                if (error != undefined) {
                    this.navigateToError(error);
                }
            }
        },

        previousError: function () {
            var currentErrors = this.get("errorsInPage");
            var messageNumber = 0;
            var message;

            if ((this.get("currentError") - 1) > 0) {
                this.set("currentError", this.get("currentError") - 1);
                var error = currentErrors["Errors"][this.get("currentError") - 1];
                this.ActionMessage.set("text", error.message);
                this.IssuesNum.set("text", "Issue " + this.get("currentError"));
                if (this.get("numberOfErrors") == 0) {
                    var issuesFixedMessage = this.ClientErrorMessages.get("All issues have been addressed");
                    this.IssuesToFix.set("text", issuesFixedMessage);
                } else {
                    var issuesToFixMessage = this.ClientErrorMessages.get("Issues to fix");
                    this.IssuesToFix.set("text", this.get("numberOfErrors") + " " + issuesToFixMessage);
                }
                this.navigateToError(error);
            } else if (this.get("currentError") == 1) {
                var error = currentErrors["Errors"][this.get("currentError") - 1];
                if (error != undefined) {
                    this.navigateToError(error);
                }
            }
        },

        navigateToError: function (error) {
            // Fix if we are going to navigate to the proper dialog in case of relationship or variant error
            if (error.type == "ProductTab") {
                this.WorkspaceTabs.set("selectedTab", "{4178FB21-7991-4F75-8868-9F949B8170B3}");
                var grid;
                var productSlickGrid = this.ProductsSlickGrid;
                var languageCombobox;
                switch (error.group) {
                    case "Relationship":
                        languageCombobox = this.LanguagesProductRel;
                        var parentRow = 0;
                        var parentItem = $.grep(productSlickGrid.get("items"), function (e, n) {
                            if (e.itemId == error.parentId) {
                                parentRow = n; return e;
                            }
                        });

                        var relationshipCell = productSlickGrid.get("grid").getColumnIndex("RelationshipErrors");
                        productSlickGrid.get("grid").gotoCell(parentRow, relationshipCell, true);
                        break;
                    case "Variant":
                        languageCombobox = this.Languages;
                        var parentRow = 0;
                        var parentItem = $.grep(productSlickGrid.get("items"), function (e, n) {
                            if (e.itemId == error.parentId) {
                                parentRow = n; return e;
                            }
                        });

                        var relationshipCell = productSlickGrid.get("grid").getColumnIndex("VariantErrors");
                        productSlickGrid.get("grid").gotoCell(parentRow, relationshipCell, true);
                        break;
                    case null:
                        grid = this.ProductsSlickGrid.get("grid");
                        languageCombobox = this.ProductLanguagesComboBox;
                        this.ProductRelationshipsWindow.hide();
                        this.VariantsWindow.hide();
                        break;
                }

                if (grid != undefined) {
                    // Highlight the cell in the grid that holds the data.  
                    var cell = grid.getColumnIndex(error.column);

                    if (!cell) {
                        var gridColumns = grid.getColumns();
                        for (var i = 0; i < gridColumns.length; i++) {
                            if (gridColumns[i].field == error.column) {
                                cell = i;
                                break;
                            }
                        }
                    }

                    if (languageCombobox.get("selectedValue") != error.lang) {
                        languageCombobox.set("selectedValue", error.lang);
                    } else {
                        this.set("currentLang", languageCombobox.get("selectedValue"));
                    }

                    grid.removeCellCssStyles(error.cssStyleKey, error.cssObject);
                    //Applies styles to all grids on next error
                    grid.addCellCssStyles(error.cssStyleKey, error.cssObject);
                    grid.gotoCell(error.row, cell, true);
                }
            }

            if (error.type == "CategoryTab") {
                this.WorkspaceTabs.set("selectedTab", "{80903895-822C-48AA-B6C8-6833AF398103}");
                var grid;
                var categorySlickGrid = this.CategoriesSlickGrid;
                var languageCombobox;
                switch (error.group) {
                    case "Relationship":
                        // Focus the relationship error column
                        var parentRow = 0;
                        var parentItem = $.grep(categorySlickGrid.get("items"), function (e, n) {
                            if (e.itemId == error.parentId) {
                                parentRow = n; return e;
                            }
                        });

                        var relationshipCell = categorySlickGrid.get("grid").getColumnIndex("RelationshipErrors");
                        categorySlickGrid.get("grid").gotoCell(parentRow, relationshipCell, true);
                        languageCombobox = this.LanguagesRel;
                        break;
                    case null:
                        grid = this.CategoriesSlickGrid.get("grid");
                        languageCombobox = this.CategoryLanguagesComboBox;
                        this.CategoryRelationshipsWindow.hide();
                        this.ProductRelationshipsWindow.hide();
                        this.VariantsWindow.hide();
                        break;
                }

                if (grid != undefined) {
                    // Highlight the cell in either the dialog of the main grid
                    var cell = grid.getColumnIndex(error.column);

                    if (languageCombobox.get("selectedValue") != error.lang) {
                        languageCombobox.set("selectedValue", error.lang);
                    } else {
                        this.set("currentLang", languageCombobox.get("selectedValue"));
                    }

                    grid.removeCellCssStyles(error.cssStyleKey, error.cssObject);
                    // Applies category error styles
                    grid.addCellCssStyles(error.cssStyleKey, error.cssObject);
                    grid.gotoCell(error.row, cell, true);
                }
            }
        },

        verifyNewColumns: function (message, type) {
            if (message.Group == "Variant" || message.Group == "Relationship") {
                var grid;
                if (type == "ProductTab") {
                    grid = this.ProductsSlickGrid.get("grid");
                } else {
                    grid = this.CategoriesSlickGrid.get("grid");
                }

                var columns = grid.getColumns();

                if (message.Group == "Variant") {
                    var column = columns[grid.getColumnIndex("VariantErrors")];
                    if (column == undefined) {
                        // Adds Variant Errors Column if it isn't already in the grid
                        variantErrorsColumn = {
                            "cssClass": "error-variant-column", "defaultSortAsc": true, "field": "VariantErrors", "focusable": true, "minWidth": 50, "id": "VariantErrors", "name": "", "rerenderOnResize": true, "resizable": false, "selectable": true, "sortable": false, "width": 50, "toolTip": "Variant Errors", "headerCssClass": "variantErrorsHeader", formatter: Slick.Sitecore.Formatters.VariantFormatter
                        };
                        var checkbox = columns.shift();
                        columns.unshift(variantErrorsColumn);
                        columns.unshift(checkbox);
                        grid.setColumns(columns);
                    }
                }

                if (message.Group == "Relationship") {
                    var column = columns[grid.getColumnIndex("RelationshipErrors")];
                    // Adds the Relationship Errors column if it isn't already in the grid
                    if (column == undefined) {
                        relationshipErrorsColumn = { "cssClass": "error-relationship-column", "defaultSortAsc": true, "field": "RelationshipErrors", "focusable": true, "minWidth": 50, "id": "RelationshipErrors", "name": "", "rerenderOnResize": true, "resizable": false, "selectable": true, "sortable": false, "width": 50, "toolTip": "Relationship Errors", "headerCssClass": "relationshipErrorsHeader", formatter: Slick.Sitecore.Formatters.RelationshipFormatter };
                        var checkbox = columns.shift();
                        columns.unshift(relationshipErrorsColumn);
                        columns.unshift(checkbox);
                        grid.setColumns(columns);
                    }
                }
            }
        },

        prevProductVariant: function () {
            var index = this.getProductFamilyIndex(this.get("currentProductFamily"), "prev");
            if (index != null) {
                var selectedRows = this.productFamilyIndicies();
                var currentlySelectedProductFamily = this.ProductsSlickGrid.get("items")[index];
                this.loadVariantsForCurrentProduct();
            }
        },

        nextProductVariant: function () {
            var index = this.getProductFamilyIndex(this.get("currentProductFamily"), "next");
            if (index != null) {
                var selectedRows = this.productFamilyIndicies();
                var currentlySelectedProductFamily = this.ProductsSlickGrid.get("items")[index];
                this.loadVariantsForCurrentProduct();
            }
        },

        prevProductRelationship: function () {
            var index = this.getItemIndex(this.get("currentProduct"), "prev", this.ProductsSlickGrid, "prod");
            if (index != null) {
                this.loadRelationshipsForCurrentProduct();
            }
        },

        nextProductRelationship: function () {
            var index = this.getItemIndex(this.get("currentProduct"), "next", this.ProductsSlickGrid, "prod");
            if (index != null) {
                this.loadRelationshipsForCurrentProduct();
            }
        },

        prevCategoryRelationship: function () {
            var index = this.getItemIndex(this.get("currentCategory"), "prev", this.CategoriesSlickGrid, "cat");
            if (index != null) {
                this.loadRelationshipsForCurrentCategory();
            }
        },

        nextCategoryRelationship: function () {
            var index = this.getItemIndex(this.get("currentCategory"), "next", this.CategoriesSlickGrid, "cat");
            if (index != null) {
                this.loadRelationshipsForCurrentCategory();
            }
        },

        getItemIndex: function (index, direction, slickGrid, type) {
            var returnItem = null;
            var selectedRows = slickGrid.selectedIndicies();
            if (selectedRows.length > 1) {
                switch (direction) {
                    case "prev":
                        var prev = index == 0 ? 0 : index - 1;
                        if (prev >= 0) {
                            returnItem = selectedRows[prev];
                            if (type == "prod") { this.set("currentProduct", prev); } else { this.set("currentCategory", prev); }
                        }
                        break;
                    case "next":
                        var next = index + 1;
                        if (selectedRows.length > next) {
                            returnItem = selectedRows[next];
                            if (type == "prod") { this.set("currentProduct", next); } else { this.set("currentCategory", next); }
                        }
                        break;
                }
            }

            return returnItem;
        },

        productFamilyIndicies: function () {
            var selectedIndicies = this.ProductsSlickGrid.selectedIndicies();
            var productFamilyIndicies = [];
            var self = this;
            selectedIndicies.forEach(function (entry) {
                var item = self.ProductsSlickGrid.get("dataView").getItemByIdx(entry);
                if (item._IsProductFamily) {
                    productFamilyIndicies.push(entry);
                }
            });

            return productFamilyIndicies;
        },

        getProductFamilyIndex: function (index, direction) {
            var returnItem = null;
            var selectedRows = this.productFamilyIndicies();
            if (selectedRows.length > 1) {
                switch (direction) {
                    case "prev":
                        var prev = index == 0 ? 0 : index - 1;
                        if (prev >= 0) {
                            returnItem = selectedRows[prev];
                            this.set("currentProductFamily", prev);
                        }
                        break;
                    case "next":
                        var next = index + 1;
                        if (selectedRows.length > next) {
                            returnItem = selectedRows[next];
                            this.set("currentProductFamily", next);
                        }
                        break;
                }
            }

            return returnItem;
        },

        // Remove item from workspace - this does not delete the product
        removeProducts: function () {
            var itemsToRemove = this.ProductsSlickGrid.selectedItemIds();
            var self = this;
            this.workspace.removeItems(itemsToRemove, function (data) {
                if (data.Result == "success") {
                    itemsToRemove.forEach(function (entry) {
                        self.ProductsSlickGrid.deleteItem(entry);
                    });
                    self.ProductsSlickGrid.unselectAll();
                    self.HeaderActionsMessageBar.addMessage("notification", data.Message);

                    self.ProductLanguagesComboBox.set("isVisible", self.ProductsSlickGrid.get("items").length > 0);
                }
            });
        },

        // Remove item from workspace - this does not delete the category
        removeCategories: function () {
            var itemsToRemove = this.CategoriesSlickGrid.selectedItemIds();
            var self = this;
            this.workspace.removeItems(itemsToRemove, function (data) {
                if (data.Result == "success") {
                    itemsToRemove.forEach(function (entry) {
                        self.CategoriesSlickGrid.deleteItem(entry);
                    });
                    self.CategoriesSlickGrid.unselectAll();
                    self.HeaderActionsMessageBar.addMessage("notification", data.Message);

                    self.CategoryLanguagesComboBox.set("isVisible", self.CategoriesSlickGrid.get("items").length > 0);
                }
            });
        },

        getCurrentProduct: function () {
            var selectedRows = this.ProductsSlickGrid.selectedIndicies();
            if (selectedRows != undefined && selectedRows.length > 0) {
                var currentlySelectedProduct = this.ProductsSlickGrid.get("items")[selectedRows[this.get("currentProduct")]];
                return currentlySelectedProduct;
            }
        },

        getCurrentCategory: function () {
            var selectedRows = this.CategoriesSlickGrid.selectedIndicies();
            if (selectedRows != undefined && selectedRows.length > 0) {
                var currentlySelectedCategory = this.CategoriesSlickGrid.get("items")[selectedRows[this.get("currentCategory")]];
                return currentlySelectedCategory;
            }
        },

        removeSelectedProductRelationshipsStart: function () {
            this.deletePointer = this.removeSelectedProductRelationships;
            this.DeleteAlert.show();
        },

        removeSelectedCategoryRelationshipsStart: function () {
            this.deletePointer = this.removeSelectedCategoryRelationships;
            this.DeleteAlert.show();
        },

        deleteSelected: function () {
            if (this.deletePointer) {
                this.deletePointer();
            }
        },

        hideDeleteAlert: function () {
            this.DeleteAlert.hide();
            if (this.deletePointer == this.removeSelectedCategoryRelationships) {
                this.CategoryRelationshipsWindow.show();
            } else if (this.deletePointer == this.removeSelectedProductRelationships) {
                this.ProductRelationshipsWindow.show();
            }
        },

        removeSelectedProductRelationships: function () {
            this.ProductRelationshipsWindow.show();
            var self = this;
            var relationshipsGrid = this.ProductRelationshipsDialog.ProductRelationshipsGrid;
            var currentProduct = this.getCurrentProduct();

            if (currentProduct) {
                var relationshipIndices = relationshipsGrid.selectedIndicies();
                var relationships = [];

                for (i = 0; i < relationshipIndices.length; i++) {
                    var relationshipItem = relationshipsGrid.get("items")[relationshipIndices[i]];

                    if (relationshipItem) {
                        relationships.push(relationshipItem);
                    }
                }

                if (relationships && relationships.length > 0) {
                    // Add them to the current product's deleted relationships list
                    if (currentProduct["TempDeleteRelationships"]) {
                        currentProduct.TempDeleteRelationships.concat(relationships);
                    } else {
                        currentProduct.TempDeleteRelationships = relationships;
                    }

                    // Remove these from the product relationships grid
                    var relationshipsToRemove = relationshipsGrid.selectedItemIds();
                    relationshipsToRemove.forEach(function (relationshipId) {
                        var relationship = relationshipsGrid.getItemById(relationshipId);
                        relationshipsGrid.deleteItem(relationshipId);

                        if (relationship) {
                            self.removeProductTempRelationshipFromAllLanguages(currentProduct, relationship);
                            if (!self.tempDeletedRelationships[currentProduct.itemId]) {
                                self.tempDeletedRelationships[currentProduct.itemId] = [];
                            }

                            self.tempDeletedRelationships[currentProduct.itemId].push(relationship);
                        }
                    });
                }
            }
        },

        removeSelectedCategoryRelationships: function () {
            this.CategoryRelationshipsWindow.show();
            var self = this;
            var relationshipsGrid = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid;
            var currentCategory = this.getCurrentCategory();

            if (currentCategory) {
                var relationshipIndices = relationshipsGrid.selectedIndicies();
                var relationships = [];

                for (i = 0; i < relationshipIndices.length; i++) {
                    var relationshipItem = relationshipsGrid.get("items")[relationshipIndices[i]];

                    if (relationshipItem) {
                        relationships.push(relationshipItem);
                    }
                }

                if (relationships && relationships.length > 0) {
                    // Add them to the current category's deleted relationships list
                    if (currentCategory["TempDeleteRelationships"]) {
                        currentCategory.TempDeleteRelationships.concat(relationships);
                    } else {
                        currentCategory.TempDeleteRelationships = relationships;
                    }

                    // Remove these from the category relationships grid
                    var relationshipsToRemove = relationshipsGrid.selectedItemIds();
                    relationshipsToRemove.forEach(function (relationshipId) {
                        var relationship = relationshipsGrid.getItemById(relationshipId);
                        relationshipsGrid.deleteItem(relationshipId);

                        if (relationship) {
                            self.removeCategoryTempRelationshipFromAllLanguages(currentCategory, relationship);
                            if (!self.tempDeletedRelationships[currentCategory.itemId]) {
                                self.tempDeletedRelationships[currentCategory.itemId] = [];
                            }

                            self.tempDeletedRelationships[currentCategory.itemId].push(relationship);
                        }
                    });
                }
            }
        },

        doneProductRelationships: function () {
            //Make sure we commit the changes on done
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid").navigateNext();
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid").navigatePrev();

            //Make sure cancel message bar is synced
            this.syncCancelBar(this.ProductRelationshipsDialog.ProductRelationshipsCancelChangesBar);

            // For every product that had been selected:
            // Update relationships with temp relationships and
            // add any deleted relationships to the deleted relationships list
            var selectedRows = null;
            if (this.productIndexBeingValidated != null) {
                selectedRows = new Array();
                selectedRows.push(this.productIndexBeingValidated);
            } else {
                selectedRows = this.ProductsSlickGrid.selectedIndicies();
            }

            var self = this;
            if (selectedRows != undefined && selectedRows.length > 0) {
                this.updateProductRelationshipEditedSharedFieldsLookup();
                this.updateCreatedRelationshipsLookup();
                this.updateDeletedRelationshipsLookup();
                for (var i = 0; i < selectedRows.length; i++) {
                    var product = this.ProductsSlickGrid.get("items")[selectedRows[i]];
                    var loadedLanguages = this.ProductsSlickGrid.getLanguages();
                    $.each(loadedLanguages, function (index, languageName) {
                        var productVersion = self.ProductsSlickGrid.getDataItems(languageName)[selectedRows[i]];
                        self.applyPendingTempRelationshipCreates(productVersion);
                        self.applyTempProductRelationshipSharedFieldEdits(productVersion);
                        productVersion.Relationships = $.extend(true, [], productVersion.TempRelationships);
                        if (productVersion.Relationships && self.collectionDirty(productVersion.Relationships)) {
                            self.set("isDirty", true);
                            self.ProductsSlickGrid.set("hasChanges", true);
                            productVersion.isDirty = true;
                        }

                        if (productVersion.TempDeleteRelationships) {
                            productVersion.DeleteRelationships = productVersion.TempDeleteRelationships;
                            productVersion.isDirty = true;
                            self.set("isDirty", true);
                            self.ProductsSlickGrid.set("hasChanges", true);
                        }

                        self.removeDeletedRelationshipsClientSide(productVersion);
                    });
                }
            }

            this.ProductRelationshipsWindow.hide();
            this.set("currentProduct", 0);
            this.clearLookup(this.tempDeletedRelationships);
            this.clearLookup(this.tempCreatedRelationships);
            this.clearLookup(this.tempEditedProductRelationshipSharedFields);
            this.productIndexBeingValidated = null;
            self.activeElement.focus();
        },

        cancelProductRelationshipsBar: function () {
            if (this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("hasChanges")) {
                var messageBar = this.ProductRelationshipsDialog.ProductRelationshipsCancelChangesBar;
                messageBar.set("isVisible", true);
                if (!messageBar.get("hasNotificationMessages")) {
                    this.cancelProductRelationships();
                }
            } else {
                this.cancelProductRelationships();
            }
        },

        cancelProductRelationships: function () {
            this.syncCancelBar(this.ProductRelationshipsDialog.ProductRelationshipsCancelChangesBar);

            // For every loaded language, revert the TempRelationships so we don't have to reset on every language switch
            var selectedRows = null;
            if (this.productIndexBeingValidated != null) {
                selectedRows = new Array();
                selectedRows.push(this.productIndexBeingValidated);
            } else {
                selectedRows = this.ProductsSlickGrid.selectedIndicies();
            }

            var self = this;
            if (selectedRows && selectedRows.length > 0) {
                var loadedLanguages = this.ProductsSlickGrid.getLanguages();
                for (var i = 0; i < selectedRows.length; i++) {
                    $.each(loadedLanguages, function (index, languageName) {
                        var productVersion = self.ProductsSlickGrid.getDataItems(languageName)[selectedRows[i]];
                        if (productVersion.Relationships) {
                            productVersion.TempRelationships = $.extend(true, [], productVersion.Relationships);
                        }
                    });
                }
            }
            // $("div[data-sc-id=MessageRowPanel]").detach().insertBefore("div[data-sc-id=WorkspaceTabs]");
            this.ProductRelationshipsWindow.hide();
            this.set("currentProduct", 0);
            this.clearLookup(this.tempDeletedRelationships);
            this.clearLookup(this.tempCreatedRelationships);
            this.clearLookup(this.tempEditedProductRelationshipSharedFields);

            this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("hasChanges", false);
            this.productIndexBeingValidated = null;

            self.activeElement.focus();
        },

        doneVariants: function () {
            //Make sure we commit the changes on done
            this.VariantsDialog.VariantsSlickGrid.get("grid").navigateNext();
            this.VariantsDialog.VariantsSlickGrid.get("grid").navigatePrev();

            //Make sure cancel message bar is synced
            this.syncCancelBar(this.VariantsDialog.ProductVariantsCancelChangesBar);

            // Get selected product families indicies
            var selectedRows = null;
            if (this.productIndexBeingValidated != null) {
                selectedRows = new Array();
                selectedRows.push(this.productIndexBeingValidated);

            } else {
                selectedRows = this.productFamilyIndicies();
            }

            var self = this;
            if (selectedRows != undefined && selectedRows.length > 0) {
                this.updateeditedVariantSharedFieldsLookup();
                for (i = 0; i < selectedRows.length; i++) {
                    var loadedLanguages = this.ProductsSlickGrid.getLanguages();
                    $.each(loadedLanguages, function (index, languageName) {
                        var productVersion = self.ProductsSlickGrid.getDataItems(languageName)[selectedRows[i]];
                        self.applyTempVariantSharedFieldEdits(productVersion);
                        productVersion.Variants = $.extend(true, [], productVersion.TempVariants);
                        if (productVersion.Variants && self.collectionDirty(productVersion.Variants)) {
                            self.set("isDirty", true);
                            self.ProductsSlickGrid.set("hasChanges", true);
                            productVersion.isDirty = true;
                        }
                    });
                }
            }

            this.VariantsWindow.hide();
            this.set("currentProductFamily", 0);
            this.productIndexBeingValidated = null;
            this.clearLookup(this.tempEditedVariantSharedFields);
            self.activeElement.focus();
        },

        doneCategoryRelationships: function () {
            //Make sure we commit the changes on done
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid").navigateNext();
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid").navigatePrev();

            //Make sure cancel message bar is synced
            this.syncCancelBar(this.CategoryRelationshipsDialog.CategoryRelationshipsCancelChangesBar);
            // For every category that had been selected:
            // Update relationships with temp relationships and
            // add any deleted relationships to the deleted relationships list
            var selectedRows = null;
            if (this.categoryIndexBeingValidated != null) {
                selectedRows = new Array();
                selectedRows.push(this.categoryIndexBeingValidated);
            } else {
                selectedRows = this.CategoriesSlickGrid.selectedIndicies();
            }

            var self = this;
            if (selectedRows != undefined && selectedRows.length > 0) {
                this.updateCategoryRelationshipEditedSharedFieldsLookup();
                this.updateCreatedRelationshipsLookup();
                this.updateDeletedRelationshipsLookup();
                for (var i = 0; i < selectedRows.length; i++) {
                    var category = this.CategoriesSlickGrid.get("items")[selectedRows[i]];
                    var loadedLanguages = this.CategoriesSlickGrid.getLanguages();

                    $.each(loadedLanguages, function (index, languageName) {
                        var categoryVersion = self.CategoriesSlickGrid.getDataItems(languageName)[selectedRows[i]];
                        self.applyPendingTempRelationshipCreates(categoryVersion);
                        categoryVersion.Relationships = categoryVersion.TempRelationships;
                        if (categoryVersion.Relationships && self.collectionDirty(categoryVersion.Relationships)) {
                            self.set("isDirty", true);
                            self.CategoriesSlickGrid.set("hasChanges", true);
                            categoryVersion.isDirty = true;
                        }

                        if (categoryVersion.TempDeleteRelationships) {
                            categoryVersion.DeleteRelationships = categoryVersion.TempDeleteRelationships;
                            categoryVersion.isDirty = true;
                            self.set("isDirty", true);
                            self.CategoriesSlickGrid.set("hasChanges", true);
                        }

                        self.removeDeletedRelationshipsClientSide(categoryVersion);
                    });
                }
            }

            this.CategoryRelationshipsWindow.hide();
            this.set("currentCategory", 0);
            this.clearLookup(this.tempDeletedRelationships);
            this.clearLookup(this.tempCreatedRelationships);
            this.clearLookup(this.tempEditedCategoryRelationshipSharedFields);
            this.categoryIndexBeingValidated = null;
            self.activeElement.focus();
        },

        collectionDirty: function (collection) {
            for (var i = 0; i < collection.length; i++) {
                if (collection[i].isDirty) {
                    return true;
                }
            }

            return false;
        },

        cancelCategoryRelationshipsBar: function () {
            if (this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("hasChanges")) {
                var messageBar = this.CategoryRelationshipsDialog.CategoryRelationshipsCancelChangesBar;
                messageBar.set("isVisible", true);
                if (!messageBar.get("hasNotificationMessages")) {
                    this.cancelCategoryRelationships();
                }
            } else {
                this.cancelCategoryRelationships();
            }

        },

        cancelCategoryRelationships: function () {
            this.syncCancelBar(this.CategoryRelationshipsDialog.CategoryRelationshipsCancelChangesBar);

            // For every loaded language, revert the TempRelationships so we don't have to reset on every language switch
            var selectedRows = null;
            if (this.categoryIndexBeingValidated != null) {
                selectedRows = new Array();
                selectedRows.push(this.categoryIndexBeingValidated);
            } else {
                selectedRows = this.CategoriesSlickGrid.selectedIndicies();
            }

            var self = this;
            if (selectedRows && selectedRows.length > 0) {
                var loadedLanguages = this.CategoriesSlickGrid.getLanguages();
                for (var i = 0; i < selectedRows.length; i++) {
                    $.each(loadedLanguages, function (index, languageName) {
                        var categoryVersion = self.CategoriesSlickGrid.getDataItems(languageName)[selectedRows[i]];
                        if (categoryVersion.Relationships) {
                            categoryVersion.TempRelationships = $.extend(true, [], categoryVersion.Relationships);
                        }
                    });
                }
            }

            this.CategoryRelationshipsWindow.hide();
            this.set("currentCategory", 0);
            this.clearLookup(this.tempDeletedRelationships);
            this.clearLookup(this.tempCreatedRelationships);
            this.clearLookup(this.tempEditedCategoryRelationshipSharedFields);

            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("hasChanges", false);
            this.categoryIndexBeingValidated = null;
            self.activeElement.focus();
        },

        getInitialLanguage: function (cultures) {
            var language = CommerceUtilities.getCookie("commerceLang");

            if (language) {

                if (cultures === null || cultures.length === 0) {
                    return "";
                }

                var cultureFound = false;
                var compatibleLanguage = "";

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
                            compatibleLanguage = cultures[i].language;
                            break;
                        }
                    }
                }

                if (cultureFound) {
                    return language;
                } else {
                    if (compatibleLanguage) {
                        return compatibleLanguage;
                    } else {
                        return "en-US";
                    }
                }
            }
            else {
                return "en-US";
            }
        },

        SetSupportedLanguageStyle: function () {
            // All grids should change the style accordingly
            this.ProductsSlickGrid.setSupportedLanguageStyles();
            this.CategoriesSlickGrid.setSupportedLanguageStyles();
            this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.setSupportedLanguageStyles();
            this.ProductRelationshipsDialog.ProductRelationshipsGrid.setSupportedLanguageStyles();
        },

        onProductRelationshipsLanguageChanged: function () {
            if (this.initializingRelationshipsDialog) {
                return;
            }

            var selectedLanguage = this.LanguagesProductRel.get("selectedValue");
            var self = this;

            var workspaceName = "Default";
            var controlFolder = self.ProductRelationshipsDialog.ProductRelationshipsGrid.get("controlMappings");


            if (this.ProductsSlickGrid.hasLanguage(selectedLanguage) == false) {
                // We haven't loaded the parents for the relationship in the requested language,
                // so load that language into the workspace now
                this.workspace.getItems(function (data) {

                    // Add the loaded items to the main workspace without switching the language
                    self.ProductsSlickGrid.addDataItems(data.Items, selectedLanguage);
                    self.loadRelationshipsForCurrentProduct(self.productIndexBeingValidated);
                    self.SetSupportedLanguageStyle();
                }, "Product", workspaceName, controlFolder, selectedLanguage);
            } else {
                self.loadRelationshipsForCurrentProduct(self.productIndexBeingValidated);
                self.SetSupportedLanguageStyle();
            }


            this.addRemoveStylesOnLanguageChange(selectedLanguage, "ProductRelationship");
        },

        onCategoryRelationshipsLanguageChanged: function () {
            if (this.initializingRelationshipsDialog) {
                return;
            }

            var selectedLanguage = this.LanguagesRel.get("selectedValue");
            var self = this;

            var workspaceName = "Default";
            var controlFolder = self.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("controlMappings");

            if (this.CategoriesSlickGrid.hasLanguage(selectedLanguage) == false) {
                // We haven't loaded the parents for the relationship in the requested language,
                // so load that language into the workspace now
                this.workspace.getItems(function (data) {

                    // Add the loaded items to the main workspace without switching the language
                    self.CategoriesSlickGrid.addDataItems(data.Items, selectedLanguage);
                    self.loadRelationshipsForCurrentCategory(self.categoryIndexBeingValidated);
                    self.SetSupportedLanguageStyle();
                }, "Category", workspaceName, controlFolder, selectedLanguage);
            } else {
                self.loadRelationshipsForCurrentCategory(self.categoryIndexBeingValidated);
                self.SetSupportedLanguageStyle();
            }
            this.addRemoveStylesOnLanguageChange(selectedLanguage, "CategoryRelationship");

        },

        // selectedIndex is passed as an optional parameter so we can override the selectedIndex
        loadRelationshipsForCurrentProduct: function (selectedIndex) {
            var selectedLanguage = this.LanguagesProductRel.get("selectedValue");
            var controlFolder = this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("controlMappings");

            var selectedIndices = this.ProductsSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentProduct")];
            if (selectedIndex != null && selectedIndex >= 0) {
                currentSelectedIndex = selectedIndex;
            }

            var product = this.ProductsSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];
            this.ProductRelationshipTitle.set("text", product["__Display name"] + " (" + product["Name"] + ")");
            var self = this;
            var comparer = function (a, b) {
                return (a["Rank"] > b["Rank"]) ? 1 : -1;
            }

            if (!product["Relationships"]) {
                // We haven't loaded the relationships for this product, so lazy-load them now
                this.workspace.getRelationships(function (data) {
                    product.Relationships = data.Items;

                    // If we have committed deletes of relationships, apply them now to the 
                    // relationships we're loading from the server - because it doesn't know about them yet.
                    self.applyPendingCommittedRelationshipCreates(product);
                    self.applyCommittedProductRelationshipShareFieldEdits(product);
                    self.applyPendingCommittedRelationshipDeletes(product);
                    product.TempRelationships = $.extend(true, [], product.Relationships); // Make a deep clone of the relationships

                    // If we have un-committed creates/deletes of relationships, add/remove them from the
                    // relationships we're loading before displaying them in the grid.
                    self.applyPendingTempRelationshipCreates(product);
                    self.applyTempProductRelationshipSharedFieldEdits(product);
                    self.applyPendingTempRelationshipDeletes(product);

                    self.setProductRelationshipsDialogDataItems(product);
                    self.ProductRelationshipsDialog.ProductRelationshipsGrid.get("dataView").sort(comparer, true);
                }, product, "Default", "Relationship", controlFolder, selectedLanguage);
            } else {
                // Relationships have already been loaded - just display them in the dialog
                self.applyPendingTempRelationshipCreates(product);
                self.applyTempProductRelationshipSharedFieldEdits(product);
                self.applyPendingTempRelationshipDeletes(product);
                self.setProductRelationshipsDialogDataItems(product);
                self.ProductRelationshipsDialog.ProductRelationshipsGrid.get("dataView").sort(comparer, true);
            }

            self.clearAllGridStyles(self.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid"));

            var currentId = self.getIDOfCurrentlySelectedProduct(currentSelectedIndex);
            self.dialogHasErrors(self.ProductRelationshipsDialog.ProductRelationshipsGrid, currentId);
        },

        // selectedIndex is an optional parameter for overriding the selected index during validation.
        loadRelationshipsForCurrentCategory: function (selectedIndex) {
            var selectedLanguage = this.LanguagesRel.get("selectedValue");
            var controlFolder = this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("controlMappings");

            // Now get the item in the chosen language
            var selectedIndices = this.CategoriesSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentCategory")];
            if (selectedIndex != null && selectedIndex >= 0) {
                currentSelectedIndex = selectedIndex;
            }

            var category = this.CategoriesSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];
            this.CategoryRelationshipTitle.set("text", category["__Display name"]);
            var self = this;
            var comparer = function (a, b) {
                return (a["Rank"] > b["Rank"]) ? 1 : -1;
            }

            if (!category["Relationships"]) {
                // We haven't loaded the relationships for this product, so lazy-load them now
                this.workspace.getRelationships(function (data) {
                    category.Relationships = data.Items;

                    // If we have committed deletes of relationships, apply them now to the 
                    // relationships we're loading from the server - because it doesn't know about them yet.
                    self.applyPendingCommittedRelationshipCreates(category);
                    self.applyCommittedCategoryRelationshipShareFieldEdits(category);
                    self.applyPendingCommittedRelationshipDeletes(category);

                    category.TempRelationships = $.extend(true, [], category.Relationships); // Make a deep clone of the relationships

                    // If we have un-committed deletes of relationships, remove them from the
                    // relationships we're loading before displaying them in the grid.
                    self.applyPendingTempRelationshipCreates(category);
                    self.applyTempCategoryRelationshipSharedFieldEdits(category);
                    self.applyPendingTempRelationshipDeletes(category);

                    self.setCategoryRelationshipsDialogDataItems(category);
                    self.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("dataView").sort(comparer, true);
                }, category, "Default", "Relationship", controlFolder, selectedLanguage);
            } else {
                // Relationships have already been loaded - just display them in the dialog
                self.applyPendingTempRelationshipCreates(category);
                self.applyPendingTempRelationshipDeletes(category);
                self.applyTempCategoryRelationshipSharedFieldEdits(category);
                self.setCategoryRelationshipsDialogDataItems(category);
                self.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("dataView").sort(comparer, true);
            }

            self.clearAllGridStyles(self.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid"));
            var currentId = self.getIDOfCurrentlySelectedCategory(currentSelectedIndex);
            self.dialogHasErrors(self.CategoryRelationshipsDialog.CategoryRelationshipsGrid, currentId);
        },

        setProductRelationshipsDialogDataItems: function (product) {
            if (product.TempRelationships) {
                this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("items", []);
                this.ProductRelationshipsDialog.ProductRelationshipsGrid.set("items", product.TempRelationships);

                $('#' + this.ProductRelationshipsDialog.ProductRelationshipsGrid.viewModel.gridId()).css("width", this.ProductRelationshipsWindow.viewModel.$el.width());
                this.ProductRelationshipsDialog.ProductRelationshipsGrid.get("grid").resizeCanvas();
            }
        },

        setCategoryRelationshipsDialogDataItems: function (category) {
            if (category.TempRelationships) {
                this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("items", []);
                this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.set("items", category.TempRelationships);

                $('#' + this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.viewModel.gridId()).css("width", this.CategoryRelationshipsWindow.viewModel.$el.width());
                this.CategoryRelationshipsDialog.CategoryRelationshipsGrid.get("grid").resizeCanvas();
            }
        },

        onVariantLanguageChanged: function () {
            if (this.initializingVariantsDialog) {
                return;
            }

            var selectedLanguage = this.Languages.get("selectedValue");
            var self = this;

            var workspaceName = "Default";
            var controlFolder = self.ProductRelationshipsDialog.ProductRelationshipsGrid.get("controlMappings");

            if (this.ProductsSlickGrid.hasLanguage(selectedLanguage) == false) {
                // We haven't loaded the parents for the relationship in the requested language,
                // so load that language into the workspace now
                this.workspace.getItems(function (data) {

                    // Add the loaded items to the main workspace without switching the language
                    self.ProductsSlickGrid.addDataItems(data.Items, selectedLanguage);
                    self.loadVariantsForCurrentProduct(self.productIndexBeingValidated);
                    self.SetSupportedLanguageStyle();
                }, "Product", workspaceName, controlFolder, selectedLanguage);
            } else {
                self.loadVariantsForCurrentProduct(self.productIndexBeingValidated);
                self.SetSupportedLanguageStyle();
            }
            this.addRemoveStylesOnLanguageChange(selectedLanguage, "ProductVariant");
        },

        // selectedIndex is optional to allow overriding for validation. 
        loadVariantsForCurrentProduct: function (selectedIndex) {
            var selectedLanguage = this.Languages.get("selectedValue");
            var controlFolder = this.VariantsDialog.VariantsSlickGrid.get("controlMappings");

            // Now get the item in the chosen language
            var selectedIndices = this.productFamilyIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentProductFamily")];
            if (selectedIndex != null && selectedIndex >= 0) {
                currentSelectedIndex = selectedIndex;
            }

            var product = this.ProductsSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];
            this.VariantTitle.set("text", product["__Display name"] + " (" + product["Name"] + ")");
            var self = this;

            if (!product["Variants"]) {
                // We haven't loaded the variants for this product, so lazy-load them now
                this.workspace.getVariants(function (data) {
                    product.Variants = data.Items;
                    self.applyCommittedVariantSharedFieldEdits(product);
                    product.TempVariants = $.extend(true, [], product.Variants); // Make a deep clone of the variants

                    self.applyTempVariantSharedFieldEdits(product);

                    self.setVariantDialogDataItems(product);
                }, product, "Default", controlFolder, selectedLanguage);
            } else {
                // Variants have already been loaded - just display them in the dialog
                self.applyTempVariantSharedFieldEdits(product);
                self.setVariantDialogDataItems(product);
            }

            self.clearAllGridStyles(self.VariantsDialog.VariantsSlickGrid.get("grid"));
            var currentId = self.getIDOfCurrentlySelectedProductForVariant(currentSelectedIndex);
            self.dialogHasErrors(self.VariantsDialog.VariantsSlickGrid, currentId);
        },

        setVariantDialogDataItems: function (product) {
            if (product.TempVariants) {
                this.VariantsDialog.VariantsSlickGrid.set("items", []);
                this.VariantsDialog.VariantsSlickGrid.set("items", product.TempVariants);

                $('#' + this.VariantsDialog.VariantsSlickGrid.viewModel.gridId()).css("width", this.VariantsWindow.viewModel.$el.width());
                this.VariantsDialog.VariantsSlickGrid.get("grid").resizeCanvas();
            }
        },

        removeProductTempRelationshipFromAllLanguages: function (currentProduct, relationship) {
            var languages = this.ProductsSlickGrid.getLanguages();

            for (i = 0; i < languages.length; i++) {
                var dataItems = Enumerable.From(this.ProductsSlickGrid.getDataItems(languages[i]));
                var matches = dataItems.Where(function (x) { return x.itemId == currentProduct.itemId }).ToArray();
                if (matches && matches.length > 0) {
                    var matchedItem = matches[0];
                    if (matchedItem.TempRelationships) {
                        for (j = 0; j < matchedItem.TempRelationships.length; j++) {
                            var r = matchedItem.TempRelationships[j];
                            if (r.RelationshipName == relationship.RelationshipName && r.targetItemId == relationship.targetItemId) {
                                matchedItem.TempRelationships.splice(j, 1);
                                break;
                            }
                        }
                    }

                }
            }
        },

        removeCategoryTempRelationshipFromAllLanguages: function (currentCategory, relationship) {
            var languages = this.CategoriesSlickGrid.getLanguages();

            for (i = 0; i < languages.length; i++) {
                var dataItems = Enumerable.From(this.CategoriesSlickGrid.getDataItems(languages[i]));
                var matches = dataItems.Where(function (x) { return x.itemId == currentCategory.itemId }).ToArray();
                if (matches && matches.length > 0) {
                    var matchedItem = matches[0];
                    if (matchedItem.TempRelationships) {
                        for (j = 0; j < matchedItem.TempRelationships.length; j++) {
                            var r = matchedItem.TempRelationships[j];
                            if (r.RelationshipName == relationship.RelationshipName && r.targetItemId == relationship.targetItemId) {
                                matchedItem.TempRelationships.splice(j, 1);
                                break;
                            }
                        }
                    }
                }
            }
        },

        removeDeletedRelationshipsClientSide: function (productVersion) {
            if (!this.deletedRelationships[productVersion.itemId]) {
                return;
            }

            var removedRelationships = this.deletedRelationships[productVersion.itemId];
            for (var i = 0; i < removedRelationships.length; i++) {
                var removedRelationship = removedRelationships[i];

                // Ensure that this version of the product has its relationships up to date.
                if (productVersion.Relationships && productVersion.Relationships.length > 0) {
                    for (var j = 0; j < productVersion.Relationships.length; j++) {
                        var currentRelationship = productVersion.Relationships[j];
                        if (removedRelationship.RelationshipName == currentRelationship.RelationshipName && removedRelationship.targetItemId == currentRelationship.targetItemId) {
                            productVersion.Relationships.splice(j, 1);
                            break;
                        }
                    }
                }

                // Ensure that any deleted relationships are removed from the list of edited relationships
                // for this product version
                if (productVersion.EditRelationships && productVersion.EditRelationships.length > 0) {
                    for (var k = 0; k < productVersion.EditRelationships.length; k++) {
                        var currentEditedRelationship = productVersion.EditRelationships[k];
                        if (removedRelationship.RelationshipName == currentEditedRelationship.RelationshipName && removedRelationship.targetItemId == currentEditedRelationship.targetItemId) {
                            productVersion.EditRelationships.splice(k, 1);
                            break;
                        }
                    }
                }
            }
        },

        applyPendingTempRelationshipDeletes: function (catalogItem) {
            if (!this.tempDeletedRelationships[catalogItem.itemId]) {
                return;
            }

            var pendingTempDeletes = this.tempDeletedRelationships[catalogItem.itemId];
            for (var i = 0; i < pendingTempDeletes.length; i++) {
                var tempDeletedRelationship = pendingTempDeletes[i];
                for (var j = 0; j < catalogItem.TempRelationships.length; j++) {
                    if (tempDeletedRelationship.RelationshipName == catalogItem.TempRelationships[j].RelationshipName && tempDeletedRelationship.targetItemId == catalogItem.TempRelationships[j].targetItemId) {
                        catalogItem.TempRelationships.splice(j, 1);
                        break;
                    }
                }
            }
        },

        applyPendingCommittedRelationshipDeletes: function (catalogItem) {
            if (!this.deletedRelationships[catalogItem.itemId]) {
                return;
            }

            var pendingDeletes = this.deletedRelationships[catalogItem.itemId];
            for (var i = 0; i < pendingDeletes.length; i++) {
                var deletedRelationship = pendingDeletes[i];
                for (var j = 0; j < catalogItem.Relationships.length; j++) {
                    if (deletedRelationship.RelationshipName == catalogItem.Relationships[j].RelationshipName && deletedRelationship.targetItemId == catalogItem.Relationships[j].targetItemId) {
                        catalogItem.Relationships.splice(j, 1);
                        break;
                    }
                }
            }
        },

        applyPendingTempRelationshipCreates: function (catalogItem) {
            if (!this.tempCreatedRelationships[catalogItem.itemId]) {
                return;
            }

            if (!catalogItem.TempRelationships) {
                // The language version of the product/category has been loaded, but its 
                // relationships have not - nothing to do.
                return;
            }

            var pendingTempCreates = this.tempCreatedRelationships[catalogItem.itemId];
            for (var i = 0; i < pendingTempCreates.length; i++) {
                var tempCreatedRelationship = $.extend(true, {}, pendingTempCreates[i]);
                var tempRels = Enumerable.From(catalogItem.TempRelationships);
                var matches = tempRels.Where(function (x) { return x.itemId == tempCreatedRelationship.itemId }).ToArray();
                if (matches.length == 0) {
                    catalogItem.TempRelationships.push(tempCreatedRelationship);
                }
            }
        },

        applyPendingCommittedRelationshipCreates: function (catalogItem) {
            if (!this.createdRelationships[catalogItem.itemId]) {
                return;
            }

            var pendingCreates = this.createdRelationships[catalogItem.itemId];
            for (var i = 0; i < pendingCreates.length; i++) {
                var createdRelationship = $.extend(true, {}, pendingCreates[i]);
                var rels = Enumerable.From(catalogItem.Relationships);
                var matches = rels.Where(function (x) { return x.itemId == createdRelationship.itemId }).ToArray();
                if (matches.length == 0) {
                    catalogItem.Relationships.push(createdRelationship);
                }
            }
        },

        applyTempVariantSharedFieldEdits: function (product) {
            if (!product.TempVariants) {
                return;
            }

            for (var i = 0; i < product.TempVariants.length; i++) {
                var tempVariant = product.TempVariants[i];
                if (this.tempEditedVariantSharedFields[tempVariant.itemId]) {
                    var editedFieldsForThisVariant = this.tempEditedVariantSharedFields[tempVariant.itemId];
                    for (var j = 0; j < editedFieldsForThisVariant.length; j++) {
                        var editedField = editedFieldsForThisVariant[j];
                        tempVariant[editedField.field] = editedField.currentValue;
                    }
                }
            }
        },

        applyCommittedVariantSharedFieldEdits: function (product) {

            if (!product.Variants) {
                return;
            }

            for (var i = 0; i < product.Variants.length; i++) {
                var variant = product.Variants[i];
                if (this.editedVariantSharedFields[variant.itemId]) {
                    var editedFieldsForThisVariant = this.editedVariantSharedFields[variant.itemId];
                    for (var j = 0; j < editedFieldsForThisVariant.length; j++) {
                        var editedField = editedFieldsForThisVariant[j];
                        variant[editedField.field] = editedField.currentValue;
                    }
                }
            }
        },

        applyTempCategoryRelationshipSharedFieldEdits: function (category) {
            if (!category.TempRelationships) {
                return;
            }

            for (var i = 0; i < category.TempRelationships.length; i++) {
                var tempRelationship = category.TempRelationships[i];
                if (this.tempEditedCategoryRelationshipSharedFields[tempRelationship.itemId]) {
                    var editedFieldsForThisRelationship = this.tempEditedCategoryRelationshipSharedFields[tempRelationship.itemId];
                    for (var j = 0; j < editedFieldsForThisRelationship.length; j++) {
                        var editedField = editedFieldsForThisRelationship[j];
                        tempRelationship[editedField.field] = editedField.currentValue;
                    }
                }
            }
        },

        applyTempProductRelationshipSharedFieldEdits: function (product) {
            if (!product.TempRelationships) {
                return;
            }

            for (var i = 0; i < product.TempRelationships.length; i++) {
                var tempRelationship = product.TempRelationships[i];
                if (this.tempEditedProductRelationshipSharedFields[tempRelationship.itemId]) {
                    var editedFieldsForThisRelationship = this.tempEditedProductRelationshipSharedFields[tempRelationship.itemId];
                    for (var j = 0; j < editedFieldsForThisRelationship.length; j++) {
                        var editedField = editedFieldsForThisRelationship[j];
                        tempRelationship[editedField.field] = editedField.currentValue;
                    }
                }
            }
        },

        applyCommittedCategoryRelationshipShareFieldEdits: function (category) {
            if (!category.Relationships) {
                return;
            }

            for (var i = 0; i < category.Relationships.length; i++) {
                var relationship = category.Relationships[i];
                if (this.editedCategoryRelationshipSharedFields[relationship.itemId]) {
                    var editedFieldsForThisRelationship = this.editedCategoryRelationshipSharedFields[relationship.itemId];
                    for (var j = 0; j < editedFieldsForThisRelationship.length; j++) {
                        var editedField = editedFieldsForThisRelationship[j];
                        relationship[editedField.field] = editedField.currentValue;
                    }
                }
            }
        },

        applyCommittedProductRelationshipShareFieldEdits: function (product) {
            if (!product.Relationships) {
                return;
            }

            for (var i = 0; i < product.Relationships.length; i++) {
                var relationship = product.Relationships[i];
                if (this.editedProductRelationshipSharedFields[relationship.itemId]) {
                    var editedFieldsForThisRelationship = this.editedProductRelationshipSharedFields[relationship.itemId];
                    for (var j = 0; j < editedFieldsForThisRelationship.length; j++) {
                        var editedField = editedFieldsForThisRelationship[j];
                        relationship[editedField.field] = editedField.currentValue;
                    }
                }
            }
        },

        updateDeletedRelationshipsLookup: function () {
            var self = this;
            $.each(self.tempDeletedRelationships, function (key, relationships) {
                if (!self.deletedRelationships[key]) {
                    self.deletedRelationships[key] = [];
                }

                self.deletedRelationships[key] = self.deletedRelationships[key].concat(relationships);
            });
        },

        updateCreatedRelationshipsLookup: function () {
            var self = this;
            $.each(self.tempCreatedRelationships, function (key, relationships) {
                if (!self.createdRelationships[key]) {
                    self.createdRelationships[key] = [];
                }

                self.createdRelationships[key] = self.createdRelationships[key].concat(relationships);
            });
        },

        updateeditedVariantSharedFieldsLookup: function () {
            var self = this;
            $.each(self.tempEditedVariantSharedFields, function (key, sharedFields) {
                if (!self.editedVariantSharedFields[key]) {
                    self.editedVariantSharedFields[key] = [];
                }

                self.editedVariantSharedFields[key] = self.editedVariantSharedFields[key].concat(sharedFields);
            });
        },

        updateProductRelationshipEditedSharedFieldsLookup: function () {
            var self = this;
            $.each(self.tempEditedProductRelationshipSharedFields, function (key, sharedFields) {
                if (!self.editedProductRelationshipSharedFields[key]) {
                    self.editedProductRelationshipSharedFields[key] = [];
                }

                self.editedProductRelationshipSharedFields[key] = self.editedProductRelationshipSharedFields[key].concat(sharedFields);
            });
        },

        updateCategoryRelationshipEditedSharedFieldsLookup: function () {
            var self = this;
            $.each(self.tempEditedCategoryRelationshipSharedFields, function (key, sharedFields) {
                if (!self.editedCategoryRelationshipSharedFields[key]) {
                    self.editedCategoryRelationshipSharedFields[key] = [];
                }

                self.editedCategoryRelationshipSharedFields[key] = self.editedCategoryRelationshipSharedFields[key].concat(sharedFields);
            });
        },

        clearLookup: function (lookup) {
            if (lookup) {
                $.each(lookup, function (key, value) {
                    delete lookup[key];
                });
            }
        },

        onSharedFieldEdited: function (e, eventArgs) {
            if (eventArgs.gridInstance == this.VariantsDialog.VariantsSlickGrid) {
                this.onVariantSharedFieldEdited(e, eventArgs);
            }

            if (eventArgs.gridInstance == this.ProductRelationshipsDialog.ProductRelationshipsGrid) {
                this.onProductRelationshipSharedFieldEdited(e, eventArgs);
            }

            if (eventArgs.gridInstance == this.CategoryRelationshipsDialog.CategoryRelationshipsGrid) {
                this.onCategoryRelationshipSharedFieldEdited(e, eventArgs);
            }
        },

        onCategoryRelationshipSharedFieldEdited: function (e, eventArgs) {
            var selectedIndices = this.ProductsSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentCategory")];
            var selectedLanguage = this.LanguagesRel.get("selectedValue");
            var product = this.CategoriesSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];
            var editedVariantSharedFields = this.tempEditedCategoryRelationshipSharedFields;
            var itemSharedFields;
            var targetSharedField = null;

            var relationship = eventArgs.item;
            var column = eventArgs.column;

            // The event arguments from Rank functions pass slightly different arguments than
            // the event generated by SlickGrid
            var fieldName = typeof column == "string" ? column : column.field;

            if (editedVariantSharedFields[relationship.itemId]) {
                itemSharedFields = editedVariantSharedFields[relationship.itemId];
            } else {
                itemSharedFields = [];
            }

            for (i = 0; i < itemSharedFields.length; i++) {
                if (itemSharedFields[i].field == fieldName) {
                    targetSharedField = itemSharedFields[i];
                    break;
                }
            }

            if (targetSharedField) {
                targetSharedField.currentValue = relationship[fieldName];
            } else {
                var sharedField = { field: fieldName, currentValue: relationship[fieldName] };
                itemSharedFields.push(sharedField);
            }

            editedVariantSharedFields[relationship.itemId] = itemSharedFields;
        },

        onProductRelationshipSharedFieldEdited: function (e, eventArgs) {
            var selectedIndices = this.ProductsSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentProduct")];
            var selectedLanguage = this.LanguagesProductRel.get("selectedValue");
            var product = this.ProductsSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];
            var editedVariantSharedFields = this.tempEditedProductRelationshipSharedFields;
            var itemSharedFields;
            var targetSharedField = null;

            var relationship = eventArgs.item;
            var column = eventArgs.column;

            // The event arguments from Rank functions pass slightly different arguments than
            // the event generated by SlickGrid
            var fieldName = typeof column == "string" ? column : column.field;

            if (editedVariantSharedFields[relationship.itemId]) {
                itemSharedFields = editedVariantSharedFields[relationship.itemId];
            } else {
                itemSharedFields = [];
            }

            for (i = 0; i < itemSharedFields.length; i++) {
                if (itemSharedFields[i].field == fieldName) {
                    targetSharedField = itemSharedFields[i];
                    break;
                }
            }

            if (targetSharedField) {
                targetSharedField.currentValue = relationship[fieldName];
            } else {
                var sharedField = { field: fieldName, currentValue: relationship[fieldName] };
                itemSharedFields.push(sharedField);
            }

            editedVariantSharedFields[relationship.itemId] = itemSharedFields;
        },

        onVariantSharedFieldEdited: function (e, eventArgs) {
            // Update edited Shared Fields
            // The product being edited must be the currently selected one
            var selectedIndices = this.ProductsSlickGrid.selectedIndicies();
            var currentSelectedIndex = selectedIndices[this.get("currentProductFamily")];
            var selectedLanguage = this.Languages.get("selectedValue");
            var product = this.ProductsSlickGrid.getDataItems(selectedLanguage)[currentSelectedIndex];

            var editedVariantSharedFields = this.tempEditedVariantSharedFields;
            var itemSharedFields;
            var targetSharedField = null;

            var variant = eventArgs.item;
            var column = eventArgs.column;

            // Check to see if this item/row is in the look-up alread (i.e. has one or more edited shared fields)
            if (editedVariantSharedFields[variant.itemId]) {
                itemSharedFields = editedVariantSharedFields[variant.itemId];
            } else {
                itemSharedFields = [];
            }

            // Check to see if the field currently being edited is already in the list
            // of edited shared fields for this item
            for (i = 0; i < itemSharedFields.length; i++) {
                if (itemSharedFields[i].field == column.field) {
                    targetSharedField = itemSharedFields[i];
                    break;
                }
            }

            // If the field currently being edited was found above, then update its current value
            // Otherwise, create a new entry for the edited shared field containing the field name and
            // the new current value and add it to the list.
            if (targetSharedField) {
                targetSharedField.currentValue = variant[column.field];
            } else {
                var sharedField = { field: column.field, currentValue: variant[column.field] };
                itemSharedFields.push(sharedField);
            }

            editedVariantSharedFields[variant.itemId] = itemSharedFields;
        },

        cancelVariantsBar: function () {
            if (this.VariantsDialog.VariantsSlickGrid.get("hasChanges")) {
                var messageBar = this.VariantsDialog.ProductVariantsCancelChangesBar;
                messageBar.set("isVisible", true);
                if (!messageBar.get("hasNotificationMessages")) {
                    this.cancelVariants();
                }
            } else {
                this.cancelVariants();
            }
        },

        cancelVariants: function () {
            this.syncCancelBar(this.VariantsDialog.ProductVariantsCancelChangesBar);

            // For every loaded language, revert the TempRelationships so we don't have to reset on every language switch
            var selectedRows = null;
            if (this.productIndexBeingValidated != null) {
                selectedRows = new Array();
                selectedRows.push(this.productIndexBeingValidated);
            } else {
                selectedRows = this.productFamilyIndicies();
            }

            var self = this;
            if (selectedRows && selectedRows.length > 0) {
                var loadedLanguages = this.ProductsSlickGrid.getLanguages();
                for (var i = 0; i < selectedRows.length; i++) {
                    $.each(loadedLanguages, function (index, languageName) {
                        var productVersion = self.ProductsSlickGrid.getDataItems(languageName)[selectedRows[i]];
                        if (productVersion.Variants) {
                            productVersion.TempVariants = $.extend(true, [], productVersion.Variants);
                        }
                    });
                }
            }

            this.VariantsWindow.hide();
            this.clearLookup(this.tempEditedVariantSharedFields);
            this.set("currentProductFamily", 0);
            this.VariantsDialog.VariantsSlickGrid.set("hasChanges", false);
            this.productIndexBeingValidated = null;
            this.clearLookup(this.tempEditedVariantSharedFields);
            self.activeElement.focus();
        },

        syncCancelBar: function (messageBar) {
            messageBar.set("isVisible", false);
            if (!messageBar.get("hasNotificationMessages")) {
                var nots = JSON.parse($("input:hidden", messageBar.viewModel.$el).val())["notifications"];
                messageBar.set("notifications", nots);
                messageBar.set("hasNotificationMessages", true);
            }
        },

        promptUserToSaveChanges: function () {
            this.PromptSaveChangesDialog.show();
        },

        hidePromptSaveChangesDialog: function () {
            this.PromptSaveChangesDialog.hide();

            if (this.dialogToRestore == "Variants") {
                this.VariantsWindow.show();
            }

            if (this.dialogToRestore == "ProductRelationships") {
                this.ProductRelationshipsWindow.show();
            }

            if (this.dialogToRestore == "CategoryRelationships") {
                this.CategoryRelationshipsWindow.show();
            }

            this.dialogToRestore = null;
        },

        addClearStyleContent: function (e, args) {
            var self = this;
            var row = args.row.toString();
            var column = args.grid.getColumns()[args.cell].id;
            var cssObject = {};
            cssObject[row] = {};
            cssObject[row][column] = "cell-cleared";

            var currentGridName = $(args.grid.getCanvasNode()).parent().parent().parent().attr("data-sc-id");
            var tab;

            if (currentGridName.indexOf("Product") == 0 || currentGridName.indexOf("Variant") == 0) {
                tab = $("li[data-tab-id=\\{4178FB21-7991-4F75-8868-9F949B8170B3\\}] > a");
            } else if (currentGridName.indexOf("Catego") == 0) {
                tab = $("li[data-tab-id=\\{80903895-822C-48AA-B6C8-6833AF398103\\}] > a");
            }

            if ($(args.grid.getActiveCellNode()).hasClass("error-highlight")) {
                var matchedError = self.buildCellCssStyle(args);
                args.grid.setCellCssStyles(matchedError.cssStyleKey, cssObject);
                self.addGridStyleToLookup(matchedError.cssStyleKey);
                self.get("errorsInPage").Errors.splice(matchedError.errorNumber - 1, 1)
                self.set("numberOfErrors", self.get("numberOfErrors") - 1);

                var issuesToFixMessage = self.ClientErrorMessages.get("Issues to fix");
                self.IssuesToFix.set("text", self.get("numberOfErrors") + " " + issuesToFixMessage);
                var number = parseInt(tab.children(".error-badge").text()) - 1;
                tab.children(".error-badge").text(number == 0 ? "" : number);
                var parentError = $.grep(self.get("errorsInPage").Errors, function (e, n) { return e.parentId == matchedError.parentId; });
                if (parentError.length == 0) {
                    var parentRow = 0;
                    var parentColumn = matchedError.group + "Errors";
                    var grid = matchedError.type == "ProductTab" ? self.ProductsSlickGrid : self.CategoriesSlickGrid;
                    var parentItem = $.grep(grid.get("items"), function (e, n) {
                        if (e.itemId == matchedError.parentId) { parentRow = n; return e; }
                    });

                    if (parentItem.length == 1) {
                        var cssObjectParent = {};
                        cssObjectParent[parentRow] = {};
                        cssObjectParent[parentRow][parentColumn] = "cell-cleared error-icon";
                        var cssStyleKeyParent = "error_" + "General" + matchedError.type + "_" + parentRow + "_" + parentColumn + "s_" + matchedError.lang;
                        grid.get("grid").removeCellCssStyles(cssStyleKeyParent);
                        grid.get("grid").addCellCssStyles(cssStyleKeyParent, cssObjectParent);
                    }
                }


                self.set("incrementCounter", false);
            }

            if (self.get("numberOfErrors") == 0) {
                // change to blue
                var issuesFixedMessage = self.ClientErrorMessages.get("All issues have been addressed");
                self.IssuesToFix.set("text", issuesFixedMessage);
                self.ActionMessage.set("text", "");
                self.IssuesNum.set("text", "");
                $("div[data-sc-id=MessageRowPanel]").css("color", "#3179b5");
                $("div[data-sc-id=MessageRowPanel]").css("backgroundColor", "#b3eaff");
                $("button[data-sc-id=PrevIssue]").css("backgroundColor", "#3179b5");
                $("button[data-sc-id=NextIssue]").css("backgroundColor", "#3179b5");
                self.NextIssue.set("isEnabled", false);
                self.PrevIssue.set("isEnabled", false);
                tab.children(".error-badge").text("");
            }
        }
    });

    return Workspace;

});

document.body.addEventListener("mousedown", defineClientX, false);
var clientX = null;
function defineClientX(e) {
    clientX = e.clientX;
}

$(function () {
    var oldSizzleAttr = $.find.attr;

    var Expr = $.expr;
    var hasOwn = ({}).hasOwnProperty;
    var documentIsHTML = !$.isXMLDoc(document);
    $.find.attr = function (elem, name) {
        // Set document vars if needed
        if ((elem.ownerDocument || elem) !== document) {
            setDocument(elem);
        }

        var fn = Expr.attrHandle[name.toLowerCase()],
            // Don't get fooled by Object.prototype properties (jQuery #13807)
            val = fn && hasOwn.call(Expr.attrHandle, name.toLowerCase()) ?
                fn(elem, name, !documentIsHTML) :
                undefined;

        return val !== undefined ?
            val :
            $.support.attributes || !documentIsHTML ?
                elem.getAttribute(name) :
                elem.getAttribute == undefined ? null :
                (val = elem.getAttributeNode(name)) && val.specified ?
                    val.value :
                    null;
    };

});
