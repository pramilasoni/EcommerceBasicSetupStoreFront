//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        CommerceBasePage: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceBasePage",
        WorkspaceHelper: "/sitecore/shell/client/Applications/MerchandisingManager/WorkspaceHelper"
    }
});

define(["sitecore", "CommerceBasePage", "WorkspaceHelper"], function (Sitecore, cbp, WorkspaceHelper) {
    var ProductDetail = cbp.extend({
        ajaxToken: {},
        defaultCategoryOnLoad: "",
        priceCardOnload: "",
        pendingRelationshipChanges: [],
        currentRelationshipName: null,
        hasInventory: false,
        inventoryChanged: false,
        variantTemplateId: null,
        currentEditedMediaField: null,
        editedRelationships: [],
        workspace: null,
        tabStrip: null,
        initialized: function () {
            // Initialize the base page
            cbp.prototype.initialized.call(this);

            this.listenTo(_sc, 'sc-concurrency-override', this.overridePreviousChanges);
            this.listenTo(_sc, 'sc-concurrency-cancel', this.cancelChanges);
            this.listenTo(_sc, 'sc-deleteselected', this.deleteSelectedVariants);
            this.listenTo(_sc, 'sc-hide-deletealert', this.hideDeleteAlert);

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            this.ajaxToken[token.headerKey] = token.value;
            $("#ui-datepicker-div").hide();

            this.HelpProvider.set("isReady", true);
            this.HelpProvider.refresh();

            // Cache for faster selector lookup
            var productTabElement = this.ProductTabs.viewModel.$el;
            this.tabStrip = $("ul.sc-tabcontrol-navigation", productTabElement).first();

            // Initialize the workspace
            this.workspace = new WorkspaceHelper({ requestToken: this.ajaxToken });

            this.workspace.getCount(function (data) {
                self.DetailActionControl.getAction("Workspace").counter(data.Count);
            });

            this.set("itemHasLayout", "false");
            this.SearchBox.viewModel.$el.after("<textarea id='searchBoxExtended' class='extendedSearchbox' rows='8' cols='50' style='display:none'/>");
            this.SearchBox.viewModel.$el.keyup(this.showHideExtendedSearchArea);
            $('#searchBoxExtended').on('keyup', $.proxy(this.addEnterKeySearchBox, this));
            this.ProductTabs.on("change:selectedTab", this.selectedTabChanged, this);
            this.VariantList.on("change:checkedItemIds", this.onSelectedVariantsChanged, this);
            this.on("change:itemHasLayout", this.updatePreviewButton, this);

            var productId = CommerceUtilities.loadPageVar("target");

            var self = this;
            this.set("targetId", productId);

            // Select Media Dialog
            this.listenTo(_sc, 'sc-frame-message', this.addMedia);

            //For Concurrency Saving
            this.set("lastModified", null);
            this.set("overrideChanges", false);

            var language = CommerceUtilities.loadPageVar("lang");

            if (!language) {
                language = cbp.prototype.getCookie("commerceLang");
            }

            if (language) {
                this.set("currentLanguage", language);
            } else {
                this.set("currentLanguage", "en-US");
            }

            if (productId) {
                // Edit
                this.doesItemHaveLayout();
                this.LanguageDataSource.set("commerceItemId", productId);
                this.LanguageDataSource.set("isReady", true);
                this.LanguageDataSource.refresh();
                this.Languages.on("change:items", this.setLanguage, this);

                this.detailsVisible();

                // Set up tabs
                this.addSpansToTabs();
                this.ParentCategoryDataSource.on("change:totalItemCount", this.parentCountChanged, this);
                this.ParentCategoryDataSource.setCompletedQueryCallback($.proxy(this.setupPrimaryParentComboBox, this));

                //Price Cards
                this.PriceCardDataSource.setCompletedQueryCallback($.proxy(this.setupPriceCardComboBox, this));

                this.RelationshipDataSource.on("change:totalItemCount", this.relationshipCountChanged, this);
                this.VariantDataSource.on("change:totalItemCount", this.variantCountChanged, this);
                this.ProductPromotionsDataSource.on("change:totalItemCount", this.productPromotionsCountChanged, this);
                this.PricingDataSource.on("change:totalItemCount", this.pricingCountChanged, this);
                this.set("selectedTab", this.ProductTabs.get("selectedTab"));

                // Infinite scroll setup.
                $(window).on("scroll", $.proxy(self.infiniteScrollVariants, self));
                $(window).on("scroll", $.proxy(self.infiniteScrollParents, self));
                $(window).on("scroll", $.proxy(self.infiniteScrollRelationships, self));

                // Select Media from BaseUrl
                this.BaseUrlTextBox.viewModel.$el.keyup(this.updateBaseUrlPreview);
                this.BaseUrlTextBox.viewModel.$el.focusout(this.updateBaseUrlPreview);

                this.RelationshipsPendingChangesList.set("items", this.pendingRelationshipChanges);
                this.RelationshipsPendingChangesList.on("change:items", this.pendingRelationshipChangesItemsChanged, this);

                this.RelationshipList.on("change:checkedItemIds", this.relationshipsListCheckedItemsChanged, this);
                this.RelationshipList.on("change:selectedItem", this.relationshipsSelectedItemChanged, this);

                this.PricingListControl.on("change:selectedItem", function () {
                    var selectedItem = this.PricingListControl.get("selectedItem");
                    this.UpdateListPriceButton.set("isEnabled", selectedItem !== null);
                }, this);

                //if the combo box isn't on the page, don't try to change anything.
                if (this.PriceCardsComboBox) {
                    this.PriceCardsComboBox.on("change:selectedItem", $.proxy(this.priceCardsComboboxChanged, this));
                    this.PriceCardsComboBox.set("isVisible", false);
                    
                }
                // Determine if we should display the inventory tab
                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/DoesProductHaveInventory",
                    type: "POST",
                    headers: this.ajaxToken,
                    data: {
                        id: productId
                    },
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {

                        // If this product is not a product family then show inventory tab
                        var inventoryTab = $("li[data-tab-id='{1A71829B-682E-4BCD-B0A1-E2B6D7ED6574}']", self.tabStrip);

                        if (data == "false") {
                            inventoryTab.hide();
                            self.hasInventory = false;
                            self.disableInventoryValidation();
                            $("[data-sc-id='ProductInventoryBaseFields']").html("");
                            $("[data-sc-id='InventorySkuFormRenderer']").html("");
                        } else if (data == "true") {
                            inventoryTab.show();
                            self.hasInventory = true;
                            self.loadInventoryDetails(productId);
                            // Detect if inventory fields are dirty
                            $(".inventory").change(function () {
                                self.inventoryChanged = true;
                            });
                        }
                    }
                });

                // Determine if we should display reset action buttons
                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/IsVirtualCatalog",
                    type: "POST",
                    headers: this.ajaxToken,
                    data: {
                        id: productId
                    },
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        if (data == "false") {
                            self.DetailActionControl.getAction("Reset Price").isEnabled(false);
                            self.DetailActionControl.getAction("Reset All Fields").isEnabled(false);
                            self.DetailActionControl.getAction("Reset Price").isVisible(false);
                            self.DetailActionControl.getAction("Reset All Fields").isVisible(false);
                        } else {
                            self.DetailActionControl.getAction("Reset Price").isEnabled(true);
                            self.DetailActionControl.getAction("Reset All Fields").isEnabled(true);
                            self.DetailActionControl.getAction("Reset Price").isVisible(true);
                            self.DetailActionControl.getAction("Reset All Fields").isVisible(true);
                        }
                    }
                });

                // Determine if we should display reset action buttons
                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/GetVariantTemplate",
                    type: "POST",
                    headers: this.ajaxToken,
                    data: {
                        id: productId
                    },
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        self.variantTemplateId = data;
                    }
                });

                // Determine if we should display the variants tab
                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/IsProductFamily",
                    type: "POST",
                    headers: this.ajaxToken,
                    data: {
                        id: productId
                    },
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        // If this product is not a product family then hide the variant tab
                        var variantTab = $("li[data-tab-id='{2DF15390-98C4-46DF-8348-26D3B8F0DEB6}']", self.tabStrip);

                        if (data == "false") {
                            variantTab.hide();
                        } else if (data == "true") {
                            variantTab.show();
                        }
                    }
                });

            } else {
                // Create
                this.detailsVisible();

                self.ProductTabs.set("selectedTab", "{941141A8-D1B4-44BC-B7D5-8642000285CD}");
                self.HeaderTitle.set("text", self.ItemTypeDictionary.get("Create Product"));
                self.TitleControl.set("text", self.ItemTypeDictionary.get("Create Product"));

                // Hide language selector on create               
                self.Languages.set("isVisible", false);

                this.set("templateId", CommerceUtilities.loadPageVar("template"));
                this.set("parentId", CommerceUtilities.loadPageVar("parent"));

                // Determine if we should display the inventory tab
                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/DoesProductHaveInventory",
                    type: "POST",
                    headers: this.ajaxToken,
                    data: {
                        id: productId
                    },
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        // If this product is not a product family then show inventory tab
                        var inventoryTab = $("li[data-tab-id='{1A71829B-682E-4BCD-B0A1-E2B6D7ED6574}']", self.tabStrip);

                        if (data == "false") {
                            inventoryTab.hide();
                            self.disableInventoryValidation();
                            self.hasInventory = false;
                            $("[data-sc-id='ProductInventoryBaseFields']").html("");
                            $("[data-sc-id='InventorySkuFormRenderer']").html("");
                        } else if (data == "true") {
                            inventoryTab.show();
                            self.hasInventory = true;
                            self.loadInventoryDetails(productId);
                        }
                    }
                });

                $("li[data-tab-id=\\{5E0D90F9-78C8-4622-A289-4B0BD80F3AF2\\}]", this.tabStrip).hide();
                $("li[data-tab-id=\\{2CD62D9B-7139-45A6-A21D-3E6A9CA021A2\\}]", this.tabStrip).hide();
                $("li[data-tab-id=\\{2DF15390-98C4-46DF-8348-26D3B8F0DEB6\\}]", this.tabStrip).hide();
                this.DetailActionControl.getAction("Reset Price").isVisible(false);
                this.DetailActionControl.getAction("Reset All Fields").isVisible(false);
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
            this.VariantTileSortComboBox.on("change:selectedItem", function () {
                var selectedItem = self.VariantTileSortComboBox.get("selectedItem");
                self.VariantDataSource.set("sorting", selectedItem.DataField);
            });

            this.ParentTileSortComboBox.on("change:selectedItem", function () {
                var selectedItem = self.ParentTileSortComboBox.get("selectedItem");
                self.ParentCategoryDataSource.set("sorting", selectedItem.DataField);
            });

            // Wait for the environment list to be loaded
            addEventListener("environmentReady", this.environmentLoaded.bind(this));
        },

        environmentLoaded: function () {
            var selectedItem = this.EnvironmentsSwitcher.get("selectedItem");
            if (selectedItem != null) {
                // Set the PricingDataSource fields values
                this.PricingDataSource.set("headers", "Environment:" + selectedItem.Name);
                // Set the ProductPromotionsDataSource fields values
                this.ProductPromotionsDataSource.set("headers", "Environment:" + selectedItem.ArtifactStoreId);
                // Set the PriceCardDataSource fields values
                this.PriceCardDataSource.set("headers", "Environment:" + selectedItem.Name);
                // Load the details with the proper environment set
                this.loadProductDetails();
            }
        },

        disableIfAX: function () {
            $(".cs-basefields :input").prop("disabled", true);
            
            this.VariantActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.DetailActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.InventoryActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.ParentActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.RelationshipActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");

            $(".sc-CommerceDateTime :input").prop("disabled", true);
        },

        disableInventoryValidation: function () {
            $('.inventory').removeClass('isrequired');
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

        setupPrimaryParentComboBox: function () {
            var parentCategoryItems = this.ParentCategoryDataSource.get("items");
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

        priceCardsComboboxChanged: function (obj) {
            self = this;
            if (obj._changing)
            {
                setTimeout(function () { self.priceCardsComboboxChanged(obj); }, 200);
                return;
            }
            var PCComboBoxVal = $("[data-sc-id='PriceCardsComboBox']").val();
            var navigateUrl = "";
            if (PCComboBoxVal !== undefined && PCComboBoxVal !== null) {
                if (PCComboBoxVal == "noPriceCard") {
                    navigateUrl = "";
                    this.PriceCardLink.set("navigateUrl", navigateUrl);
                    this.PriceCardLink.set("text", "");
                } else {
                    
                    navigateUrl = "/sitecore/client/Applications/PricingPromotionsManager/Pages/All%20Books/Price%20Books/PageSettings/Price%20Book/PageSettings/Price%20Card?priceCardId=" + PCComboBoxVal;
                    this.PriceCardLink.set("navigateUrl", navigateUrl);
                    this.PriceCardLink.set("text", "View Details");
                }
            }
        },

        setupPriceCardComboBox: function () {
            var priceCardItems = this.PriceCardDataSource.get("items");
            this.priceCardOnload = $("#productPriceCard").val();
            if (this.PriceCardsComboBox) {
                var noPriceCardDisplayText = this.NoPriceCardText.get("text");

                if (priceCardItems) {
                    var noPriceCardItem = {
                        Id: "noPriceCard",
                        Name: noPriceCardDisplayText,
                        $icon: ""
                    };

                    priceCardItems.unshift(noPriceCardItem);

                    //we want to dynamically add the Autocomplete box
                    var PCComboBox = $("[data-sc-id='PriceCardsComboBox']");
                    if ($("#PCComboBoxAutoComplete").length == 0)
                        PCComboBox.after("<input class='form-control' id='PCComboBoxAutoComplete' style='background-image:url(/sitecore/shell/client/Applications/MerchandisingManager/Assets/Icons/16x16/search_icon.png);background-repeat:no-repeat;background-position:right center;' type='search' ></input>");

                    var list = [];
                    for (var i = 0; i < priceCardItems.length; i++)
                    {
                        //add all the options to a string list
                        list.push({ label: priceCardItems[i].Name,value:priceCardItems[i].Id });
                    }
                    var PCCBRef = this.PriceCardsComboBox;
                    var self = this;
                    $("#PCComboBoxAutoComplete").autocomplete({
                        source: list,
                        select: function (event, ui) {
                            var selectedItem = ui.item;
                            $("#PCComboBoxAutoComplete").val(selectedItem.label);
                            event.preventDefault(); //we don't want to show the value in the textbox.
                            PCCBRef.set("selectedItem", selectedItem.value);
                            $("[data-sc-id='PriceCardsComboBox']").val(selectedItem.value);
                            self.setPageIsDirty(true);
                        },
                        focus: function (event, ui) {
                            var selectedItem = ui.item;
                            event.preventDefault();
                            $("#PCComboBoxAutoComplete").val(selectedItem.label);
                        }
                    });
                    $("#PCComboBoxAutoComplete").focus(function () {
                        $(this).autocomplete("search",$(this).val());
                    });
                    this.PriceCardsComboBox.set("items", priceCardItems);

                    if (this.priceCardOnload) {
                        var selectedItem = null;
                        for (i = 0; i < priceCardItems.length; i++) {
                            if (priceCardItems[i].Name == this.priceCardOnload) {
                                selectedItem = priceCardItems[i];
                                this.PriceCardsComboBox.set("selectedItem", selectedItem.Name);
                                $("#PCComboBoxAutoComplete").val(selectedItem.Name);
                                $("[data-sc-id='PriceCardsComboBox']").val(selectedItem.Id)
                            }
                        }
                    }
                    if (selectedItem) {
                        var navigateUrl = "/sitecore/client/Applications/PricingPromotionsManager/Pages/All%20Books/Price%20Books/PageSettings/Price%20Book/PageSettings/Price%20Card?priceCardId=" + selectedItem.Id;
                        this.PriceCardLink.set("navigateUrl", navigateUrl);
                        this.PriceCardLink.set("text", "View Details");
                    }
                    else {
                        // Need token to represent null/empty value as we cannot
                        // set the combo box selected value to null/empty.
                        this.PriceCardLink.set("navigateUrl", "");
                        this.PriceCardLink.set("text", "");
                        this.PriceCardsComboBox.set("selectedValue", "noPriceCard");
                        $("#PCComboBoxAutoComplete").val(noPriceCardDisplayText);
                    }
                }
            } else {
                if (priceCardItems) {
                    for (i = 0; i < priceCardItems.length; i++) {
                        if (priceCardItems[i].Id == this.priceCardOnload) {
                            this.PriceCardText.set("text", priceCardItems[i]._displayname);
                            var navigateUrl = "/sitecore/client/Applications/PricingPromotionsManager/Pages/All%20Books/Price%20Books/PageSettings/Price%20Book/PageSettings/Price%20Card?pricingCardId=" + priceCardItems[i].Id;
                            this.PriceCardText.set("navigateUrl", navigateUrl);
                            break;
                        }
                    }
                }
            }
        },

        setLanguage: function () {
            this.determineLanguageToSet();
            var l = this.get("currentLanguage");
            this.Languages.set("selectedValue", l);
            this.Languages.on("change:selectedItemId", this.selectedLanguageChange, this);
        },

        loadProductDetails: function () {
            var self = this;
            var productId = this.get("targetId");

            if (productId !== "") {
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceSearch/GetItem",
                type: "POST",
                headers: this.ajaxToken,
                context: this,
                data: {
                    id: productId,
                    language: this.get("currentLanguage")
                },
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    if (data.InMaterializedCatalog) {
                        $(".cs-basefields :input").prop("disabled", true);
                        $(".sc-ProductInventoryBaseFields :input").prop("disabled", true);
                        $(".sc-expander :input").prop("disabled", true);
                        
                        self.VariantActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
                        self.DetailActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
                        self.InventoryActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
                        self.ParentActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
                        self.RelationshipActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");

                            this.DefaultCategoryComboBox.set("isEnabled", false);
                            this.Status.set("isEnabled", false);
                        }

                        self.set("catalogName", data.CatalogName);
                        self.set("productId", data.Name);

                        self.ProductPromotionsDataSource.set("catalogName", data.CatalogName);
                        self.ProductPromotionsDataSource.set("searchTerm", data.Name + "|");
                        self.PricingDataSource.set("catalogName", data.CatalogName);
                        self.PricingDataSource.set("searchTerm", data.Name + ",");
                        self.PriceCardDataSource.set("catalogName", data.CatalogName);

                        self.HeaderTitle.set("text", data.DisplayName);
                        self.TitleControl.set("text", data.DisplayName);
                        self.set("itemPath", data.Path);
                        self.defaultCategoryOnLoad = data.PrimaryParentCategory;
                        self.priceCardOnload = "";
                        self.CommerceImages.set("displayName", data.DisplayName);
                        self.CommerceImages.set("images", data.Images);
                        var lang = self.get("currentLanguage");

                        self.HeaderTitleLabel.set("text", self.ItemTypeDictionary.get("product"));

                        self.initializeQueryDataSource();
                        self.ProductTabs.set("selectedTab", "{941141A8-D1B4-44BC-B7D5-8642000285CD}");

                        //For Concurrency Saving
                        self.set("lastModified", data.LastModified);

                        var previousTab = window.location.hash;

                        if (previousTab !== "") {
                            self.ProductTabs.set("selectedTab", previousTab.substring(1, previousTab.length));
                        }
                    }
                });
            }
        },

        loadInventoryDetails: function (productId) {
            // Get the inventory details for this product
            if (this.hasInventory === true) {

                // Setup the Status combo box
                var statusValues = [];
                statusValues.push({ statusValue: "Enabled", statusName: "Enabled" });
                statusValues.push({ statusValue: "Disabled", statusName: "Disabled" });
                statusValues.push({ statusValue: "Ignored", statusName: "Ignored" });
                this.Status.set("items", statusValues);

                var self = this;
                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceProduct/GetInventoryDetailsForProduct",
                    type: "POST",
                    headers: this.ajaxToken,
                    data: {
                        id: productId
                    },
                    context: this,
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        self.setInventoryBaseFields(data, self);
                    }
                });
            }
        },

        setInventoryBaseFields: function (data, page) {
            if (data) {
                page.InventoryCatalogName.set("text", data.InventoryCatalogName);
                page.Backorderable.set("isChecked", data.Backorderable);
                page.Preorderable.set("isChecked", data.Preorderable);
                page.OnHandQuantity.set("text", data.OnhandQuantity);
                page.ExcessOnHandQuantity.set("text", data.ExcessOnhandQuantity);
                page.ReorderPoint.set("text", data.ReorderPoint);
                page.TargetQuantity.set("text", data.TargetQuantity);
                page.BackorderLimit.set("text", data.BackorderLimit);
                page.PreorderLimit.set("text", data.PreorderLimit);
                page.StockOutThreshold.set("text", data.StockOutThreshold);
                page.PreorderAvailabilityDate.set("value", data.PreorderAvailability);
                page.BackorderAvailabilityDate.set("value", data.BackorderAvailability);
                page.LastRestocked.set("value", data.LastRestocked);
                page.UnitOfMeasure.set("text", data.UnitOfMeasure);
                page.Memo.set("text", data.Memo);
                page.SkuLastModified.set("text", CommerceUtilities.formatInventoryDateString(data.LastModified));
                page.BackorderedQuantity.set("text", data.BackorderedQuantity);
                page.PreorderedQuantity.set("text", data.PreorderedQuantity);
                page.Status.set("selectedValue", data.Status);
            }
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
            $("li[data-tab-id=\\{5E0D90F9-78C8-4622-A289-4B0BD80F3AF2\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{2CD62D9B-7139-45A6-A21D-3E6A9CA021A2\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{2DF15390-98C4-46DF-8348-26D3B8F0DEB6\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{26213DC0-B3F1-4682-B0D2-B6E87B9216B4\\}] > a", this.tabStrip).append("<span class='badge'></span>");
            $("li[data-tab-id=\\{941141A8-D1B4-44BC-B7D5-8642000285CD\\}] > a", this.tabStrip).append("<label style=\"display:inline\"></label>");
            $("li[data-tab-id=\\{1A71829B-682E-4BCD-B0A1-E2B6D7ED6574\\}] > a", this.tabStrip).append("<label style=\"display:inline\"></label>");
        },

        parentCountChanged: function () {
            var count = this.ParentCategoryDataSource.get("totalItemCount") > 99 ? "99+" : this.ParentCategoryDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{2CD62D9B-7139-45A6-A21D-3E6A9CA021A2\\}] > a > span", this.tabStrip).html(count);
        },

        relationshipCountChanged: function () {
            var count = this.RelationshipDataSource.get("totalItemCount") > 99 ? "99+" : this.RelationshipDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{5E0D90F9-78C8-4622-A289-4B0BD80F3AF2\\}] > a > span", this.tabStrip).html(count);
        },

        variantCountChanged: function () {
            var count = this.VariantDataSource.get("totalItemCount") > 99 ? "99+" : this.VariantDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{2DF15390-98C4-46DF-8348-26D3B8F0DEB6\\}] > a > span", this.tabStrip).html(count);
        },

        productPromotionsCountChanged: function () {
            var count = this.ProductPromotionsDataSource.get("totalItemCount") > 99 ? "99+" : this.ProductPromotionsDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{26213DC0-B3F1-4682-B0D2-B6E87B9216B4\\}] > a > span", this.tabStrip).html(count);
        },

        pricingCountChanged: function () {
            var count = this.PricingDataSource.get("totalItemCount") > 99 ? "99+" : this.PricingDataSource.get("totalItemCount");
            //$("div class=\"sc-expander-toggler\"> a > span", this.tabStrip).html(count);
        },

        selectedTabChanged: function () {
            this.set("selectedTab", this.ProductTabs.get("selectedTab"));
            this.hideErrorMessage();

            if (this.get("selectedTab") == "{941141A8-D1B4-44BC-B7D5-8642000285CD}") { // Details
                this.displayDetails();
            } else if (this.get("selectedTab") == "{2DF15390-98C4-46DF-8348-26D3B8F0DEB6}") { // Variants
                this.issueVariantQuery();
            } else if (this.get("selectedTab") == "{5E0D90F9-78C8-4622-A289-4B0BD80F3AF2}") { // Relationships
                this.displayRelationships();
            } else if (this.get("selectedTab") == "{2CD62D9B-7139-45A6-A21D-3E6A9CA021A2}") { // Parents
                this.displayParents();
            } else if (this.get("selectedTab") == "{1A71829B-682E-4BCD-B0A1-E2B6D7ED6574}") { // Inventory
                this.displayInventory();
            }
        },

        onSelectedVariantsChanged: function () {
            this.hideErrorMessage();
            this.VariantActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.VariantList));
        },

        issueVariantQuery: function () {
            this.VariantList.set("isVisible", true);
            this.RelationshipList.set("isVisible", false);
            this.ParentCategoryList.set("isVisible", false);
            this.detailsInVisible();
            this.loadCorrectActionControl("variant");
            this.PendingRelationshipChangesExpander.set("isVisible", false);
            this.ProductInventoryBaseFields.set("isVisible", false);
            this.InventoryExtendedFieldsExpander.set("isVisible", false);

            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);

            if (this.listViewMode == "TileList") {
                this.VariantTileSortComboBox.set("isVisible", true);
                this.ParentTileSortComboBox.set("isVisible", false);
            }

            window.location.hash = '#{2DF15390-98C4-46DF-8348-26D3B8F0DEB6}';
        },

        displayDetails: function () {
            this.VariantList.set("isVisible", false);
            this.RelationshipList.set("isVisible", false);
            this.ParentCategoryList.set("isVisible", false);
            this.detailsVisible();
            this.PendingRelationshipChangesExpander.set("isVisible", false);
            this.ProductInventoryBaseFields.set("isVisible", false);
            this.InventoryExtendedFieldsExpander.set("isVisible", false);

            this.DetailListIconButton.set("isVisible", false);
            this.TileListIconButton.set("isVisible", false);

            this.VariantTileSortComboBox.set("isVisible", false);
            this.ParentTileSortComboBox.set("isVisible", false);

            window.location.hash = '#{941141A8-D1B4-44BC-B7D5-8642000285CD}';
        },

        displayRelationships: function () {
            this.VariantList.set("isVisible", false);
            this.RelationshipList.set("isVisible", true);
            this.ParentCategoryList.set("isVisible", false);
            this.detailsInVisible();
            this.loadCorrectActionControl("relationship");
            this.ProductInventoryBaseFields.set("isVisible", false);
            this.InventoryExtendedFieldsExpander.set("isVisible", false);
            this.VariantTileSortComboBox.set("isVisible", false);
            this.ParentTileSortComboBox.set("isVisible", false);

            // Show pending relationship changes conditionally
            var showPendingRelationshipChanges = false;
            var relationshipChanges = this.RelationshipsPendingChangesList.get("items");
            if (relationshipChanges && relationshipChanges.length > 0) {
                showPendingRelationshipChanges = true;
            }

            this.PendingRelationshipChangesExpander.set("isVisible", showPendingRelationshipChanges);

            this.VariantTileSortComboBox.set("isVisible", false);
            this.ParentTileSortComboBox.set("isVisible", false);
            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);

            window.location.hash = '#{5E0D90F9-78C8-4622-A289-4B0BD80F3AF2}';
        },

        displayParents: function () {
            this.VariantList.set("isVisible", false);
            this.RelationshipList.set("isVisible", false);
            this.ParentCategoryList.set("isVisible", true);
            this.detailsInVisible();
            this.loadCorrectActionControl("parent");

            this.PendingRelationshipChangesExpander.set("isVisible", false);
            this.ProductInventoryBaseFields.set("isVisible", false);
            this.InventoryExtendedFieldsExpander.set("isVisible", false);

            this.DetailListIconButton.set("isVisible", true);
            this.TileListIconButton.set("isVisible", true);

            if (this.listViewMode == "TileList") {
                if (this.listViewMode == "TileList") {
                    this.VariantTileSortComboBox.set("isVisible", false);
                    this.ParentTileSortComboBox.set("isVisible", true);
                }
            }

            window.location.hash = '#{2CD62D9B-7139-45A6-A21D-3E6A9CA021A2}';
        },

        displayInventory: function () {
            this.VariantList.set("isVisible", false);
            this.RelationshipList.set("isVisible", false);
            this.ParentCategoryList.set("isVisible", false);
            this.detailsInVisible();
            this.loadCorrectActionControl("inventory");
            this.PendingRelationshipChangesExpander.set("isVisible", false);

            this.ProductInventoryBaseFields.set("isVisible", true);
            this.InventoryExtendedFieldsExpander.set("isVisible", true);
            this.DetailListIconButton.set("isVisible", false);
            this.TileListIconButton.set("isVisible", false);

            window.location.hash = '#{1A71829B-682E-4BCD-B0A1-E2B6D7ED6574}';
        },

        detailsVisible: function () {
            this.ReadOnlyDefaultFields.set("isVisible", true);
            this.CommerceFieldExpander.set("isVisible", true);
            this.CommerceImages.set("isVisible", true);
            //CommerceItem
            this.loadCorrectActionControl("detail");
            $(".cs-commerceitem").show();
        },

        detailsInVisible: function () {
            this.ReadOnlyDefaultFields.set("isVisible", false);
            this.CommerceFieldExpander.set("isVisible", false);
            this.CommerceImages.set("isVisible", false);
            $(".cs-commerceitem").hide();
        },

        setItemPickerHeaderTitle: function (relationshipName) {
            if (relationshipName) {
                var titleFormat = this.ResourcesDictionary.get("ChooseRelationship");
                var titleText = Sitecore.Helpers.string.format(titleFormat, relationshipName, this.HeaderTitleLabel.get("text"), this.HeaderTitle.get("text"));
                $(".sc-dialogWindow-header-title").html(titleText);
            }
        },

        initializeQueryDataSource: function () {

            var productId = this.get("targetId");

            this.VariantDataSource.set("commerceItemId", productId);
            this.VariantDataSource.set("isReady", true);
            this.VariantDataSource.refresh();

            this.ParentCategoryDataSource.set("commerceItemId", productId);
            this.ParentCategoryDataSource.set("isReady", true);
            this.ParentCategoryDataSource.set("language", this.get("currentLanguage"));
            this.ParentCategoryDataSource.refresh();

            this.RelationshipDataSource.set("commerceItemId", productId);
            this.RelationshipDataSource.set("language", this.get("currentLanguage"));
            this.RelationshipDataSource.set("isReady", true);
            this.RelationshipDataSource.refresh();

            this.ProductPromotionsDataSource.set("commerceItemId", productId);
            this.ProductPromotionsDataSource.set("language", this.get("currentLanguage"));
            this.ProductPromotionsDataSource.set("isReady", true);
            this.ProductPromotionsDataSource.refresh();

            // Set the PricingDataSource fields values
            this.PricingDataSource.set("commerceItemId", productId);
            this.PricingDataSource.set("language", this.get("currentLanguage"));
            this.PricingDataSource.set("isReady", true);
            this.PricingDataSource.refresh();

            // Set the PriceCardDataSource fields values
            this.PriceCardDataSource.set("language", this.get("currentLanguage"));
            this.PriceCardDataSource.set("isReady", true);
            this.PriceCardDataSource.refresh();
            
        },

        addCrossSell: function () {
            this.addRelationship("CrossSell", "Cross-Sell");
        },

        addUpSell: function () {
            this.addRelationship("UpSell", "Up-Sell");
        },

        isDetailsTabSelected: function () {
            return this.ProductTabs.get("selectedTab") == "{941141A8-D1B4-44BC-B7D5-8642000285CD}";
        },

        isRelationshipsTabSelected: function () {
            return this.ProductTabs.get("selectedTab") == "{5E0D90F9-78C8-4622-A289-4B0BD80F3AF2}";
        },

        isParentsTabSelected: function () {
            return this.ProductTabs.get("selectedTab") == "{2CD62D9B-7139-45A6-A21D-3E6A9CA021A2}";
        },

        isVariantsTabSelected: function () {
            return this.ProductTabs.get("selectedTab") == "{2DF15390-98C4-46DF-8348-26D3B8F0DEB6}";
        },

        infiniteScrollVariants: function () {
            var isBusy = this.VariantDataSource.get("isBusy");
            var hasMoreItems = this.VariantDataSource.get("hasMoreItems");

            if (this.isVariantsTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.VariantDataSource.next();
                }
            }
        },

        infiniteScrollParents: function () {
            var isBusy = this.ParentCategoryDataSource.get("isBusy");
            var hasMoreItems = this.ParentCategoryDataSource.get("hasMoreItems");

            if (this.isParentsTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.ParentCategoryDataSource.next();
                }
            }
        },

        infiniteScrollRelationships: function () {
            var isBusy = this.RelationshipDataSource.get("isBusy");
            var hasMoreItems = this.RelationshipDataSource.get("hasMoreItems");

            if (this.isRelationshipsTabSelected() && !isBusy && hasMoreItems) {
                var val = parseInt($(window).scrollTop(), 10) + parseInt($(window).height(), 10);
                if (val >= document.body.offsetHeight * 0.75) {
                    this.RelationshipDataSource.next();
                }
            }
        },

        loadCorrectActionControl: function (action) {
            if (action == "detail") {
                this.DetailActionControl.set("isVisible", true);
                this.VariantActionControl.set("isVisible", false);
                this.InventoryActionControl.set("isVisible", false);
                this.ParentActionControl.set("isVisible", false);
                this.RelationshipActionControl.set("isVisible", false);
                this.RelationshipsContextMenu.set("isVisible", false);
                this.Languages.set("isVisible", true);
            }
            else if (action == "variant") {
                this.VariantActionControl.set("isVisible", true);
                this.VariantActionControl.getAction("Delete").isEnabled(this.isAnItemSelected(this.VariantList));
                this.DetailActionControl.set("isVisible", false);
                this.InventoryActionControl.set("isVisible", false);
                this.ParentActionControl.set("isVisible", false);
                this.RelationshipActionControl.set("isVisible", false);
                this.RelationshipsContextMenu.set("isVisible", false);
                this.Languages.set("isVisible", false);
            }
            else if (action == "inventory") {
                this.InventoryActionControl.set("isVisible", true);
                this.DetailActionControl.set("isVisible", false);
                this.VariantActionControl.set("isVisible", false);
                this.ParentActionControl.set("isVisible", false);
                this.RelationshipActionControl.set("isVisible", false);
                this.Languages.set("isVisible", false);
            } else if (action == "parent") {
                this.ParentActionControl.set("isVisible", true);
                this.InventoryActionControl.set("isVisible", false);
                this.DetailActionControl.set("isVisible", false);
                this.VariantActionControl.set("isVisible", false);
                this.RelationshipActionControl.set("isVisible", false);
                this.Languages.set("isVisible", false);
            } else if (action == "relationship") {
                this.RelationshipActionControl.set("isVisible", true);
                this.DetailActionControl.set("isVisible", false);
                this.VariantActionControl.set("isVisible", false);
                this.InventoryActionControl.set("isVisible", false);
                this.ParentActionControl.set("isVisible", false);
                this.Languages.set("isVisible", true);
            }
            else {
                this.RelationshipActionControl.set("isVisible", false);
                this.DetailActionControl.set("isVisible", false);
                this.VariantActionControl.set("isVisible", false);
                this.InventoryActionControl.set("isVisible", false);
                this.ParentActionControl.set("isVisible", false);
                this.Languages.set("isVisible", false);
            }
        },

        addVariant: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/VariantDetail?create=true&template=' + this.variantTemplateId + '&parent=' + this.get("targetId"));
        },

        saveProduct: function () {
            var id = this.get("targetId");
            if (id) {
                this.updateProduct();
            } else {
                this.createProduct();
            }
        },

        updateProduct: function () {
            this.hideErrorMessage();
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.updateSaveButton(false);
                this.updateTabsIndicators();
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();
            var d = this.FormRenderer.get("editFunctionBody");
            var baseFields = this.ProductBaseFields.get("editFunctionBody");
            baseFields.push(["Tags", "Tags", "Text"]);
            var currentLanguage = this.get("currentLanguage");
            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, d);
            if (!this.isAXEnabled) {
                this.addRendererFieldsToObject(dataObject, baseFields);
            }

            dataObject.currentLanguage = currentLanguage;
            dataObject.images = this.CommerceImages.get("images");
            dataObject.itemId = this.get("targetId");

            //For Concurrency Saving
            dataObject.lastModified = this.get("lastModified");
            dataObject.overrideChanges = this.get("overrideChanges");

            // Only include inventory information if this is not a product family
            if (this.hasInventory === true && this.inventoryChanged) {
                dataObject.inventory = {};
                this.addInventoryBaseFieldsToPost(dataObject.inventory);
                var extendedFields = this.InventorySkuFormRenderer.get("editFunctionBody");
                this.addRendererFieldsToObject(dataObject.inventory, extendedFields);
            }

            dataObject.addedRelationships = this.getPendingRelationshipOperations("Add");
            dataObject.deletedRelationships = this.getPendingRelationshipOperations("Delete");
            dataObject.editedRelationships = this.getPendingRelationshipOperations("Edit");

            if (this.DefaultCategoryComboBox) {
                var primaryParent = this.DefaultCategoryComboBox.get("selectedValue");
                if (primaryParent == "noParent") {
                    dataObject.primaryParentCategory = "";
                } else {
                    dataObject.primaryParentCategory = primaryParent;
                }
            }

            if (this.PriceCardsComboBox) {
                var priceCard = $("[data-sc-id='PriceCardsComboBox']").val();
                if (priceCard == "noPriceCard") {
                    dataObject.PriceCardName = "";
                    $("#productPriceCard").val("");
                } else {
                    dataObject.PriceCardName = $("#PCComboBoxAutoComplete").val();
                    $("#productPriceCard").val($("#PCComboBoxAutoComplete").val());
                }
            }

            // Since we need to update the Manhattan cache, the environment must be supplied in request
            var currentEnvironment = this.EnvironmentsSwitcher.get("selectedItem");
            if (currentEnvironment && typeof currentEnvironment !== "undefined") {
                dataObject.Headers = "Environment:" + currentEnvironment.Name;
            }

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceProduct/Update",
                type: "POST",
                headers: this.ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    var self = this;
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();
                        //this.updateSaveButton(false);

                        //For Concurrency Saving
                        this.set("overrideChanges", false);

                        for (i = 0; i < data.Errors.length; i++) {
                            this.ErrorsMessageBar.addMessage("error", data.Errors[i].ErrorMessage);

                            if (data.Errors[i].ControlId) {
                                $("[data-sc-id='" + data.Errors[i].ControlId + "']").addClass("sc-validation");
                                this.serverUpdateTabErrorIndicator(data.Errors[i].ControlId);
                            }
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
                    }
                    else {
                        this.hideInProgressMessage(true);
                        //For Concurrency Saving
                        this.setPageIsDirty(false);
                        this.set("overrideChanges", false);
                        if (this.DefaultCategoryComboBox){
                            this.defaultCategoryOnLoad = this.DefaultCategoryComboBox.get("selectedValue");
                        }

                        this.RelationshipsPendingChangesList.set("items", []);
                        this.pendingRelationshipChanges = [];
                        this.RelationshipsPendingChangesList.set("items", []);

                        // Clear any exclusions on the data source
                        this.RelationshipDataSource.set("exclusions", "");
                        this.RelationshipList.set("checkedItemIds", []);
                        setTimeout(function () { self.initializeQueryDataSource(); }, 3000);

                        if (data.Status.indexOf("success") === 0) {
                            self.set("lastModified", data.Status.split('|')[1]);
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
            this.updateProduct();
            this.ConcurrencyAlert.hide();
        },

        createProduct: function () {
            this.hideErrorMessage();
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.updateSaveButton(false);
                this.updateTabsIndicators();
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();
            var d = this.FormRenderer.get("editFunctionBody");
            var baseFields = this.ProductBaseFields.get("editFunctionBody");
            baseFields.push(["Tags", "Tags", "Text"]);

            var currentLanguage = this.get("currentLanguage");
            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, d);
            this.addRendererFieldsToObject(dataObject, baseFields);

            dataObject.currentLanguage = currentLanguage;
            dataObject.images = this.CommerceImages.get("images");
            dataObject.templateId = this.get("templateId");
            dataObject.parentId = this.get("parentId");
            dataObject.name = this.Name.get("text") !== null ? this.Name.get("text").trim() : "";

            // custom validation of Name
            if (!this.isNameValid(dataObject.name)) {
                return;
            }

            var self = this;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceProduct/Create",
                type: "POST",
                headers: this.ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    var self = this;
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();
                        this.HeaderActionsMessageBar.removeMessages();
                        for (var i = 0; i < data.Errors.length; i++) {
                            this.HeaderActionsMessageBar.addMessage("error", data.Errors[i].ErrorMessage);

                            if (data.Errors[i].ControlId) {
                                $("[data-sc-id='" + data.Errors[i].ControlId + "']").addClass("sc-validation");
                            }
                        }

                        this.HeaderActionsMessageBar.set("isVisible", true);
                        $(".sc-validation").change(function () {
                            self.updateValidationError($(this));
                        });
                        $(".sc-validation.sc-datepicker").click(function () {
                            self.updateValidationError($(this));
                        });
                    } else {
                        this.hideInProgressMessageCreate(true, "Product Created");
                        this.setPageIsDirty(false);
                        this.set("newTargetId", data);
                        setTimeout($.proxy(this.redirectToSavedProduct, this), 10000);
                    }
                }
            });
        },

        redirectToSavedProduct: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/ProductDetail?target=' + this.get("newTargetId"));
        },

        validateProduct: function () {
            var d = this.FormRenderer.get("editFunctionBody");
            var baseFields = this.ProductBaseFields.get("editFunctionBody");
            var currentLanguage = this.get("currentLanguage");
            var dataObject = {};

            this.addRendererFieldsToObject(dataObject, d);
            this.addRendererFieldsToObject(dataObject, baseFields);

            dataObject.currentLanguage = currentLanguage;
            dataObject.images = this.CommerceImages.get("images");
            dataObject.itemId = this.get("targetId");

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceProduct/Validate",
                type: "POST",
                data: dataObject,
                headers: this.ajaxToken,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    if (data.length > 0) {
                        this.handleValidationMessages(data);
                    }
                }
            });
        },

        deleteSelectedVariants: function () {
            this.deleteRequestedItems(this.VariantList, this.VariantDataSource);
        },

        hideDeleteAlert: function () {
            this.DeleteAlert.hide();
        },

        deleteRequestedItems: function (itemListControl, dataSource) {

            var selectedVariants = itemListControl.get("checkedItemIds");

            if (selectedVariants && selectedVariants.length > 0) {
                var variantsDelimitedList = "";
                for (i = 0; i < selectedVariants.length; i++) {
                    var variant = selectedVariants[i];
                    if (i > 0) {
                        variantsDelimitedList += "|";
                    }

                    variantsDelimitedList += variant;
                }

                if (variantsDelimitedList) {
                    $.ajax({
                        url: "/sitecore/shell/commerce/merchandising/CommerceProduct/Delete",
                        type: "POST",
                        headers: this.ajaxToken,
                        data: {
                            itemsToDelete: variantsDelimitedList
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

                                // Clear the checked items collection of the list control to
                                // prevent re-submission of deleted items.
                                itemListControl.viewModel.uncheckItems(selectedVariants);
                            }, 2000);
                        }
                    });
                }
            }


        },

        resetField: function (fieldName) {
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceProduct/ResetField",
                type: "POST",
                headers: this.ajaxToken,
                data: {
                    id: this.get("targetId"),
                    fieldName: fieldName
                },
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    if (fieldName == "cy_list_price" && data != "false") {
                        var price = parseFloat(data).toFixed(2);
                        this.ListPrice.set("value", price.toString());
                        this.ResetPriceAlert.hide();
                    } else {
                        window.location.reload();
                    }
                }
            });
        },

        handleValidationMessages: function (data) {
            this.ValidationMessageBar.set("isVisible", true);
            for (var i = 0; i < data.length; i++) {
                /* jshint ignore:start */
                var actions = [{ text: "Jump to field", action: "javascript:app.jumpToField('" + data[i].ControlId + "')" }];
                /* jshint: ignore:end */
                var messageWithActions = { text: data[i].ErrorMessage, actions: actions, closable: false };
                this.ValidationMessageBar.viewModel.warnings.push(messageWithActions);
            }

            this.ValidationMessageBar.setMessagesStatus();
        },

        jumpToField: function (controlName) {
            alert("Error in control" + controlName);
        },

        hideErrorMessage: function () {
            this.ErrorsMessageBar.removeMessages();
            this.ErrorsMessageBar.set("isVisible", false);
        },

        updateValidationError: function (obj) {
            obj.removeClass("sc-validation");
            this.updateTabsIndicators();
            if ($(".sc-validation").length === 0) {
                this.updateSaveButton(true);
                this.hideErrorMessage();
            }
        },

        updateSaveButton: function (status) {
            if (this.InventoryActionControl) {
                this.InventoryActionControl.getAction("Save").isEnabled(status);
            }
            if (this.ParentActionControl) {
                this.ParentActionControl.getAction("Save").isEnabled(status);
            }
            this.DetailActionControl.getAction("Save").isEnabled(status);
            if (this.RelationshipActionControl) {
                this.RelationshipActionControl.getAction("Save").isEnabled(status);
            }
            if (this.VariantActionControl) {
                this.VariantActionControl.getAction("Save").isEnabled(status);
            }
        },

        updateTabsIndicators: function () {
            var tabDetailsStatusElement = $("li[data-tab-id=\\{941141A8-D1B4-44BC-B7D5-8642000285CD\\}] > a > label", this.tabStrip);
            var tabInventoryStatusElement = $("li[data-tab-id=\\{1A71829B-682E-4BCD-B0A1-E2B6D7ED6574\\}] > a > label", this.tabStrip);
            var detailsCount = 0;
            var inventoryCount = 0;
            $(".sc-validation").each(function () {
                if ($(this).parent().hasClass("details")) {
                    detailsCount++;
                } else if ($(this).parent().hasClass("inventory")) {
                    inventoryCount++;
                }
            });

            if (detailsCount > 0) {
                tabDetailsStatusElement.html("<div class='warning16'>");
            } else {
                tabDetailsStatusElement.html("");
            }

            if (inventoryCount > 0) {
                tabInventoryStatusElement.html("<div class='warning16'>");
            } else {
                tabInventoryStatusElement.html("");
            }
        },

        itemPickerAcceptChanges: function () {
            this.ItemPicker.hide();

            if (this.currentRelationshipName) {
                // do add relationship and clear flag
                var addedProductRelationships = [];
                var addedCategoryRelationships = [];
                var productListItems = [];
                var categoryListItems = [];
                var showWarning = false;

                var addedProducts = this.getItemPickerSelectedProducts();
                var addedCategories = this.getItemPickerSelectedCategories();

                var attemptedCategoryAdds = addedCategories.length;
                var attemptedProductAdds = addedProducts.length;

                var showTriedToAddParentWarning = false;

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

                var self = this;
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

                this.currentRelationshipName = null;
                this.setPageIsDirty(true);
            }
        },

        itemPickerClose: function () {
            this.ItemPicker.hide();
        },

        pendingRelationshipChangesItemsChanged: function () {
            var showRelationshipChangesExpander = false;
            if (this.RelationshipsPendingChangesList && this.RelationshipsPendingChangesList.get("items").length > 0) {
                showRelationshipChangesExpander = true;
                this.setPageIsDirty(true);
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

        deleteSelectedRelationships: function () {
            var selectedRelationships = this.RelationshipList.get("checkedItems");
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

                var newPendingChanges = this.pendingRelationshipChanges.concat(listItems);
                this.RelationshipsPendingChangesList.set("items", newPendingChanges);
                this.pendingRelationshipChanges = newPendingChanges;
                var currentRelationshipExclusions = this.RelationshipDataSource.get("exclusions");
                var newExclusionsDelimited = CommerceUtilities.createDelimitedListFromArray(newExclusions);
                var exclusions = CommerceUtilities.joinDelimitedLists(this.RelationshipDataSource.get("exclusions"), newExclusionsDelimited);
                this.RelationshipDataSource.set("exclusions", exclusions);

                // Requery the datasource to exclude pending deletes
                this.RelationshipDataSource.refresh();
            }
        },

        relationshipsListCheckedItemsChanged: function () {
            var selectedRelationshipItems = this.RelationshipList.get("checkedItems");
            var deleteEnabled = false;
            if (selectedRelationshipItems && selectedRelationshipItems.length > 0) {
                deleteEnabled = true;
            }
            if (!this.isAXEnabled) {
                this.RelationshipActionControl.getAction("Delete").isEnabled(deleteEnabled);
            }
        },

        relationshipDoesNotExist: function (item) {

            var existingRelationships = this.RelationshipDataSource.get("items");
            for (i = 0; i < existingRelationships.length; i++) {
                if (item.itemId == existingRelationships[i].targetItemId &&
                    this.currentRelationshipName == existingRelationships[i].relationshipName) {
                    return false;
                }
            }

            return true;
        },

        relationshipsSelectedItemChanged: function () {

            var selectedRelationship = this.RelationshipList.get("selectedItem");
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
            var selectedRelationship = this.RelationshipList.get("selectedItem");
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
            this.VariantList.set("view", viewMode);
            this.RelationshipList.set("view", viewMode);
            this.ParentCategoryList.set("view", viewMode);

            // Update the user preference
            this.setUsersListViewPreference(viewMode);

            if (this.listViewMode == "TileList") {
                // switch to default sorting
                this.VariantTileSortComboBox.trigger("change:selectedItem");
                this.ParentTileSortComboBox.trigger("change:selectedItem");

                this.checkListViewItems(this.VariantList);
                this.checkListViewItems(this.RelationshipList);

                if (this.get("selectedTab") == "{941141A8-D1B4-44BC-B7D5-8642000285CD}") { // details
                    this.VariantTileSortComboBox.set("isVisible", false);
                    this.ParentTileSortComboBox.set("isVisible", false);
                } else if (this.get("selectedTab") == "{2DF15390-98C4-46DF-8348-26D3B8F0DEB6}") { // variant
                    this.VariantTileSortComboBox.set("isVisible", true);
                    this.ParentTileSortComboBox.set("isVisible", false);
                } else if (this.get("selectedTab") == "{5E0D90F9-78C8-4622-A289-4B0BD80F3AF2}") { // relationships
                    this.VariantTileSortComboBox.set("isVisible", false);
                    this.ParentTileSortComboBox.set("isVisible", false);
                } else if (this.get("selectedTab") == "{2CD62D9B-7139-45A6-A21D-3E6A9CA021A2}") { // parents
                    this.VariantTileSortComboBox.set("isVisible", false);
                    this.ParentTileSortComboBox.set("isVisible", true);
                } else if (this.get("selectedTab") == "{1A71829B-682E-4BCD-B0A1-E2B6D7ED6574}") { // inventory
                    this.VariantTileSortComboBox.set("isVisible", false);
                    this.ParentTileSortComboBox.set("isVisible", false);
                }
            } else {
                this.VariantTileSortComboBox.set("isVisible", false);
                this.ParentTileSortComboBox.set("isVisible", false);
            }
        }
    });

    return ProductDetail;
});

document.body.addEventListener("mousedown", defineClientX, false);
var clientX = null;
function defineClientX(e) {
    clientX = e.clientX;
}