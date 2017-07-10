//     Copyright (c) Sitecore Corporation 1999-2017
// jshint ignore: start
// TODO: remove jshint ignore when stubbed portions of code are implemented
(function (Speak) {

    require.config({
        paths: {
            EntityHelper: "/sitecore/shell/client/Commerce/Assets/lib/EntityHelper",
            Utils: "/sitecore/shell/client/Commerce/Assets/lib/Utils"
        }
    });

    Speak.pageCode(["EntityHelper", "Utils"], function (EntityHelper, Utils) {
        var utils = new Utils();

        return {
            initialize: function () {
                // Init
                this.defineProperty("CurrentCustomerInfo", null);
                this.on("change:CurrentCustomerInfo", this.updateCustomerPreview);

                this.defineProperty("CurrentOrderInfo", null);
                this.on("change:CurrentOrderInfo", this.updateOrderPreview);

                var searchTerm = utils.getQueryStringVariable("searchTerm");
                this.defineProperty("SearchTerm", searchTerm);

                this.on("ConfirmDeleteCustomer:ButtonClick", this.confirmDeleteButtonClicked);

                $(document).on("environmentReady", $.proxy(this.environmentLoaded, this));
            },

            initialized: function () {
                // Add eventlisteners
                this.SearchTabControl.on("loaded:Customers", $.proxy(this.customersTabLoaded, this));
                this.SearchTabControl.on("loaded:Orders", $.proxy(this.ordersTabLoaded, this));

                if (this.SearchTerm) {
                    this.SearchBox.Value = this.SearchTerm;
                }

                // Initialize the environment list
                utils.initializeEnvironmentList(this);
            },

            environmentLoaded: function () {
                utils.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                utils.Language = Sitecore.Speak.Context.current().cultureName;
                utils.Currency = "";
                this.refresh();
            },

            refresh: function () {
                // Refresh the data sources for the Orders and Customers apps once the environment is loaded
                if (this.OrdersApp !== undefined) {
                    this.getOrdersData(this.OrdersApp);
                }

                if (this.CustomersApp !== undefined) {
                    this.getCustomersData(this.CustomersApp);
                }
            },

            customersTabLoaded: function (subApp) {
                this.getCustomersData(subApp);
                var self = this;
                subApp.CustomersList.on("change:SelectedItem", function (rowModel) {
                    var customerInfo = rowModel ? { ItemId: rowModel.Id, DisplayName: rowModel.DisplayName, Template: rowModel.Template } : null;
                    self.CurrentCustomerInfo = customerInfo;
                });
            },

            ordersTabLoaded: function (subApp) {
                this.getOrdersData(subApp);
                var self = this;
                subApp.OrdersList.on("change:SelectedItem", function (rowModel) {
                    var orderInfo = rowModel ? { OrderId: rowModel.orderid, OrderConfirmationId: rowModel.orderconfirmationid } : null;
                    self.CurrentOrderInfo = orderInfo;
                });
            },

            getOrdersData: function (subApp) {
                // Only get the data when the environment has been loaded
                if (!utils.EnvironmentListReady) {
                    return;
                }

                // Setup all events for renderings in the orders tab
                var self = this;
                subApp.OrderDataSource.IsReady = true;
                subApp.OrderDataSource.setQueryCompletedCallback($.proxy(this.updateOrderPagingElements, this));
                subApp.OrderDataSource.Headers = "Environment:" + this.EnvironmentsSwitcher.SelectedItem.ArtifactStoreId;
                subApp.OrderDataSource.Language = Sitecore.Speak.Context.current().cultureName;
                subApp.OrderDataSource.Currency = "";
                subApp.OrderDataSource.SearchTerm = this.SearchTerm;
            },

            getCustomersData: function (subApp) {
                // Only get the data when the environment has been loaded
                if (!utils.EnvironmentListReady) {
                    return;
                }

                // Setup all events for renderings in the customers tab
                var self = this;
                subApp.CustomerDataSource.IsReady = true;
                subApp.CustomerDataSource.setQueryCompletedCallback($.proxy(this.updateCustomerPagingElements, this));
                subApp.CustomerDataSource.SearchTerm = this.SearchTerm;
                subApp.CustomerDataSource.Headers = "Environment:" + this.EnvironmentsSwitcher.SelectedItem.Name;
                subApp.CustomerDataSource.Language = Sitecore.Speak.Context.current().cultureName;
                subApp.CustomerDataSource.Currency = "";
            },

            updateCustomerPreview: function (customerInfo) {
                if (customerInfo) {
                    this.CustomersApp.SelectedCustomerItemTitle.Text = customerInfo.DisplayName;
                    this.CustomersApp.CustomerDetailsButton.IsEnabled = true;
                    this.getCustomerPreviewPaneContents(customerInfo.ItemId, customerInfo.Template);
                } else {
                    this.CustomersApp.SelectedCustomerItemTitle.Text = null;
                    this.CustomersApp.CustomerDetailsButton.IsEnabled = false;
                    this.clearCustomerPreviewPane();
                }
            },

            updateOrderPreview: function (orderInfo) {
                if (orderInfo) {
                    this.OrdersApp.SelectedOrderItemTitle.Text = orderInfo.OrderConfirmationId;
                    this.OrdersApp.OrderDetailsButton.IsEnabled = true;

                    var self = this;
                    this.getOrderPreviewPaneContents(orderInfo.OrderId);
                } else {
                    this.OrdersApp.SelectedOrderItemTitle.Text = null;
                    this.OrdersApp.OrderDetailsButton.IsEnabled = false;
                    $(this.OrdersApp.PreviewPanel.el).html("");
                }
            },

            viewCustomerDetailsClicked: function () {
                if (this.CurrentCustomerInfo) {
                    window.location.href = "/sitecore/client/Applications/CustomerOrderManager/Customer?target=" + this.CurrentCustomerInfo.ItemId + "&template=" + this.CurrentCustomerInfo.Template;
                }
            },

            viewOrderDetailsClicked: function () {
                if (this.CurrentOrderInfo) {
                    window.location.href = "/sitecore/client/Applications/CustomerOrderManager/Order?target=" + this.CurrentOrderInfo.OrderId;
                }
            },

            getCustomerPreviewPaneContents: function (id, template) {
                var previewPanel = this.CustomersApp.PreviewPanel.el;
                $(previewPanel).css("background-image", "url('/sitecore/shell/client/Speak/Assets/img/Speak/ProgressIndicator/sc-spinner32.gif')");
                $(previewPanel).css("background-position", "center center");
                $(previewPanel).css("background-repeat", "no-repeat");
                $(previewPanel).css("background-color", "#ebebeb");

                $.ajax({
                    url: "/sitecore/shell/commerce/tools/Profile/GetProfilePreview",
                    type: "POST",
                    headers: utils.getDefaultRequestHeaders(),
                    data: { id: id, entityType: "Customer" },
                    context: this,
                    success: function (data) {
                        $(previewPanel).css("background-image", "none");
                        $(previewPanel).css("background-color", "#fffff");
                        $(previewPanel).html(data)
                    }
                });
            },

            getOrderPreviewPaneContents: function (id) {
                var url = "/sitecore/shell/commerce/tools/Order/GetOrderPreview";
                var previewPanel = this.OrdersApp.PreviewPanel.el;
                $(previewPanel).css("background-image", "url('/sitecore/shell/client/Speak/Assets/img/Speak/ProgressIndicator/sc-spinner32.gif')");
                $(previewPanel).css("background-position", "center center");
                $(previewPanel).css("background-repeat", "no-repeat");
                $(previewPanel).css("background-color", "#ebebeb");

                $.ajax({
                    url: url,
                    type: "POST",
                    headers: utils.getDefaultRequestHeaders(),
                    context: this,
                    data: { id: id },
                    success: function (data) {
                        $(previewPanel).css("background-image", "none");
                        $(previewPanel).css("background-color", "#fffff");
                        $(previewPanel).html(data);
                    }
                });
            },

            clearCustomerPreviewPane: function () {
                var previewPanel = this.CustomersApp.PreviewPanel.el;
                $(previewPanel).html("");
            },

            clearOrderPreviewPane: function () {
                var previewPanel = this.OrdersApp.PreviewPanel.el;
                $(previewPanel).html("");
            },

            getSearchResults: function () {
                var searchTerm = this.SearchBox.Value;
                this.CustomersApp.CustomerDataSource.SearchTerm = searchTerm;
                this.OrdersApp.OrderDataSource.SearchTerm = searchTerm;
            },

            addCustomerClicked: function () {
                var self = this;
                $.ajax({
                    url: "/sitecore/shell/commerce/tools/Profile/GetEntityTemplates",
                    type: "POST",
                    headers: utils.getDefaultRequestHeaders(),
                    context: this,
                    data: { entityType: "Customer" },
                    success: function (data) {
                        self.CustomerTemplatesList.DynamicData = data;
                        self.CustomerTemplatesDialog.show();
                    }
                });
            },

            deleteCustomerClicked: function () {
                this.ConfirmDeleteCustomer.show();
            },

            templatesOKClicked: function () {
                var templateItem = this.CustomerTemplatesList.SelectedItem;
                if (templateItem) {
                    var templateName = templateItem.TemplateName;
                    window.location.href = "/sitecore/client/Applications/CustomerOrderManager/Customer?template=" + templateName;
                }
            },

            templatesCancelClicked: function () {
                this.CustomerTemplatesDialog.hide();
            },

            confirmDeleteButtonClicked: function (eventArgs) {
                if (eventArgs[0] === "ok") {
                    var self = this;
                    var selectedCustomer = this.CustomersApp.CustomersList.SelectedItem;
                    if (!selectedCustomer) {
                        return;
                    }

                    var entityHelper = new EntityHelper();
                    entityHelper.EnvironmentName = this.EnvironmentsSwitcher.SelectedItem.Name;
                    entityHelper.Language = Sitecore.Speak.Context.current().cultureName;
                    entityHelper.Currency = "";

                    entityHelper.deleteProfile(selectedCustomer.ItemId, "Customer", function () {
                        // Refresh the list
                        self.CustomersApp.CustomerDataSource.refresh();
                    });
                }
            },

            moreOrdersResultsClicked: function () {
                this.OrdersApp.OrderDataSource.next();
            },

            moreCustomersResultsClicked: function () {
                this.CustomersApp.CustomerDataSource.next();
            },

            updateOrderPagingElements: function () {
                this.OrdersApp.MoreResultsButton.IsEnabled = this.OrdersApp.OrderDataSource.HasMoreItems;
                $(".sc-associated-listpage").hide();
            },

            updateCustomerPagingElements: function () {
                $(".sc-associated-listpage").hide();
                this.CustomersApp.MoreResultsButton.IsEnabled = this.CustomersApp.CustomerDataSource.HasMoreItems;
            }
        };
    });

})(Sitecore.Speak);