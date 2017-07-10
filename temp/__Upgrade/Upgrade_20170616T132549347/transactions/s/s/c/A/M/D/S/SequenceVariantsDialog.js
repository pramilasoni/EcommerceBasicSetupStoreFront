//     Copyright (c) Sitecore Corporation 1999-2017
require.config({
    paths: {
        Sequencing: "/sitecore/shell/client/Applications/MerchandisingManager/Sequencing"
    }
});

define(["sitecore", "Sequencing"], function (Sitecore, seq) {
    var SequenceVariantsDialog = seq.extend({
        initialized: function () {
            this.VariantItems.on("change:selectedItemId", this.updateVariantButtons, this);
        },

        moveVariantUp: function () {
            var dataSource = this.SortableVariants;
            var listControl = this.VariantItems;
            this.moveUp(dataSource, listControl);
            this.updateButtons(this.VariantItems);
        },

        moveVariantDown: function () {
            var dataSource = this.SortableVariants;
            var listControl = this.VariantItems;
            this.moveDown(dataSource, listControl);
            this.updateButtons(this.VariantItems);
        },

        updateVariantButtons: function () {
            this.updateButtons(this.VariantItems);
        },

        saveVariantSequence: function () {
            var dataSource = this.SortableVariants;
            this.postSequencing(dataSource, "/sitecore/shell/commerce/merchandising/CommerceSequencing/UpdateVariantRank");
        }
    });

    return SequenceVariantsDialog;
});