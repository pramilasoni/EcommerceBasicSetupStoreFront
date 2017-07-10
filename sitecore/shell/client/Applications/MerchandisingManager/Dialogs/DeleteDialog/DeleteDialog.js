define(["sitecore"], function (Sitecore) {
  var DeleteDialog = Sitecore.Definitions.App.extend({
    initialized: function () {
    },

    deleteSelected: function () {
        _sc.trigger('sc-deleteselected');
    },

    hideDialog: function () {
        _sc.trigger('sc-hide-deletealert');
    }
  });

  return DeleteDialog;
});