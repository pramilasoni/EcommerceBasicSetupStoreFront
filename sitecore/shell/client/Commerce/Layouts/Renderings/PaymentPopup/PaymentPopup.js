//     Copyright (c) Sitecore Corporation 1999-2017
// jshint ignore: start
(function (Speak) {
    Speak.pageCode([], function () {
        return {

            initialize: function () {
                this.defineProperty("ClientToken", null);
                this.defineProperty("PaymentNonce", null);

                this.on("change:ClientToken", $.proxy(function () { this.setClientToken(this.ClientToken); }, this));
                this.OKButton.on("click", $.proxy(this.onOKClicked, this));
                this.CancelButton.on("click", $.proxy(this.onCancelClicked, this));
            },

            initialized: function () {

            },

            setClientToken: function (clientToken) {
                this.CommerceBrainTree.ClientToken = clientToken;
            },

            onOKClicked: function () {
                this.parent.PaymentPopupContainer.IsVisible = false;

                if (this.CommerceBrainTree.PaymentMethodNonce) {
                    // Only set the validation state of the parent form to completed if a payment nonce has been received.
                    this.parent.CommerceForm.CF_PaymentLauncher.setValidationCompleteState();
                }
            },

            onCancelClicked: function () {
                this.CommerceBrainTree.reset();
                this.parent.PaymentPopupContainer.IsVisible = false;
            }
        };
    }, "PaymentPopup");
})(Sitecore.Speak);