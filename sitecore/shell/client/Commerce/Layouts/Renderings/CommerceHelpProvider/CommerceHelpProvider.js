//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {
    Speak.component([], function () {

        return {
            initialized: function () {
                this.$el = $(this.el);
                this.PageID = this.$el.attr("data-sc-pageid");
            },

            openHelp: function () {
                this.$el = $(this.el);
                var url = "/sitecore/shell/commerce/tools/CommerceHelp/Document?folderId=" + this.FolderID + "&pageId=" + this.PageID + "&tabId=" + this.TabID;
                window.open(url);
            }
        };
    }, "CommerceHelpProvider");

})(Sitecore.Speak);