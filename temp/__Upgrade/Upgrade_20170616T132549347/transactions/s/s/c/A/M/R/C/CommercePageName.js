//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore"], function (Sitecore) {
    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("text", "");
            this.set("prefix", "");
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();
            this.model.on("change:text", this.setTitle, this);
            this.model.set("text", this.$el.attr("data-sc-text"));
            this.model.set("prefix", this.$el.attr("data-sc-prefix"));
        },

        setTitle: function () {
            document.title = this.model.get("text") + " - " + this.model.get("prefix");
        }
    });

    Sitecore.Factories.createComponent("CommercePageName", model, view, ".sc-CommercePageName");
});
