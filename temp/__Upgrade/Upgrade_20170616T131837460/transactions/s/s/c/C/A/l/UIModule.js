//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore", "Utils", "EntityHelper"], function (Sitecore, Utils, EntityHelper) {
    var UIModule = Sitecore.Definitions.Models.Model.extend({

        ModuleContexts: {},
        SnapshotContexts: {},
        ControlMarkup: null,
        PendingActionName: null,
        PendingActionIsMultiStep: false,
        PendingActionType: null,
        PendingEntityView: null,
        CurrentModuleContextName: null,
        CurrentSnapshotId: null,
        App: null,
        EnvironmentName: null,
        Language: null,
        Currency: null,
        IsRenderingComplete: false,

        insertControlDynamically: function (app, templateControlId, controlName, targetElement, cb) {
            var self = this;
            // Query for the static copy of the control
            var controlCopy = $(self.ControlMarkup).filter('[data-sc-id=' + templateControlId + ']').clone();

            // Update the data-sc-id attribute of the clone to a new id
            controlCopy.attr('data-sc-id', controlName);

            // Get the html of the control copy
            var controlHtml = controlCopy[0].outerHTML;

            var options = { prepend: false, el: targetElement, html: controlHtml };
            app.insertMarkups(controlHtml, options, cb);
        },

        // If no target element is specified (null passed) then the root element for app is used.
        renderModule: function (app, moduleName, displayName, targetElement, commerceActions, listColumns, listData, html, isParentChildRelationship, callback) {
            if (!this.ControlMarkup) {
                // Query for markup we'll use to create controls dynamically
                var self = this;
                var utils = new Utils();
                utils.EnvironmentName = this.EnvironmentName;
                utils.Language = this.Language;
                utils.Currency = this.Currency;

                $.ajax({
                    url: "/sitecore/client/Commerce/DynamicRendering/ModulePage",
                    type: "GET",
                    context: this,
                    headers: utils.getDefaultRequestHeaders(),
                    data: {
                    },
                    success: function (data) {
                        self.ControlMarkup = data;
                        self.createModule(app, moduleName, displayName, targetElement, commerceActions, listColumns, listData, html, isParentChildRelationship, callback);
                    }
                });

                return;
            }

            if (!this.ModuleContexts[moduleName]) {
                this.createModule(app, moduleName, displayName, targetElement, commerceActions, listColumns, listData, html, isParentChildRelationship, callback);
            } else {
                this.refreshModule(moduleName, commerceActions, listColumns, listData, html, callback);
            }
        },

        createModule: function (app, moduleName, displayName, targetElement, commerceActions, listColumns, listData, html, isParentChildRelationship, callback) {
            var expanderId = moduleName + "_expander";
            var listId = moduleName + "_listcontrol";
            var actionControlId = moduleName + "_actionControl";

            var moduleContext = {
                viewName: moduleName,
                displayName: displayName,
                listId: listId,
                expanderId: expanderId,
                actionControlId: actionControlId,
                app: app,
                isParentChildRelationship: isParentChildRelationship, // TODO:
                getSelectedItemId: function () {
                    if (this.app[listId]) {
                        return this.app[listId].SelectedValue;
                    }

                    return null;
                }
            };

            this.ModuleContexts[moduleName] = moduleContext;

            var actionModels = this.createActionModels(moduleName, commerceActions);

            var baseExpanderId = "Expander1";
            var baseListControlId = "ListControl1";
            var baseActionControlId = "ActionControl1";

            var expanderTargetElement = app.el;

            if (targetElement) {
                expanderTargetElement = targetElement;
            }

            var self = this;

            // First insert the expander
            this.insertControlDynamically(app, baseExpanderId, expanderId, expanderTargetElement, function () {

                // Set the title
                app[expanderId].HeaderText = displayName;
                var expanderEl = app[expanderId].$el.find(".sc-expander-bodywrapper")[0];

                if (html) {
                    $(expanderEl).html(html);
                } else {
                    // insert the list
                    self.insertControlDynamically(app, baseListControlId, listId, expanderEl, function () {
                        self.createListColumns(app[listId], listColumns);

                        app[listId].ValueFieldName = "ItemId";

                        app[listId].DynamicData = listData;
                    });
                }

                // Necessary to manipulate directly with jQuery to make action control visible
                var $expanderActionHeaderEl = app[expanderId].$el.find(".sc-expander-header-actionbar-container");
                $expanderActionHeaderEl.css("display", "inline"); // this is the default value;

                var $expanderHeaderActionBar = $expanderActionHeaderEl.closest("td");
                $expanderHeaderActionBar.removeClass("sc-actionbar-collapsed");

                var expanderActionHeaderEl = $expanderActionHeaderEl[0];

                // insert the action control
                self.insertControlDynamically(app, baseActionControlId, actionControlId, expanderActionHeaderEl, function () {
                    app[actionControlId].at(0).at(0).reset();
                    for (var i = 0; i < actionModels.length; i++) {
                        var action = actionModels[i];

                        // TODO: Note that ActionDefinition items pointed to by base must have a single Action button
                        // to avoid unexplained duplicates.
                        app[actionControlId].at(0).at(0).add(action);
                    }
                    $(".sc-associated-listpage").hide();
                });

                // Invoke the callback, if supplied
                if (typeof (callback) == "function") {
                    callback();
                }
            });
        },

        refreshModule: function (moduleName, commerceActions, listColumns, listData, html, callback) {
            var moduleContext = this.ModuleContexts[moduleName];

            if (html) {
                moduleContext.app[moduleContext.expanderId].$el.find(".sc-expander-bodywrapper").html(html);
            } else {
                // If no columns had been created because the list was empty, add them now
                var listControl = moduleContext.app[moduleContext.listId];
                if (listControl.ColumnDefinitionItems.length === 0) {
                    this.createListColumns(listControl, listColumns);
                }

                // refresh the list data
                moduleContext.app[moduleContext.listId].DynamicData = listData;
            }

            // refresh the actions
            var actionModels = this.createActionModels(moduleName, commerceActions);
            var actionControl = moduleContext.app[moduleContext.actionControlId];

            actionControl.at(0).at(0).reset();

            for (var i = 0; i < actionModels.length; i++) {
                var action = actionModels[i];
                actionControl.at(0).at(0).add(action);
            }

            // Invoke the callback, if supplied
            if (typeof (callback) == "function") {
                callback();
            }
        },

        createActionModels: function (moduleName, commerceActions, actionEventName) {

            var actionModels = [];
            if (!actionEventName || actionEventName == "undefined") {
                actionEventName = "actionClicked";
            }

            for (var i = 0; i < commerceActions.length; i++) {

                var actionModel = {};
                actionModel.Text = commerceActions[i].DisplayName ? commerceActions[i].DisplayName : commerceActions[i].Name;
                actionModel.IsFavorite = false;
                actionModel.IsDisabled = !commerceActions[i].IsEnabled;
                actionModel.Tooltip = commerceActions[i].Description;

                var viewName;
                var actionName;
                var isMultiStepAction = false;

                var multiStepActionProperties = this.getMultiStepActionProperties(commerceActions[i]);
                if (multiStepActionProperties) {
                    viewName = multiStepActionProperties.EntityView;
                    actionName = multiStepActionProperties.ActionName;
                    isMultiStepAction = true;
                } else {
                    viewName = commerceActions[i].EntityView;
                    actionName = commerceActions[i].Name;
                }

                /* jshint ignore:start */
                actionModel.Click = "javascript:$.event.trigger('" + actionEventName + "', { actionName: '" + actionName + "', requiresConfirmation: " + commerceActions[i].RequiresConfirmation + ", entityView: '" + viewName + "', moduleContextName: '" + moduleName + "', isMultiStep: " + isMultiStepAction + " });";
                /* jshint ignore:end */
                actionModels.push(actionModel);
            }

            return actionModels;
        },

        getMultiStepActionProperties: function (commerceAction) {
            // TODO: For now we assume any policy under an action is a mult-step policy until we can
            // expose @odata.type or have the API include some other property we can use
            if (commerceAction.Policies && commerceAction.Policies.length > 0) {
                var properties = {};
                properties.EntityView = commerceAction.Policies[0].FirstStep.EntityView;
                properties.ActionName = commerceAction.Policies[0].FirstStep.Name;
                return properties;
            }

            return null;
        },

        createListColumns: function (listControl, columnDefinitions) {
            listControl.ColumnDefinitionItems = [];
            for (var i = 0; i < columnDefinitions.length; i++) {
                if (!columnDefinitions[i].IsHidden) {
                    var columnType;
                    if (columnDefinitions[i].IsLinked === true) {
                        columnType = "Link";
                    } else {
                        columnType = this.mapToColumnType(columnDefinitions[i].OriginalType);
                    }

                    var column = this.createColumnDefinitionItem(columnDefinitions[i].DisplayName, columnType, columnDefinitions[i].Name);
                    listControl.ColumnDefinitionItems.push(column);
                }
            }

            listControl.trigger("change:ColumnDefinitionItems");
        },

        createColumnDefinitionItem: function (columnTitle, columnType, dataFieldName) {
            if (columnType == "Link") {
                return {
                    LinkTextFieldName: dataFieldName,
                    LinkUrlFieldName: "LinkTarget",
                    ColumnAlignment: "left",
                    ColumnFieldId: "",
                    ColumnMinWidth: "",
                    ColumnTitle: columnTitle,
                    ColumnType: columnType,
                    ColumnWidth: "",
                    DataFieldName: dataFieldName,
                    IsBold: false,
                    IsItalic: false,
                    IsSortable: false,
                    IsWrapped: false,
                    SortDirection: "no-sorting"
                };
            }

            return {
                ColumnAlignment: "left",
                ColumnFieldId: "",
                ColumnMinWidth: "",
                ColumnTitle: columnTitle,
                ColumnType: columnType,
                ColumnWidth: "",
                DataFieldName: dataFieldName,
                IsBold: false,
                IsItalic: false,
                IsSortable: false,
                IsWrapped: false,
                SortDirection: "no-sorting"
            };
        },

        mapToColumnType: function (originalType) {
            // TODO: For now just map all types to text
            var columnType = "text";
            return columnType;
        },

        beginAction: function (actionConfig) {
            if (actionConfig.requiresConfirmation) {
                this.PendingActionName = actionConfig.actionName;
                this.PendingActionType = actionConfig.actionType;
                this.CurrentModuleContextName = actionConfig.moduleContextName;
                this.App.ConfirmActionDialog.show();
                return;
            }

            if (actionConfig.entityView && actionConfig.entityView != "undefined") {
                // This action requires additional parameters so query for the action's entity view
                this.PendingActionIsMultiStep = actionConfig.isMultiStep;
                this.getActionView(actionConfig);
            } else {
                this.invokeAction(actionConfig.actionName, actionConfig.moduleContextName);
            }
        },

        getActionView: function (actionConfig) {
            var entityId = actionConfig.entityId;
            var itemId = this.getItemIdForAction(actionConfig.actionType, actionConfig.moduleContextName);

            var utils = new Utils();
            utils.EnvironmentName = this.EnvironmentName;
            utils.Language = this.Language;
            utils.Currency = this.Currency;

            var formContainerElement = $("[data-sc-id='FormContentsPanel']")[0];
            utils.loadCommerceFoundationForm(actionConfig.app, formContainerElement, entityId, itemId, actionConfig.entityView, actionConfig.actionName, $.proxy(this.onLoadCommerceFormComplete, this));
        },

        continueMultiStepAction: function (entityView) {
            var utils = new Utils();
            var self = this;
            var formContainerElement = $("[data-sc-id='FormContentsPanel']")[0];

            utils.loadCommerceFoundationForm(self.App, formContainerElement, "", "", "", "", $.proxy(this.onLoadCommerceFormComplete, this), entityView);
        },

        // Since the rendering of modules is asynchronous, we need to do something to ensure 
        // a consistent order for the modules
        renderModulesInOrder: function (targetApp, views, index) {
            if (index == views.length) {
                return;
            } else {
                var self = this;
                var view = views[index];

                self.renderModule(
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
                        self.renderModulesInOrder(targetApp, views, index + 1);
                    });
            }
        },

        confirmActionDialogButtonClicked: function (eventArgs) {
            if (eventArgs[0] === "ok" || eventArgs[0] === "yes") {
                this.invokeAction(this.PendingActionName);
            }
        },

        updateEntityViewFromForm: function () {
            var entityView = this.App.PendingEntityView;
            var formData = null;

            // Work around for customer property delimiter 
            if (entityView.Action === "EditCustomer" || entityView.Action === "AddCustomer") {
                formData = this.App.CommerceForm.getCommerceCustomerFormData();
            }
            else {
                formData = this.App.CommerceForm.getCommerceFormData();
            }

            for (var i = 0; i < entityView.Properties.length; i++) {
                var name = entityView.Properties[i].Name;
                entityView.Properties[i].Value = formData[name];
            }

            return entityView;
        },

        invokeAction: function (actionName, moduleContextName, entityView) {
            var entityHelper = new EntityHelper();
            entityHelper.EnvironmentName = this.EnvironmentName;
            entityHelper.Language = this.Language;
            entityHelper.Currency = this.Currency;

            if (!entityView) {
                // Required if we prompted for confirmation
                if (!moduleContextName) {
                    moduleContextName = this.CurrentModuleContextName;
                }

                var itemId = null;
                var entityId = this.App.EntityId;
                var version = this.App.Version;

                itemId = this.getItemIdForAction(this.PendingActionType, moduleContextName);

                entityView = entityHelper.buildEntityView(entityId, actionName, itemId, version);
            }

            var self = this;
            entityHelper.invokeAction(actionName, entityView, function (response) {
                if (response.ResponseCode == "Ok") {
                    if (response.NextActionStep) {
                        self.continueMultiStepAction(response.NextActionStep);
                        return;
                    }

                    // If we make it here, then either was not multi-step or we've completed last step
                    self.PendingActionIsMultiStep = false;
                    self.App.DialogWindow.hide();
                    self.App.DialogWindow.IsVisible = false;

                    self.App.SuccessMessage.IsVisible = true;
                    setTimeout(function () {
                        self.App.SuccessMessage.IsVisible = false;
                    }, 5000);
                    
                    // Check if we cached anything on the server
                    if (response.CacheGuid) {
                        self.App.CacheGuid = response.CacheGuid;
                    }

                    self.App.refresh();

                } else {
                    if (response.Errors && response.Errors.length > 0) {
                        for (var i = 0; i < response.Errors.length; i++) {
                            // In the event of a concurrency exception, we show a different
                            // message bar with a refresh button
                            if (response.Errors[i].TermKey == "OptimisticConcurrencyFailure") {
                                self.App.ConcurrencyMessage.IsVisible = true;
                                return;
                            }

                            var message = { Text: response.Errors[i].MessageText, Type: "Error" };
                            self.App.ErrorMessage.reset();
                            self.App.ErrorMessage.add(message);
                        }

                        self.App.ErrorMessage.IsVisible = true;
                        setTimeout(function () {
                            self.App.ErrorMessage.IsVisible = false;
                        }, 10000);
                    }
                }
            });
        },

        renderSnapshotsModule: function (app, targetElement, name, data, cb) {
            if (!this.ControlMarkup) {
                // Query for markup we'll use to create controls dynamically
                var self = this;
                var utils = new Utils();
                utils.EnvironmentName = this.EnvironmentName;
                utils.Language = this.Language;
                utils.Currency = this.Currency;

                $.ajax({
                    url: "/sitecore/client/Commerce/DynamicRendering/ModulePage",
                    type: "GET",
                    context: this,
                    headers: utils.getDefaultRequestHeaders(),
                    data: {
                    },
                    success: function (markupData) {
                        self.ControlMarkup = markupData;
                        self.createSnapshotsModule(app, targetElement, name, data, cb);
                    }
                });

                return;
            }

            if (!this.SnapshotContexts[data.Properties.ItemId.Value]) {
                this.createSnapshotsModule(app, targetElement, name, data, cb);
            } else {
                this.refreshSnapshotsModule(app, data, cb);
            }

        },

        refreshSnapshotsModule: function (app, data, cb) {
            var context = this.SnapshotContexts[data.Properties.ItemId.Value];
            context.snapshot = data;
            var radioButton = app[context.radioButtonId];
            var listControl = app[context.listControlId];
            var actionControl = app[context.actionControlId];

            // refresh the actions
            var snapshotDetailsActionModels = this.createActionModels(null, data.SnapshotDetailsActions, "snapshotListActionClicked");
            var snapshotRowActionModels = this.createActionModels(null, data.SnapshotRowActions, "snapshotActionClicked");
            var actionModels = snapshotDetailsActionModels.concat(snapshotRowActionModels);
            actionControl.at(0).at(0).reset();

            for (var i = 0; i < actionModels.length; i++) {
                var action = actionModels[i];
                actionControl.at(0).at(0).add(action);
            }

            radioButton.Label = data.Properties.BeginDate.Value;

            // Create the column for currencies
            listControl.ColumnDefinitionItems = [];
            listControl.ColumnDefinitionItems.push(this.createColumnDefinitionItem("", "text", "Currency"));

            // Create the list columns for the tiers
            for (var j = 0; j < data.Tiers.length; j++) {
                var columnDef = this.createColumnDefinitionItem(data.Tiers[j], "text", data.Tiers[j]);
                listControl.ColumnDefinitionItems.push(columnDef);
            }

            listControl.trigger("change:ColumnDefinitionItems");

            var updatedList = this.transformDataForSnapshotList(data.CurrencyRows);
            listControl.DynamicData = updatedList;

            // Handle changes in state that should disable the tag editor
            var snapshotId = data.Properties.ItemId.Value;
            var includeTagsContainerName = "Snapshot" + snapshotId + "_IncludeTagsContainer";
            var includeTagEditorId = "Snapshot" + snapshotId + "IncludeTagEditor";
            var includeTagContainerId = "#" + includeTagsContainerName + "_text";

            if (this.CurrentSnapshotId == snapshotId) {
                if (!data.Properties.CanAddTag &&
                    !data.Properties.CanRemoveTag) {

                    // Hide the tag editor
                    this.App.SnapshotsApp[includeTagEditorId].IsVisible = false;

                    //Include tags string build
                    $(includeTagContainerId).empty();
                    $(includeTagContainerId).append("Tags: ");
                    var intags = "";

                    for (var k = 0; k < this.App.SnapshotsApp[includeTagEditorId].Items.length; k++) {
                        intags += this.App.SnapshotsApp[includeTagEditorId].Items[k].Name + ", ";
                    }

                    $(includeTagContainerId).append(intags.slice(0, -2));
                    $(includeTagContainerId).show();
                } else {

                    this.App.SnapshotsApp[includeTagEditorId].IsVisible = true;
                    $(includeTagContainerId).empty();
                    $(includeTagContainerId).hide();
                }
            }

            // Invoke the callback, if supplied
            if (typeof (cb) == "function") {
                cb();
            }
        },

        renderPricingCardShapshotsActions: function (app, targetElement, data) {
            if (!this.ControlMarkup) {
                // Query for markup we'll use to create controls dynamically
                var self = this;
                var utils = new Utils();
                utils.EnvironmentName = this.EnvironmentName;
                utils.Language = this.Language;
                utils.Currency = this.Currency;

                $.ajax({
                    url: "/sitecore/client/Commerce/DynamicRendering/ModulePage",
                    type: "GET",
                    context: this,
                    headers: utils.getDefaultRequestHeaders(),
                    data: {
                    },
                    success: function (markupData) {
                        self.ControlMarkup = markupData;
                        self.createPricingCardShapshotsActions(app, targetElement, data);
                    }
                });

                return;
            }

            this.createPricingCardShapshotsActions(app, targetElement, data);
        },

        createPricingCardShapshotsActions: function (app, targetElement, data) {
            var actionModels = this.createActionModels("", data.Actions, "snapshotListActionClicked");
            var baseActionControlId = "ActionControl1";
            var actionControlId = "snapshotsListActionControl";

            // Create the action control
            this.insertControlDynamically(app, baseActionControlId, actionControlId, targetElement, function () {
                app[actionControlId].at(0).at(0).reset();
                for (var i = 0; i < actionModels.length; i++) {
                    var action = actionModels[i];
                    app[actionControlId].at(0).at(0).add(action);
                }
            });
        },

        createSnapshotsModule: function (app, targetElement, name, data, cb) {
            // Create container divs
            var snapshotActionsContainerName = name + "_ActionsContainer";
            var snapshotRadioButtonContainerName = name + "_RadioButtonContainer";
            var snapshotListContainerName = name + "_ListContainer";
            var includeTagsContainerName = name + "_IncludeTagsContainer";

            var snapshotWrapperDivId = name + "Wrapper";
            $(targetElement).append("<div id='" + name + "Wrapper' class='snapshot_wrapper'><div id=\"" + snapshotActionsContainerName + "\" class=\"SnapshotActionContainer\" style=\"margin-top: 10px;\"></div><div id=\"" + snapshotRadioButtonContainerName + "\" class=\"SnapshotRadioContainer\" style=\"margin-top: 10px;\"></div><div id=\"" + snapshotListContainerName + "\" class=\"SnapshotListContainer\" style=\"margin-top: 10px;\"></div></div>");

            // Get the container and use it as the new target
            var radioDiv = $("#" + snapshotRadioButtonContainerName)[0];
            var listDiv = $("#" + snapshotListContainerName)[0];

            var radioButtonName = name + "RadioButton";
            var listControlName = name + "ListControl";
            var actionControlName = name + "ActionControl";
            var includeTagEditorName = name + "IncludeTagEditor";

            // Create the snapshot context
            var snapshotContext = {
                snapshotWrapperDiv: snapshotWrapperDivId,
                radioButtonId: radioButtonName,
                listControlId: listControlName,
                actionControlId: actionControlName,
                includeTagEditorId: includeTagEditorName,
                snapshotId: data.Properties.ItemId.Value,
                snapshot: data,
                app: app
            };

            this.SnapshotContexts[data.Properties.ItemId.Value] = snapshotContext;

            var self = this;
            this.insertControlDynamically(app, "RadioButton1", radioButtonName, radioDiv, function () {
                app[radioButtonName].Label = data.Properties.BeginDate.Value;
                app[radioButtonName].GroupName = "SnapshotListRadioGroup";
                app[radioButtonName].Value = data.Properties.ItemId.Value;
                var currentSnapshot = data;
                var snapshotNumber = radioButtonName.replace("RadioButton", "").replace("Snapshot", "");

                $("#Snapshot" + snapshotNumber + "Wrapper").on("click", $.proxy(function (isChecked) {
                    if (!app[radioButtonName].app[radioButtonName].get("IsChecked")) {
                        app[radioButtonName].app[radioButtonName].set("IsChecked", true);
                    }
                }));
                // Set up an event trigger for the radio button so that page code can react 
                app[radioButtonName].on("change:IsChecked", $.proxy(function (isChecked) {
                    if (!self.IsRenderingComplete) {
                        return;
                    }

                    var includeTagContainerId = "#" + includeTagsContainerName + "_text";
                    var intags = "";

                    if (isChecked === true) {
                        self.CurrentSnapshotId = currentSnapshot.Properties.ItemId.Value;
                        $(".snapshot_wrapper").removeClass("snapshot_selected");
                        $("#Snapshot" + snapshotNumber + "Wrapper").addClass("snapshot_selected");
                        $.event.trigger('currentSnapshotChanged', currentSnapshot);

                        // Hide/disable all tag editors in snapshots that are not selected
                        $.each(self.SnapshotContexts, function (snapshotId, snapshotContext) {
                            var includeEditorId = snapshotContext.includeTagEditorId;
                            app[includeEditorId].IsVisible = false;
                        });

                        // Hide tag text container
                        $("#" + includeTagsContainerName + "_text").hide();
                        app[includeTagEditorName].IsVisible = true;

                        var canAddTag = self.getCurrentSnapshot().Properties.CanAddTag;
                        var canRemoveTag = self.getCurrentSnapshot().Properties.CanRemoveTag;

                        if (!canAddTag && !canRemoveTag) {
                            // Hide the tag editor
                            app[includeTagEditorName].IsVisible = false;
                            //Include tags string build
                            $(includeTagContainerId).empty();
                            $(includeTagContainerId).append("Tags: ");
                            intags = "";
                            for (var i = 0; i < app[includeTagEditorName].Items.length; i++) {
                                intags += app[includeTagEditorName].Items[i].Name + ", ";
                            }
                            $(includeTagContainerId).append(intags.slice(0, -2));
                            $(includeTagContainerId).show();
                        }

                    } else {

                        if (!app[includeTagEditorName] || app[includeTagEditorName] == "undefined") {
                            return;
                        }

                        //Include tags string build
                        $(includeTagContainerId).empty();
                        $(includeTagContainerId).append("Tags: ");
                        intags = "";

                        for (var j = 0; j < app[includeTagEditorName].Items.length; j++) {
                            intags += app[includeTagEditorName].Items[j].Name + ", ";
                        }
                        $(includeTagContainerId).append(intags.slice(0, -2));
                        $(includeTagContainerId).show();
                    }

                }), app);

                var snapshotActionsContainerDiv = $('#' + snapshotActionsContainerName)[0];

                var snapshotDetailsActionModels = self.createActionModels(null, data.SnapshotDetailsActions, "snapshotListActionClicked");
                var snapshotRowActionModels = self.createActionModels(null, data.SnapshotRowActions, "snapshotActionClicked");
                var actionModels = snapshotDetailsActionModels.concat(snapshotRowActionModels);

                // insert the action control
                self.insertControlDynamically(app, "ActionControl1", actionControlName, snapshotActionsContainerDiv, function () {
                    app[actionControlName].at(0).at(0).reset();
                    for (var i = 0; i < actionModels.length; i++) {
                        var action = actionModels[i];
                        app[actionControlName].at(0).at(0).add(action);
                    }
                });

                // Create container divs for tag editors
                $(listDiv).append("<div id=\"" + includeTagsContainerName + "\" ></div>");

                // Create tags texts containers
                $(listDiv).append("<p id=\"" + includeTagsContainerName + "_text\" class='tagstring'>Tags: </p>");

                var intags = "";
                var i;
                for (i = 0; i < data.IncludeTags.length; i++) {
                    intags += data.IncludeTags[i].Name + ", ";
                }
                $("#" + includeTagsContainerName + "_text").append(intags.slice(0, -2));

                var includeTagsDiv = $('#' + includeTagsContainerName)[0];

                self.insertControlDynamically(app, "TagEditor1", includeTagEditorName, includeTagsDiv, function () {
                    // TODO: Localize label text when we implement with client-side dictionary or alternative
                    app[includeTagEditorName].LabelText = "Tags";
                    app[includeTagEditorName].TagType = "Include";
                    app[includeTagEditorName].TagCssClass = "green-tag";
                    app[includeTagEditorName].Items = data.IncludeTags;
                    app[includeTagEditorName].IsVisible = false;
                });

                self.insertControlDynamically(app, "ListControl1", listControlName, listDiv, function () {
                    var listControl = app[listControlName];

                    // Create the column for currencies
                    listControl.ColumnDefinitionItems = [];
                    listControl.ColumnDefinitionItems.push(self.createColumnDefinitionItem("", "text", "Currency"));

                    // Create the list columns for the tiers
                    for (var i = 0; i < data.Tiers.length; i++) {
                        var columnDef = self.createColumnDefinitionItem(data.Tiers[i], "text", data.Tiers[i]);
                        listControl.ColumnDefinitionItems.push(columnDef);
                    }

                    listControl.trigger("change:ColumnDefinitionItems");

                    // Now bind the data
                    var updatedList = self.transformDataForSnapshotList(data.CurrencyRows);
                    listControl.DynamicData = updatedList;

                    // Invoke the callback, if supplied
                    if (typeof (cb) == "function") {
                        cb();
                    }
                });
            });
        },

        transformDataForSnapshotList: function (data) {
            var simplifiedArray = [];
            for (var i = 0; i < data.length; i++) {
                var row = {};
                for (var prop in data[i]) {
                    if (data[i].hasOwnProperty(prop)) {
                        row[prop] = data[i][prop].Value;
                    }
                }

                simplifiedArray.push(row);
            }

            return simplifiedArray;
        },

        renderSnapshotsInOrder: function (targetApp, snapshots, index) {
            if (index == snapshots.length) {
                // Initialize the renderded list and end recursion
                this.IsRenderingComplete = true;
                if (snapshots.length === 0) {
                    return;
                }

                var activeSnapshot = null;
                if (this.CurrentSnapshotId) {
                    activeSnapshot = this.SnapshotContexts[this.CurrentSnapshotId];
                    $.event.trigger("currentSnapshotChanged");
                } else {
                    var activeSnapshotId = Object.keys(this.SnapshotContexts)[0];
                    activeSnapshot = this.SnapshotContexts[activeSnapshotId];
                }

                targetApp[activeSnapshot.radioButtonId].IsChecked = true;
                return;
            } else {
                // Render the snapshots
                var self = this;
                var targetContainer = $(targetApp.el).children(".snapshots_scroll");
                var snapshotName = "Snapshot" + snapshots[index].Properties.ItemId.Value;
                this.renderSnapshotsModule(
                    targetApp,
                    targetContainer,
                    snapshotName,
                    snapshots[index],
                    function () { self.renderSnapshotsInOrder(targetApp, snapshots, index + 1); });
            }
        },

        renderSnapshots: function (targetApp, priceCardSnapshotsView) {

            this.IsRenderingComplete = false;

            if (!targetApp.snapshotsListActionControl) {
                // Render the actions that apply to the list of snapshots
                var targeActionstElement, targetActionsElementId;

                targetActionsElementId = "ActionsContainer";
                $(targetApp.el).append("<div id=\"" + targetActionsElementId + "\" style=\"clear: right\"></div>");
                targeActionstElement = $("#" + targetActionsElementId)[0];
                this.renderPricingCardShapshotsActions(targetApp, targeActionstElement, priceCardSnapshotsView);

                var maxheight = screen.height - 480;
                $(targetApp.el).append("<div style=\"height:" + maxheight + "px\" class=\"snapshots_scroll\" style=\"clear: right\"></div>");

            } else {
                // Refresh the list-level actions
                targetApp.snapshotsListActionControl.at(0).at(0).reset();
                var actionModels = this.createActionModels("", priceCardSnapshotsView.Actions, "snapshotListActionClicked");
                for (var i = 0; i < actionModels.length; i++) {
                    var action = actionModels[i];
                    targetApp.snapshotsListActionControl.at(0).at(0).add(action);
                }
            }

            // Clean up any removed snapshots
            this.removeDeletedSnapshots(targetApp, priceCardSnapshotsView.Snapshots);

            // Render the snapshots
            this.renderSnapshotsInOrder(targetApp, priceCardSnapshotsView.Snapshots, 0);
        },

        removeDeletedSnapshots: function (targetApp, snapshots) {
            // for every snapshot context that no longer exists in the current view set we should remove
            var self = this;
            var snapshotIdsToDelete = [];

            $.each(self.SnapshotContexts, function (snapshotId, snapshotContext) {
                var foundSnapshot = false;
                for (var i = 0; i < snapshots.length; i++) {
                    if (snapshotId == snapshots[i].Properties.ItemId.Value) {
                        foundSnapshot = true;
                        break;
                    }
                }

                if (!foundSnapshot) {
                    snapshotIdsToDelete.push(snapshotId);
                }
            });

            if (snapshotIdsToDelete.length === 0) {
                return;
            }

            for (var j = 0; j < snapshotIdsToDelete.length; j++) {
                var snapshotId = snapshotIdsToDelete[j];
                this.removeSnapshot(targetApp, snapshotId);
            }

            this.CurrentSnapshotId = null;
        },

        removeSnapshot: function (targetApp, snapshotId) {
            var snapshotContext = this.SnapshotContexts[snapshotId];

            if (!snapshotContext) {
                return;
            }

            // Remove the html content
            $('#' + snapshotContext.snapshotWrapperDiv).remove();

            // Remove the renderings from the SPEAK programming scope
            delete targetApp[snapshotContext.radioButtonId];
            delete targetApp[snapshotContext.listControlId];
            delete targetApp[snapshotContext.actionControlId];
            delete targetApp[snapshotContext.includeTagEditorId];

            // Remove the snapshot context from the contexts lookup
            delete this.SnapshotContexts[snapshotId];

            // If there are no snapshots left, null out the current snapshot id
            if (Object.keys(this.SnapshotContexts).length === 0) {
                this.CurrentSnapshotId = null;
            }
        },

        getCurrentSnapshot: function () {
            var currentSnapshotContext = this.getCurrentSnapshotContext();
            if (currentSnapshotContext) {
                return currentSnapshotContext.snapshot;
            }

            return null;
        },

        getCurrentSnapshotContext: function () {
            var currentSnapshotContext = this.SnapshotContexts[this.CurrentSnapshotId];
            return currentSnapshotContext;
        },

        getCurrentSnapshotSelectedCurrencyItemId: function () {
            var context = this.getCurrentSnapshotContext();
            var app = context.app;
            var list = app[context.listControlId];
            return list.SelectedValue;
        },

        onActionDialogOK: function () {
            var entityView = this.updateEntityViewFromForm();
            this.invokeAction(null, null, entityView);

            if (!this.PendingActionIsMultiStep) {
                this.App.DialogWindow.hide();
                this.App.DialogWindow.IsVisible = false;
            }
        },

        onActionDialogCancel: function () {
            this.App.DialogWindow.hide();
            this.App.DialogWindow.IsVisible = false;
        },

        getItemIdForAction: function (actionType, moduleContextName) {
            var itemId = null;
            if (actionType === null || actionType === undefined || actionType == "Module") {
                var moduleContext = this.ModuleContexts[moduleContextName];

                if (moduleContext) {
                    itemId = moduleContext.getSelectedItemId();
                }
            }

            if (actionType == "SnapshotList") {
                itemId = this.CurrentSnapshotId;
            }

            if (actionType == "Snapshot") {
                itemId = this.getCurrentSnapshotSelectedCurrencyItemId();
            }

            return itemId;
        },

        onLoadCommerceFormComplete: function () {
            var el = this.App.CommerceFoundationFormHelper.el;

            // Get the form field initialization data and apply it to the form fields
            var formInitializationDataElement = $(el).find(".sc-commerceForm-formInitializationData")[0];
            var formInitData = JSON.parse(formInitializationDataElement.innerHTML);
            var self = this;

            $.each(formInitData, function (key, value) {
                var formFieldRendering = self.App.CommerceForm[key];
                $.each(value, function (propertyName, propertyValue) {
                    formFieldRendering.set(propertyName, propertyValue, false);
                    // SPEAK form controls don't collapse when visible is false so we handle that here
                    if (propertyName == "IsVisible" && propertyValue === false) {
                        $(formFieldRendering.el).parent().parent().parent().css("display", "none");
                    }

                    // SPEAK form controls IsRequired need special action
                    if (propertyName == "IsRequired" && propertyValue === true) {
                        $(formFieldRendering.el).addClass("sc-commerceForm-IsRequired");
                        $(formFieldRendering.el).parent().append("<span style=\"float: right; display: inline-block; position: absolute; top: 5px; right: 5px; color: red\">&#9679;</span>");
                    }
                });
            });

            // Bind the form to its data
            var formDataElement = $(el).find(".sc-commerceForm-formData")[0];
            var jsonContent = JSON.parse(formDataElement.innerHTML);
            self.App.CommerceForm.setFormData(jsonContent);

            var entityViewElement = $(el).find(".sc-commerceForm-entityView")[0];
            self.App.PendingEntityView = JSON.parse(entityViewElement.innerHTML);

            // TODO: Alex's temp fix for dialog window misbehaving
            self.App.DialogWindow.$el.css("top", "calc( 14% + " + $(document).scrollTop() + "px)");
            self.App.DialogWindow.$el.data("modal", { options: { width: screen.width / 2 } });
            self.App.DialogWindow.show();

            var utils = new Utils();
            utils.registerFormChangedEvent(self.App.CommerceForm, self.App);

            //Set Scrollbar to Top
            document.getElementsByClassName("sc-scrollablepanel sc-border")[0].scrollTop = 0;
        },

        clearEnvironmentCache: function (cacheStoreName) {
            var utils = new Utils();
            var ajaxToken = utils.getDefaultRequestHeaders();
            var self = this;

            $.ajax({
                type: "POST",
                context: this,
                dataType: "text",
                headers: ajaxToken,
                data: { "cacheStoreName": cacheStoreName },
                url: "/sitecore/shell/commerce/tools/CommerceEnvironment/ClearEnvironmentCache",
                success: function (data) {
                    var result = JSON.parse(data);

                    if (result.Success) {
                        self.App.SuccessMessage.IsVisible = true;
                        setTimeout(function () {
                            self.App.SuccessMessage.IsVisible = false;
                        }, 5000);
                    }
                    else {
                        // Successful call with error messages
                        self.App.ErrorMessage.reset();
                        var message = { Text: result.Message, Type: "Error" };
                        self.App.ErrorMessage.add(message);
                        self.App.ErrorMessage.IsVisible = true;
                        setTimeout(function () {
                            self.App.ErrorMessage.IsVisible = false;
                        }, 10000);
                    }
                },
                error: function (xhr, status, errorThrown) {
                    self.App.ErrorMessage.reset();
                    var message = { Text: xhr.statusText, Type: "Error" };
                    self.App.ErrorMessage.add(message);
                    self.App.ErrorMessage.IsVisible = true;
                    setTimeout(function () {
                        self.App.ErrorMessage.IsVisible = false;
                    }, 10000);
                }
            });
        }
    });

    return UIModule;
});

