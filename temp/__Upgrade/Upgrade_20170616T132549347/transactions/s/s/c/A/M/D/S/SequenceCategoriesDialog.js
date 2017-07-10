//     Copyright (c) Sitecore Corporation 1999-2017
require.config({
    paths: {
        Sequencing: "/sitecore/shell/client/Applications/MerchandisingManager/Sequencing"
    }
});

define(["sitecore", "Sequencing"], function (Sitecore, seq) {
    var SequenceCategoriesDialog = seq.extend({
        initialized: function () {
            this.CategoryItems.on("change:selectedItemId", this.updateCategoryButtons, this);
        },

        moveCategoryUp: function () {
            var dataSource = this.SortableCategories;
            var listControl = this.CategoryItems;
            this.moveUp(dataSource, listControl);
            this.updateButtons(this.CategoryItems);
        },

        moveCategoryDown: function () {
            var dataSource = this.SortableCategories;
            var listControl = this.CategoryItems;
            this.moveDown(dataSource, listControl);
            this.updateButtons(this.CategoryItems);
        },

        updateCategoryButtons: function () {
            this.updateButtons(this.CategoryItems);
        },

        saveCategorySequence: function () {
            var dataSource = this.SortableCategories;
            this.postSequencing(dataSource, "/sitecore/shell/commerce/merchandising/CommerceSequencing/UpdateCategoryRank");
        }
    });

    return SequenceCategoriesDialog;
});