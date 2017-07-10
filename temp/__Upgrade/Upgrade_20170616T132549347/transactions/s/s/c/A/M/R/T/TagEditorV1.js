//     Copyright (c) Sitecore Corporation 1999-2017
/// <reference path="../../../../../../assets/vendors/KnockOut/knockout-2.1.0.js" />
/* jshint unused: vars */
require.config({
    paths: {
        'caret': '/sitecore/shell/client/Applications/MerchandisingManager/Renderings/TagEditorV1/assets/jquery.caret',
        'tag-editor': '/sitecore/shell/client/Applications/MerchandisingManager/Renderings/TagEditorV1/assets/jquery.tag-editor'
    },
    shim: {
        'caret': {
            exports: 'jQuery.fn.caret'
        },
        'tag-editor': {
            exports: 'jQuery.fn.tagEditor'
        }
    }
});

define(["sitecore", "caret", "tag-editor"], function (Sitecore, caret, tagEditor) {

    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("Items", []);
            this.set("id", this.attributes.name);
            this.set("Text", "");
        },
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();
            this.TagEditorContainerId = '#' + this.model.id.replace(' ', '') + 'Container';

            this.model.on("change:Items", this.itemsChanged, this);
            this.model.on("change:Text", this.changedText, this);

            this.initializeEditor();

            var text = this.$el.attr("data-sc-text");
            this.model.set("Text", text);

        },

        changedText: function () {
            if (this.model.get("Text")) {
                var tags = [];
                var textTags = this.model.get("Text").split(',');

                for (var i = 0; i < textTags.length; i++) {
                    var item = { Name: textTags[i].trim(), Excluded: false };
                    tags.push(item);
                }

                this.model.set("Items", tags);
            }
        },
        itemsChanged: function () {
            var tags = this.getTagNamesFromItems();
            this.destroyEditor();
            this.initializeEditor(tags);
        },

        getTagNamesFromItems: function () {
            var tags = [];
            var text = "";
            if (this.model.get("Items")) {
                for (var i = 0; i < this.model.get("Items").length; i++) {
                    tags.push(this.model.get("Items")[i].Name);
                    text += this.model.get("Items")[i].Name + ",";
                }
            }
            var text = text.slice(0, -1);
            this.model.set("Text", text);

            return tags;
        },

        initializeEditor: function (tags) {
            var self = this;
            if (tags && tags != "undefined" && tags.length > 0) {
                $(self.TagEditorContainerId).tagEditor({
                    initialTags: tags,
                    beforeTagSave: function (field, editor, tags, tag, val) {
                        self.triggerTagAdded(val);
                    },
                    beforeTagDelete: function (field, editor, tags, val) {
                        self.triggerTagDeleted(val);
                    },
                    onChange: function (field, editor, tags) {
                        self.setTagClasses(field, editor);
                    }
                });

                // Need to call this explicitly upon initialization - onChange not invoked on init.
                self.setTagClasses(null, $(self.TagEditorContainerId).tagEditor('getTags')[0].editor);
            } else {
                $(self.TagEditorContainerId).tagEditor({
                    beforeTagSave: function (field, editor, tags, tag, val) {
                        self.triggerTagAdded(val);
                    },
                    beforeTagDelete: function (field, editor, tags, val) {
                        self.triggerTagDeleted(val);
                    },
                    onChange: function (field, editor, tags) {
                        self.setTagClasses(field, editor);
                    }
                });
            }

            self.el.childNodes[1].focus();
        },

        destroyEditor: function () {
            var self = this;
            $(self.TagEditorContainerId).tagEditor('destroy');
            $(self.TagEditorContainerId).val("");
        },

        setTagClasses: function (field, editor) {
            var tagCssClass = this.TagCssClass;
            $('li', editor).each(function () {
                var li = $(this);
                li.addClass(tagCssClass);
            });
        },

        triggerTagAdded: function (tagName) {
            var self = this;
            var eventArgs = {
                Name: tagName,
                Type: self.TagType
            };
            this.model.get("Items").push(eventArgs);
            this.itemsChanged();

        },

        triggerTagDeleted: function (tagName) {
            if (this.app.setPageIsDirty) {
                this.app.setPageIsDirty(true);
            }

            var self = this;
            var eventArgs = {
                Name: tagName,
                Type: self.Type
            };

            var items = this.model.get("Items");
            for (var i = 0; i < items.length; i++) {
                if (items[i].Name === eventArgs.Name) {
                    this.model.get("Items").splice(i, 1);
                }
            }

            this.itemsChanged();
        }



    });

    Sitecore.Factories.createComponent("TagEditor", model, view, ".sc-tageditor");

});

