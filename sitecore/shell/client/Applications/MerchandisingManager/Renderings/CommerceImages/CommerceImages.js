//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    paths: {
        jqueryui: "/sitecore/shell/client/Speak/Assets/lib/ui/1.1/deps/jQueryUI/jquery-ui-1.10.1.custom"
    }
});

define(["sitecore", "jqueryui"], function (Sitecore, jqueryui) {
    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("images", null);
            this.set("computedimages", null);
            this.set("baseUrl", "");
            this.set("itemDrag", true);
            this.set("isStandalone", false);
            this.set("numberOfImages", 0);
            this.on("change:images", this.convertImageStringToImages, this);
            this.listenTo(_sc, "sc-media-item-remove", this.removeItemFromCollection, this);
            this.listenTo(_sc, "sc-last-media-item-remove", this.removeLastItemFromCollection, this);
            this.listenTo(_sc, "sc-media-item-sort", this.sortCollection, this);

        },

        removeItemFromCollection: function (id) {
            if (this.get("images").indexOf('|' + id) == -1) {
                this.set("images", this.get("images").replace(id + "|", ""));
            } else {
                this.set("images", this.get("images").replace('|' + id, ""));
            }

            this.onImagesChanged();
        },

        removeLastItemFromCollection: function () {
            var number = this.get("numberOfImages");
            if (number == 1) {
                this.set("images", "");
                this.set("computedimages", null);
                this.set("numberOfImages", 0);

                this.onImagesChanged();
            }
        },

        sortCollection: function (ui) {
            var tempImages = [];
            var newListImages = [];
            this.viewModel.$el.children("ul").find("li").map(function () { tempImages.push(this.getAttribute("id")); });
            newListImages = tempImages.join('|');
            this.set("images", newListImages);

            this.onImagesChanged();
        },

        convertImageStringToImages: function () {
            var imageString = this.get("images");

            if (imageString !== "") {

                if (imageString.indexOf('|') === 0) {
                    imageString = imageString.replace('|', '');
                }
                var imageStringArray = imageString.split("|");                
                var complexImageArray = [];

                if (this.get("isStandalone") == "false" && this.get("baseUrl") === "") {
                    var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
                    var ajaxToken = {};
                    ajaxToken[token.headerKey] = token.value;
                    $.ajax({
                        url: "/sitecore/shell/commerce/merchandising/CommerceSearch/GetItems",
                        type: "POST",
                        headers: ajaxToken,
                        context: this,
                        data: {
                            itemIds: imageString
                        },
                        error: CommerceUtilities.IsAuthenticated,
                        success: function (data) {
                            if (!data || data.length == 0) {
                                return;
                            }

                            for (var i = 0; i < imageStringArray.length; i++) {
                                var imageId = imageStringArray[i];
                                var imageFound = false;
                                var altText = "";
                                for (var j = 0; j < data.length; j++) {
                                    if (imageId.toUpperCase() == data[j].itemId.toUpperCase()) {
                                        imageFound = true;
                                        altText = data[j].alt.length > 0 ? data[j].alt : data[j].name;
                                        break;
                                    }
                                }

                                if (imageFound) {
                                    var complexImage = {
                                        path: this.cleaningUpImagePath(imageStringArray[i]),
                                        id: imageStringArray[i],
                                        alt: altText
                                    };

                                    complexImageArray.push(complexImage);
                                }
                            }   
                            
                            this.set("computedimages", complexImageArray);
                        }
                    });
                } else {                   
                    for (i = 0; i < imageStringArray.length; i++) {
                        complexImageArray[i] = {
                            path: this.cleaningUpImagePath(imageStringArray[i]),
                            id: imageStringArray[i],
                            alt: imageStringArray[i]
                        };
                    }
                    this.set("computedimages", complexImageArray);
                }                
            }
        },

        cleaningUpImagePath: function (pathFragment) {

            if (this.get("baseUrl") === "") {
                var img = pathFragment.replace('{', '');
                img = img.replace('}', '');
                img = img.replace(/-/g, '');

                return "/sitecore/shell/~/media/" + img + ".ashx?db=master&w=300&as=1";
            } else {
                return this.get("baseUrl") + pathFragment;
            }
        },       

        onImagesChanged: function () {
            $.event.trigger({
                type: "commerceImages_changed",
            });
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();
            this.model.on("change:computedimages", this.render, this);
            this.model.set("baseUrl", this.$el.attr("media-url"));
            this.model.set("isStandalone", this.$el.attr("sc-cs-license"));            
        },

        render: function () {
            $(".commerceImageList").selectable({
                filter: "li", cancel: '.sort-handle', selected: function (event, ui) {
                    $(".commerceImageList").find('.sort-delete').hide();
                    $(ui.selected).find('.sort-delete').show();

                }
            }).sortable({
                handle: '.sort-handle',
                cancel: "li:first-child",
                opacity: 0.6,
                distance: 1,
                revert: 500,
                tolerance: 'pointer',
                placeholder: '.imageHighlight',
                stop: function (event, ui) {
                  //  $(".removeItemDiv").attr("disabled", true);
                    _sc.trigger("sc-media-item-sort", ui);
                }
            });
            //$(".commerceImageList").disableSelection();
            $(".removeItemDiv").droppable({
                accept: ".commerceImageList li",
                hoverClass: "removeItemDiv-Hover",
                drop: function (event, ui) {
                    _sc.trigger("sc-media-item-remove", ui.draggable.attr("id"));
                    $(".commerceImageList").first().addClass("firstChild");
                    ui.draggable.hide("slow");
                },
                connectToSortable: ".commerceImageList",
                tolerance: 'touch'
            });
            if (this.model.get('computedimages') !== null) {
                this.model.set("numberOfImages", this.model.get('computedimages').length);
            }

            $(".removeAnchor").click(function () {
                _sc.trigger("sc-last-media-item-remove");
            });

            $(".sort-delete").click(function () {

                if ($(".commerceImageList").children("li").length == 1) {
                    _sc.trigger("sc-last-media-item-remove");
                } else {
                    _sc.trigger("sc-media-item-remove", $(this.parentElement.parentElement).attr("id"));
                    $(".commerceImageList").first().addClass("firstChild");
                }
            });
        }
    });

    Sitecore.Factories.createComponent("CommerceImages", model, view, ".sc-CommerceImages");
});
