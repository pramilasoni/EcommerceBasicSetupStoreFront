//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        CommerceBasePage: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceBasePage"
    }
});

define(["sitecore", "CommerceBasePage"], function (Sitecore, cbp) {
    var VariantDetail = cbp.extend({
        hasInventory: false,
        inventoryChanged: false,
        currentEditedMediaField: null,
        ajaxToken: {},
        tabStrip: null,
        initialized: function () {
            $("#ui-datepicker-div").hide();
            this.HelpProvider.set("isReady", true);
            this.HelpProvider.refresh();
            this.set("selectedTab", "{917CC948-91C6-40B0-9813-FF3AA89C1DA2}");

            cbp.prototype.initialized.call(this);

            this.listenTo(_sc, 'sc-concurrency-override', this.overridePreviousChanges);
            this.listenTo(_sc, 'sc-concurrency-cancel', this.cancelChanges);

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            this.ajaxToken[token.headerKey] = token.value;
            var variantId = CommerceUtilities.loadPageVar("target");
            this.set("targetId", variantId);
            this.VariantTab.on("change:selectedTab", this.selectedTabChanged, this);

            // Set up tabs
            this.VariantPromotionsDataSource.on("change:totalItemCount", this.variantPromotionsCountChanged, this);

            var self = this;

            // Select Media Dialog
            this.listenTo(_sc, 'sc-frame-message', this.addMedia);

            var language = CommerceUtilities.loadPageVar("lang");

            if (!language) {
                language = cbp.prototype.getCookie("commerceLang");
            }

            if (language) {
                this.set("currentLanguage", language);
            } else {
                this.set("currentLanguage", "en-US");
            }

            // Cache for faster selector lookup
            var variantTabElement = this.VariantTab.viewModel.$el;
            this.tabStrip = $("ul.sc-tabcontrol-navigation", variantTabElement).first();

            // Setup event handler for the select media event of media field 
            var selectMediaEventHandler = $.proxy(this.showMediaDialog, this);
            this.on("selectMediaEvent", selectMediaEventHandler, this);

            if (this.VariantPriceCardsComboBox) {
                this.VariantPriceCardsComboBox.on("change:selectedItem", $.proxy(this.variantPriceCardsComboboxChanged, this));
                this.VariantPriceCardsComboBox.set("isVisible", false);
            }

            // Setup event handler for select media accept changes
            this.listenTo(_sc, 'sc-frame-message', this.mediaItemSelected);
            // Wait for the environment list to be loaded
            addEventListener("environmentReady", $.proxy(this.environmentLoaded.bind(this), false), this);
        },

        environmentLoaded: function () {
            var selectedItem = this.EnvironmentsSwitcher.get("selectedItem");
            if (selectedItem != null) {
                // Set the VariantPricingDataSource fields values
                this.VariantPricingDataSource.set("headers", "Environment:" + selectedItem.Name);
                // Set the VariantPromotionsDataSource fields values
                this.VariantPromotionsDataSource.set("headers", "Environment:" + selectedItem.ArtifactStoreId);
                // Set the VariantPriceCardDataSource fields values
                this.VariantPriceCardDataSource.set("headers", "Environment:" + selectedItem.Name);
                // Load the variant details with the proper environment set
                this.loadProductVariantDetails();
            }
        },

        loadProductVariantDetails: function () {
            var self = this;
            var variantId = this.get("targetId");

            if (variantId) {
                // Set up tabs
                this.addLabelsToTabs();

                //For Concurrency Saving
                this.set("lastModified", null);
                this.set("overrideChanges", false);

                // Edit
                this.LanguageDataSource.set("commerceItemId", variantId);
                this.LanguageDataSource.set("isReady", true);
                this.LanguageDataSource.refresh();
                this.Language.on("change:items", this.setLanguage, this);

                this.VariantActionControl.set("isVisible", true);
                this.InventoryActionControl.set("isVisible", false);

                //Price Cards
                this.VariantPriceCardDataSource.setCompletedQueryCallback($.proxy(this.setupVariantPriceCardComboBox, this));

                this.VariantPricingListControl.on("change:selectedItem", function () {
                    var selectedItem = this.VariantPricingListControl.get("selectedItem");
                    this.UpdateListPriceButton.set("isEnabled", selectedItem !== null);
                }, this);

                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceSearch/GetItem",
                    type: "POST",
                    context: this,
                    headers: this.ajaxToken,
                    data: {
                        id: variantId,
                        language: this.get("currentLanguage")
                    },
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        if (data.InMaterializedCatalog) {
                            $(".cs-basefields :input").prop("disabled", true);
                            this.VariantActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
                            this.InventoryActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");

                            $(".sc-ProductInventoryBaseFields :input").prop("disabled", true);
                            $(".sc-expander :input").prop("disabled", true);
                        }
                        self.HeaderTitle.set("text", data.DisplayName);
                        self.TitleControl.set("text", data.DisplayName);
                        self.CommerceImages.set("displayName", data.DisplayName);
                        self.CommerceImages.set("images", data.Variant_Images);

                        self.HeaderTitleLabel.set("text", self.ItemTypeDictionary.get("variant"));
                        self.set("itemPath", data.Path);

                        //For Concurrency Saving
                        self.set("lastModified", data.LastModified);

                        self.set("catalogName", data.CatalogName);
                        self.set("productId", data.ProductId);
                        self.set("variantId", data.Name);

                        self.VariantPromotionsDataSource.set("catalogName", data.CatalogName);
                        self.VariantPromotionsDataSource.set("searchTerm", data.ProductId + "|" + data.Name);

                        self.VariantPromotionsDataSource.set("commerceItemId", variantId);
                        self.VariantPromotionsDataSource.set("language", this.get("currentLanguage"));
                        self.VariantPromotionsDataSource.set("isReady", true);
                        self.VariantPromotionsDataSource.refresh();

                        // Set the PricingDataSource fields values
                        this.VariantPricingDataSource.set("catalogName", data.CatalogName);
                        this.VariantPricingDataSource.set("searchTerm", data.ProductId + "," + data.Name);
                        this.VariantPricingDataSource.set("commerceItemId", variantId);
                        this.VariantPricingDataSource.set("isReady", true);
                        this.VariantPricingDataSource.refresh();

                        // Set the VariantPriceCardDataSource fields values
                        this.VariantPriceCardDataSource.set("catalogName", data.CatalogName);
                        this.VariantPriceCardDataSource.set("language", this.get("currentLanguage"));
                        this.VariantPriceCardDataSource.set("isReady", true);
                        this.VariantPriceCardDataSource.refresh();
                        
                    }
                });

                // Select Media from BaseUrl
                this.BaseUrlTextBox.viewModel.$el.keyup(this.updateBaseUrlPreview);
                this.BaseUrlTextBox.viewModel.$el.focusout(this.updateBaseUrlPreview);

                // Determine if we should display the inventory tab
                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceMetadata/DoesVariantHaveInventory",
                    type: "POST",
                    headers: this.ajaxToken,
                    data: {
                        id: variantId
                    },
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        // If no associated inventory hide the tab.
                        var inventoryTab = $("li[data-tab-id='{CD3FF5FA-EA98-4965-91EE-2B7A400D0789}']", this.tabStrip);

                        if (data == "false") {
                            inventoryTab.hide();
                            self.hasInventory = false;
                            self.disableInventoryValidation();
                        } else if (data == "true") {
                            inventoryTab.show();
                            self.hasInventory = true;
                            self.loadInventoryDetails(variantId);
                            // Detect if inventory fields are dirty
                            $(".inventory").change(function () {
                                self.inventoryChanged = true;
                            });
                        }
                    }
                });
            } else {
                // Create
                this.VariantTab.set("selectedTab", "{917CC948-91C6-40B0-9813-FF3AA89C1DA2}");
                self.HeaderTitle.set("text", self.ItemTypeDictionary.get("Create Variant"));
                self.TitleControl.set("text", self.ItemTypeDictionary.get("Create Variant"));

                this.set("templateId", CommerceUtilities.loadPageVar("template"));
                this.set("parentId", CommerceUtilities.loadPageVar("parent"));
                this.VariantActionControl.set("isVisible", true);
                this.InventoryActionControl.set("isVisible", false);

                $("[data-sc-id='ProductInventoryBaseFields']").html("");
                $("[data-sc-id='InventorySkuFormRenderer']").html("");
                this.disableInventoryValidation();

                this.Language.set("isVisible", false);

                $("li[data-tab-id=\\{CD3FF5FA-EA98-4965-91EE-2B7A400D0789\\}]", this.tabStrip).hide();
            }
        },

        disableIfAX: function () {
            $(".cs-basefields :input").prop("disabled", true);
            this.VariantActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            this.InventoryActionControl.disableActionsNotInGroup("EnableWhenExtendedFields");
            $(".sc-CommerceDateTime :input").prop("disabled", true);
        },

        disableInventoryValidation: function () {
            $('.inventory').removeClass('isrequired');
        },

        showMediaDialog: function (mediaField) {
            this.currentEditedMediaField = mediaField;
            this.SelectMediaDialogWindow.show();
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

        setLanguage: function () {
            this.determineLanguageToSet();
            var l = this.get("currentLanguage");
            this.Language.set("selectedValue", l);
            this.Language.on("change:selectedItemId", this.selectedLanguageChange, this);
        },

        variantPriceCardsComboboxChanged: function (obj) {
            self = this;
            if (obj._changing) {
                setTimeout(function () { self.variantPriceCardsComboboxChanged(obj); }, 200);
                return;
            }
            var PCComboBoxVal = $("[data-sc-id='VariantPriceCardsComboBox']").val();
            var navigateUrl = "";
            if (PCComboBoxVal !== undefined && PCComboBoxVal !== null) {
                if (PCComboBoxVal == "noPriceCard") {
                    navigateUrl = "";
                    this.VariantPriceCardLink.set("navigateUrl", navigateUrl);
                    this.VariantPriceCardLink.set("text", "");
                } else {
                    navigateUrl = "/sitecore/client/Applications/PricingPromotionsManager/Pages/All%20Books/Price%20Books/PageSettings/Price%20Book/PageSettings/Price%20Card?priceCardId=" + PCComboBoxVal;
                    this.VariantPriceCardLink.set("navigateUrl", navigateUrl);
                    this.VariantPriceCardLink.set("text", "View Details");
                }
            }
        },

        setupVariantPriceCardComboBox: function () {
            var priceCardItems = this.VariantPriceCardDataSource.get("items");
            this.priceCardOnload = $("#variantPriceCard").val();
            if (this.VariantPriceCardsComboBox) {
                var noPriceCardDisplayText = this.NoVariantPriceCardText.get("text");
                if (priceCardItems) {
                    var noPriceCardItem = {
                        Id: "noPriceCard",
                        Name: noPriceCardDisplayText,
                        $icon: ""
                    };

                    priceCardItems.unshift(noPriceCardItem);

                    //we want to dynamically add the Autocomplete box
                    var PCComboBox = $("[data-sc-id='VariantPriceCardsComboBox']");
                    if ($("#VariantPCComboBoxAutoComplete").length == 0)
                        PCComboBox.after("<input class='form-control' id='VariantPCComboBoxAutoComplete'  style='background-image:url(/sitecore/shell/client/Applications/MerchandisingManager/Assets/Icons/16x16/search_icon.png);background-repeat:no-repeat;background-position:right center;' type='search' ></input>");

                    var list = [];
                    for (var i = 0; i < priceCardItems.length; i++) {
                        //add all the options to a string list
                        list.push({ label: priceCardItems[i].Name, value: priceCardItems[i].Id });
                    }
                    var PCCBRef = this.VariantPriceCardsComboBox;
                    var self = this;
                    $("#VariantPCComboBoxAutoComplete").autocomplete({
                        source: list,
                        select: function (event, ui) {
                            var selectedItem = ui.item;
                            $("#VariantPCComboBoxAutoComplete").val(selectedItem.label);
                            event.preventDefault(); //we don't want to show the value in the textbox.
                            PCCBRef.set("selectedItem", selectedItem.value);
                            $("[data-sc-id='VariantPriceCardsComboBox']").val(selectedItem.value);
                            self.setPageIsDirty(true);
                        },
                        focus: function (event, ui) {
                            var selectedItem = ui.item;
                            event.preventDefault();
                            $("#VariantPCComboBoxAutoComplete").val(selectedItem.label);
                        }
                    });
                    $("#VariantPCComboBoxAutoComplete").focus(function () {
                        $(this).autocomplete("search", $(this).val());
                    });

                    this.VariantPriceCardsComboBox.set("items", priceCardItems);

                    if (this.priceCardOnload) {
                        var selectedItem = null;
                        for (i = 0; i < priceCardItems.length; i++) {
                            if (priceCardItems[i].Name == this.priceCardOnload) {
                                selectedItem = priceCardItems[i];
                                this.VariantPriceCardsComboBox.set("selectedItem", selectedItem);
                                $("#VariantPCComboBoxAutoComplete").val(selectedItem.Name);
                                $("[data-sc-id='VariantPriceCardsComboBox']").val(selectedItem.Id)
                            }
                        }
                    }
                    if (selectedItem) {
                        var navigateUrl = "/sitecore/client/Applications/PricingPromotionsManager/Pages/All%20Books/Price%20Books/PageSettings/Price%20Book/PageSettings/Price%20Card?priceCardId=" + selectedItem.Id;
                        this.VariantPriceCardLink.set("navigateUrl", navigateUrl);
                        this.VariantPriceCardLink.set("text", "View Details");
                    } else {
                        // Need token to represent null/empty value as we cannot
                        // set the combo box selected value to null/empty.
                        this.VariantPriceCardLink.set("navigateUrl", "");
                        this.VariantPriceCardLink.set("text", "");
                        this.VariantPriceCardsComboBox.set("selectedValue", "noPriceCard");
                        $("#VariantPCComboBoxAutoComplete").val(noPriceCardDisplayText);
                    }
                }
            } else {
                if (priceCardItems) {
                    for (i = 0; i < priceCardItems.length; i++) {
                        if (priceCardItems[i].Id == this.priceCardOnload) {
                            this.VariantPriceCardText.set("text", priceCardItems[i]._displayname);
                            var navigateUrl = "/sitecore/client/Applications/PricingPromotionsManager/Pages/All%20Books/Price%20Books/PageSettings/Price%20Book/PageSettings/Price%20Card?pricingCardId=" + priceCardItems[i].Id;
                            this.VariantPriceCardText.set("navigateUrl", navigateUrl);
                            break;
                        }
                    }
                }
            }
        },

        selectedLanguageChange: function () {
            var currentPath = this.updateQueryStringParameter(window.location.href, "lang", this.Language.get("selectedValue"));
            try {
                window.location.href = currentPath;
            } catch (e) {
                // stay on page
            }
        },

        addLabelsToTabs: function () {
            $("li[data-tab-id=\\{917CC948-91C6-40B0-9813-FF3AA89C1DA2\\}] > a", this.tabStrip).append("<label style=\"display:inline\"></label>");
            $("li[data-tab-id=\\{CD3FF5FA-EA98-4965-91EE-2B7A400D0789\\}] > a", this.tabStrip).append("<label style=\"display:inline\"></label>");
            $("li[data-tab-id=\\{B8ED623C-9537-4CA4-89E4-669E03F8D233\\}] > a", this.tabStrip).append("<span class='badge'></span>");
        },

        variantPromotionsCountChanged: function () {
            var count = this.VariantPromotionsDataSource.get("totalItemCount") > 99 ? "99+" : this.VariantPromotionsDataSource.get("totalItemCount");
            $("li[data-tab-id=\\{B8ED623C-9537-4CA4-89E4-669E03F8D233\\}] > a > span", this.tabStrip).html(count);
        },

        saveVariant: function () {
            var id = this.get("targetId");
            if (id) {
                this.updateVariant();
            } else {
                this.createVariant();
            }
        },

        updateVariant: function () {
            this.hideHeaderActionsMessage();
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.updateSaveButton(false);
                this.updateTabsIndicators();
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();
            var baseFields = this.VariantBaseFields.get("editFunctionBody");
            baseFields.push(["Variant_Tags", "Variant_Tags", "Text"]);
            var currentLanguage = this.get("currentLanguage");

            var dataObject = {};
            if (!this.isAXEnabled) {
                this.addRendererFieldsToObject(dataObject, baseFields);
            }

            var extendedFields = this.ExtendedFieldsFormRenderer.get("editFunctionBody");
            this.addRendererFieldsToObject(dataObject, extendedFields);

            dataObject.variant_Images = this.CommerceImages.get("images");
            dataObject.currentLanguage = currentLanguage;
            dataObject.itemId = this.get("targetId");

            //For Concurrency Saving
            dataObject.lastModified = this.get("lastModified");
            dataObject.overrideChanges = this.get("overrideChanges");

            if (this.hasInventory && this.inventoryChanged) {
                dataObject.inventory = {};
                this.addInventoryBaseFieldsToPost(dataObject.inventory);
                extendedFields = this.InventorySkuFormRenderer.get("editFunctionBody");
                this.addRendererFieldsToObject(dataObject.inventory, extendedFields);
            }

            if (this.VariantPriceCardsComboBox) {
                var priceCard = $("[data-sc-id='VariantPriceCardsComboBox']").val();
                if (priceCard == "noPriceCard") {
                    dataObject.VariationPriceCardName = "";
                } else {
                    dataObject.VariationPriceCardName = $("#VariantPCComboBoxAutoComplete").val();
                    $("#variantPriceCard").val($("#VariantPCComboBoxAutoComplete").val());
                }
            }

            // Since we need to update the Manhattan cache, the environment must be supplied in request
            var currentEnvironment = this.EnvironmentsSwitcher.get("selectedItem");
            if (currentEnvironment && typeof currentEnvironment !== "undefined") {
                dataObject.Headers = "Environment:" + currentEnvironment.Name;
            }

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceVariant/Update",
                type: "POST",
                headers: this.ajaxToken,
                data: dataObject,
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {
                    var self = this;
                    if (data.Status == "failed") {
                        this.hideInProgressMessage();
                        var self = this;
                        //this.updateSaveButton(false);

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
                        this.hideInProgressMessage();
                        //For Concurrency Saving
                        this.ConcurrencyAlert.show();
                    } else {
                        this.hideInProgressMessage(true);
                        this.setPageIsDirty(false);
                        //For Concurrency Saving
                        this.set("overrideChanges", false);
                        setTimeout(function () { self.VariantPricingDataSource.refresh(); }, 3000);

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
            this.updateVariant();
            this.ConcurrencyAlert.hide();
        },

        createVariant: function () {
            this.hideHeaderActionsMessage();
            var invalidFieldNames = [];
            if (!this.validateRequiredFields(invalidFieldNames)) {
                this.updateSaveButton(false);
                this.updateTabsIndicators();
                this.showRequiredFieldsMessages(invalidFieldNames);
                this.InProgress.hide();
                return;
            }

            this.displayInProgressMessage();
            var baseFields = this.VariantBaseFields.get("editFunctionBody");
            baseFields.push(["Variant_Tags", "Variant_Tags", "Text"]);

            var currentLanguage = this.get("currentLanguage");

            var dataObject = {};
            this.addRendererFieldsToObject(dataObject, baseFields);

            var extendedFields = this.ExtendedFieldsFormRenderer.get("editFunctionBody");
            this.addRendererFieldsToObject(dataObject, extendedFields);

            dataObject.variant_Images = this.CommerceImages.get("images");
            dataObject.currentLanguage = currentLanguage;
            dataObject.templateId = this.get("templateId");
            dataObject.parentId = this.get("parentId");
            dataObject.name = this.Name.get("text") !== null ? this.Name.get("text").trim() : "";

            // Custom validation of Name
            if (!this.isNameValid(dataObject.name)) {
                return;
            }

            var self = this;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/CommerceVariant/Create",
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
                            this.HeaderActionsMessageBar.set("isVisible", true);
                            $("[data-sc-id='" + data.Errors[i].ControlId + "']").addClass("sc-validation");
                        }
                        $(".sc-validation").change(function () {
                            self.updateValidationError($(this));
                        });
                        $(".sc-validation.sc-datepicker").click(function () {
                            self.updateValidationError($(this));
                        });
                    } else {
                        this.hideInProgressMessageCreate(true, "Variant Created");
                        this.setPageIsDirty(false);
                        this.set("newTargetId", data);
                        setTimeout($.proxy(this.redirectToSavedVariant, this), 10000);
                    }
                }
            });
        },

        redirectToSavedVariant: function () {
            window.location.assign('/sitecore/client/Applications/MerchandisingManager/VariantDetail?target=' + this.get("newTargetId"));
        },

        selectedTabChanged: function () {
            this.set("selectedTab", this.VariantTab.get("selectedTab"));
            var selectedTabId = this.get("selectedTab");

            if (selectedTabId == "{917CC948-91C6-40B0-9813-FF3AA89C1DA2}") { // Details tab
                this.ProductInventoryBaseFields.set("isVisible", false);
                this.VariantActionControl.set("isVisible", true);
                this.InventoryActionControl.set("isVisible", false);
                this.InventorExtendedFieldsExpander.set("isVisible", false);
            } else if (selectedTabId == "{CD3FF5FA-EA98-4965-91EE-2B7A400D0789}") { // Inventory
                this.VariantActionControl.set("isVisible", false);
                this.InventoryActionControl.set("isVisible", true);
                this.ProductInventoryBaseFields.set("isVisible", true);
                this.InventorExtendedFieldsExpander.set("isVisible", true);
            }

        },

        updateValidationError: function (obj) {
            obj.removeClass("sc-validation");
            this.updateTabsIndicators();
            if ($(".sc-validation").length === 0) {
                this.updateSaveButton(true);
                this.hideHeaderActionsMessage();
            }
        },

        updateSaveButton: function (status) {
            this.VariantActionControl.getAction("Save").isEnabled(status);
            if (this.InventoryActionControl) {
                this.InventoryActionControl.getAction("Save").isEnabled(status);
            }
        },

        updateTabsIndicators: function () {
            var tabDetailsStatusElement = $("li[data-tab-id=\\{917CC948-91C6-40B0-9813-FF3AA89C1DA2\\}] > a > label", this.tabStrip);
            var tabInventoryStatusElement = $("li[data-tab-id=\\{CD3FF5FA-EA98-4965-91EE-2B7A400D0789\\}] > a > label", this.tabStrip);
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

        loadInventoryDetails: function (variantId) {
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
                    url: "/sitecore/shell/commerce/merchandising/CommerceVariant/GetInventoryDetailsForVariant",
                    type: "POST",
                    headers: this.ajaxToken,
                    data: {
                        id: variantId
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
        }
    });

    return VariantDetail;
});