//     Copyright (c) Sitecore Corporation 1999-2017
/// <reference path="../../../../../../assets/vendors/KnockOut/knockout-2.1.0.js" />
/* jshint unused: vars */
require.config({
    paths: {
        jqueryui: "/sitecore/shell/client/Speak/Assets/lib/ui/1.1/deps/jQueryUI/jquery-ui-1.10.1.custom",
        fastLiveFilter: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/jquery.fastLiveFilter"
    }
});

define(["sitecore", "knockout", "jqueryui", "fastLiveFilter"], function (Sitecore, ko, jqueryui, fastLiveFilter) {
    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("columns", null);
            this.set("selectedColumns", null);
            this.set("newColumns", []);
            this.set("removedColumns", []);
        },

        saveSelected: function () {
            // Set the property on the related grid 
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();
            this.model.on("change:columns", this.render, this);
            this.model.on("change:selectedColumns", this.render, this);
        },


        cleanAvailableColumns: function () {
            var self = this;
            if (this.model.get("columns") != undefined && this.model.get("columns").length > 0) {
                if (this.model.get("selectedColumns") != undefined && this.model.get("selectedColumns").length > 0) {
                    var selected = this.model.get("selectedColumns");
                    var newColumns = this.model.get("columns");
                    for (var i = 0; i < selected.length; i++) {
                        var id1 = selected[i]["itemId"];
                        for (var i2 = 0; i2 < newColumns.length; i2++) {
                            if (id1 == newColumns[i2]["itemId"]) {
                                newColumns.splice(i2, 1);
                                break;
                            }
                        }
                    }
                    this.model.set("columns", []);
                    this.model.set("columns", newColumns);
                }
            }
        },

        render: function () {
            var self = this;
            if (this.model.get("selectedColumns") == undefined) {
                this.model.set("selectedColumns", []);
            }
            this.$el.find(".sc-filterColumn-list").sortable({
                connectWith: this.$el.find(".sc-selectedColumn-list"), handle: ".handle", receive: function (event, ui) {
                    $.each(self.model.get("selectedColumns"), function (index, val) {
                        if (val != undefined) {
                            if (val.itemId == ui.item.attr("sc-li-id")) {
                                self.model.get("selectedColumns").splice(index, 1);
                                val.oldIndex = index;
                                self.model.get("removedColumns").push(val);
                                var index = 0;
                                $.grep(self.model.get("columns"), function (e, n) { if (e.itemId == ui.item.prev().attr("sc-li-id")) { index = n + 1; return e; } });
                                self.model.get("columns").splice(index, 0, val);
                                self.$el.find('.sc-filterColumn-search').fastLiveFilter(self.$el.find('.sc-filterColumn-list'));
                            }
                        }
                    });

                }
            }).selectable({
                filter: "li.column-item", cancel: ".handle", selected: function (event, ui) {
                    $(ui.selected).addClass("ui-selected").siblings().removeClass("ui-selected").each(
                        function (key, value) {
                            $(value).find('*').removeClass("ui-selected");
                        }
                    );
                }
            })

            this.$el.find(".sc-selectedColumn-list").sortable({
                connectWith: this.$el.find(".sc-filterColumn-list"), handle: ".handle", stop: function (event, ui) {
                    var id = ui.item.attr("sc-li-id");
                    var newIndex = ui.item.index();
                    $.each(self.model.get("selectedColumns"), function (index, val) {
                        if (val != undefined && val.itemId == id) {
                            var tmp = self.model.get("selectedColumns")[index];
                            self.model.get("selectedColumns")[index] = self.model.get("selectedColumns")[newIndex];
                            self.model.get("selectedColumns")[newIndex] = tmp;
                            return false;

                        }
                    });

                }, receive: function (event, ui) {
                    $.each(self.model.get("columns"), function (index, val) {
                        if (val.itemId == ui.item.attr("sc-li-id")) {
                            self.model.get("selectedColumns").push(val);
                            self.model.get("newColumns").push(val);
                            self.$el.find('.sc-filterColumn-search').fastLiveFilter(self.$el.find('.sc-filterColumn-list'));
                        }
                    });
                }
            }).selectable({
                filter: "li.column-item", cancel: ".handle", selected: function (event, ui) {
                    $(ui.selected).addClass("ui-selected").siblings().removeClass("ui-selected").each(
                        function (key, value) {
                            $(value).find('*').removeClass("ui-selected");
                        }
                    );
                }
            })

            this.$el.find(".sc-columnList").children("li.column-item").addClass("ui-corner-all").prepend("<div class='handle'><span class='ui-icon ui-icon-carat-2-n-s'></span></div>");

            this.$el.find('.sc-filterColumn-search').fastLiveFilter(this.$el.find('.sc-filterColumn-list'));

            this.$el.find('.sc-filterColumn-search').on("search", function (event, send) {
                $(this).trigger("change");
                event.stopImmediatePropagation();
            });

            this.$el.find(".addButton").unbind('click').click(function () {
                var picker = $(this).parent().parent();
                var selected = picker.find(".sc-filterColumn-list").children("li.ui-selected").attr("sc-li-id");

                if (selected != undefined) {
                    $.each(self.model.get("columns"), function (index, val) {

                        if (val != undefined && val.itemId == selected) {
                            self.model.get("selectedColumns").push(val);
                            self.model.get("newColumns").push(val);
                        }
                    });

                    picker.find(".sc-selectedColumn-list").append(picker.find(".sc-filterColumn-list").children("li.ui-selected"));
                    picker.find(".sc-filterColumn-list").children("li.ui-selected").remove();
                    picker.find(".sc-selectedColumn-list").children("li.ui-selected").removeClass("ui-selected");
                    picker.find('.sc-filterColumn-search').fastLiveFilter(picker.find('.sc-filterColumn-list'));

                }
            });

            this.$el.find(".removeButton").unbind('click').click(function () {
                var picker = $(this).parent().parent();
                var selected = picker.find(".sc-selectedColumn-list").children("li.ui-selected").attr("sc-li-id");
                if (selected != undefined) {
                    $.each(self.model.get("selectedColumns"), function (index, val) {
                        if (val != undefined && val.itemId == selected) {
                            self.model.get("selectedColumns").splice(index, 1);
                            val.oldIndex = index;
                            self.model.get("removedColumns").push(val);
                            self.model.get("columns").splice(index, 0, val);
                        }
                    });
                    picker.find(".sc-filterColumn-list").prepend(picker.find(".sc-selectedColumn-list").children("li.ui-selected"));
                    picker.find(".sc-selectedColumn-list").children("li.ui-selected").remove();
                    picker.find(".sc-filterColumn-list").children("li.ui-selected").removeClass("ui-selected");
                    picker.find('.sc-filterColumn-search').fastLiveFilter(picker.find('.sc-filterColumn-list'));
                }
            });

            this.$el.find(".moveUp").unbind('click').click(function () {
                var picker = $(this).parent().parent();
                var selected = picker.find(".sc-selectedColumn-list").children("li.ui-selected");
                if (selected != undefined && selected.length == 1) {
                    var id = selected.attr("sc-li-id");
                    $.each(self.model.get("selectedColumns"), function (index, val) {
                        if (val != undefined && val.itemId == id && index > 0) {
                            var tmp = self.model.get("selectedColumns")[index];
                            self.model.get("selectedColumns")[index] = self.model.get("selectedColumns")[index - 1]
                            self.model.get("selectedColumns")[index - 1] = tmp;
                            selected.insertBefore(selected.prev());

                            return false;
                        }
                    });
                }
            });

            this.$el.find(".moveDown").unbind('click').click(function () {
                var picker = $(this).parent().parent();
                var selected = picker.find(".sc-selectedColumn-list").children("li.ui-selected");

                if (selected != undefined && selected.length == 1) {
                    var id = selected.attr("sc-li-id");
                    var length = self.model.get("selectedColumns").length;
                    $.each(self.model.get("selectedColumns"), function (index, val) {
                        if (val != undefined && val.itemId == id && index < length -1 ) {
                            var tmp = self.model.get("selectedColumns")[index];
                            self.model.get("selectedColumns")[index] = self.model.get("selectedColumns")[index + 1]
                            self.model.get("selectedColumns")[index + 1] = tmp;
                            selected.insertAfter(selected.next());

                            return false;
                        }
                    });
                }
            });
        }
    });

    Sitecore.Factories.createComponent("ColumnPicker", model, view, ".sc-ColumnPicker");
});
