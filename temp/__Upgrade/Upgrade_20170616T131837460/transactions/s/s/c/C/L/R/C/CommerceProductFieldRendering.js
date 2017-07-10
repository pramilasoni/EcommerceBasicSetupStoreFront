//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {

    Speak.component({
        name: "CommerceProductFieldRendering",

        initialize: function () {
            // Setup properties
        },

        initialized: function () {
            // Add eventlisteners
            var self = this;
            var button = $(this.el).find("button");
            button.click(function () {
                $.event.trigger('productPickerOpened', { productFieldRendering: self });
                return false;
            });

            this.on("change:Value", function () { self.setDisplayValue(); });
        },

        parseProductFieldValue: function () {
            var value = this.Value;
            if (value) {
                var tokens = value.split('|');

                if (!(tokens.length == 2 || tokens.length == 3)) {
                    return "";
                }
                
                var product = {
                    catalogName: tokens[0],
                    productId: tokens[1]
                };

                if (tokens.length > 2) {
                    product.variantId = tokens[2];
                }

                return product;
            }

            return "";
        },

        setDisplayValue: function () {
            var product = this.parseProductFieldValue();
            var displayValue = "";
            if (product) {
                displayValue = product.productId;
                if (product.variantId) {
                    displayValue += ", " + product.variantId;
                }
            }

            $(this.el).find("input[type=text]").val(displayValue);
        }
    });

})(Sitecore.Speak);