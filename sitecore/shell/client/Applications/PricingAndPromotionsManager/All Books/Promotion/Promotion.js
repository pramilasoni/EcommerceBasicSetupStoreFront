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
                this.defineProperty("Version", null);
                this.defineProperty("PromotionBookId", null);
                this.defineProperty("AssociatedCatalogs", null);
                this.defineProperty("CacheGuid", null);

                var utils = new Utils();
                this.EntityId = utils.getQueryStringVariable("promotionId");

                this.Modules.App = this;

                this.updatedHeaderd = false;

                var self = this;

                $(document).on("productPickerOpened", $.proxy(this.productPickerOpen, this));
                $(document).on("productPickerClosed", $.proxy(this.productPickerClose, this));

                this.on("ConfirmActionDialog:ButtonClick", $.proxy(this.Modules.confirmActionDialogButtonClicked, this.Modules));
                $(document).on("actionClicked", function (e, eventArgs) {
                    var actionConfig = {
                        app: self,
                        entityId: self.EntityId,
                        actionName: eventArgs.actionName,
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

                $(document).on("environmentReady", $.proxy(this.environmentLoaded, this));
            },

            initialized: function () {
                var utils = new Utils();
                // Initialize the environment list
                utils.initializeEnvironmentList(this);
            },

            productPickerOpen: function (e, object) {
                this.OverlayPanel1.set("IsOpen", true);
                this.ItemPicker.AllowSelectProductFamily = true;
                this.ItemPicker.SelectProductFamilyCheckBox.IsChecked = false;
                this.ItemPicker.VariantsListBox.IsEnabled = true;
                this.ItemPicker.FieldRendering = object.productFieldRendering;
            },

            productPickerClose: function () {
                this.OverlayPanel1.set("IsOpen", false);
            },

            environmentLoaded: function () {
                this.setBreadcrumbsParameters();
                this.refresh();
            },
                        
            refresh: function () {
                var self = this;
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                if (self.CacheGuid) {
                    // Get the cached coupon codes
                    document.location = '/sitecore/shell/commerce/tools/PricingPromotionsCache/GetCachedPrivateCoupons?cacheGuid=' + self.CacheGuid;
                }

                entityHelper.getMasterView(this.EntityId, function (data) {
                    self.Modules.renderModulesInOrder(self, data.Views, 0);
                    self.Version = data.Version;
                    for (var i = 0; i < data.Views.length; i++) {
                        if (data.Views[i].ViewName === "Details") {
                            findViewHeader = i;
                            break;
                        }
                    }
                    if (findViewHeader != -1) {
                        if (self.updatedHeader == false) {
                            var headerString = data.Views[i].Properties.DisplayName.Value;
                            var promoHeader = self.HeaderTitle.get("Text");
                            self.HeaderTitle.set("Text", promoHeader + " " + headerString);
                            self.updatedHeader = true;
                        }
                    }


                });

                if (!this.AssociatedCatalogs) {
                    entityHelper.getEntityView("PromotionBookCatalogs", this.PromotionBookId, null, function (data) {
                        self.AssociatedCatalogs = [];
                        var catalogExclusions = "";
                        if (data.Items && data.Items.length > 0) {
                            for (var i = 0; i < data.Items.length; i++) {
                                var catalog = data.Items[i];
                                if (catalog.IsAssociated === "False") {
                                    self.AssociatedCatalogs.push(catalog.CatalogName);
                                    catalogExclusions += catalog.CatalogName + "|";
                                }
                            }

                            if (catalogExclusions.length > 0) {
                                catalogExclusions = catalogExclusions.substring(0, catalogExclusions.length - 1);
                            }

                            self.ItemPicker.ItemPickerDataSource.Exclusions = catalogExclusions;
                        }
                    });
                }
            },

            setBreadcrumbsParameters: function () {
                var url = document.location.href;
                var bookId = this.EntityId.replace("Entity-Promotion-", "").split('-')[0];
                var bookUrl = $("div[data-sc-id=Breadcrumb] ul li:nth-child(2) a").attr("href").replace(".aspx", "") + "?promotionBookId=Entity-PromotionBook-" + bookId;
                $("div[data-sc-id=Breadcrumb] ul li:last-child a").attr("href", url);
                $("div[data-sc-id=Breadcrumb] ul li:nth-child(2) a").attr("href", bookUrl);

                this.PromotionBookId = "Entity-PromotionBook-" + bookId;
            }
        };
    });

})(Sitecore.Speak);