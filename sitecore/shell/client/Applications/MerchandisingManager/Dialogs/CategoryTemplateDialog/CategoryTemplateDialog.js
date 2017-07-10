define(["sitecore"], function (Sitecore) {
  var CategoryTemplateDialog = Sitecore.Definitions.App.extend({
      initialized: function () {
          this.CategoryTemplateDataSource.set("isReady", true);
          this.CategoryTemplateDataSource.refresh();
    }
  });

  return CategoryTemplateDialog;
});