define(["sitecore"], function (Sitecore) {
    var PromptSaveChangesDialog = Sitecore.Definitions.App.extend({
        initialized: function () {
        },

        closeDialog: function () {
            _sc.trigger('sc-hide-promptsavechangesdialog');
        }
    });

    return PromptSaveChangesDialog;
});