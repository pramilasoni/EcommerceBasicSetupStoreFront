define(["sitecore"], function (Sitecore) {
  var ProductTemplateDialog = Sitecore.Definitions.App.extend({
      initialized: function () {
          this.ProductTemplateDataSource.set("isReady", true);
          this.ProductTemplateDataSource.refresh();
    }
  });

  return ProductTemplateDialog;
});