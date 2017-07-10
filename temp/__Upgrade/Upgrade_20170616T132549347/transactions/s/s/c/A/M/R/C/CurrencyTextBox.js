//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore"], function (Sitecore) {

    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("value", "");
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        clientUpdateInProgress: false,
        initialize: function (options) {
            this._super();
            this.model.on("change:value", this.onModelValueChanged, this);

            var rawValue = this.$el.attr("data-sc-value");
            this.model.set("value", rawValue);

            this.$el.change($.proxy(this.onInputValueChanged, this));
        },

        onInputValueChanged: function () {
            var currencyText = this.$el.val();
            var rawValueText = this.parseCurrencyValue(currencyText);
            
            this.clientUpdateInProgress = true;
            this.model.set("value", rawValueText);
            this.clientUpdateInProgress = false;
        },

        onModelValueChanged: function () {
            if (!this.clientUpdateInProgress) {
                var rawValue = this.model.get("value");
                var roundedValue = parseFloat(Math.round(rawValue * 100) / 100).toFixed(2).toString();
                this.$el.val(roundedValue);
                this.formatCurrencyValue();
            }
        },

        parseCurrencyValue: function (currencyValue) {
            var regionCurrencyFormat = CommerceUtilities.getCurrencyFormatForRegion();
            var decimalSymbol = regionCurrencyFormat.decimalSymbol;
            
            if (currencyValue && decimalSymbol != ".") {
                currencyValue = currencyValue.replace(decimalSymbol, ".");
            }

            return currencyValue;
        },

        formatCurrencyValue: function () {
            CommerceUtilities.formatElement(this.$el);
        }
    });

    Sitecore.Factories.createComponent("CurrencyTextBox", model, view, ".sc-CurrencyTextBox");
});
