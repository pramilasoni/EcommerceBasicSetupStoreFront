//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore", "knockout"], function (Sitecore, ko) {
    var SequencingUtils = Sitecore.Definitions.App.extend({
        arrayMove: function (array, from, to) {
            array.splice(to, 0, array.splice(from, 1)[0]);
        },

        findItem: function (selectedItemId) {
            return function (element) {
                if (element.itemId == selectedItemId) {
                    return true;
                }
            };
        },

        moveDown: function (dataSource, listControl) {
            var items = dataSource.get("items");
            var selectedItemId = listControl.get("selectedItemId");
            var selectedItemInDataSource = items.filter($.proxy(this.findItem(selectedItemId), this));
            var selectedItemIndexInDataSource = items.indexOf(selectedItemInDataSource[0]);

            // Find the item just before the selected item in the data source
            var itemJustAfterTheSelectedItems = items[selectedItemIndexInDataSource + 1];

            // Swap their rank properties
            var selectedItemRank = selectedItemInDataSource[0].Rank;
            var otherItemRank = itemJustAfterTheSelectedItems.Rank;

            selectedItemInDataSource[0].Rank = otherItemRank;
            itemJustAfterTheSelectedItems.Rank = selectedItemRank;

            selectedItemInDataSource[0].IsDirty = true;
            itemJustAfterTheSelectedItems.IsDirty = true;

            // Swap the items in the array
            this.arrayMove(items, selectedItemIndexInDataSource, selectedItemIndexInDataSource + 1);

            // Hack 
            listControl.set("items", null);
            listControl.set("items", dataSource.get("items"));
            listControl.set("selectedItemId", selectedItemInDataSource[0].itemId);

            var idToUse = selectedItemInDataSource[0].itemId.replace(/[\])}[{(]/g, '');
            $("span[id*=\"" + idToUse + "\"]").parent().parent().addClass("active");
        },

        moveUp: function (dataSource, listControl) {
            var items = dataSource.get("items");
            var selectedItemId = listControl.get("selectedItemId");
            var selectedItemInDataSource = items.filter($.proxy(this.findItem(selectedItemId), this));
            var selectedItemIndexInDataSource = items.indexOf(selectedItemInDataSource[0]);

            // Find the item just before the selected item in the data source
            var itemJustBeforeTheSelectedItems = items[selectedItemIndexInDataSource - 1];

            // Swap their rank properties
            var selectedItemRank = selectedItemInDataSource[0].Rank;
            var otherItemRank = itemJustBeforeTheSelectedItems.Rank;

            selectedItemInDataSource[0].Rank = otherItemRank;
            itemJustBeforeTheSelectedItems.Rank = selectedItemRank;

            selectedItemInDataSource[0].IsDirty = true;
            itemJustBeforeTheSelectedItems.IsDirty = true;

            // Swap the items in the array
            this.arrayMove(items, selectedItemIndexInDataSource, selectedItemIndexInDataSource - 1);

            // Hack 
            listControl.set("items", null);
            listControl.set("items", dataSource.get("items"));
            listControl.set("selectedItemId", selectedItemInDataSource[0].itemId);

            var idToUse = selectedItemInDataSource[0].itemId.replace(/[\])}[{(]/g, '');
            $("span[id*=\"" + idToUse + "\"]").parent().parent().addClass("active");
        },

        updateButtons: function (listControl) {
            var selectedItemId = listControl.get("selectedItemId");
            if (selectedItemId) {
                var items = listControl.get("items");
                var selectedItemInDataSource = items.filter($.proxy(this.findItem(selectedItemId), this));
                var selectedItemIndexInDataSource = items.indexOf(selectedItemInDataSource[0]);

                if (selectedItemIndexInDataSource === 0) {
                    this.UpButton.set("isEnabled", false);
                } else {
                    this.UpButton.set("isEnabled", true);
                }

                if (selectedItemIndexInDataSource == items.length - 1) {
                    this.DownButton.set("isEnabled", false);
                } else {
                    this.DownButton.set("isEnabled", true);
                }
            }
        },

        postSequencing: function (dataSource, url) {
            var items = dataSource.get("items");
            var touchedItems = items.filter(this.findTouchedItems);
            var itemsToPost = "";

            for (index = 0 ; index < touchedItems.length; ++index) {
                var item = touchedItems[index];
                if (itemsToPost) {
                    itemsToPost += "|";
                }

                itemsToPost += ko.toJSON(item);
            }

            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;

            $.ajax({
                url: url,
                type: "POST",
                headers: ajaxToken,
                data: {
                    id: CommerceUtilities.loadPageVar("target"),
                    updatedItems: itemsToPost
                },
                context: this,
                error: CommerceUtilities.IsAuthenticated,
                success: function (data) {

                }
            });
        },

        findTouchedItems: function (element) {
            return element.IsDirty;
        }
    });

    return SequencingUtils;
});

