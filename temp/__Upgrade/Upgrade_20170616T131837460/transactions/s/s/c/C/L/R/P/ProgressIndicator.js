//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {
    Speak.component({
        name: "ProgressIndicator",


        initialize: function () {
            // Setup properties

        },

        initialized: function () {
            // Setup properties
            var self = this;
            self.hideSpinner();
            this.$el = $(this.el);

        },

        showSpinner: function () {
            $(this.el).css("display", "block");
        },

        hideSpinner: function () {
            $(this.el).css("display", "none");
        }
    });

})(Sitecore.Speak);