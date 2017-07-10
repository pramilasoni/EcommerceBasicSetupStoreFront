/// <reference path="../../../../../../assets/vendors/lodash/lodash.min.js" />
/// <reference path="../../../../../../assets/vendors/Backbone/backbone.js" />
/// <reference path="../../../../../../assets/lib/dist/sitecore.js" />
/// <reference path="../../../../../../assets/vendors/KnockOut/knockout-2.1.0.js" />
//     Copyright (c) Sitecore Corporation 1999-2017
/*
* Local Storage
* Styling
* Close when clicking outside
* BDD tests
*/
/* jshint unused: vars */
define(["sitecore", "knockout", "bootstrap"], function (Sitecore, ko) {
    var CommandModel = function () {
        this.id = new ko.observable("");
        this.title = new ko.observable("");
        this.click = new ko.observable("");
    };

    CommandModel.prototype.invoke = function (app) {
        var click = this.click();
        if (click) {
            Sitecore.Helpers.invocation.execute(click, { control: this, app: app });
        }
    };

    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("commands", []);
            this.set("axis", "");
            //120px (First element in ActionBar) Set this in the CommerceContextGroup Item
            //180px (Second element in ActionBar)
            //230px (Third element in ActionBar)
            //290px (Fourth element in ActionBar)
        },

    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();

            var commands = this.$el.find("[data-sc-commandid]").map(function () {
                var command = new CommandModel();

                command.id($(this).attr("data-sc-commandid"));
                command.title($(this).text());

                command.click($(this).attr("data-sc-click"));


                return command;
            });

            this.model.set("commands", commands);
            this.model.set("axis", this.$el.attr("data-sc-axis"));
        },


        invokeEvent: function (command) {
            var clickedCommand = this.model.get("commands")[command];

            clickedCommand.invoke(this.app);

        },
    });

    Sitecore.Factories.createComponent("CommerceContextMenu", model, view, ".sc-CommerceContextMenu");
});