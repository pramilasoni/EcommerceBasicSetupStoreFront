// jshint ignore: start
// TODO: remove jshint ignore when stubbed portions of code are implemented. Requirejs as global?
//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {


    requirejs.config({
        paths: {
            'caret': '/sitecore/shell/client/Commerce/Layouts/Renderings/TagEditor/assets/jquery.caret',
            'tag-editor': '/sitecore/shell/client/Commerce/Layouts/Renderings/TagEditor/assets/jquery.tag-editor'
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


    Speak.component(['caret', 'tag-editor'], function() {

        return {
            initialized: function () {
                var textAreaId = this.id.replace(' ', '') + 'Container';
                this.TagEditorContainerId = '#' + textAreaId;

                var labelId = this.id.replace(' ', '') + 'Label';
                this.LabelId = '#' + labelId;

                var editorElement = this.el;
                var labelText = this.LabelText;
                $(editorElement).append("<label id=\"" + labelId + "\">" + labelText + "</label><textarea id=\"" + textAreaId + "\" class=\"tagEditorContainer\"></textarea>");

                // Items must be initialized to an empty array to avoid SPEAK error
                this.Items = [];

                this.on("change:Items", $.proxy(this.itemsChanged, this));
                this.on("change:LabelText", $.proxy(this.labelTextChanged, this));
                this.initializeEditor();
            },

            itemsChanged: function() {
                var tags = this.getTagNamesFromItems();
                this.destroyEditor();
                this.initializeEditor(tags);
            },

            labelTextChanged: function () {
                var self = this;
                $(self.LabelId).text(self.LabelText);
            },

            getTagNamesFromItems: function () {
                var tags = [];
                if (this.Items) {
                    for (var i = 0; i < this.Items.length; i++) {
                        tags.push(this.Items[i].Name);
                    }
                }

                return tags;
            },

            initializeEditor: function (tags) {
                var self = this;
                if (tags && tags != "undefined" && tags.length > 0) {
                    $(self.TagEditorContainerId).tagEditor({
                        initialTags: tags,
                        beforeTagSave: function (field, editor, tags, tag, val) {
                            if (!tag) {
                                self.triggerTagAdded(val);
                            } else {
                                self.triggerTagEdited(val, tag);
                            }
                        },
                        beforeTagDelete: function (field, editor, tags, val) {
                            self.triggerTagDeleted(val);
                        },
                        onChange: function (field, editor) {
                            self.setTagClasses(field, editor);
                        }
                    });

                    // Need to call this explicitly upon initialization - onChange not invoked on init.
                    self.setTagClasses(null, $(self.TagEditorContainerId).tagEditor('getTags')[0].editor);
                } else {
                    $(self.TagEditorContainerId).tagEditor({
                        beforeTagSave: function (field, editor, tags, tag, val) {
                            if (!tag) {
                                self.triggerTagAdded(val);
                            } else {
                                self.triggerTagEdited(val, tag);
                            }
                        },
                        beforeTagDelete: function (field, editor, tags, val) {
                            self.triggerTagDeleted(val);
                        },
                        onChange: function (field, editor) {
                            self.setTagClasses(field, editor);
                        }
                    });
                }
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
                    tagName: tagName,
                    tagType: self.TagType
                };

                $.event.trigger("snapshotTagAdded", eventArgs);
            },

            triggerTagEdited: function (tagName, oldTagName) {
                var self = this;
                var eventArgs = {
                    tagName: tagName,
                    oldTagName: oldTagName,
                    tagType: self.TagType
                };

                $.event.trigger("snapshotTagEdited", eventArgs);
            },

            triggerTagDeleted: function (tagName) {
                var self = this;
                var eventArgs = {
                    tagName: tagName,
                    tagType: self.TagType
                };

                $.event.trigger("snapshotTagDeleted", eventArgs);
            }
        };
    }, "TagEditor");

})(Sitecore.Speak);