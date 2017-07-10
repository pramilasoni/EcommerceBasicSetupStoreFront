//     Copyright (c) Sitecore Corporation 1999-2017
require.config({
    paths: {
        Sequencing: "/sitecore/shell/client/Applications/MerchandisingManager/Sequencing"
    }
});


define(["sitecore", "Sequencing"], function (Sitecore, seq) {
    var SequenceRelationshipsDialog = seq.extend({
        initialized: function () {
            this.RelationshipItems.on("change:selectedItemId", this.updateRelationshipButtons, this);
        },

        moveRelationshipUp: function () {
            var dataSource = this.SortableRelationships;
            var listControl = this.RelationshipItems;
            this.moveUp(dataSource, listControl);
            this.updateButtons(this.RelationshipItems);

        },

        moveRelationshipDown: function () {
            var dataSource = this.SortableRelationships;
            var listControl = this.RelationshipItems;
            this.moveDown(dataSource, listControl);
            this.updateButtons(this.RelationshipItems);
        },

        updateRelationshipButtons: function () {
            this.updateButtons(this.RelationshipItems);
        },

        saveRelationshipSequence: function () {
            var dataSource = this.SortableRelationships;
            this.postSequencing(dataSource, "/sitecore/shell/commerce/merchandising/CommerceSequencing/UpdateRelationshipRank");
        }
    });

    return SequenceRelationshipsDialog;
});