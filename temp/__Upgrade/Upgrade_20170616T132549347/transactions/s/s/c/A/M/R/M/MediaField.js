//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore"], function (Sitecore) {
    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("mediaItemId", null);
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();
            this.model.on("change:mediaItemId", this.updateMediaItemDisplayName, this);

            // Assign handlers for button click events
            var renderingId = this.$el.attr("data-sc-id");
            var mediaItemId = this.$el.attr("data-sc-mediaItemId");

            this.model.set("mediaItemId", mediaItemId);

            var selectButtonId = renderingId + "SelectButton";
            var clearButtonId = renderingId + "ClearButton";

            var selectMediaItemHandler = $.proxy(this.selectMediaItemClicked, this);
            var clearMediaItemHandler = $.proxy(this.clearMediaItemClicked, this);

            $("[data-sc-id='" + selectButtonId + "']").click(selectMediaItemHandler);
            $("[data-sc-id='" + clearButtonId + "']").click(clearMediaItemHandler);
        },

        updateMediaItemDisplayName: function () {
            var mediaItemId = this.model.get("mediaItemId");
            var textInput = this.$el.find("input");

            if (!textInput) {
                return;
            }

            if (mediaItemId) {
                var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
                var ajaxToken = {};
                ajaxToken[token.headerKey] = token.value;
                $.ajax({
                    url: "/sitecore/shell/commerce/merchandising/CommerceSearch/GetItem",
                    headers: ajaxToken,
                    data: {
                        id: mediaItemId
                    },
                    type: "POST",
                    context: this,
                    success: function (data) {
                        textInput.val(data.DisplayName);
                    },
                    error: function (result, textStatus, errorThrown) {
                        // Fall back to display item id in text box if display name could not be retrieved
                        textInput.val(mediaItemId);
                    if (result.status === 401) {
                        _sc.Helpers.session.unauthorized();
                        return;
                    }
                } 
                });
            }
        },

        selectMediaItemClicked: function () {
            this.selectMediaEvent();
        },

        clearMediaItemClicked: function () {
            this.model.set("mediaItemId", null);
            this.model.set("mediaItemDisplayName", null);
        },

        selectMediaEvent: function () {
            this.app.trigger("selectMediaEvent", this);
        }
    });

    Sitecore.Factories.createComponent("MediaField", model, view, ".sc-MediaField");
});
