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

                this.Modules.App = this;

                var self = this;
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
                this.EntityId = utils.getQueryStringVariable("priceBookId");
                // Initialize the environment list
                utils.initializeEnvironmentList(this);
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

                entityHelper.getMasterView(this.EntityId, function (data) {
                    //TODO: self.renderGlobalActions(data.Actions);
                    self.Modules.renderModulesInOrder(self, data.Views, 0);
                    self.Version = data.Version;
                    var findViewHeader = -1;
                    for (var i = 0; i < data.Views.length; i++) {
                        if (data.Views[i].ViewName === "Details") {
                            findViewHeader = i;
                            break;
                        }
                    }
                    if (findViewHeader != -1) {
                        var headerString = data.Views[i].Properties.DisplayName.Value + " (" + data.Views[i].Properties.Name.Value + ")";
                        self.HeaderTitle.set("text", headerString);
                    }
                });
            },

            setBreadcrumbsParameters: function () {
                var url = document.location.href;
                $("div[data-sc-id=Breadcrumb] ul li:last-child a").attr("href", url);
            }

        };
    });
})(Sitecore.Speak);