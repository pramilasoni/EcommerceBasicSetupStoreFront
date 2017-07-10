//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {

    require.config({
        paths: {
            EntityHelper: "/sitecore/shell/client/Commerce/Assets/lib/EntityHelper",
            UIModule: "/sitecore/shell/client/Commerce/Assets/lib/UIModule",
            Utils: "/sitecore/shell/client/Commerce/Assets/lib/Utils"
        }
    });

    Speak.pageCode(["EntityHelper", "UIModule", "Utils"], function (EntityHelper, UIModule, Utils) {
        return {
            initialize: function () {
                this.defineProperty("Modules", new UIModule());
                this.on("ConfirmActionDialog:ButtonClick", $.proxy(this.Modules.confirmActionDialogButtonClicked, this.Modules));
                this.on("ConfirmClearCacheActionDialog:ButtonClick", this.confirmClearCacheActionDialogButtonClicked);

                var self = this;
                this.Modules.App = this;
                $(document).on("actionClicked", function (e, eventArgs) {

                    var actionConfig = {
                        app: self,
                        entityId: "",
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
                // Initialize the environment list
                var utils = new Utils();
                utils.initializeEnvironmentList(this);
            },

            environmentLoaded: function () {
                this.refresh();
            },

            refresh: function () {
                var targetElement = $(".sc-applicationContent-main")[0];
                var self = this;
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                entityHelper.getEntityView("PromotionBooks", "", "", function (data) {
                    self.Modules.renderModule(
                        self,
                        data.ViewName,
                        data.ViewDisplayName,
                        targetElement,
                        data.Actions,
                        data.ItemDefinition,
                        data.Items,
                        "",
                        data.IsParentChildRelationship,
                        function () { }
                    );
                });
            },

            clearCache: function () {
                var self = this;
                self.ConfirmClearCacheActionDialog.show();
            },

            confirmClearCacheActionDialogButtonClicked: function (eventArgs) {
                if (eventArgs[0] === "ok") {
                    this.Modules.clearEnvironmentCache(this.EnvironmentsSwitcher.SelectedItem.Name);
                }
            }
        };
    });

})(Sitecore.Speak);