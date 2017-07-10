//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {

    Speak.component({
        name: "PriceTiersEditor",

        initialize: function () {
            this.defineProperty("Currency", "");
            this.defineProperty("AvailableCurrencies", []);
            this.defineProperty("PriceTiers", []);
            this.defineProperty("UpdatingFromUI", false);
            this.defineProperty("GroupSeparator", "");
            this.defineProperty("DecimalSeparator", "");
        },

        initialized: function () {
            // Add event handler for add tier button
            var self = this;
            var editorElement = this.el;
            $(editorElement).find("#AddTierButton").click(function () {
                $('#PricingTiersTable tr:last').after('<tr class=\"PricingTierRow\"><td><input class=\"TierQtyCell\" type="text" /></td><td><input class=\"TierPriceCell\" type="text" /></td></tr>');
                self.assignTierCellValidationHandlers();
                $("#PricingTiersTable > tbody > tr.PricingTierRow:last-child > td > input.TierQtyCell").focus();
            });

            this.on("change:AvailableCurrencies", $.proxy(this.refreshAvailableCurrencies, this));
            this.on("change:Currency", $.proxy(this.refreshCurrency, this));
            this.on("change:PriceTiers", $.proxy(this.refreshTiers, this));
            this.GroupSeparator = $(this.el).attr('data-sc-groupSeparator');
            this.DecimalSeparator = $(this.el).attr('data-sc-decimalSeparator');
        },

        refreshAvailableCurrencies: function () {
            $("#PriceTiersCurrencySelect").empty();
            var availableCurrencies = this.AvailableCurrencies;
            for (var i = 0; i < availableCurrencies.length; i++) {
                var option = $('<option>' + availableCurrencies[i].DisplayName + '</option>').attr("value", availableCurrencies[i].Name);
                $("#PriceTiersCurrencySelect").append(option);
            }
        },

        refreshCurrency: function () {
            var currency = this.Currency;
            
            // Edit currency row scenario
            if (this.AvailableCurrencies.length == 0) {
                var currency = this.Currency;
                var option = $('<option>' + currency + '</option>').attr("value", currency);
                $("#PriceTiersCurrencySelect").empty().append(option);
            }

            $(PriceTiersCurrencySelect).val(currency);
        },

        refreshTiers: function () {
            if (!this.UpdatingFromUI) {
                // Clear any existing rows in the body
                $(".PricingTierRow").remove();

                for (var i = 0; i < this.PriceTiers.length; i++) {
                    var priceTier = this.PriceTiers[i];

                    if (priceTier.Price == null) {
                        priceTier.Price = "";
                    }

                    var tierQty = priceTier.Quantity;
                    var tierPrice = priceTier.Price;

                    $('#PricingTiersTable tr:last').after("<tr class=\"PricingTierRow\"><td><input class=\"TierQtyCell\" type=\"text\" value=\"" + tierQty + "\" /></td><td><input class=\"TierPriceCell\" type=\"text\" value=\"" + tierPrice + "\" /></td></tr>");
                }

                this.assignTierCellValidationHandlers();
            }
        },

        updateDataModelFromUI: function () {
            this.UpdatingFromUI = true;
            this.PriceTiers = [];
            var self = this;
            $("#PricingTiersTable tr.PricingTierRow").each(function () {
                var tierQty = $(this).find("input:first").val();
                var tierPrice = $(this).find("input:last").val();
                self.PriceTiers.push({ Quantity: tierQty, Price: tierPrice });
            });

            this.Currency = $("#PriceTiersCurrencySelect").val();

            this.UpdatingFromUI = false;
        },

        getDataModel: function () {

            this.updateDataModelFromUI();

            var dataModel = {};
            dataModel.Currency = this.Currency;
            dataModel.PriceTiers = this.PriceTiers;

            return dataModel;
        },

        setDataModel: function (dataModel) {
            this.AvailableCurrencies = dataModel.AvailableCurrencies;
            this.Currency = dataModel.Currency;
            this.PriceTiers = dataModel.PriceTiers;
        },

        reset: function () {
            this.Currency = "";
            this.PriceTiers = [];
            $("#PriceTiersCurrencySelect").empty();
            $("#PriceTierEditorErrorMessageLabel").text("");
        },

        assignTierCellValidationHandlers: function () {
            var self = this;
            $(".TierQtyCell").unbind("blur");
            $(".TierQtyCell").bind("blur", $.proxy(self.validateTierQtyCell, self));

            $(".TierPriceCell").unbind("blur");
            $(".TierPriceCell").bind("blur", $.proxy(self.validateTierPriceCell, self));
        },

        validateTierQtyCell: function (e) {
            var targetValue = e.target.value;
            var self = this;

            if (targetValue) {
                targetValue = targetValue.replace(self.GroupSeparator, "").replace(self.DecimalSeparator, ".");
            }

            if (!e.target.value) {
                this.setFormError(e.target, this.QuantityRequiredErrorText);
            } else if (isNaN(targetValue) || parseFloat(targetValue) <= 0.0) {
                this.setFormError(e.target, this.QuantityFormatErrorText);
            } else {
                this.clearFormError(e.target);
            }
        },

        validateTierPriceCell: function (e) {
            var targetValue = e.target.value;
            var self = this;

            if (targetValue) {
                targetValue = targetValue.replace(self.GroupSeparator, "").replace(self.DecimalSeparator, ".");
            }

            if (isNaN(targetValue) || parseFloat(targetValue) <= 0.0) {
                this.setFormError(e.target, this.PriceFormatErrorText);
            } else {
                this.clearFormError(e.target);
            }
        },

        setFormError: function (formField, message) {
            $(formField).addClass("priceTiersInputError");
            $("#PriceTierEditorErrorMessageLabel").text(message);
        },

        clearFormError: function (formField) {
            $(formField).removeClass("priceTiersInputError");
            $("#PriceTierEditorErrorMessageLabel").text("");
        },

        hasErrors: function () {
            return $(".priceTiersInputError").length > 0;
        }
    });

})(Sitecore.Speak);