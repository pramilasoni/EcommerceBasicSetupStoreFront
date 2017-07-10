//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore"], function (Sitecore) {
    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("sitename", "");
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();
            this.model.set("sitename", this.$el.attr("data-sc-sitename"));
        }
    });

    Sitecore.Factories.createComponent("CommerceSiteName", model, view, ".sc-CommerceSiteName");
});
