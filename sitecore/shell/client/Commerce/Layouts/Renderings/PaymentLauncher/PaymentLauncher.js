//     Copyright (c) Sitecore Corporation 1999-2017
// jshint ignore: start
(function (Speak) {

    Speak.component({
        name: "PaymentLauncher",

        initialize: function () {

        },

        initialized: function () {
            $("#paymentSubAppValidationComplete").hide();
            $("#paymentSubAppButton").on("click", $.proxy(this.launch, this));
        },

        launch: function () {
            if (this.ClientToken) {
                var self = this;
                var token = this.ClientToken;

                this.app.PaymentPopupContainer.IsVisible = true;
                this.app.PaymentPopup.ClientToken = token;

                $(self.app.PaymentPopupContainer.el).css('top', $("#paymentSubAppButton").offset().top - 100);
                $(self.app.PaymentPopupContainer.el).css('left', $("#paymentSubAppButton").offset().left);
            }
        },

        setValidationCompleteState: function () {
            $("#paymentSubAppLauncherDiv").hide();
            $("#paymentSubAppValidationComplete").show();
        }
    });

})(Sitecore.Speak);