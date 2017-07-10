//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {

    require.config({
        paths: {
            EntityHelper: "/sitecore/shell/client/Commerce/Assets/lib/EntityHelper",
            Utils: "/sitecore/shell/client/Commerce/Assets/lib/Utils",
            UIModule: "/sitecore/shell/client/Commerce/Assets/lib/UIModule"
        }
    });

    Speak.pageCode(["EntityHelper", "Utils", "UIModule"], function (EntityHelper, Utils, UIModule) {
        return {
            initialize: function () {
                this.defineProperty("Modules", new UIModule());
                this.defineProperty("PendingActionName", null);
                this.defineProperty("PendingEntityView", null);
                this.defineProperty("CurrentModuleContextName", null);
                this.defineProperty("EntityId", null);
                this.defineProperty("SnapshotsView", null);
                this.defineProperty("Version", null);

                var utils = new Utils();
                this.EntityId = utils.getQueryStringVariable("priceCardId");

                this.Modules.App = this;

                var self = this;

                this.on("ConfirmActionDialog:ButtonClick", $.proxy(this.Modules.confirmActionDialogButtonClicked, this.Modules));
                $(document).on("actionClicked", function (e, eventArgs) {
                    var actionConfig = {
                        app: self,
                        entityId: self.EntityId,
                        actionName: eventArgs.actionName,
                        actionType: "Module",
                        requiresConfirmation: eventArgs.requiresConfirmation,
                        entityView: eventArgs.entityView,
                        moduleContextName: eventArgs.moduleContextName,
                        confirmationCallback: function () {
                            self.ConfirmActionDialog.show();
                        }
                    };

                    self.Modules.EnvironmentName = self.EnvironmentsSwitcher.SelectedItem.Name;
                    self.Modules.Language = Sitecore.Speak.Context.current().cultureName;
                    self.Modules.Currency = "";
                    self.Modules.beginAction(actionConfig);
                });

                $(document).on("snapshotListActionClicked", function (e, eventArgs) {
                    var actionConfig = {
                        app: self,
                        entityId: self.EntityId,
                        actionName: eventArgs.actionName,
                        actionType: "SnapshotList",
                        requiresConfirmation: eventArgs.requiresConfirmation,
                        entityView: eventArgs.entityView,
                        confirmationCallback: function () {
                            self.ConfirmActionDialog.show();
                        }
                    };

                    self.Modules.EnvironmentName = self.EnvironmentsSwitcher.SelectedItem.Name;
                    self.Modules.Language = Sitecore.Speak.Context.current().cultureName;
                    self.Modules.Currency = "";
                    self.Modules.beginAction(actionConfig);
                });

                $(document).on("snapshotActionClicked", function (e, eventArgs) {
                    var actionConfig = {
                        app: self,
                        entityId: self.EntityId,
                        actionName: eventArgs.actionName,
                        actionType: "Snapshot",
                        requiresConfirmation: eventArgs.requiresConfirmation,
                        entityView: eventArgs.entityView,
                        confirmationCallback: function () {
                            self.ConfirmActionDialog.show();
                        }
                    };

                    self.Modules.EnvironmentName = self.EnvironmentsSwitcher.SelectedItem.Name;
                    self.Modules.Language = Sitecore.Speak.Context.current().cultureName;
                    self.Modules.Currency = "";
                    self.beginSnapshotAction(actionConfig);
                });

                $(document).on("snapshotTagAdded", function (e, eventArgs) {
                    self.onSnapshotTagAdded(eventArgs.tagName, eventArgs.tagType);
                });


                $(document).on("snapshotTagEdited", function (e, eventArgs) {
                    self.onSnapshotTagEdited(eventArgs.tagName, eventArgs.oldTagName, eventArgs.tagType);
                });

                $(document).on("snapshotTagDeleted", function (e, eventArgs) {
                    self.onSnapshotTagDeleted(eventArgs.tagName, eventArgs.tagType);
                });

                $(document).on("environmentReady", $.proxy(this.environmentLoaded, this));
            },

            initialized: function () {
                // Initialize the environment list
                var utils = new Utils();
                utils.initializeEnvironmentList(this);
            },

            environmentLoaded: function () {
                this.PricingCardTabControl.on("loaded:Snapshots", $.proxy(this.snapshotsTabLoaded, this));
                this.PricingCardTabControl.on("loaded:Details", $.proxy(this.detailsTabLoaded, this));

                this.setBreadcrumbsParameters();
                if (this.DetailsApp) {
                    this.detailsTabLoaded();
                }

                if(this.SnapshotsApp)
                {
                    this.snapshotsTabLoaded();
                }
            },

            detailsTabLoaded: function () {
                this.getCardDetails();
            },

            snapshotsTabLoaded: function () {
                var targetElement = this.SnapshotsApp.el;

                // Get the snapshots view data
                var id = this.EntityId;
                var self = this;
                this.getPricingCardSnapshots(id, function (snapshotsView) {
                    // Render the snapshots
                    self.Modules.renderSnapshots(self.SnapshotsApp, snapshotsView);
                    self.Version = snapshotsView.Version;
                });
            },

            refresh: function () {
                var id = this.EntityId;
                var self = this;
                this.getPricingCardSnapshots(id, function (snapshotsView) {
                    // Render the snapshots
                    self.Modules.renderSnapshots(self.SnapshotsApp, snapshotsView);
                    self.Version = snapshotsView.Version;
                });

                this.getCardDetails();
            },

            getPricingCardSnapshots: function (pricingCardId, onSuccess) {
                var payload = { pricingCardId: pricingCardId };
                var url = "/sitecore/shell/commerce/tools/CommerceEntity/GetPricingCardSnapshotsView";

                var utils = new Utils();
                utils.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                utils.Language = Sitecore.Speak.Context.current().cultureName;
                utils.Currency = "";

                $.ajax({
                    url: url,
                    type: "POST",
                    headers: utils.getDefaultRequestHeaders(),
                    context: this,
                    data: payload,
                    success: function (data) {
                        if (typeof (onSuccess) == "function") {
                            onSuccess(data);
                        }
                    }
                });
            },

            getCardDetails: function () {
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                var entityId = this.EntityId;
                var targetApp = this.DetailsApp;
                var targetElement = this.DetailsApp.CardBorder.el;
                var self = this;

                entityHelper.getMasterView(entityId, function (data) {
                    var view = data.Views[0];
                    self.Version = data.Version;
                    self.Modules.renderModule(
                        targetApp,
                        view.ViewName,
                        view.ViewDisplayName,
                        targetElement,
                        view.Actions,
                        view.ItemDefinition,
                        view.Items,
                        view.FormattedView,
                        view.IsParentChildRelationship,
                        null);
                    var findViewHeader = -1;
                    for (var i = 0; i < data.Views.length; i++)
                    {
                        if (data.Views[i].ViewName === "Details" )
                        {
                            findViewHeader = i;
                            break;
                        }
                    }
                    if (findViewHeader != -1) {
                        var headerString = data.Views[i].Properties.Name.Value;
                        self.HeaderTitle.set("text", headerString);
                    }
                });
            },

            onSnapshotTagAdded: function (tagName, tagType) {
                var entityId = this.EntityId;
                var currentSnapshot = this.Modules.getCurrentSnapshot();
                var itemId = currentSnapshot.Properties.ItemId.Value;
                var name = tagName;
                var self = this;
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                var addTagActionView = entityHelper.getActionView("AddPriceTag", "PriceTagDetails", entityId, itemId, function (actionView) {
                    entityHelper.setEntityViewPropertyValue(actionView, "Name", tagName);
                    entityHelper.setEntityViewPropertyValue(actionView, "Excluded", tagType == "Exclude");

                    // TODO: Handle errors
                    entityHelper.invokeAction("AddPriceTag", actionView, function (response) {
                        if (response.ResponseCode == "Ok") {
                            // Update the client side representation
                            var tags = tagType == "Exclude" ? currentSnapshot.ExcludeTags : currentSnapshot.IncludeTags;
                            var newClientSideTag = { Name: tagName, Excluded: tagType == "Exclude" };
                            tags.push(newClientSideTag);
                            // Update the client side representation
                            self.Version = (parseInt(self.Version) + 1).toString();
                        }
                    });
                });
            },

            onSnapshotTagEdited: function (tagName, oldTagName, tagType) {
                var entityId = this.EntityId;
                var currentSnapshot = this.Modules.getCurrentSnapshot();
                var itemId = currentSnapshot.Properties.ItemId.Value;
                var name = tagName;
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                var addTagActionView = entityHelper.getActionView("AddPriceTag", "PriceTagDetails", entityId, itemId, function (actionView) {
                    entityHelper.setEntityViewPropertyValue(actionView, "Name", tagName);
                    entityHelper.setEntityViewPropertyValue(actionView, "Excluded", tagType == "Exclude");
                    var version = entityHelper.getEntityViewPropertyValue(actionView, "Version");
                    entityHelper.invokeAction("AddPriceTag", actionView, function (response) {
                        if (response.ResponseCode == "Ok") {
                            // Update the client side representation
                            var tags = tagType == "Exclude" ? currentSnapshot.ExcludeTags : currentSnapshot.IncludeTags;
                            var newClientSideTag = { Name: tagName, Excluded: tagType == "Exclude" };
                            tags.push(newClientSideTag);

                            // Now do a remove of the old tag
                            itemId = currentSnapshot.Properties.ItemId.Value + "|" + oldTagName;
                            var deleteTagEntityView = entityHelper.buildEntityView(entityId, "RemovePriceTag", itemId, parseInt(version) + 1);
                            entityHelper.invokeAction("RemovePriceTag", deleteTagEntityView, function (response) {
                                if (response.ResponseCode == "Ok") {
                                    // Update the client side representation
                                    var tags = tagType == "Exclude" ? currentSnapshot.ExcludeTags : currentSnapshot.IncludeTags;
                                    for (var i = 0; i < tags.length; i++) {
                                        if (tags[i].Name == tagName) {
                                            tags.splice(i, 1);
                                            break;
                                        }
                                    }
                                }
                            });
                        }
                    });
                });
            },

            onSnapshotTagDeleted: function (tagName, tagType) {
                var entityId = this.EntityId;
                var currentSnapshot = this.Modules.getCurrentSnapshot();
                var itemId = currentSnapshot.Properties.ItemId.Value + "|" + tagName;
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                var version = this.Version;
                var deleteTagEntityView = entityHelper.buildEntityView(entityId, "RemovePriceTag", itemId, version);
                var self = this;
                entityHelper.invokeAction("RemovePriceTag", deleteTagEntityView, function (response) {
                    if (response.ResponseCode == "Ok") {
                        // Update the client side representation
                        self.Version = (parseInt(version) + 1).toString();
                        var tags = tagType == "Exclude" ? currentSnapshot.ExcludeTags : currentSnapshot.IncludeTags;
                        for (var i = 0; i < tags.length; i++) {
                            if (tags[i].Name == tagName) {
                                tags.splice(i, 1);
                                break;
                            }
                        }
                    }
                });
            },

            onActionDialogOK: function () {
                var entityView = this.Modules.updateEntityViewFromForm();
                this.Modules.invokeAction(null, null, entityView);
                this.DialogWindow.hide();
                this.DialogWindow.IsVisible = false;
            },

            onActionDialogCancel: function () {
                this.DialogWindow.hide();
                this.DialogWindow.IsVisible = false;
            },

            confirmActionDialogButtonClicked: function (eventArgs) {
                if (eventArgs[0] === "ok") {
                    this.invokeSnapshotListAction(this.PendingActionName);
                }
            },

            beginSnapshotAction: function (actionConfig) {
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                if (actionConfig.actionName == "AddCurrency" || actionConfig.actionName == "EditCurrency") {

                    var self = this;
                    var entityId = this.EntityId;
                    var itemId = this.Modules.CurrentSnapshotId;

                    self.PriceTiersEditor.reset();

                    if (actionConfig.actionName == "EditCurrency") {
                        itemId = this.Modules.getCurrentSnapshotSelectedCurrencyItemId();
                    }

                    entityHelper.getActionView(actionConfig.actionName, actionConfig.entityView, entityId, itemId, function (data) {
                        // Get the currency and price-tiers and load them into the custom editor
                        var editorDataModel = {};
                        var priceTiers = [];
                        for (var i = 0; i < data.Properties.length; i++) {
                            var property = data.Properties[i];
                            if (property.Name === "Currency") {
                                editorDataModel.Currency = property.Value;
                                editorDataModel.AvailableCurrencies = [];
                                // Get the available selections for currency
                                if (property.Policies && property.Policies.length > 0) {
                                    for (var j = 0; j < property.Policies.length; j++) {
                                        if (property.Policies[j].List) {
                                            var availableCurrencies = property.Policies[j].List;
                                            for (var k = 0; k < availableCurrencies.length; k++) {
                                                var selection = {
                                                    DisplayName: availableCurrencies[k].DisplayName,
                                                    Name: availableCurrencies[k].Name
                                                };

                                                editorDataModel.AvailableCurrencies.push(selection);
                                            }

                                            break;
                                        }
                                    }
                                }
                            }

                            if (!isNaN(property.Name.charAt(0))) {
                                var tier = {
                                    Quantity: property.Name,
                                    Price: property.Value
                                };

                                priceTiers.push(tier);
                            }
                        }

                        editorDataModel.PriceTiers = priceTiers;
                        self.PriceTiersEditor.setDataModel(editorDataModel);
                        self.PendingEntityView = data;
                        self.CurrencyRowDialogWindow.$el.css("top", "50%");//"calc( 25% + " + $(".snapshots_scroll").scrollTop() + "px)");
                        self.CurrencyRowDialogWindow.show();
                        $("#PriceTiersCurrencySelect").focus()
                    });
                } else {
                    // Only handle Add/Edit currency as special cases, sincey they require a custom editor.
                    this.Modules.beginAction(actionConfig);
                }
            },

            onCurrencyRowOKClicked: function () {
                var self = this;

                if (this.PriceTiersEditor.hasErrors()) {
                    return;
                }

                var currencyRowModel = this.PriceTiersEditor.getDataModel();
                var entityView = this.PendingEntityView;

                // Update the entity view with the data in the editor.
                for (var i = 0; i < entityView.Properties.length; i++) {
                    var property = entityView.Properties[i];
                    if (property.Name === "Currency") {
                        property.Value = currencyRowModel.Currency;
                        break;
                    }
                }

                for (var i = 0; i < currencyRowModel.PriceTiers.length; i++) {
                    var tier = currencyRowModel.PriceTiers[i];
                    var tierFound = false;
                    for (var j = 0; j < entityView.Properties.length; j++) {
                        var property = entityView.Properties[j];
                        if (tier.Quantity === property.Name) {
                            property.Value = tier.Price;
                            tierFound = true;
                            break;
                        }
                    }

                    if (!tierFound) {
                        // Needs to be added
                        var property = this.getPropertyTemplate();
                        property.Name = tier.Quantity;
                        property.Value = tier.Price;
                        entityView.Properties.push(property);
                    }
                }

                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                entityHelper.invokeAction("", entityView, function (response) {
                    if (response.ResponseCode == "Ok") {
                        self.SuccessMessage.IsVisible = true;
                        setTimeout(function () {
                            self.SuccessMessage.IsVisible = false;
                        }, 5000);

                        self.refresh();
                    } else {
                        for (var i = 0; i < response.Errors.length; i++) {
                            self.ErrorMessage.add({ Text: response.Errors[i].MessageText, Type: "Error" });
                        }

                        self.ErrorMessage.IsVisible = true;
                        setTimeout(function () { self.ErrorMessage.IsVisible = false; }, 10000);
                    }

                    self.CurrencyRowDialogWindow.hide();
                    self.CurrencyRowDialogWindow.IsVisible = false;
                });
            },

            onCurrencyRowCancelClicked: function () {
                this.CurrencyRowDialogWindow.hide();
                this.CurrencyRowDialogWindow.IsVisible = false;
            },

            getPropertyTemplate: function () {
                return {
                    "Name": "1.0",
                    "Policies": [],
                    "DisplayName": "1.0",
                    "Value": null,
                    "IsHidden": false,
                    "OriginalType": null,
                    "IsReadOnly": false,
                    "UiType": ""
                };
            },

            setBreadcrumbsParameters: function () {
                var url = document.location.href;
                var bookId = this.EntityId.replace("Entity-PriceCard-", "").split('-')[0];
                var bookUrl = $("div[data-sc-id=Breadcrumb] ul li:nth-child(2) a").attr("href").replace(".aspx", "") + "?priceBookId=Entity-PriceBook-" + bookId;
                $("div[data-sc-id=Breadcrumb] ul li:last-child a").attr("href", url);
                $("div[data-sc-id=Breadcrumb] ul li:nth-child(2) a").attr("href", bookUrl);
            }
        };
    });

})(Sitecore.Speak);