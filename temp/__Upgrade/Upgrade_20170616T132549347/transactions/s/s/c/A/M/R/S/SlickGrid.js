require.config({
    config: {
        waitSeconds: 15
    },
    paths: {
        slickCore: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/slick.core",
        slickDataView: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/slick.dataview",
        slickEditors: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/slick.editors",
        slickFormatters: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/slick.formatters",
        slickGrid: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/slick.grid",
        slickRemoveModel: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/slick.remotemodel",
        slickGroup: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/slick.groupitemmetadataprovider",
        jQueryDrag: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/jquery.event.drag-2.2",
        jQueryDrop: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/jquery.event.drop-2.2",
        slickCheckBoxColumn: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/plugins/slick.checkboxselectcolumn",
        slickSitecoreModules: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/slick.sitecore.modules",
        slickRowSelectionModel: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/plugins/slick.rowselectionmodel",
        Linq: "/sitecore/shell/client/Applications/MerchandisingManager/linq",
        CommerceUtils: "/sitecore/shell/client/Applications/MerchandisingManager/CommerceUtils",
        timePicker: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/jquery.timepicker.min",
        datepickerRegions: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/jquery.datepicker.regions",
        caret: '/sitecore/shell/client/Applications/MerchandisingManager/Renderings/TagEditorV1/assets/jquery.caret',
        tagEditor: '/sitecore/shell/client/Applications/MerchandisingManager/Renderings/TagEditorV1/assets/jquery.tag-editor'

    },
    shim: {
        'datepickerRegions': {
            deps: ['jqueryui'/*, 'css!dynatreecss'*/]
        },
        slickCore: ['jqueryui'],
        slickGrid: ['slickCore', 'jQueryDrag', 'jQueryDrop'],
        slickDataView: ['slickGrid']
    }
});

define(["sitecore", "jQueryDrag", "jQueryDrop", "slickCore", "slickDataView", "slickEditors", "slickFormatters", "slickGrid", "slickRemoveModel", "slickGroup", "slickCheckBoxColumn", "slickRowSelectionModel", "slickSitecoreModules", "Linq", "CommerceUtils", "timePicker", "datepickerRegions", "caret", "tagEditor"], function (Sitecore, Linq) {
    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("items", []);
            this.set("dataView", null);
            this.set("columns", []);
            this.set("grid", null);
            this.set("gridId", false);
            this.set("controlMappings", false);
            this.set("selectedColumns", null);
            this.set("entityType", null);
            this.set("hasSelectedItems", false);
            this.set("hasSingleItemSelected", false);
            this.set("hasChanges", false);
            // Initializing data view here instead of initGrid to prevent race condition - sometimes 
            // dataRefresh called before initGrid callback.
            var dataView = new Slick.Data.DataView();
            this.set("dataView", dataView);

            // Initialize the client side representation of data and languages
            var gridData = {};
            gridData.languages = {};

            this.set("currentLanguage", null);
            this.set("gridData", gridData);

            // Initialize the shared fields look-up
            var editedSharedFields = {};
            this.set("editedSharedFields", editedSharedFields);
        },

        initGrid: function () {
            var self = this;
            var items = this.get("items");
            var gridContainerId = "#" + this.get("gridId");
            
            var options = {
                enableCellNavigation: true,
                enableColumnReorder: false,
                editable: true,
                autoEdit: true,
                rowHeight: 40,
                forceFitColumns: true
            };

            var dataView = this.get("dataView");

            var checkboxSelector = new Slick.CheckboxSelectColumn({
                cssClass: "slick-cell-checkboxsel"
            });

            var columnModification = [];
            var columns = this.get("columns");

            // Add the Correct Editor to Tags Column
            for (var a = 0; a < columns.length; a++) {
                if (columns[a].field == "Tags" || columns[a].field == "Variant_Tags") {
                    columns[a].editor = Slick.Sitecore.Editors.Tags;
                }
            }

            // Evaluate the editor type for each column and set it
            for (i = 0; i < columns.length; i++) {
                if (columns[i]) {

                    if (columns[i]["editor"]) {
                        columns[i]["editor"] = eval(columns[i]["editor"]);
                    }

                    if (columns[i]["formatter"]) {
                        columns[i]["formatter"] = eval(columns[i]["formatter"]);
                    }
                }
            }

            columnModification.push(checkboxSelector.getColumnDefinition());
            columns.push.apply(columnModification, columns);

            var grid = new Slick.Grid(gridContainerId, dataView, columnModification, options);
            this.set("grid", grid);

            grid.setSelectionModel(new Slick.RowSelectionModel({ selectActiveRow: false }));
            grid.registerPlugin(checkboxSelector);

            grid.onBeforeEditCell.subscribe(function (e, args) {
                if (!self.isCellEditable(args.row, args.cell, args.item)) {
                    return false;
                }
            });

            grid.onCellChange.subscribe(function (e, args) {
                self.set("hasChanges", true);

                var column = args.grid.getColumns()[args.cell];
                var columnId = column.id;

                args.item.isDirty = true;

                if (!args.item.DirtyFields) {
                    args.item.DirtyFields = [];
                }

                args.item.DirtyFields.push(columnId);

                if (column.isShared) {
                    // Update edited Shared Fields
                    var editedSharedFields = self.get("editedSharedFields");
                    var itemSharedFields;
                    var targetSharedField = null;

                    // Check to see if this item/row is in the look-up alread (i.e. has one or more edited shared fields)
                    if (editedSharedFields[args.item.itemId]) {
                        itemSharedFields = editedSharedFields[args.item.itemId];
                    } else {
                        itemSharedFields = [];
                    }

                    // Check to see if the field currently being edited is already in the list
                    // of edited shared fields for this item
                    for (i = 0; i < itemSharedFields.length; i++) {
                        if (itemSharedFields[i].field == column.field) {
                            targetSharedField = itemSharedFields[i];
                            break;
                        }
                    }

                    // If the field currently being edited was found above, then update its current value
                    // Otherwise, create a new entry for the edited shared field containing the field name and
                    // the new current value and add it to the list.
                    if (targetSharedField) {
                        targetSharedField.currentValue = args.item[column.field];
                    } else {
                        var sharedField = { field: column.field, currentValue: args.item[column.field] };
                        itemSharedFields.push(sharedField);
                    }

                    editedSharedFields[args.item.itemId] = itemSharedFields;
                    self.set("editedSharedFields", editedSharedFields);

                    // Dispatch an event to allow listeners to act on the shared field edit for custom application purposes
                    $(document).trigger("onSlickGridSharedFieldEdited", [{ item: args.item, column: column, gridInstance: self }]);
                }
            });

            grid.onSelectedRowsChanged.subscribe(function (e, args) {
                self.trigger("selectedRowChanged", null);
                self.set("hasSelectedItems", grid.getSelectedRows().length > 0);
                self.set("hasSingleItemSelected", grid.getSelectedRows().length == 1);
            });

            $(grid.getContainerNode()).on('blur.editorFocusLost', 'input.editor-text', function (e) {
                window.setTimeout(function () {
                    if (!$(e.currentTarget).parent().hasClass("twowayDescDiv")) {
                        var focusedEditor = $("#" + grid.getContainerNode().id + " :focus");
                        if ((focusedEditor.length == 0) && Slick.GlobalEditorLock.isActive()) {
                            Slick.GlobalEditorLock.commitCurrentEdit();
                        }
                    }
                }, 0);

            });

            grid.onKeyDown.subscribe(function (e, args) {
                if (e.keyCode === 13 || e.keyCode === 32) {
                    var node = args.grid.getActiveCellNode();
                    if ($(node).hasClass("error-relationship-column") || $(node).hasClass("error-variant-column") || $(node).hasClass("link-to-item")) {
                        //trigger click event on column error
                        $(node).children()[0].click();
                        e.stopImmediatePropagation();
                    }
                }
            });

            $(grid.getContainerNode()).on('blur.editorFocusLost', 'select.editor-select', function (e) {
                window.setTimeout(function () {
                    var focusedEditor = $("#" + grid.getContainerNode().id + " :focus");
                    if ((focusedEditor.length == 0) && Slick.GlobalEditorLock.isActive()) {
                        Slick.GlobalEditorLock.commitCurrentEdit();
                    }
                }, 0);
            });

            $(grid.getContainerNode()).parents("div[data-sc-id*='Window']").children(".sc-dialogWindow-header").click(function () {
                Slick.GlobalEditorLock.commitCurrentEdit();
            })

            grid.onKeyDown.subscribe(function (event) {
                if (event.keyCode === 9 && event.shiftKey === false) {
                    if (grid.getActiveCell() != null) {
                        if (grid.getActiveCell().cell === (grid.getColumns().length - 1) && grid.getActiveCell().row === (grid.getData().getLength() - 1)) {
                            Slick.GlobalEditorLock.commitCurrentEdit();
                            var tabables = $("*[tabindex != '-1']:visible");
                            var index = tabables.index(grid.getActiveCellNode());
                            grid.resetActiveCell();
                            if (index == tabables.length - 1) {
                                tabables[0].focus();
                            } else {
                                if ($(tabables[index + 1]).children(":focusable")[0] != undefined) {
                                    $(tabables[index + 1]).children(":focusable")[0].focus();
                                } else { $(tabables[index + 1]).focus(); }
                            }
                            event.stopImmediatePropagation();
                        }
                    }
                }
            });

            dataView.onRowCountChanged.subscribe(function (e, args) {
                self.trigger("rowCountChanged", self.get("grid").getDataLength());
                self.get("grid").updateRowCount();
                self.get("grid").render();
                self.get("grid").resizeCanvas();
            });

            dataView.onRowsChanged.subscribe(function (e, args) {
                self.trigger("rowsChanged", null);
                self.get("grid").invalidateRows(args.rows);
                self.get("grid").render();
                self.get("grid").resizeCanvas();
            });

            dataView.setItems(items);

            grid.autosizeColumns();

        },

        setSupportedLanguageStyles: function () {
            var items = this.get("items");
            for (var i = 0; i < items.length; i++) {
                this.removeStyleToRow(i, "notSupportedLanguage");
                this.enableDisableCheckBox(i, false);
                if (!items[i].SupportsRequestedLanguage) {
                    this.addStyleToRow(i, "notSupportedLanguage");
                    this.enableDisableCheckBox(i, true);
                    $(this.get("grid").getCellNode(i, 0)).children("input").prop("checked", false);
                }
            }

        },

        getSelectedColumnsForPicker: function () {
            var self = this;
            var ajaxToken = {};
            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/GetWorkspaceColumnsForPicker",
                type: "POST",
                headers: ajaxToken,
                data: {
                    workspaceName: "Default",
                    entityType: this.get("entityType"),
                    controlFolder: this.get("controlMappings")
                },
                context: this,
                success: function (data) {
                    self.set("selectedColumns", data);

                }
            });
        },

        saveSelectedColumns: function (columns, refreshData) {
            var self = this;
            var ajaxToken = {};
            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            ajaxToken[token.headerKey] = token.value;

            var columnString = "";
            columns.forEach(function (entry) {
                if (columnString.length > 0) {
                    columnString += ";";
                }
                if (entry != undefined) {
                    columnString += entry.itemId + "," + entry.IsCollapsed;
                }
            });

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/SaveWorkspaceColumns",
                type: "POST",
                headers: ajaxToken,
                data: {
                    workspaceName: "Default",
                    entityType: this.get("entityType"),
                    columns: columnString
                },
                context: this,
                success: function (data) {
                    this.getTransformedColumns(refreshData);
                }
            });
        },

        dataRefreshed: function () {
            var items = this.get("items");
            this.get("dataView").setItems(items, "itemId");
        },

        getTransformedColumns: function (refreshData) {
            var self = this;
            var ajaxToken = {};
            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: "/sitecore/shell/commerce/merchandising/Workspace/GetWorkspaceColumns",
                type: "POST",
                headers: ajaxToken,
                data: {
                    workspaceName: "Default",
                    entityType: this.get("entityType"),
                    controlFolder: this.get("controlMappings")
                },
                context: this,
                success: function (data) {
                    this.set("columns", data);
                    this.initGrid();
                    if (refreshData && typeof (refreshData) === "function") {
                        refreshData();
                    }
                }
            });
        },

        selectedIndicies: function () {
            return this.get("grid").getSelectedRows();
        },

        selectedItemIds: function () {
            var ids = [];
            var items = this.selectedIndicies();
            var self = this;
            items.forEach(function (entry) {
                var item = self.get("dataView").getItemByIdx(entry);
                ids.push(item.itemId);
            });

            return ids;
        },

        selectedItems: function () {
            var fullItems = [];
            var items = this.selectedIndicies();
            var self = this;
            items.forEach(function (entry) {
                var item = self.get("dataView").getItemByIdx(entry);
                fullItems.push(item);
            });

            return fullItems;
        },

        deleteItem: function (itemId) {
            this.get("dataView").deleteItem(itemId);
            this.unselectAll();

            var currentLanguage = this.get("currentLanguage");
            var gridData = this.get("gridData");
            $.each(gridData.languages, function (languageName, data) {
                if (languageName != currentLanguage) {
                    gridData.languages[languageName] = $.grep(data, function (item, i) { return item.itemId != itemId; });
                }
            });
        },

        unselectAll: function () {
            this.get("grid").setSelectedRows([]);
        },

        modifiedItems: function () {
            var updatedItems = [];
            var items = this.get("items");

            for (var i = 0; i < items.length; i++) {
                if (items[i].isDirty) {
                    updatedItems.push(items[i]);
                }
            }

            return updatedItems;
        },

        getPayloadForSave: function (extensionFunction) {
            // Ensure all dirty shared fields have the latest updated value
            this.updateEditedSharedFieldsInAllLanguages();
            var payloadData = [];

            var gridData = this.get("gridData");
            var self = this;

            $.each(gridData.languages, function (languageName, items) {
                var languageItem = {};
                languageItem.Language = languageName;

                var itemsToUpdate = [];
                for (var i = 0; i < items.length; i++) {
                    var tempItem = items[i];
                    if (tempItem.isDirty) {
                        var updateItem = {
                            ItemId: tempItem.itemId,
                            Fields: []
                        };

                        // call the passed in function
                        if (extensionFunction) {
                            extensionFunction(tempItem, updateItem);
                        }

                        if (tempItem.DirtyFields) {
                            for (var j = 0; j < tempItem.DirtyFields.length; j++) {
                                var dirtyField = tempItem.DirtyFields[j];
                                var selectedColumn = self.getFieldNameByIdFromColumns(dirtyField);
                                updateItem.Fields.push({ FieldIdentifier: dirtyField, FieldValue: tempItem[selectedColumn.field] });
                            }
                        }

                        itemsToUpdate.push(updateItem);
                    }
                }
                languageItem.ItemsToUpdate = itemsToUpdate;
                payloadData.push(languageItem);

            });

            return payloadData;
        },

        getFieldNameByIdFromColumns: function (id) {
            var columns = Enumerable.From(this.get("grid").getColumns());
            return columns.Single(function (x) { return x.id == id });
        },

        addValidationStyle: function (itemId, fieldId) {
            var dataView = this.get("dataView");
            var row = dataView.getItemById(itemId);
            var columnIndex = this.findColumn(fieldId);
            row.errorStyle = "error" + columnIndex;
            dataView.updateItem(row.itemId, row);
        },

        setFocusOnCell: function (itemId, fieldId) {
            var dataView = this.get("dataView");
            var row = dataView.getItemById(itemId);
            var columnIndex = this.findColumn(fieldId);
            var rowIndex = dataView.getIdxById(itemId);
            this.get("grid").gotoCell(rowIndex, columnIndex, true);
        },

        findColumn: function (fieldId) {
            var columns = this.get("grid").getColumns();
            for (var i = 0 ; i < columns.length; i++) {
                if (columns[i].id == fieldId) {
                    return i;
                }
            }

            return null;
        },

        isCellEditable: function (row, cell, item) {
            var column = this.get("grid").getColumns()[cell].field;

            if (item.SupportsRequestedLanguage) {
                this.removeStyleToRow(row, "notSupportedLanguage");
                if (item._Security != null && item._Security[column] != null) {
                    return item._Security[column].CanWrite;
                }
            }

            return false;
        },

        enableDisableCheckBox: function (row, enable) {
            if (this.get("grid") != null) {
                $(this.get("grid").getCellNode(row, 0)).children("input").prop("disabled", enable);
            }
        },

        addStyleToRow: function (row, cssClass) {
            var columns = this.get("grid").getColumns();
            var cssObject = {};
            cssObject[row] = {};
            for (var i = 0; i < columns.length; i++) {
                cssObject[row][columns[i].id] = cssClass;
            }
            this.get("grid").removeCellCssStyles("rowStyle_" + row + "_" + cssClass);
            this.get("grid").addCellCssStyles("rowStyle_" + row + "_" + cssClass, cssObject);
        },

        removeStyleToRow: function (row, cssClass) {
            if (this.get("grid") != null) {
                this.get("grid").removeCellCssStyles("rowStyle_" + row + "_" + cssClass);
            }
        },

        addStyleToCell: function (row, columnName, cssClass) {
            var cssObject = {};
            cssObject[row] = {};
            cssObject[row][columnName] = cssClass;
            this.get("grid").removeCellCssStyles(row + "_" + columnName + "_" + cssClass);
            this.get("grid").addCellCssStyles(row + "_" + columnName + "_" + cssClass, cssObject);
        },

        removeStyleToCell: function (row, columName, cssClass) {
            this.get("grid").removeCellCssStyles(row + "_" + columnName + "_" + cssClass);
        },

        getItemById: function (itemId) {
            return this.get("dataView").getItemById(itemId);
        },

        getCurrentLanguage: function () {
            return this.get("currentLanguage");
        },

        getLanguages: function () {
            var gridData = this.get("gridData");
            var languages = [];
            $.each(gridData.languages, function (languageName, dataItems) {
                languages.push(languageName);
            });

            return languages;
        },

        hasLanguage: function (languageName) {
            var gridData = this.get("gridData");
            if (gridData.languages[languageName]) {
                return true;
            }

            return false;
        },

        setLanguage: function (languageName) {
            // Before we switch, update any edited shared fields
            this.updateEditedSharedFieldsInAllLanguages();
            var gridData = this.get("gridData");
            this.set("items", []);
            this.set("items", gridData.languages[languageName]);
            this.set("currentLanguage", languageName);
        },

        // Gets the data items for the specified language
        getDataItems: function (languageName) {
            var gridData = this.get("gridData");
            return gridData.languages[languageName];
        },

        // Adds data items for the specified language without switching the current language
        addDataItems: function (items, languageName) {
            var gridData = this.get("gridData");
            gridData.languages[languageName] = items;

            this.updateEditedSharedFieldsInAllLanguages();
        },

        setDataItems: function (items, languageName) {
            var gridData = this.get("gridData");
            gridData.languages[languageName] = items;

            this.updateEditedSharedFieldsInAllLanguages();

            this.set("items", []);
            this.set("items", gridData.languages[languageName]);
            this.set("currentLanguage", languageName);
        },

        clearDataItems: function () {
            var gridData = this.get("gridData");
            this.set("items", []);
            $.each(gridData.languages, function (key, data) {
                delete gridData.languages[key];
            });
        },

        clearState: function (extensionFunction) {
            this.clearEditedSharedFields();
            var gridData = this.get("gridData");
            var self = this;

            $.each(gridData.languages, function (languageName, items) {
                for (var i = 0; i < items.length; i++) {
                    var tempItem = items[i];
                    delete tempItem.isDirty;
                    delete tempItem.DirtyFields;
                    if (extensionFunction) {
                        extensionFunction(tempItem);
                    }
                }
            });
        },

        clearEditedSharedFields: function () {
            var editedSharedFields = this.get("editedSharedFields");

            $.each(editedSharedFields, function (itemId, itemEditedSharedFieldsArray) {
                delete editedSharedFields[itemId];
            });

            this.set("editedSharedFields", editedSharedFields);
        },

        updateEditedSharedFieldsInAllLanguages: function () {
            var currentLanguage = this.get("currentLanguage");
            var gridData = this.get("gridData");
            var editedSharedFields = this.get("editedSharedFields");

            // For each language except the current one, update the edited shared fields.
            $.each(gridData.languages, function (languageName, data) {
                if (languageName != currentLanguage) {
                    var dataItems = Enumerable.From(gridData.languages[languageName]);
                    $.each(editedSharedFields, function (itemId, itemEditedSharedFieldsArray) {

                        var matches = dataItems.Where(function (x) {
                            return x.itemId == itemId
                        }).ToArray();
                        if (matches && matches.length > 0) {
                            var dataItem = matches[0];

                            for (i = 0; i < itemEditedSharedFieldsArray.length; i++) {
                                var editedSharedField = itemEditedSharedFieldsArray[i];
                                if (dataItem[editedSharedField.field]) {
                                    dataItem[editedSharedField.field] = editedSharedField.currentValue;
                                }
                            }
                        }
                    });
                }
            });

            this.set("editedSharedFields", editedSharedFields);
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();
            var gridId = this.$el.attr("data-sc-gridId") || "";
            var entityType = this.$el.attr("data-sc-entityType") || "";
            var controlMappings = this.$el.attr("data-sc-controlMappings");
            
            this.model.set("gridId", gridId);
            this.model.set("entityType", entityType);
            this.model.set("controlMappings", controlMappings);
            this.model.getTransformedColumns();
            this.model.getSelectedColumnsForPicker();
            this.model.on("change:items", this.model.dataRefreshed, this.model);
        }
    });

    Sitecore.Factories.createComponent("SlickGrid", model, view, ".sc-SlickGrid");
});