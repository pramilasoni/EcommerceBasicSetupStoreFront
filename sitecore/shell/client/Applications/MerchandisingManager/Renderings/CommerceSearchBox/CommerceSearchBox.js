//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore"], function (Sitecore) {
    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("items", null);
            this.set("searchTerm", null);
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({

        initialize: function (options) {
            this._super();

            var self = this;

            var id = this.$el.attr("data-sc-id") || "";
            var inputId = "#" + id + "-text";

            var handleKeyPressFunction = $.proxy(this.handleKeyPress, this);
            var setSuggestionsFunction = $.proxy(this.setSearchSuggestions, this);

            $(inputId).on("keyup", handleKeyPressFunction);
            self.model.on("change:items", setSuggestionsFunction);
        },

        handleKeyPress: function (event) {
            if (event.which != 13 && event.which != 38 && event.which != 40) {
                this.getSearchSuggestions(event);
            }
        },

        getSearchSuggestions: function (event, ui) {
            if (event && event.target) {
                var searchTerm = event.target.value;
                this.model.set("searchTerm", searchTerm);
            }
        },

        setSearchSuggestions: function () {

            var searchItems = this.model.get("items");

            var suggestions = null;
            if (searchItems !== null) {
                suggestions = $.map(searchItems, function (item, i) {
                    return {
                        label: item._displayname,
                        value: item.itemId
                    };
                });
            }

            var id = this.$el.attr("data-sc-id") || "";
            var inputId = "#" + id + "-text";

            var options = {
                minLength: 2,
                source: function (request, response) { response(suggestions); },
                focus: function (event, ui) {
                    $(inputId).val(ui.item.label);
                    return false;
                },
                messages: {
                    noResults: '',
                    results: function () { }
                }
            };

            $(inputId).autocomplete(options);

            var searchText = $(inputId).val();

            $(inputId).autocomplete("search", searchText);
        }
    });

    Sitecore.Factories.createComponent("CommerceSearchBox", model, view, ".sc-CommerceSearchBox");
});
