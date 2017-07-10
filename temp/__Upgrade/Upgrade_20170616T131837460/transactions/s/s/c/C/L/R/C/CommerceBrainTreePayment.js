//     Copyright (c) Sitecore Corporation 1999-2017
// jshint ignore: start
(function (Speak) {

    requirejs.config({
        paths: {
            'braintree': 'https://js.braintreegateway.com/js/braintree-2.31.0'
        }
    });

    Speak.component(['braintree'], function (braintree) {
        return {
            initialize: function () {
                // Setup properties
            },

            initialized: function () {
                // Add eventlisteners
                this.on("change:ClientToken", $.proxy(this.setupBrainTree, this));
                this.on("change:PaymentMethodNonce", $.proxy(this.updateFormLevelNonce, this));
            },

            setupBrainTree: function () {
                if (this.ClientToken) {
                    // Remove any existing contents of the drop-in container
                    $("#dropin-container").html("");

                    var clientToken = this.ClientToken;
                    var self = this;

                    braintree.setup(clientToken, "dropin", {
                        container: "dropin-container",
                        paymentMethodNonceReceived: function (event, nonce) {
                            self.PaymentMethodNonce = nonce;
                        }
                    });
                }
            },

            reset: function () {
                this.setupBrainTree();
                this.PaymentMethodNonce = "";
            },

            updateFormLevelNonce: function () {
                if (this.app.parent.CommerceForm.CF_PaymentMethodNonce && this.app.parent.CommerceForm.CF_PaymentMethodNonce != "undefined") {
                    this.app.parent.CommerceForm.CF_PaymentMethodNonce.Value = this.PaymentMethodNonce;
                }
            }
        };
    }, "CommerceBrainTreePayment");

})(Sitecore.Speak);