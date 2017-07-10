//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore", "Utils", ], function (Sitecore, Utils) {
    var EntityHelper = Sitecore.Definitions.Models.Model.extend({

        EnvironmentName: null,
        Language: null,
        Currency: null,

        getProfile: function (id, entityType, onSuccess, onError) {
            var url = "/sitecore/shell/commerce/tools/Profile/Fetch";
            var payload = { id: id, entityType: entityType };
            this.sendRequest(url, payload, onSuccess, onError);
        },

        updateProfile: function (entityData, onSuccess, onError) {
            var url = "/sitecore/shell/commerce/tools/Profile/Update";
            this.sendRequest(url, entityData, onSuccess, onError);
        },

        createProfile: function (entityData, onSuccess, onError) {
            var url = "/sitecore/shell/commerce/tools/Profile/Create";
            this.sendRequest(url, entityData, onSuccess, onError);
        },

        deleteProfile: function (id, entityType, onSuccess, onError) {
            var url = "/sitecore/shell/commerce/tools/Profile/Delete";
            var payload = { id: id, entityType: entityType };
            this.sendRequest(url, payload, onSuccess, onError);
        },

        getOrder: function (id, onSuccess, onError) {
            var url = "/sitecore/shell/commerce/tools/Order/Fetch";
            var payload = { id: id };
            this.sendRequest(url, payload, onSuccess, onError);
        },

        getEntityView: function (viewName, entityId, itemId, onSuccess, onError) {
            var url = "/sitecore/shell/commerce/tools/CommerceEntity/GetEntityView";
            var payload = { viewName: viewName, entityId: entityId, itemId: itemId };
            this.sendRequest(url, payload, onSuccess, onError);
        },

        getMasterView: function (entityId, onSuccess, onError) {
            var url = "/sitecore/shell/commerce/tools/CommerceEntity/GetMasterView";
            var payload = { entityId: entityId };
            this.sendRequest(url, payload, onSuccess, onError);
        },

        getActionView: function (actionName, viewName, entityId, itemId, onSuccess, onError) {
            var url = "/sitecore/shell/commerce/tools/CommerceEntity/GetActionView";
            var payload = {
                actionName: actionName,
                viewName: viewName,
                entityId: entityId,
                itemId: itemId
            };
            
            this.sendRequest(url, payload, onSuccess, onError);
        },

        invokeAction: function (actionName, entityView, onSuccess, onError) {
            var url = "/sitecore/shell/commerce/tools/CommerceEntity/InvokeAction";
            var payload = { entityView: JSON.stringify(entityView) };
            this.sendRequest(url, payload, onSuccess, onError);
        },

        // Builds an entity view to be submitted when invoking an action
        buildEntityView: function(entityId, actionName, itemId, version) {
            var entityView = {
                EntityId: entityId,
                Action: actionName
            };

            if (itemId) {
                entityView.ItemId = itemId;
            }

            var properties = [];
            var versionProperty = {
                Name: "Version",
                Value: version
            };
            properties.push(versionProperty);
            entityView.Properties = properties;

            return entityView;
        },

        getEntityViewPropertyValue: function (view, propertyName) {
            if (view && view.Properties && view.Properties.length > 0) {
                for (var i = 0; i < view.Properties.length; i++) {
                    if (view.Properties[i].Name == propertyName) {
                        return view.Properties[i].Value;
                    }
                }
            }
        },

        setEntityViewPropertyValue: function(view, propertyName, value) {
            if (view && view.Properties && view.Properties.length > 0) {
                for (var i = 0; i < view.Properties.length; i++) {
                    if (view.Properties[i].Name == propertyName) {
                        view.Properties[i].Value = value;
                        return;
                    }
                }
            }
        },

        sendRequest: function (url, payload, onSuccess, onError) {
            var utils = new Utils();
            utils.EnvironmentName = this.EnvironmentName;
            utils.Language = this.Language;
            utils.Currency = this.Currency;

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
                },
                error: function (xhr, status, errorThrown) {
                    if (typeof (onError) == "function") {
                        onError(errorThrown);
                    } else if (onError === undefined) {
                        this.onError(errorThrown);
                    }
                }
            });
        },

        onError: function (error) {
            $('div[data-sc-id=GeneralErrorMessage] > div.sc-messageBar-messages-wrap > div > div > div.sc-messageBar-messageText-container > span.sc-messageBar-messageText').text(error);
            $('div[data-sc-id=GeneralErrorMessage]').show();
        }
    });

    return EntityHelper;
});

