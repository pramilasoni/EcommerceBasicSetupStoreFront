//     Copyright (c) Sitecore Corporation 1999-2017
require.config({
    paths: {
        Sequencing: "/sitecore/shell/client/Applications/MerchandisingManager/Sequencing"
    }
});


define(["sitecore", "Sequencing"], function (Sitecore, seq) {
    var SequenceProductsDialog = seq.extend({
        initialized: function () {
            this.ProductItems.on("change:selectedItemId", this.updateProductButtons, this);
        },

        moveProductUp: function () {
            var dataSource = this.SortableProducts;
            var listControl = this.ProductItems;
            this.moveUp(dataSource, listControl);
            this.updateButtons(this.ProductItems);
        },

        moveProductDown: function () {
            var dataSource = this.SortableProducts;
            var listControl = this.ProductItems;
            this.moveDown(dataSource, listControl);
            this.updateButtons(this.ProductItems);
        },

        updateProductButtons: function () {
            this.updateButtons(this.ProductItems);
        },

        saveProductSequence: function () {
            var dataSource = this.SortableProducts;
            this.postSequencing(dataSource, "/sitecore/shell/commerce/merchandising/CommerceSequencing/UpdateProductRank");
        }
    });

    return SequenceProductsDialog;
});