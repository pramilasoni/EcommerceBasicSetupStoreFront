//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore"], function (Sitecore) {
    var WorkspaceHelper = Sitecore.Definitions.Models.Model.extend({
        getItems: function (callback, itemType, workspaceName, controlFolder, language) {
            var requestToken = this.get("requestToken");
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/GetItems",
                type: "POST",
                headers: requestToken,
                data: {
                    itemType: itemType,
                    workspaceName: workspaceName,
                    controlFolder: controlFolder,
                    language: language
                },
                context: this,
                success: function (data) {
                    if (typeof (callback) == "function") {
                        callback(data);
                    }
                }
            });
        },

        getVariants: function (callback, item, workspaceName, controlFolder, language) {
            var requestToken = this.get("requestToken");
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/GetVariantsForProduct",
                type: "POST",
                headers: requestToken,
                data: {
                    id: item.itemId,
                    workspaceName: workspaceName,
                    controlFolder: controlFolder,
                    language: language
                },
                context: this,
                success: function (data) {
                    if (typeof (callback) == "function") {
                        callback(data, item);
                    }
                }
            });
        },

        getRelationships: function (callback, item, workspaceName, entityType, controlFolder, language) {
            var requestToken = this.get("requestToken");
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/GetRelationships",
                type: "POST",
                headers: requestToken,
                data: {
                    id: item.itemId,
                    workspaceName: workspaceName,
                    entityType: entityType,
                    controlFolder: controlFolder,
                    language: language
                },
                context: this,
                success: function (data) {
                    if (typeof (callback) == "function") {
                        callback(data, item);
                    }
                }
            });
        },

        getCount: function (callback) {
            var requestToken = this.get("requestToken");
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/GetTotalCount",
                type: "POST",
                headers: requestToken,
                context: this,
                success: function (data) {
                    if (typeof (callback) == "function") {
                        callback(data);
                    }
                }
            });
        },

        addItems: function (items, callback) {
            var delimitedList = this.buildDelimitedList(items);
            var requestToken = this.get("requestToken");
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/AddItems",
                type: "POST",
                headers: requestToken,
                data: {
                    items: delimitedList
                },
                context: this,
                success: function (data) {
                    if (typeof (callback) == "function") {
                        callback(data);
                    }
                }
            });
        },

        removeItems: function (items, callback) {
            var delimitedList = this.buildDelimitedList(items);
            var requestToken = this.get("requestToken");
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/RemoveItems",
                type: "POST",
                headers: requestToken,
                data: {
                    items: delimitedList
                },
                context: this,
                success: function (data) {
                    if (typeof (callback) == "function") {
                        callback(data);
                    }
                }
            });
        },

        getWorkspaceLanguages: function (callback, itemType, workspaceName) {
            var requestToken = this.get("requestToken");
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/GetWorkspaceLanguages",
                type: "POST",
                headers: requestToken,
                data: {
                    itemType: itemType,
                    workspaceName: workspaceName,
                },
                context: this,
                success: function (data) {
                    if (typeof (callback) == "function") {
                        callback(data);
                    }
                }
            });
        },

        removeAll: function (callback) {
            var requestToken = this.get("requestToken");
            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/RemoveAllItems",
                type: "POST",
                headers: requestToken,
                context: this,
                success: function (data) {
                    if (typeof (callback) == "function") {
                        callback(data);
                    }
                }
            });
        },

        buildDelimitedList: function (items) {
            var itemList = "";
            if (items && items.length > 0) {
                for (i = 0; i < items.length; i++) {
                    itemList += items[i];

                    if (i < items.length - 1) {
                        itemList += "|";
                    }
                }
            }

            return itemList;
        }
    });

    return WorkspaceHelper;
});

