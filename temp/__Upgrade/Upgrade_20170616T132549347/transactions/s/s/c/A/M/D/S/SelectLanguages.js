//     Copyright (c) Sitecore Corporation 1999-2017
define(["sitecore"], function (Sitecore) {
    var SelectLanguages = Sitecore.Definitions.App.extend({
        initialized: function () {
            this.LanguagesFilterTextBox.on("change", this.filterLanguagesList, this);
            this.SelectLanguagesDataSource.set("isReady", true);
            this.SelectLanguagesDataSource.refresh();
        },

        filterLanguagesList: function () {
            if (this.LanguagesFilterTextBox) {
                var filterText = this.LanguagesFilterTextBox.get("text");

                if (filterText) {
                    filterText = filterText.trim();
                }

                this.SelectLanguagesDataSource.set("searchTerm", filterText);
            }
        }
    });

    return SelectLanguages;
});