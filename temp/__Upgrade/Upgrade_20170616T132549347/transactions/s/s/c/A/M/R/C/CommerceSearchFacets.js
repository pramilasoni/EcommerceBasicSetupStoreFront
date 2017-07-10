//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore"], function (Sitecore) {

    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("facets", null);
            this.set("facetCriteria", "");
            this.set("isVisible", true);
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();
            this.model.on("change:facets", this.render, this);
            this.isListPrice = function (facetValue) {
                if ($.isNumeric(facetValue)) {

                    return parseFloat(facetValue).toFixed(2);
                }

                return facetValue;
            };

        },

        facetClicked: function (facetValue, event, facet) {
            if (facet && facetValue) {
                var facetNameValue = facet.Name + "=" + facetValue.Name;
                var facetCriteria = this.model.get("facetCriteria");

                if (facetCriteria === null || facetCriteria.indexOf(facetNameValue) == -1) {
                    if (facetCriteria === null || facetCriteria.length === 0) {
                        facetCriteria = facetNameValue;
                    } else {
                        facetCriteria = facetCriteria + "&" + facetNameValue;
                    }

                } else {
                    facetCriteria = facetCriteria.replace(facetNameValue, '');

                    if (facetCriteria.indexOf("=") == -1) {
                        facetCriteria = "";
                    }
                }

                this.model.set("facetCriteria", facetCriteria);
            }
        },

        isFacetSelected: function (facetValue, facet) {

            var facetCriteria = this.model.get("facetCriteria");

            if (facetValue && facet && facetCriteria) {
                var facetNameValue = facet.Name + "=" + facetValue.Name;

                return (facetCriteria.indexOf(facetNameValue) != -1);
            }

            return false;
        },

        clearFacets: function () {
            this.model.set("facetCriteria", null);
        }
    });

    Sitecore.Factories.createComponent("CommerceSearchFacets", model, view, ".sc-CommerceSearchFacets");
});
