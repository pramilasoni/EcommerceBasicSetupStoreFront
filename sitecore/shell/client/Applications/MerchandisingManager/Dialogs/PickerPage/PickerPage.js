//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore"], function (Sitecore) {

    var categoriesTabText, productsTabText, catalogsTabText, variantTabText;
    var PickerPage = Sitecore.Definitions.App.extend({
        
        itemPickerSelectedCatalogs: [],

        itemPickerSelectedCategories: [],

        itemPickerSelectedProducts: [],

        itemPickerSelectedVariants: [],

        initialized: function () {
            this.ItemPickerTabs.on("change:selectedTab", this.itemPickerTabChanged, this);
            this.PickerSearchBox.on("change", this.searchItemPicker, this);
            this.initializePickerSmartPanelFacets();
            this.initializeSelectedPickerCounter();
            this.initializeTabTitles();

            this.listenTo(_sc, 'sc-picker-categories-scroll', this.infiniteScrollPickerCategories);
            this.listenTo(_sc, 'sc-picker-products-scroll', this.infiniteScrollPickerProducts);
            this.listenTo(_sc, 'sc-picker-catalogs-scroll', this.infiniteScrollPickerCatalogs);
            this.listenTo(_sc, 'sc-picker-variants-scroll', this.infiniteScrollPickerVariants);
        },

        itemPickerTabChanged: function () {
            var selectedTabIndex = this.ItemPickerTabs.get("selectedTab");
            switch (selectedTabIndex) {
            case '{98766E08-3633-45C4-92BA-353BE5EFC445}':
                //Show only selected categories icon
                this.PickerActionControl.getAction("Selected Categories").isVisible(true);
                this.PickerActionControl.getAction("Selected Products").isVisible(false);
                this.PickerActionControl.getAction("Selected Catalogs").isVisible(false);
                this.PickerActionControl.getAction("Selected Variants").isVisible(false);

                if (!this.itemPickerSelectedCategoriesMode) {
                    this.togglePickerSearchArea(true);
                    this.PickerProductList.set("isVisible", false);
                    this.PickerCategoriesList.set("isVisible", true);
                    this.PickerCatalogsList.set("isVisible", false);
                    this.PickerVariantsList.set("isVisible", false);

                    this.PickerSelectedProductList.set("isVisible", false);
                    this.PickerSelectedCategoriesList.set("isVisible", false);
                    this.PickerSelectedCatalogList.set("isVisible", false);
                    this.PickerSelectedVariantList.set("isVisible", false);

                    this.PickerCategoryFacets.set("isVisible", true);
                    this.PickerProductFacets.set("isVisible", false);
                    this.PickerCatalogFacets.set("isVisible", false);
                    this.PickerVariantFacets.set("isVisible", false);

                } else {
                    this.togglePickerSearchArea(false);
                    this.PickerProductList.set("isVisible", false);
                    this.PickerCategoriesList.set("isVisible", false);
                    this.PickerCatalogsList.set("isVisible", false);
                    this.PickerVariantsList.set("isVisible", false);

                    this.PickerSelectedCategoriesList.set("isVisible", true);
                    this.PickerSelectedProductList.set("isVisible", false);
                    this.PickerSelectedCatalogList.set("isVisible", false);
                    this.PickerSelectedVariantList.set("isVisible", false);

                    this.PickerCategoryFacets.set("isVisible", true);
                    this.PickerProductFacets.set("isVisible", false);
                    this.PickerCatalogFacets.set("isVisible", false);
                    this.PickerVariantFacets.set("isVisible", false);
                }
                break;
            case '{1BEFF994-0E31-457D-AA5F-5C39853E5ADD}':

                //Show only selected product icon
                this.PickerActionControl.getAction("Selected Categories").isVisible(false);
                this.PickerActionControl.getAction("Selected Products").isVisible(true);
                this.PickerActionControl.getAction("Selected Catalogs").isVisible(false);
                this.PickerActionControl.getAction("Selected Variants").isVisible(false);

                if (!this.itemPickerSelectedProductsMode) {
                    this.togglePickerSearchArea(true);
                    this.PickerProductList.set("isVisible", true);
                    this.PickerCategoriesList.set("isVisible", false);
                    this.PickerCatalogsList.set("isVisible", false);
                    this.PickerVariantsList.set("isVisible", false);

                    this.PickerSelectedProductList.set("isVisible", false);
                    this.PickerSelectedCategoriesList.set("isVisible", false);
                    this.PickerSelectedCatalogList.set("isVisible", false);
                    this.PickerSelectedVariantList.set("isVisible", false);

                    this.PickerCategoryFacets.set("isVisible", false);
                    this.PickerProductFacets.set("isVisible", true);
                    this.PickerCatalogFacets.set("isVisible", false);
                    this.PickerVariantFacets.set("isVisible", false);
                } else {
                    this.togglePickerSearchArea(false);
                    this.PickerProductList.set("isVisible", false);
                    this.PickerCategoriesList.set("isVisible", false);
                    this.PickerCatalogsList.set("isVisible", false);
                    this.PickerVariantsList.set("isVisible", false);

                    this.PickerSelectedProductList.set("isVisible", true);
                    this.PickerSelectedCategoriesList.set("isVisible", false);
                    this.PickerSelectedCatalogList.set("isVisible", false);
                    this.PickerSelectedVariantList.set("isVisible", false);

                    this.PickerCategoryFacets.set("isVisible", false);
                    this.PickerProductFacets.set("isVisible", true);
                    this.PickerCatalogFacets.set("isVisible", false);
                    this.PickerVariantFacets.set("isVisible", false);
                }
                break;
            case '{78F2B183-B384-440C-8D2A-A0621DA83789}':

                //Show only selected catalog icon
                this.PickerActionControl.getAction("Selected Categories").isVisible(false);
                this.PickerActionControl.getAction("Selected Products").isVisible(false);
                this.PickerActionControl.getAction("Selected Catalogs").isVisible(true);
                this.PickerActionControl.getAction("Selected Variants").isVisible(false);

                if (!this.itemPickerSelectedCatalogMode) {
                    this.togglePickerSearchArea(true);
                    this.PickerProductList.set("isVisible", false);
                    this.PickerCategoriesList.set("isVisible", false);
                    this.PickerCatalogsList.set("isVisible", true);
                    this.PickerVariantsList.set("isVisible", false);

                    this.PickerSelectedProductList.set("isVisible", false);
                    this.PickerSelectedCategoriesList.set("isVisible", false);
                    this.PickerSelectedCatalogList.set("isVisible", false);
                    this.PickerSelectedVariantList.set("isVisible", false);

                    this.PickerCategoryFacets.set("isVisible", false);
                    this.PickerProductFacets.set("isVisible", false);
                    this.PickerCatalogFacets.set("isVisible", true);
                    this.PickerVariantFacets.set("isVisible", false);
                } else {
                    this.togglePickerSearchArea(false);
                    this.PickerProductList.set("isVisible", false);
                    this.PickerCategoriesList.set("isVisible", false);
                    this.PickerCatalogsList.set("isVisible", false);
                    this.PickerVariantsList.set("isVisible", false);

                    this.PickerSelectedProductList.set("isVisible", false);
                    this.PickerSelectedCategoriesList.set("isVisible", false);
                    this.PickerSelectedCatalogList.set("isVisible", true);
                    this.PickerSelectedVariantList.set("isVisible", false);

                    this.PickerCategoryFacets.set("isVisible", false);
                    this.PickerProductFacets.set("isVisible", false);
                    this.PickerCatalogFacets.set("isVisible", true);
                    this.PickerVariantFacets.set("isVisible", false);

                }
                break;
            case '{957A5534-78F2-4EBE-A313-745E710BE238}':

                //Show only selected variants icon
                this.PickerActionControl.getAction("Selected Categories").isVisible(false);
                this.PickerActionControl.getAction("Selected Products").isVisible(false);
                this.PickerActionControl.getAction("Selected Catalogs").isVisible(false);
                this.PickerActionControl.getAction("Selected Variants").isVisible(true);

                if (!this.itemPickerSelectedVariantMode) {
                    this.togglePickerSearchArea(true);
                    this.PickerProductList.set("isVisible", false);
                    this.PickerCategoriesList.set("isVisible", false);
                    this.PickerCatalogsList.set("isVisible", false);
                    this.PickerVariantsList.set("isVisible", true);

                    this.PickerSelectedProductList.set("isVisible", false);
                    this.PickerSelectedCategoriesList.set("isVisible", false);
                    this.PickerSelectedCatalogList.set("isVisible", false);
                    this.PickerSelectedVariantList.set("isVisible", false);

                    this.PickerCategoryFacets.set("isVisible", false);
                    this.PickerProductFacets.set("isVisible", false);
                    this.PickerCatalogFacets.set("isVisible", false);
                    this.PickerVariantFacets.set("isVisible", true);
                } else {
                    this.togglePickerSearchArea(false);
                    this.PickerProductList.set("isVisible", false);
                    this.PickerCategoriesList.set("isVisible", false);
                    this.PickerCatalogsList.set("isVisible", false);
                    this.PickerVariantsList.set("isVisible", false);


                    this.PickerSelectedProductList.set("isVisible", false);
                    this.PickerSelectedCategoriesList.set("isVisible", false);
                    this.PickerSelectedCatalogList.set("isVisible", false);
                    this.PickerSelectedVariantList.set("isVisible", true);


                    this.PickerCategoryFacets.set("isVisible", false);
                    this.PickerProductFacets.set("isVisible", false);
                    this.PickerCatalogFacets.set("isVisible", false);
                    this.PickerVariantFacets.set("isVisible", true);
                }
                break;
            }
        },

        PickerCategoriesScroll: function () {
            _sc.trigger('sc-picker-categories-scroll');
        },

        PickerProductScroll: function () {
            _sc.trigger('sc-picker-products-scroll');
        },

        PickerCatalogsScroll: function () {
            _sc.trigger('sc-picker-catalogs-scroll');
        },

        PickerVariantsScroll: function () {
            _sc.trigger('sc-picker-variants-scroll');
        },

        searchItemPicker: function () {

            var searchterm = this.PickerSearchBox.get("text");
            var pickerMode = this.PickerMode.get("text");

            switch (pickerMode) {
            case "ProductOnly":
                this.PickProductsDataSource.set("isReady", false);
                this.PickProductsDataSource.set("searchTerm", searchterm);
                this.PickProductsDataSource.set("isReady", true);
                this.PickProductsDataSource.refresh();
                break;

            case "CategoryOnly":
                this.PickCategoriesDataSource.set("isReady", false);
                this.PickCategoriesDataSource.set("searchTerm", searchterm);
                this.PickCategoriesDataSource.set("isReady", true);
                this.PickCategoriesDataSource.refresh();
                break;

            case "CatalogOnly":
                this.PickCatalogsDataSource.set("isReady", false);
                this.PickCatalogsDataSource.set("searchTerm", searchterm);
                this.PickCatalogsDataSource.set("isReady", true);
                this.PickCatalogsDataSource.refresh();
                break;

            case "VariantOnly":
                this.PickVariantsDataSource.set("isReady", false);
                this.PickVariantsDataSource.set("searchTerm", searchterm);
                this.PickVariantsDataSource.set("isReady", true);
                this.PickVariantsDataSource.refresh();
                break;

            case "AllTabs":
                this.PickProductsDataSource.set("isReady", false);
                this.PickProductsDataSource.set("searchTerm", searchterm);
                this.PickProductsDataSource.set("isReady", true);
                this.PickProductsDataSource.refresh();

                this.PickCategoriesDataSource.set("isReady", false);
                this.PickCategoriesDataSource.set("searchTerm", searchterm);
                this.PickCategoriesDataSource.set("isReady", true);
                this.PickCategoriesDataSource.refresh();

                this.PickCatalogsDataSource.set("isReady", false);
                this.PickCatalogsDataSource.set("searchTerm", searchterm);
                this.PickCatalogsDataSource.set("isReady", true);
                this.PickCatalogsDataSource.refresh();

                this.PickVariantsDataSource.set("isReady", false);
                this.PickVariantsDataSource.set("searchTerm", searchterm);
                this.PickVariantsDataSource.set("isReady", true);
                this.PickVariantsDataSource.refresh();
                break;


            default:
                this.PickCategoriesDataSource.set("isReady", false);
                this.PickCategoriesDataSource.set("searchTerm", searchterm);
                this.PickCategoriesDataSource.set("isReady", true);
                this.PickCategoriesDataSource.refresh();

                this.PickProductsDataSource.set("isReady", false);
                this.PickProductsDataSource.set("searchTerm", searchterm);
                this.PickProductsDataSource.set("isReady", true);
                this.PickProductsDataSource.refresh();
                break;
            }
        },

        toggleCategories: function () {
            var selectedTab = this.ItemPickerTabs.get("selectedTab");
            var categoriesTab = $("li[data-tab-id='{98766E08-3633-45C4-92BA-353BE5EFC445}'] a");

            if (selectedTab == '{98766E08-3633-45C4-92BA-353BE5EFC445}') {
                this.PickerSelectedProductList.set("isVisible", false);
                this.PickerSelectedCatalogList.set("isVisible", false);
                this.PickerSelectedVariantList.set("isVisible", false);

                if (!this.PickerSelectedCategoriesList.get("isVisible")) {
                    this.PickerSelectedCategoriesList.set("isVisible", true);
                    this.PickerSelectedCategoriesList.set("items", this.itemPickerSelectedCategories);
                    this.PickerCategoriesList.set("isVisible", false);
                    this.togglePickerSearchArea(false);
                    categoriesTab.text(this.SelectedCategories.get("text"));
                } else {
                    this.PickerCategoriesList.set("isVisible", true);
                    this.PickerSelectedCategoriesList.set("items", null);
                    this.PickerSelectedCategoriesList.set("isVisible", false);
                    this.togglePickerSearchArea(true);
                    var count = this.PickCategoriesDataSource.get("totalItemCount") > 99 ? "99+" : this.PickCategoriesDataSource.get("totalItemCount");
                    categoriesTab.text(categoriesTabText).append("<span class=\"badge\">" + count + "</span>");
                }
            } else {
                this.PickerSelectedCategoriesList.set("isVisible", false);
                this.togglePickerSearchArea(true);
                var count = this.PickCategoriesDataSource.get("totalItemCount") > 99 ? "99+" : this.PickCategoriesDataSource.get("totalItemCount");
                categoriesTab.text(categoriesTabText).append("<span class=\"badge\">" + count + "</span>");
            }

            var selectedCategoriesAction = this.PickerActionControl.getAction("Selected Categories");
            this.PickerActionControl.viewModel.toggleActive(selectedCategoriesAction);
            this.itemPickerSelectedCategoriesMode = !this.itemPickerSelectedCategoriesMode;
        },

        togglePickerSmartPanel: function () {
            var isOpen = this.PickerSmartPanel.get("isOpen");

            if (!isOpen) {
                switch (this.PickerMode.get("text")) {
                    case "ProductOnly":
                        this.PickerCategoryFacets.set("isVisible", false);
                        this.PickerProductFacets.set("isVisible", true);
                        this.PickerCatalogFacets.set("isVisible", false);
                        this.PickerVariantFacets.set("isVisible", false);
                        break;
                    case "CategoryOnly":
                        this.PickerCategoryFacets.set("isVisible", true);
                        this.PickerProductFacets.set("isVisible", false);
                        this.PickerCatalogFacets.set("isVisible", false);
                        this.PickerVariantFacets.set("isVisible", false);
                        break;
                    case "CatalogOnly":
                        this.PickerCategoryFacets.set("isVisible", false);
                        this.PickerProductFacets.set("isVisible", false);
                        this.PickerCatalogFacets.set("isVisible", true);
                        this.PickerVariantFacets.set("isVisible", false);
                        break;
                    case "VariantOnly":
                        this.PickerCategoryFacets.set("isVisible", false);
                        this.PickerProductFacets.set("isVisible", false);
                        this.PickerCatalogFacets.set("isVisible", false);
                        this.PickerVariantFacets.set("isVisible", true);
                        break;
                    case "AllTabs":
                        this.selectCorrectPickerFacets();
                        break;
                    case "Default":
                        this.selectCorrectPickerFacets();
                        break;
                }
            } else {
                this.PickerCategoryFacets.set("isVisible", false);
                this.PickerProductFacets.set("isVisible", false);
                this.PickerCatalogFacets.set("isVisible", false);
                this.PickerVariantFacets.set("isVisible", false);
            }

            this.PickerSmartPanel.set("isOpen", !isOpen);
        },

        toggleProducts: function () {
            var selectedTab = this.ItemPickerTabs.get("selectedTab");
            var productsTab = $("li[data-tab-id='{1BEFF994-0E31-457D-AA5F-5C39853E5ADD}'] a");

            //Products
            if (selectedTab == '{1BEFF994-0E31-457D-AA5F-5C39853E5ADD}') {
                this.PickerSelectedCategoriesList.set("isVisible", false);
                this.PickerSelectedCatalogList.set("isVisible", false);
                this.PickerSelectedVariantList.set("isVisible", false);

                if (!this.PickerSelectedProductList.get("isVisible")) {
                    this.PickerSelectedProductList.set("isVisible", true);
                    this.PickerSelectedProductList.set("items", this.itemPickerSelectedProducts);
                    this.PickerProductList.set("isVisible", false);
                    productsTab.text(this.SelectedProducts.get("text"));
                    this.togglePickerSearchArea(false);
                } else {
                    this.PickerProductList.set("isVisible", true);
                    this.PickerSelectedProductList.set("items", null);
                    this.PickerSelectedProductList.set("isVisible", false);
                    var count = this.PickProductsDataSource.get("totalItemCount") > 99 ? "99+" : this.PickProductsDataSource.get("totalItemCount");
                    productsTab.text(productsTabText).append("<span class=\"badge\">" + count + "</span>");
                    this.togglePickerSearchArea(true);
                }
            } else {
                this.PickerSelectedProductList.set("isVisible", false);
                this.togglePickerSearchArea(true);
                var count = this.PickProductsDataSource.get("totalItemCount") > 99 ? "99+" : this.PickProductsDataSource.get("totalItemCount");
                productsTab.text(productsTabText).append("<span class=\"badge\">" + count + "</span>");
            }

            var selectedProductsAction = this.PickerActionControl.getAction("Selected Products");
            this.PickerActionControl.viewModel.toggleActive(selectedProductsAction);
            this.itemPickerSelectedProductsMode = !this.itemPickerSelectedProductsMode;
        },

        toggleSelectedCatalogs: function () {
            var selectedTab = this.ItemPickerTabs.get("selectedTab");
            var catalogsTab = $("li[data-tab-id='{78F2B183-B384-440C-8D2A-A0621DA83789}'] a");

            //Catalogs
            if (selectedTab == '{78F2B183-B384-440C-8D2A-A0621DA83789}') {
                this.PickerSelectedCategoriesList.set("isVisible", false);
                this.PickerSelectedProductList.set("isVisible", false);
                this.PickerSelectedVariantList.set("isVisible", false);

                if (!this.PickerSelectedCatalogList.get("isVisible")) {
                    this.PickerSelectedCatalogList.set("isVisible", true);
                    this.PickerSelectedCatalogList.set("items", this.itemPickerSelectedCatalogs);
                    this.PickerCatalogsList.set("isVisible", false);
                    this.togglePickerSearchArea(false);
                    catalogsTab.text(this.SelectedCatalogs.get("text"));
                } else {
                    this.PickerCatalogsList.set("isVisible", true);
                    this.PickerSelectedCatalogList.set("items", null);
                    this.PickerSelectedCatalogList.set("isVisible", false);
                    this.togglePickerSearchArea(true);
                    var count = this.PickCatalogsDataSource.get("totalItemCount") > 99 ? "99+" : this.PickCatalogsDataSource.get("totalItemCount");
                    catalogsTab.text(catalogsTabText).append("<span class=\"badge\">" + count + "</span>");
                }
            } else {
                this.PickerSelectedCatalogList.set("isVisible", false);
                this.togglePickerSearchArea(true);
                var count = this.PickCatalogsDataSource.get("totalItemCount") > 99 ? "99+" : this.PickCatalogsDataSource.get("totalItemCount");
                catalogsTab.text(catalogsTabText).append("<span class=\"badge\">" + count + "</span>");
            }

            var selectedCatalogsAction = this.PickerActionControl.getAction("Selected Catalogs");
            this.PickerActionControl.viewModel.toggleActive(selectedCatalogsAction);
            this.itemPickerSelectedCatalogsMode = !this.itemPickerSelectedCatalogsMode;
        },

        toggleSelectedVariants: function () {
            var selectedTab = this.ItemPickerTabs.get("selectedTab");
            var variantTab = $("li[data-tab-id='{957A5534-78F2-4EBE-A313-745E710BE238}'] a");

            //variants
            if (selectedTab == '{957A5534-78F2-4EBE-A313-745E710BE238}') {
                this.PickerSelectedCategoriesList.set("isVisible", false);
                this.PickerSelectedProductList.set("isVisible", false);
                this.PickerSelectedCatalogList.set("isVisible", false);

                if (!this.PickerSelectedVariantList.get("isVisible")) {
                    this.PickerSelectedVariantList.set("isVisible", true);
                    this.PickerSelectedVariantList.set("items", this.itemPickerSelectedVariants);
                    this.PickerVariantsList.set("isVisible", false);
                    this.togglePickerSearchArea(false);
                    variantTab.text(this.SelectedVariants.get("text"));
                } else {
                    this.PickerVariantsList.set("isVisible", true);
                    this.PickerSelectedVariantList.set("items", null);
                    this.PickerSelectedVariantList.set("isVisible", false);
                    this.togglePickerSearchArea(true);
                    var count = this.PickVariantsDataSource.get("totalItemCount") > 99 ? "99+" : this.PickVariantsDataSource.get("totalItemCount");
                    variantTab.text(variantTabText).append("<span class=\"badge\">" + count + "</span>");
                }
            } else {
                this.PickerSelectedVariantList.set("isVisible", false);
                this.togglePickerSearchArea(true);
                var count = this.PickVariantsDataSource.get("totalItemCount") > 99 ? "99+" : this.PickVariantsDataSource.get("totalItemCount");
                variantTab.text(variantTabText).append("<span class=\"badge\">" + count + "</span>");
            }

            var selectedVariantAction = this.PickerActionControl.getAction("Selected Variants");
            this.PickerActionControl.viewModel.toggleActive(selectedVariantAction);
            this.itemPickerSelectedVariantMode = !this.itemPickerSelectedVariantMode;
        },

        initializePickerSmartPanelFacets: function () {
            this.PickerSmartPanel.viewModel.$el.find(".sc-smartpanel-content").append(this.PickerCategoryFacets.viewModel.$el);
            this.PickerSmartPanel.viewModel.$el.find(".sc-smartpanel-content").append(this.PickerProductFacets.viewModel.$el);
            this.PickerSmartPanel.viewModel.$el.find(".sc-smartpanel-content").append(this.PickerCatalogFacets.viewModel.$el);
            this.PickerSmartPanel.viewModel.$el.find(".sc-smartpanel-content").append(this.PickerVariantFacets.viewModel.$el);
        },

        initializeSelectedPickerCounter: function () {
            this.PickerCategoriesList.on("change:checkedItemIds", this.syncCategoryCounter, this);
            this.PickerProductList.on("change:checkedItemIds", this.syncProductCounter, this);
            this.PickerCatalogsList.on("change:checkedItemIds", this.syncCatalogCounter, this);
            this.PickerVariantsList.on("change:checkedItemIds", this.syncVariantCounter, this);
        },

        initializeTabTitles: function () {
            var catalogsTab = $("li[data-tab-id='{78F2B183-B384-440C-8D2A-A0621DA83789}'] a");
            catalogsTabText = catalogsTab.text();
            var categoriesTab = $("li[data-tab-id='{98766E08-3633-45C4-92BA-353BE5EFC445}'] a");
            categoriesTabText = categoriesTab.text();
            var productsTab = $("li[data-tab-id='{1BEFF994-0E31-457D-AA5F-5C39853E5ADD}'] a");
            productsTabText = productsTab.text();
            var variantTab = $("li[data-tab-id='{957A5534-78F2-4EBE-A313-745E710BE238}'] a");
            variantTabText = variantTab.text();
        },

        syncCategoryCounter: function () {
            this.queryItems(this.PickerCategoriesList.get("checkedItemIds"), "category");
            var selectedCategories = this.PickerCategoriesList.get("checkedItemIds").length;
            this.PickerActionControl.getAction("Selected Categories").counter("");
            this.PickerActionControl.getAction("Selected Categories").counter(selectedCategories == 0 ? "" : selectedCategories);

            if (parseInt(this.PickerActionControl.getAction("Selected Categories").counter(), 10) > 0) {
                this.PickerActionControl.getAction("Selected Categories").isEnabled(true);
            } else {
                this.PickerActionControl.getAction("Selected Categories").isEnabled(false);
            }
        },

        syncProductCounter: function () {
            this.queryItems(this.PickerProductList.get("checkedItemIds"), "product");
            var selectedProducts = this.PickerProductList.get("checkedItemIds").length;
            this.PickerActionControl.getAction("Selected Products").counter("");
            this.PickerActionControl.getAction("Selected Products").counter(selectedProducts == 0 ? "" : selectedProducts);

            if (parseInt(this.PickerActionControl.getAction("Selected Products").counter(), 10) > 0) {
                this.PickerActionControl.getAction("Selected Products").isEnabled(true);
            } else {
                this.PickerActionControl.getAction("Selected Products").isEnabled(false);
            }
        },

        syncCatalogCounter: function () {
            this.queryItems(this.PickerCatalogsList.get("checkedItemIds"), "catalog");
            var selectedCatalogs = this.PickerCatalogsList.get("checkedItemIds").length;
            this.PickerActionControl.getAction("Selected Catalogs").counter("");
            this.PickerActionControl.getAction("Selected Catalogs").counter(selectedCatalogs  == 0 ? "" : selectedCatalogs);

            if (parseInt(this.PickerActionControl.getAction("Selected Catalogs").counter(), 10) > 0) {
                this.PickerActionControl.getAction("Selected Catalogs").isEnabled(true);
            } else {
                this.PickerActionControl.getAction("Selected Catalogs").isEnabled(false);
            }
        },

        syncVariantCounter: function () {
            this.queryItems(this.PickerVariantsList.get("checkedItemIds"), "variant");
            var selectedVariants = this.PickerVariantsList.get("checkedItemIds").length;
            this.PickerActionControl.getAction("Selected Variants").counter("");
            this.PickerActionControl.getAction("Selected Variants").counter(selectedVariants  == 0 ? "" : selectedVariants);

            if (parseInt(this.PickerActionControl.getAction("Selected Variants").counter(), 10) > 0) {
                this.PickerActionControl.getAction("Selected Variants").isEnabled(true);
            } else {
                this.PickerActionControl.getAction("Selected Variants").isEnabled(false);
            }
        },

        selectCorrectPickerFacets: function () {

            var selectedTab = this.ItemPickerTabs.get("selectedTab");

            //Categories
            if (selectedTab == '{98766E08-3633-45C4-92BA-353BE5EFC445}') {
                this.PickerCategoryFacets.set("isVisible", true);
                this.PickerProductFacets.set("isVisible", false);
                this.PickerCatalogFacets.set("isVisible", false);
                this.PickerVariantFacets.set("isVisible", false);
            }

            //Products
            if (selectedTab == '{1BEFF994-0E31-457D-AA5F-5C39853E5ADD}') {
                this.PickerCategoryFacets.set("isVisible", false);
                this.PickerProductFacets.set("isVisible", true);
                this.PickerCatalogFacets.set("isVisible", false);
                this.PickerVariantFacets.set("isVisible", false);
            }

            //Catalogs
            if (selectedTab == '{78F2B183-B384-440C-8D2A-A0621DA83789}') {
                this.PickerCategoryFacets.set("isVisible", false);
                this.PickerProductFacets.set("isVisible", false);
                this.PickerCatalogFacets.set("isVisible", true);
                this.PickerVariantFacets.set("isVisible", false);
            }

            //variants
            if (selectedTab == '{957A5534-78F2-4EBE-A313-745E710BE238}') {
                this.PickerCategoryFacets.set("isVisible", false);
                this.PickerProductFacets.set("isVisible", false);
                this.PickerCatalogFacets.set("isVisible", false);
                this.PickerVariantFacets.set("isVisible", true);
            }
        },

        togglePickerSearchArea: function (state) {
            this.PickerSearchBox.set("isEnabled", state);
            this.PickerSearchButton.set("isEnabled", state);
        },

        checkListViewItems: function (listControl) {
            for (i = 0; i < listControl.get("checkedItemIds").length; i++) {
                var itemId = listControl.get("checkedItemIds")[i];
                var item = listControl.viewModel.$el.find("[id^='" + itemId + "']");
                item.parent().siblings('.sc-cb').attr('checked', 'checked');
            }
        },

        queryItems: function (itemIds, itemType) {

            var delimitedItemIdList = "";
            for (i = 0; i < itemIds.length; i++) {
                if (delimitedItemIdList) {
                    delimitedItemIdList += "|" + itemIds[i];
                } else {
                    delimitedItemIdList += itemIds[i];
                }
            }

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceSearch/GetItems",
                data: {
                    itemIds: delimitedItemIdList
                },
                type: "POST",
                headers: ajaxToken,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    if (itemType == "product") {
                        this.itemPickerSelectedProducts = data;
                        this.PickerSelectedProductList.set("items", data);
                    } else if (itemType == "category") {
                        this.itemPickerSelectedCategories = data;
                        this.PickerSelectedCategoriesList.set("items", data);
                    } else if (itemType == "catalog") {
                        this.itemPickerSelectedCatalogs = data;
                        this.PickerSelectedCatalogList.set("items", data);
                    } else {
                        this.itemPickerSelectedVariants = data;
                        this.PickerSelectedVariantList.set("items", data);
                    }
                }
            });
        },

        infiniteScrollPickerProducts: function () {
            var isBusy = this.PickProductsDataSource.get("isBusy");
            var hasMoreItems = this.PickProductsDataSource.get("hasMoreItems");

            if (this.isPickerProductsTabSelected() && !isBusy && hasMoreItems) {
                this.PickProductsDataSource.next();
            }
        },

        infiniteScrollPickerCategories: function () {
            var isBusy = this.PickCategoriesDataSource.get("isBusy");
            var hasMoreItems = this.PickCategoriesDataSource.get("hasMoreItems");

            if (this.isPickerCategoriesTabSelected() && !isBusy && hasMoreItems) {
                this.PickCategoriesDataSource.next();
            }
        },

        infiniteScrollPickerCatalogs: function () {
            var isBusy = this.PickCatalogsDataSource.get("isBusy");
            var hasMoreItems = this.PickCatalogsDataSource.get("hasMoreItems");

            if (this.isPickerCatalogsTabSelected() && !isBusy && hasMoreItems) {
                this.PickCatalogsDataSource.next();
            }
        },

        infiniteScrollPickerVariants: function () {
            var isBusy = this.PickVariantsDataSource.get("isBusy");
            var hasMoreItems = this.PickVariantsDataSource.get("hasMoreItems");

            if (this.isPickerVariantsTabSelected() && !isBusy && hasMoreItems) {
                this.PickVariantsDataSource.next();
            }
        },

        isPickerProductsTabSelected: function () {
            return this.ItemPickerTabs.get("selectedTab") == "{1BEFF994-0E31-457D-AA5F-5C39853E5ADD}";
        },

        isPickerCategoriesTabSelected: function () {
            return this.ItemPickerTabs.get("selectedTab") == "{98766E08-3633-45C4-92BA-353BE5EFC445}";
        },

        isPickerCatalogsTabSelected: function () {
            return this.ItemPickerTabs.get("selectedTab") == "{78F2B183-B384-440C-8D2A-A0621DA83789}";
        },

        isPickerVariantsTabSelected: function () {
            return this.ItemPickerTabs.get("selectedTab") == "{957A5534-78F2-4EBE-A313-745E710BE238}";
        }
    });

    return PickerPage;
});