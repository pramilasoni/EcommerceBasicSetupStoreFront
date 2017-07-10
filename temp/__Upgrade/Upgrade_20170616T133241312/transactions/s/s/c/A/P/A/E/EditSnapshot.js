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

                this.Modules.App = this;

                var self = this;
                this.on("ConfirmActionDialog:ButtonClick", $.proxy(this.Modules.confirmActionDialogButtonClicked, this.Modules));

                // TODO: Note that whatever strategy we use to navigate from modules must be able to support multiple paramters
                var utils = new Utils();
                this.EntityId = utils.getQueryStringVariable("priceCardId");
                this.SnapshotId = utils.getQueryStringVariable("snapshotId");

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
            },

            initialized: function () {
                // Initialize the environment list
                utils.initializeEnvironmentList(this);
                // Wait for the environment list to be loaded
                addEventListener("environmentReady", this.environmentLoaded.bind(this), false);
            },

            environmentLoaded: function () {
                
                var self = this;
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                entityHelper.getEntityView("PriceSnapshotTags", this.EntityId, this.SnapshotId, function (data) {
                    self.SnapshotTagEditor.Items = data.Items;
                });

                entityHelper.getEntityView("PriceSnapshotTiers", this.EntityId, this.SnapshotId, function (data) {
                    self.Modules.renderModule(
                        self,
                        "PriceSnapshotTiers",
                        self.el,
                        data.Actions,
                        data.ItemDefinition,
                        data.Items,
                        "",
                        data.IsParentChildRelationship,
                        function () { }
                    );
                });
            }
        };
    });

})(Sitecore.Speak);