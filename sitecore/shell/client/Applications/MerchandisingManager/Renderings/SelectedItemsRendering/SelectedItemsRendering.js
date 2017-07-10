//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore"], function (Sitecore) {
    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("SelectedItemString", null);
            this.set("SelectedItemObject", null);
            this.on("change:SelectedItemString", this.transform, this);
        },

        transform: function () {
            var selectedItem = this.get("SelectedItemString");
            if (selectedItem) {
                var innerItem = selectedItem.attributes;
                var array = [];
                array.push(innerItem);
                this.set("SelectedItemObject", array);
            }
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();
        }
    });

    Sitecore.Factories.createComponent("SelectedItemsRendering", model, view, ".sc-SelectedItemsRendering");
});
