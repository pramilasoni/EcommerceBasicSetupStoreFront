define(["sitecore"], function (Sitecore) {
  var ConcurrencyDialog = Sitecore.Definitions.App.extend({
      initialized: function () {

      },

      cancelChanges: function () {
          _sc.trigger('sc-concurrency-cancel');
      },

      overridePreviousChanges: function () {
          _sc.trigger('sc-concurrency-override');
      }
  });

  return ConcurrencyDialog;
});