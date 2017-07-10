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
                // Init
                this.defineProperty("Modules", new UIModule());
                this.defineProperty("IsDirty", false);
                this.defineProperty("EntityId", null);
                this.defineProperty("Version", null);

                this.Modules.App = this;
                this.OrderId = "";
                this.updatedHeader = false;
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
                        isMultiStep: eventArgs.isMultiStep,
                        confirmationCallback: function () {
                            self.ConfirmActionDialog.show();
                        }
                    };

                    self.Modules.beginAction(actionConfig);
                });

                $(document).on("productPickerOpened", function (e, eventArgs) {
                    // Give the Item Picker a reference to the form field
                    self.ItemPicker.FieldRendering = eventArgs.productFieldRendering;

                    // Open the product picker TODO: Alex to revisit how we position this
                    self.ItemPickerContainer.IsVisible = true;
                    $(self.ItemPickerContainer.el).css('top', $(e.target.activeElement).offset().top - 100);
                    $(self.ItemPickerContainer.el).css('left', $(e.target.activeElement).offset().left);
                });

                $(document).on("productPickerClosed", function () {
                    self.ItemPickerContainer.IsVisible = false;
                });

                $(document).on("environmentReady", $.proxy(this.environmentLoaded, this));
            },

            initialized: function () {
                var utils = new Utils();
                this.EntityId = utils.getQueryStringVariable("target");

                var self = this;
                // When the user closes the action dialog we reset the IsDirty
                this.DialogWindow.on("change:IsVisible", function () {
                    if (self.DialogWindow.IsVisible === false) {
                        self.IsDirty = false;
                    }
                });
                // Warn the user if they attempt to navigate away with unsaved changes
                window.onbeforeunload = function () {
                    if (self.IsDirty) {
                        // Actual string is ignored by most browsers - warning triggered by returning non-empty string.
                        return "You have unsaved changes.";
                    }
                };

                // Initialize the environment list
                utils.initializeEnvironmentList(this);
            },

            environmentLoaded: function () {
                // Set the Modules property when the environment is loaded
                this.Modules.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                this.Modules.Language = Sitecore.Speak.Context.current().cultureName;
                this.Modules.Currency = "";

                this.refresh();
            },
           
            renderGlobalActions: function (actions) {
                if (!actions || actions.length === 0) {
                    return;
                }

                // Clear any existing actions
                this.GlobalActionsControl.at(0).at(0).Items = [];

                var actionModels = this.Modules.createActionModels("", actions);
                for (var i = 0; i < actions.length; i++) {
                    var actionModel = actionModels[i];
                    this.GlobalActionsControl.at(0).at(0).add(actionModel);
                }
            },

            getSearchResults: function () {
                var searchTerm = this.SearchBox.Value;

                if (searchTerm) {
                    var utils = new Utils();
                    utils.navigateSearch(searchTerm);
                }
            },

            refresh: function () {
                this.getOrderMasterView(this.EntityId);
            },

            getOrderMasterView: function (id) {
                var self = this;
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                entityHelper.getMasterView(id, function (data) {
                    self.renderGlobalActions(data.Actions);
                    self.renderModulesInOrder(data.Views, 0);

                    var findViewHeader = -1;
                    for (var i = 0; i < data.Views.length; i++) {
                        if (data.Views[i].ViewName === "Summary") {
                            findViewHeader = i;
                            break;
                        }
                    }
                    if (findViewHeader != -1) {
                        var headerString = data.Views[i].Properties.OrderConfirmationId.Value;
                        if (self.updatedHeader === false) {
                            self.HeaderTitle.set("Text", self.HeaderTitle.get("Text") + " " + headerString);
                            self.updatedHeader = true;
                        }
                    }

                    self.Version = data.Version;
                    
                    $(document).prop('title', self.HeaderTitle.get("Text"));
                });
            },

            // Since the rendering of modules is asynchronous, we need to do something to ensure 
            // a consistent order for the modules
            renderModulesInOrder: function (views, index) {
                if (index == views.length) {
                    return;
                } else {
                    var self = this;
                    var view = views[index];
                    var targetApp;

                    if (view.ViewName == "Lines") {
                        targetApp = self.LineItemsApp;
                    } else {
                        targetApp = self.DetailsApp;
                    }

                    self.Modules.renderModule(
                        targetApp,
                        view.ViewName,
                        view.ViewDisplayName,
                        targetApp.el,
                        view.Actions,
                        view.ItemDefinition,
                        view.Items,
                        view.FormattedView,
                        view.IsParentChildRelationship,
                        function () {
                            self.renderModulesInOrder(views, index + 1);
                        });
                }
            },

            refreshPage: function () {
                this.IsDirty = false;
                location.reload(true);
            }
        };
    });

})(Sitecore.Speak);