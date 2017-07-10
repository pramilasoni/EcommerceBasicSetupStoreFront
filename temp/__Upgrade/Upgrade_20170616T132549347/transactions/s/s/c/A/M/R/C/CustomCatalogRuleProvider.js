//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore"], function (Sitecore) {
    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("dataurl", null);
            this.set("items", null);
            this.set("commerceitemid", null);

            this.on("change:commerceitemid", this.getRules, this);
        },

        getRules: function () {
            var id = this.get("commerceitemid");
            var dataUrl = this.get("dataurl");

            if (dataUrl && id) {
                var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
                var ajaxToken = {};
                ajaxToken[token.headerKey] = token.value;
                $.ajax({
                    url: dataUrl,
                    type: "POST",
                    headers: ajaxToken,
                    data: {
                        id: id
                    },
                    context: this,
                    error: CommerceUtilities.IsAuthenticated,
                    success: function (data) {
                        this.set("items", data.Items);
                    }
                });
            }
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();
            this.model.set("commerceitemid", this.$el.attr("data-sc-commerceitemid"));
            this.model.set("dataurl", this.$el.attr("data-sc-dataurl"));
            this.model.getRules();
        }
    });

    Sitecore.Factories.createComponent("CustomCatalogRuleProvider", model, view, ".sc-CustomCatalogRuleProvider");
});
