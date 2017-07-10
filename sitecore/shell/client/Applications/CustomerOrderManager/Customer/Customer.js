//     Copyright (c) Sitecore Corporation 1999-2017
// jshint ignore: start
// TODO: remove jshint ignore when stubbed portions of code are implemented
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
                this.defineProperty("CurrentOrderInfo", null);
                this.on("change:CurrentOrderInfo", this.updateOrderPreview);
                this.defineProperty("CustomerId", null);
                this.defineProperty("Template", null);

                this.defineProperty("IsDirty", false);
                this.on("change:IsDirty", this.isDirtyChanged);

                this.defineProperty("Modules", new UIModule());
                this.defineProperty("EntityId", null);
                this.defineProperty("Version", null);

                this.Modules.App = this;

                var self = this;
                this.on("ConfirmActionDialog:ButtonClick", $.proxy(this.Modules.confirmActionDialogButtonClicked, this.Modules));
                $(document).on("actionClicked", function (e, eventArgs) {
                    var actionConfig = {
                        app: self,
                        entityId: "Entity-Customer-" + self.CustomerId,
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

                $(document).on("environmentReady", $.proxy(this.environmentLoaded, this));
            },

            initialized: function () {
                var utils = new Utils();
                this.CustomerId = utils.getQueryStringVariable("target");
                this.Template = utils.getQueryStringVariable("template");
                this.EntityId = "Entity-Customer-" + utils.getQueryStringVariable("target");

                var self = this;
                
                // When the user closes the action dialog we reset the IsDirty
                // TODO: When closing dialog with X, why does IsVisible remain set to true?! Is this something we added?
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

                this.getCustomerMasterView(this.CustomerId);
            },
            refresh: function () {
                this.getCustomerMasterView(this.CustomerId);
            },
            getCustomerMasterView: function (id) {
                var self = this;
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";
                if (id !== "") {
                    id = "Entity-Customer-" + id;
                    entityHelper.getMasterView(id, function (data) {
                        self.renderGlobalActions(data.Actions);
                        self.renderModulesInOrder(data.Views, 0);
                        self.Version = data.Version;

                        var findViewHeader = -1;
                        for (var i = 0; i < data.Views.length; i++) {
                            if (data.Views[i].ViewName === "Details") {
                                findViewHeader = i;
                                break;
                            }
                        }
                        var Header = self.HeaderTitle.Text;
                        if (findViewHeader != -1 && data.Views[i].Properties["GeneralInfo-first_name"].Value && data.Views[i].Properties["GeneralInfo-last_name"].Value && self.addedNameToTitle != true) {
                            

                            var headerString = Header + ": " + data.Views[i].Properties["GeneralInfo-first_name"].Value + " " + data.Views[i].Properties["GeneralInfo-last_name"].Value;
                            self.HeaderTitle.Text = headerString;
                            self.addedNameToTitle = true;
                        }

                    });
                }
                else {
                    var actionConfig = {
                        app: self,
                        entityId: "",
                        actionName: "AddCustomer",
                        requiresConfirmation: false,
                        entityView: "Details",
                        moduleContextName: "Customers",
                        isMultiStep: false,
                        confirmationCallback: function () {
                            self.ConfirmActionDialog.show();
                        }
                    };

                    this.Modules.beginAction(actionConfig);
                }
            },

            ordersTabLoaded: function (subApp) {
                var self = this;
                subApp.OrdersList.on("change:SelectedItem", function (rowModel) {
                    var orderInfo = rowModel ? { ItemId: rowModel.ItemId, OrderNumber: rowModel.OrderNumber } : null;
                    self.CurrentOrderInfo = orderInfo;
                });
            },

            updateOrderPreview: function (orderInfo) {
                if (orderInfo) {
                    this.OrdersApp.SelectedOrderItemTitle.Text = orderInfo.OrderNumber;
                    this.OrdersApp.OrderDetailsButton.IsEnabled = true;
                    var entityHelper = new EntityHelper();
                    entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                    entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                    entityHelper.Currency = "";

                    entityHelper.getOrder(orderInfo.OrderNumber, function (customer) {
                        // TODO: Load customer into form
                    });
                } else {
                    this.OrdersApp.SelectedOrderItemTitle.Text = null;
                    this.OrdersApp.OrderDetailsButton.IsEnabled = false;
                }
            },

            viewOrderDetailsClicked: function () {
                if (this.CurrentOrderInfo) {
                    window.location.href = "/sitecore/client/Applications/CustomerOrderManager/Order?target=" + this.CurrentOrderInfo.OrderNumber;
                }
            },

            getSearchResults: function () {
                var searchTerm = this.SearchBox.Value;

                if (searchTerm) {
                    var utils = new Utils();
                    utils.navigateSearch(searchTerm);
                }
            },

            save: function () {
                if (this.CustomerId) {
                    this.updateCustomer();
                } else {
                    this.createCustomer();
                }
            },

            updateCustomer: function () {
                if (!this.IsDirty) {
                    return;
                }

                var self = this;
                var updatedCustomerData = this.DetailsApp.CustomerDetailsForm.getFormData();
                updatedCustomerData.Id = this.CustomerId;
                updatedCustomerData.entityType = "Customer";
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                entityHelper.updateProfile(updatedCustomerData, function (responseData) {
                    self.SuccessMessage.IsVisible = true;
                    setTimeout(function () {
                        self.SuccessMessage.IsVisible = false;
                    }, 5000);
                    self.IsDirty = false;
                });
            },

            createCustomer: function () {
                var self = this;
                var newCustomerData = this.DetailsApp.CustomerDetailsForm.getFormData();
                newCustomerData.Template = this.Template;
                var entityHelper = new EntityHelper();
                entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                entityHelper.Currency = "";

                entityHelper.createProfile(newCustomerData, function (responseData) {
                    self.SuccessMessage.IsVisible = true;
                    setTimeout(function () {
                        self.SuccessMessage.IsVisible = false;
                        // TODO: Redirect to the customer detals page in edit mode using the customer id in responseData
                        // TODO: For now just redirect back to search page
                        ////window.location.href = "/sitecore/client/Applications/CustomerOrderManager/Customer?target=" + customerId + "&template=" + self.Template;
                        window.location.href = "/sitecore/client/Applications/CustomerOrderManager/Search";
                    }, 5000);
                    self.IsDirty = false;
                });
            },

            isDirtyChanged: function (isDirty) {
                //  We don't have a save button here, but we'll keep this function just in case.
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

                    targetApp = self.DetailsApp;
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
            }
        };
    });

})(Sitecore.Speak);