//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {
    Speak.pageCode([], function () {
        return {
            initialize: function () {
                this.defineProperty("SelectedItem", this.getSelectedElement);
                this.defineProperty("FieldRendering", null);
                this.defineProperty("AllowSelectProductFamily", false);
            },

            initialized: function () {

                this.variantsVisibility(false);
                this.ItemsDropList.on("change:SelectedValue", $.proxy(this.searchVariants, this));

                this.ItemSearchButton.on("click", $.proxy(this.searchItem, this));

                this.VariantsDataSource.setQueryCompletedCallback($.proxy(this.successGetVariants, this));

                this.SelectButton.on("click", $.proxy(this.getSelectedItem, this));

                this.CancelButton.on("click", $.proxy(this.cancelOperation, this));

                this.SelectProductFamilyCheckBox.on("change:IsChecked", $.proxy(this.onSelectProductFamilyCheckedChanged, this));
            },

            onSelectProductFamilyCheckedChanged: function () {
                this.VariantsListBox.IsEnabled = !this.SelectProductFamilyCheckBox.IsChecked;
            },

            getSelectedItem: function () {
                if (this.FieldRendering !== null) {
                    if (this.ItemsDropList.SelectedItem !== "") {
                        // TODO: Must be catalog name, not catalog display name
                        this.SelectedItem = { Catalog: this.ItemsDropList.SelectedItem.catalogdisplayname, ItemSKU: this.ItemsDropList.SelectedItem.name, Variant: this.VariantsListBox.SelectedItems[0].Name == "-" ? "" : this.VariantsListBox.SelectedItems[0].Name };

                        var compoundProductId = "";

                        if (this.AllowSelectProductFamily && this.SelectProductFamilyCheckBox.IsChecked === true) {
                            // If the user has selected the product family, do not specify anything for the variant portion of the delimited string
                            compoundProductId = this.SelectedItem.Catalog + "|" + this.SelectedItem.ItemSKU + "|";
                        } else {
                            compoundProductId = this.SelectedItem.Catalog + "|" + this.SelectedItem.ItemSKU + "|" + this.SelectedItem.Variant;
                        }

                        this.FieldRendering.Value = compoundProductId;
                    }

                    $.event.trigger('productPickerClosed');
                }
            },

            cancelOperation: function () {             
                $.event.trigger('productPickerClosed');
            },

            searchForItems: function (searchTerm) {

                this.ItemPickerDataSource.SearchTerm = searchTerm;
                this.ItemPickerDataSource.IsReady = true;
                this.ItemPickerDataSource.refresh();
            },

            searchForVariants: function (itemId) {

                this.VariantsDataSource.CommerceItemId = itemId;
                this.VariantsDataSource.IsReady = true;
                this.VariantsDataSource.refresh();

            },

            successGetVariants: function () {
                this.SelectProductFamilyCheckBox.IsChecked = false;
                if (this.VariantsDataSource.Items !== null) {
                    this.VariantsListBox.DynamicData = this.VariantsDataSource.Items;
                    if (this.AllowSelectProductFamily) {
                        this.SelectProductFamilyCheckBox.IsEnabled = true;
                    }
                }
                else {
                    this.VariantsListBox.DynamicData = [{ "itemId": "{00000000-0000-0000-0000-000000000000}", "Name": "-" }];
                    if (this.AllowSelectProductFamily) {
                        this.SelectProductFamilyCheckBox.IsEnabled = false;
                    }
                }
                this.variantsVisibility(true);
                this.VariantsPanel.set("IsBusy", false);

            },

            open: function () {
                alert("This should open a new tab to explore the promotions/pricing");
            },

            searchItem: function () {
                this.searchForItems(this.ItemSearchButton.Value);
                this.ItemSearchButton.Value = "";
            },

            searchVariants: function () {
                this.variantsVisibility(false);
                this.VariantsPanel.set("IsBusy", true);
                this.searchForVariants(this.ItemsDropList.SelectedValue);

            },

            loadVariants: function (load) {

                if (load) {
                    this.VariantsPanel.set("IsBusy", false);
                } else {
                    this.VariantsPanel.set("IsBusy", true);
                }

            },

            variantsVisibility: function (visibility) {
                this.VariantsListBox.set("IsVisible", visibility);
                this.variantsLabel.set("IsVisible", visibility);
                if (this.AllowSelectProductFamily) {
                    this.SelectProductFamilyCheckBox.IsVisible = visibility;
                }
            }
        };
    }, "ItemPicker");
})(Sitecore.Speak);