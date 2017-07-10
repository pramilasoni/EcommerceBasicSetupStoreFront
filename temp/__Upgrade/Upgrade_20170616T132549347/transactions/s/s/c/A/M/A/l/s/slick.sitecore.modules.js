(function ($, sc) {
    // register namespace
    $.extend(true, window, {
        "Slick": {
            "Sitecore": {
                "Editors": {
                    "Tags": TagEditor,
                    "Text": TextEditor,
                    "Integer": IntegerEditor,
                    "YesNoSelect": YesNoSelectEditor,
                    "SitecoreCommerceCustom": CustomControl,
                    "Combo": ComboEditor,
                    "DialogButtonFormatter": DialogButtonFormatter,
                    "RelationshipDirection": RelationshipDirectionEditor,
                    "RelationshipDescription": RelationshipDescriptionEditor,
                    "RelationshipName": RelationshipNameEditor,
                    "DialogButtonFormatter": DialogButtonFormatter,
                    "DateTime": DateTimeEditor,
                    "Decimal": DecimalEditor,
                    "ProductLinkFormatter": ProductLinkFormatter,
                    "CategoryLinkFormatter": CategoryLinkFormatter
                },
                "Helpers": {
                    getKeyCodeFromEvent: function (keyEvent) {
                        // To resolve cross-browser issues with key events - Firefox doesn't support keyCode
                        return keyEvent.keyCode == 0 ? keyEvent.charCode : keyEvent.keyCode;
                    }
                }
            }
        }
    });

    $.extend(true, window, {
        "Slick": {
            "Sitecore": {
                "Formatters": {
                    "DateTime": DateTimeFormatter,
                    "VariantFormatter": VariantFormatter,
                    "RelationshipFormatter" : RelationshipFormatter
                }
            }
        }
    });

    function TagEditor(args) {
        var $input;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $input = $("<textarea class='tageditor-slick-area'/>")
            $input.appendTo(args.container)
                .bind("keydown.nav", function (e) {
                    if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
                        e.stopImmediatePropagation();
                    }
                })
                .focus()
                .select();

        };

        this.destroy = function () {
            $input.remove();
        };

        this.focus = function () {
            $input.focus();
        };

        this.getValue = function () {
            return $input.val();
        };

        this.setValue = function (val) {
            $input.val(val);
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field] || "";
            $input.val(defaultValue);
            $input.tagEditor();
        };

        this.serializeValue = function () {
            return $input.val();
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function TextEditor(args) {
        var $input;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $input = $("<INPUT type=text class='editor-text' />")
                .appendTo(args.container)
                .bind("keydown.nav", function (e) {
                    /// Update to handle left and right inside the editor
                    var keyCode = Slick.Sitecore.Helpers.getKeyCodeFromEvent(e);
                    if (keyCode === $.ui.keyCode.RIGHT) {
                        if (e.target.value.length != e.target.selectionStart) {
                            e.stopImmediatePropagation();
                        }
                    } else if (keyCode === $.ui.keyCode.LEFT) {
                        if (e.target.selectionStart != 0) {
                            e.stopImmediatePropagation();
                        }
                    }

                })
                .focus()
                .select();
        };

        this.destroy = function () {
            $input.remove();
        };

        this.focus = function () {
            $input.focus();
        };

        this.getValue = function () {
            return $input.val();
        };

        this.setValue = function (val) {
            $input.val(val);
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field] || "";
            $input.val(defaultValue);
            $input[0].defaultValue = defaultValue;
            $input.select();
        };

        this.serializeValue = function () {
            return $input.val();
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
        };

        this.validate = function () {
            if (args.column.validator) {
                var validationResults = args.column.validator($input.val());
                if (!validationResults.valid) {
                    return validationResults;
                }
            }

            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function IntegerEditor(args) {
        var $input;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $input = $("<INPUT type=text class='editor-text' />");

            $input.bind("keydown.nav", function (e) {
                /// Update to handle left and right inside the editor
                var keyCode = Slick.Sitecore.Helpers.getKeyCodeFromEvent(e);
                if (keyCode === $.ui.keyCode.RIGHT) {
                    if (e.target.value.length != e.target.selectionStart) {
                        e.stopImmediatePropagation();
                    }
                } else if (keyCode === $.ui.keyCode.LEFT) {
                    if (e.target.selectionStart != 0) {
                        e.stopImmediatePropagation();
                    }
                }
            });

            $input.appendTo(args.container);
            $input.focus().select();
        };

        this.destroy = function () {
            $input.remove();
        };

        this.focus = function () {
            $input.focus();
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field];
            $input.val(defaultValue);
            $input[0].defaultValue = defaultValue;
            $input.select();
        };

        this.serializeValue = function () {
            return parseInt($input.val(), 10) || 0;
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
        };

        this.validate = function () {
            if (isNaN($input.val())) {
                return {
                    valid: false,
                    msg: "Please enter a valid integer"
                };
            }

            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function DateEditor(args) {
        var $input;
        var defaultValue;
        var scope = this;
        var calendarOpen = false;

        this.init = function () {
            $input = $("<INPUT type=text class='editor-text' />");
            $input.appendTo(args.container);
            $input.focus().select();
            $input.datepicker({
                showOn: "button",
                buttonImageOnly: true,
                buttonImage: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/sg/images/calendar.gif",
                beforeShow: function () {
                    calendarOpen = true
                },
                onClose: function () {
                    calendarOpen = false
                }
            });
            $input.width($input.width() - 18);
        };

        this.destroy = function () {
            $.datepicker.dpDiv.stop(true, true);
            $input.datepicker("hide");
            $input.datepicker("destroy");
            $input.remove();
        };

        this.show = function () {
            if (calendarOpen) {
                $.datepicker.dpDiv.stop(true, true).show();
            }
        };

        this.hide = function () {
            if (calendarOpen) {
                $.datepicker.dpDiv.stop(true, true).hide();
            }
        };

        this.position = function (position) {
            if (!calendarOpen) {
                return;
            }
            $.datepicker.dpDiv
                .css("top", position.top + 30)
                .css("left", position.left);
        };

        this.focus = function () {
            $input.focus();
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field];
            $input.val(defaultValue);
            $input[0].defaultValue = defaultValue;
            $input.select();
        };

        this.serializeValue = function () {
            return $input.val();
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function CheckboxEditor(args) {
        var $select;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $select = $("<INPUT type=checkbox value='true' class='editor-checkbox' hideFocus>");
            $select.appendTo(args.container).bind("keydown.nav", function (e) {
                /// Update to handle left and right inside the editor
                var keyCode = Slick.Sitecore.Helpers.getKeyCodeFromEvent(e);
                if (keyCode === $.ui.keyCode.UP || keyCode === $.ui.keyCode.DOWN) {
                    e.stopImmediatePropagation();
                }
            });;
            $select.focus();
        };

        this.destroy = function () {
            $select.remove();
        };

        this.focus = function () {
            $select.focus();
        };

        this.loadValue = function (item) {
            defaultValue = !!item[args.column.field];
            if (defaultValue) {
                $select.prop('checked', true);
            } else {
                $select.prop('checked', false);
            }
        };

        this.serializeValue = function () {
            return $select.prop('checked');
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return (this.serializeValue() !== defaultValue);
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function RelationshipDirectionEditor(args) {
        var $select;
        var defaultValue;
        var scope = this;
        var oneWayText = "One-way";
        var twoWayText = "Two-way";

        this.init = function () {

            // Get these values from sitecore
            oneWayText = "One-way";
            twoWayText = "Two-way";

            $select = $("<SELECT tabIndex='0' class='editor-twoway'></SELECT>");

            $select.append('<option value="0">' + oneWayText + '</option>');
            $select.append('<option value="1">' + twoWayText + '</option>');

            $select.appendTo(args.container).bind("keydown.nav", function (e) {
                var keyCode = Slick.Sitecore.Helpers.getKeyCodeFromEvent(e);
                if (keyCode === $.ui.keyCode.UP || keyCode === $.ui.keyCode.DOWN) {
                    e.stopImmediatePropagation();
                }
            });

            $select.focus();
        };

        this.destroy = function () {
            $select.remove();
        };

        this.focus = function () {
            $select.focus();
        };

        this.loadValue = function (item) {
            $select.val((defaultValue = item[args.column.field]) ? oneWayText : twoWayText);
            $select.select();
        };

        this.serializeValue = function () {
            return ($select.val() == "One-way");
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return ($select.val() != defaultValue);
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function RelationshipDescriptionEditor(args) {
        
        var twoWay = (args.item.IsReciprocal == "Two-way" && args.item._Security.IsReciprocal != undefined) ? true : false;
        var $input;
        var $inputB;
        var defaultValue;
        var scope = this;

        this.init = function () {

            if (twoWay) {
                $descDiv = $("<div class='twowayDescDiv'></div>").appendTo(args.container);
                $("<p>Description A to B</p>").appendTo($descDiv);
                $input = $("<INPUT type=text class='editor-text descriptionA' />").appendTo($descDiv);
                $input.bind("keydown.nav", function (e) {
                    var keyCode = Slick.Sitecore.Helpers.getKeyCodeFromEvent(e);
                    if (keyCode === $.ui.keyCode.RIGHT) {
                        $inputB.select();
                        e.stopImmediatePropagation();
                    }
                });
                $("<p>Description B to A</p>").appendTo($descDiv);
                $inputB = $("<INPUT type=text class='editor-text descriptionB' />").appendTo($descDiv);
                $inputB.bind("keydown.nav", function (e) {
                    var keyCode = Slick.Sitecore.Helpers.getKeyCodeFromEvent(e);
                    if (keyCode === $.ui.keyCode.LEFT) {
                        $input.select();
                        e.stopImmediatePropagation();
                    }
                });
            } else {
                $input = $("<INPUT type=text class='editor-text descriptionA' />").appendTo(args.container);   
            }          
        };

        this.destroy = function () {
            $input.remove();
            if ($inputB != undefined) {
                $inputB.remove();
            }
        };

        this.focus = function () {
            $input.focus();
        };

        this.getValue = function () {
            return $input.val();
        };

        this.setValue = function (val) {
            if (val.indexOf('|') == -1) {
                var values = val.split('|');
                if ($inputB != undefined && $inputB.val() != "") {
                    $input.val(values[0]);
                    $inputB.val(values[1]);
                }

            } else {
                $input.val(val);
            }
            
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field] || "";
            if (defaultValue.indexOf('|') == -1) {
                $input.val(defaultValue);
                $input[0].defaultValue = defaultValue;
                $input.select();
            } else {
                var descs = defaultValue.split('|');

                if (descs.length == 2) {
                    $input.val(descs[0]);
                    $input[0].defaultValue = descs[0];
                   
                    if ($inputB != undefined) { 
                    $inputB.val(descs[1]);
                    $inputB[0].defaultValue = descs[1];
                        }

                    $input.select();
                } else {
                    $input.val(descs[0]);
                    $input[0].defaultValue = defaultValue;

                    $input.select();

                }

            }
           
        };

        this.serializeValue = function () {
            if ($inputB != undefined && $inputB.val() != "") {
                return $input.val() + "|" + $inputB.val();
            } else {
                return $input.val();
            }
            
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            if ($inputB != undefined && $inputB.val() != "") {
                var currentValue = $input.val() + '|' + $inputB.val();
                return (!(currentValue == "" && defaultValue == null)) && (currentValue != defaultValue);
            } else {
                return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
            }
        };

        this.validate = function () {
            if (args.column.validator) {
                var validationResults = args.column.validator($input.val());
                if (!validationResults.valid) {
                    return validationResults;
                }
            }

            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function RelationshipNameEditor(args) {
        var $select;
        var defaultValue;
        var scope = this;
        var twoWay = false;

        var types = [];

        this.init = function () {

            $select = $("<SELECT tabIndex='0' class='editor-name-twoway'></SELECT>");
            types = loadTypes(); // Method to load the correct types
            for (var i = 0; i < types.length; i++) {
                $select.append('<option value=' + types[i].value + '>' + types[i].value + '</option>');
            }

           

            $select.appendTo(args.container).bind("keydown.nav", function (e) {
                var keyCode = Slick.Sitecore.Helpers.getKeyCodeFromEvent(e);
                if (keyCode === $.ui.keyCode.UP || keyCode === $.ui.keyCode.DOWN) {
                    e.stopImmediatePropagation();
                }
            });



            $select.focus();
        };

        this.destroy = function () {
            $select.remove();
        };

        this.focus = function () {
            $select.focus();
        };

        this.loadValue = function (item) {
            $select.val((defaultValue = item[args.column.field]) ? oneWay : twoWay);
            $select.select();
        };

        this.serializeValue = function () {
            return ($select.val() == "One-way");
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return ($select.val() != defaultValue);
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function YesNoSelectEditor(args) {
        var $select;
        var defaultValue;
        var scope = this;

        this.init = function () {
            $select = $("<SELECT tabIndex='0' class='editor-yesno'><OPTION value='yes'>Yes</OPTION><OPTION value='no'>No</OPTION></SELECT>");
            $select.appendTo(args.container).bind("keydown.nav", function (e) {
                /// Update to handle left and right inside the editor
                var keyCode = Slick.Sitecore.Helpers.getKeyCodeFromEvent(e);
                if (keyCode === $.ui.keyCode.UP || keyCode === $.ui.keyCode.DOWN) {
                    e.stopImmediatePropagation();
                }
            });
            $select.focus();
        };

        this.destroy = function () {
            $select.remove();
        };

        this.focus = function () {
            $select.focus();
        };

        this.loadValue = function (item) {
            $select.val((defaultValue = item[args.column.field]) ? "yes" : "no");
            $select.select();
        };

        this.serializeValue = function () {
            return ($select.val() == "yes");
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return ($select.val() != defaultValue);
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function ComboEditor(args) {
        var $select;
        var defaultValue;
        var scope = this;

        this.init = function () {
            opt_values = args.column.options;
            option_str = "";

            for (var i = 0; i < opt_values.length; i++) {
                option_str += "<OPTION value='" + opt_values[i]['displayName'] + "'>" + opt_values[i]['displayName'] + "</OPTION>";
            }

            $select = $("<SELECT tabIndex='0' class='editor-select'>" + option_str + "</SELECT>");
            $select.appendTo(args.container);
            $select.bind("keydown.nav", function (e) {
                var keyCode = Slick.Sitecore.Helpers.getKeyCodeFromEvent(e);
                if (keyCode === $.ui.keyCode.LEFT || keyCode === $.ui.keyCode.RIGHT) {
                    if (e.currentTarget.selectedIndex == 0 && keyCode === $.ui.keyCode.RIGHT) {
                        e.stopImmediatePropagation();
                    }

                    if (e.currentTarget.selectedIndex == 1 && keyCode === $.ui.keyCode.LEFT) {
                        e.stopImmediatePropagation();
                    }
                }
            }).select().focus();
        };

        this.destroy = function () {
            $select.remove();
        };

        this.focus = function () {
            $select.focus();
        };

        this.getValue = function () {
            return $select.val();
        };

        this.setValue = function (val) {
            $select.val(val);
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field];
            $select.val(defaultValue);
        };

        this.serializeValue = function () {
            if (args.column.options) {
                return $select.val();
            }
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return ($select.val() != defaultValue);
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function DialogButtonFormatter(row, cell, value, columnDef, dataContext) {
        return "<button class='example' data-sc-itemId='" + dataContext.itemId + "'>Click</button>";
    }

    function ProductLinkFormatter(row, cell, value, columnDef, dataContext) {
        return "<a class='workspace-link' title='" + dataContext.Name + "' id='" + dataContext.itemId + "_productdetail' href='/sitecore/client/Applications/MerchandisingManager/ProductDetail?target=" + dataContext.itemId + "'><img src='/sitecore/shell/client/Applications/MerchandisingManager/Assets/Icons/16x16/view-details.png' alt='" + dataContext.Name + "'/></a>";
    }

    function CategoryLinkFormatter(row, cell, value, columnDef, dataContext) {
        return "<a class='workspace-link' title='" + dataContext.Name + "' id='" + dataContext.itemId + "_category' href='/sitecore/client/Applications/MerchandisingManager/Category?target=" + dataContext.itemId + "'><img src='/sitecore/shell/client/Applications/MerchandisingManager/Assets/Icons/16x16/view-details.png' alt='" + dataContext.Name + "'/></a>";
    }

    function CustomControl(args) {
        var $select;
        var defaultValue;
        var scope = this;

        this.init = function () {
            opt_values = args.column.options;
            var items = self.get(opt_values);
            option_str = "";

            for (var i = 0; i < items.length; i++) {
                option_str += "<OPTION value='" + items[i].Color + "'>" + items[i].$displayName + "</OPTION>";
            }

            $select = $("<SELECT tabIndex='0' class='editor-select'>" + option_str + "</SELECT>");
            $select.appendTo(args.container);
            $select.bind("keydown.nav", function (e) {
                var keyCode = Slick.Sitecore.Helpers.getKeyCodeFromEvent(e);
                if (keyCode === $.ui.keyCode.LEFT || keyCode === $.ui.keyCode.RIGHT) {
                    e.stopImmediatePropagation();
                }
            });
            $select.focus();
        };

        this.destroy = function () {
            $select.remove();
        };

        this.focus = function () {
            $select.focus();
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field];
            $select.val(defaultValue);
        };

        this.serializeValue = function () {
            if (args.column.options) {
                return $select.val();
            } else {
                return ($select.val() == "yes");
            }
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.isValueChanged = function () {
            return ($select.val() != defaultValue);
        };

        this.validate = function () {
            return {
                valid: true,
                msg: null
            };
        };

        this.init();
    }

    function DateTimeEditor(args) {
        var $dateInput, $timeInput; //, $saveButton, $cancelButton;
        var $wrapper;
        scope = this;
        var defaultValue;
        var currentValue;

        var userLanguage = CommerceUtilities.getClientRegionISO();

        // Regions should already be loaded by require.js
        var region = $.datepicker.regional[userLanguage];

        if (!region) {
            // Default to english US
            region = $.datepicker.regional[''];
        }

        $.datepicker.setDefaults(region);

        // initialize the UI
        this.init = function () {
            var $container = $("body");

            if (!$dateInput) {
                $dateInput = $("<INPUT type=text class='editor-text' />");
                $timeInput = $("<INPUT type=text class='editor-text' />");

                $wrapper = $("<DIV style='z-index:10000;position:absolute;background:white;padding:5px;border:3px solid gray; -moz-border-radius:10px; border-radius:10px;'/>")
                .appendTo($container);

                scope.position(args.position);

                $dateInput.appendTo($wrapper);
                $timeInput.appendTo($wrapper);

                $("<DIV style='text-align:right'><BUTTON>Save</BUTTON><BUTTON>Cancel</BUTTON></DIV>")
                  .appendTo($wrapper);

                $wrapper.find("button:first").bind("click", this.save);
                $wrapper.find("button:last").bind("click", this.cancel);

                $dateInput.bind("keydown", scope.handleKeyDown);
                $timeInput.bind("keydown", scope.handleKeyDown);

                $wrapper.find("button:first").bind("keydown", scope.handleKeyDown);
                $wrapper.find("button:last").bind("keydown", scope.handleKeyDown);
            }

            $dateInput.datepicker({
                showOn: "focus",
                onSelect: function () {
                    $(this).change(); // update current value even if no blur
                    this.focus();
                }
            });

            $timeInput.timepicker({
                selectOnBlur: true,
                selectTime: function () {
                    $timeInput.focus();
                }
            });

            var sitecoreFormattedDateTime = args.item[args.column.field]
            var dateValue = scope.parseDateFromSitecoreDateFormatedString(sitecoreFormattedDateTime);

            $dateInput.datepicker('setDate', dateValue);
            $dateInput.datepicker('show');

            $timeInput.timepicker('setTime', dateValue);

            $dateInput.on("change", scope.updateCurrentValue);
            $timeInput.on("change", scope.updateCurrentValue);
        };

        this.destroy = function () {
            // We are re-using the wrapper div, so don't remove the wrapper from the DOM - Just hide.
            // Need to do this to implement custom key-handling without throwing errors in jQuery UI.
            $wrapper.hide();
        };

        this.focus = function () {
            $dateInput.focus().select();
        };

        this.isValueChanged = function () {
            return defaultValue != currentValue;
        };

        this.serializeValue = function () {
            return currentValue;
        };

        this.loadValue = function (item) {
            defaultValue = currentValue = item[args.column.field];
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.validate = function () {
            if (scope.isCurrentDateValid()) {
                return { valid: true, msg: null };
            } else {
                // TODO: when we implement validation use this msg as key in dictionary
                return { valid: true, msg: "Invalid date" }; 
            }
        };

        this.handleKeyDown = function (e) {
            if (e.which == $.ui.keyCode.ENTER) {
                scope.updateCurrentValue(); // necessary in case edit was typed manually
                e.preventDefault();
                args.grid.navigateDown();
            } else if (e.which == $.ui.keyCode.ESCAPE) {
                e.preventDefault();
                scope.cancel();
            } else if (e.which == $.ui.keyCode.TAB && e.shiftKey) {
                if (scope.shouldTabNavigatePrev()) {
                    scope.updateCurrentValue(); 
                    e.preventDefault();
                    args.grid.navigatePrev();
                }
            } else if (e.which == $.ui.keyCode.TAB) {
                if (scope.shouldTabNavigateNext()) {
                    scope.updateCurrentValue(); 
                    e.preventDefault();
                    args.grid.navigateNext();
                }
            } else if (e.which == $.ui.keyCode.DOWN) {
                scope.updateCurrentValue(); 
                e.preventDefault();
                args.grid.navigateDown();
            } else if (e.which == $.ui.keyCode.UP) {
                scope.updateCurrentValue(); 
                e.preventDefault();
                args.grid.navigateUp();
            } else if (e.which == $.ui.keyCode.LEFT) {
                if (scope.shouldTabNavigatePrev()) {
                    if (e.target.selectionStart == 0) {
                        scope.updateCurrentValue(); 
                        e.preventDefault();
                        $dateInput.datepicker("hide");
                        args.grid.navigatePrev();
                    }
                }
            } else if (e.which == $.ui.keyCode.RIGHT) {
                // TODO: Until timepicker focus issue is resolved
                if ($dateInput.is(":focus")) {
                    if (e.target.value.length == e.target.selectionStart) {
                        scope.updateCurrentValue(); 
                        e.preventDefault();
                        $dateInput.datepicker("hide");
                        scope.updateCurrentValue();
                        args.grid.navigateNext();
                    }
                }
            }
        };

        this.hide = function () {
            $wrapper.hide();
        };

        this.show = function () {
            $wrapper.show();
        };

        this.position = function (position) {
            $wrapper
              .css("top", position.top - 5)
              .css("left", position.left - 5)
        };

        this.save = function () {
            scope.updateCurrentValue();
            args.commitChanges();
        };

        this.cancel = function () {
            $dateInput.val(defaultValue);
            args.item[args.column.field] = currentValue = defaultValue;
            args.cancelChanges();
        };

        this.isCurrentDateValid = function () {
            var datePicker = $dateInput;

            var format = datePicker.datepicker("option", "dateFormat"),
                text = datePicker.val(),
                settings = datePicker.datepicker("option", "settings");

            try {
                var theDate = $.datepicker.parseDate(format, text, settings);
            } catch (err) {
                return false;
            }

            return true;
        };

        this.updateCurrentValue = function () {
            var dateString = null;
            var timeString = null;
            var sitecoreDateTimeString = null;

            if ($dateInput) {

                if (!scope.isCurrentDateValid()) {
                    currentValue = defaultValue;
                    return;
                }

                var date = $dateInput.datepicker('getDate');

                if (date) {

                    var year = date.getFullYear();
                    var month = date.getMonth() + 1;
                    var day = date.getDate();
                    var monthString = scope.getTwoDigitString(month);
                    var dayString = scope.getTwoDigitString(day);

                    dateString = year.toString() + monthString + dayString;

                } else {
                    return;
                }
            }

            if ($timeInput) {
                var time = $timeInput.timepicker('getTime');

                if (time) {
                    var hour = time.getHours();
                    var minutes = time.getMinutes();

                    var hourString = scope.getTwoDigitString(hour);
                    var minuteString = scope.getTwoDigitString(minutes);

                    timeString = "T" + hourString + minuteString + "00";

                } else {
                    timeString = "T000000";
                }
            }

            if (dateString !== null && timeString !== null) {
                sitecoreDateTimeString = dateString + timeString;
                currentValue = sitecoreDateTimeString;
                args.item[args.column.field] = currentValue;
            }
        };

        this.parseDateFromSitecoreDateFormatedString = function (sitecoreDate) {
           
            if (sitecoreDate) {

                var year = parseInt(sitecoreDate.substring(0, 4), 10);
                var month = parseInt(sitecoreDate.substring(4, 6), 10) - 1;
                var day = parseInt(sitecoreDate.substring(6, 8), 10);

                var hour = parseInt(sitecoreDate.substring(9, 11), 10);
                var minute = parseInt(sitecoreDate.substring(11, 13), 10);

                return new Date(year, month, day, hour, minute);
            }

            return null;
        };

        this.getTwoDigitString = function (number) {
            var twoDigitString = null;

            if (number !== null) {
                twoDigitString = number < 10 ? "0" + number.toString() : number.toString();
            }

            return twoDigitString;
        };

        this.shouldTabNavigatePrev = function () {
            return $dateInput.is(":focus");
        }

        this.shouldTabNavigateNext = function () {
            var cancelButton = $wrapper.find("button:last");

            if (cancelButton) {
                return cancelButton.is(":focus");
            }

            return false;
        }

        this.init();
    }

    function DecimalEditor(args) {
        var $input;
        var defaultValue;

        this.init = function () {
            $input = $("<INPUT type=text class='editor-text' />")
                .appendTo(args.container)
                .bind("keydown.nav", function (e) {
                    /// Update to handle left and right inside the editor
                    var keyCode = Slick.Sitecore.Helpers.getKeyCodeFromEvent(e);
                    if (keyCode === $.ui.keyCode.RIGHT) {
                        if (e.target.value.length != e.target.selectionStart) {
                            e.stopImmediatePropagation();
                        }
                    } else if (keyCode === $.ui.keyCode.LEFT) {
                        if (e.target.selectionStart != 0) {
                            e.stopImmediatePropagation();
                        }
                    }
                    // Allow: backspace, delete, tab, escape, enter, ctrl+A and . and commas
                    if ($.inArray(keyCode, [44, 46, 8, 9, 27, 13, 110, 188, 190]) !== -1 ||
                        // Allow: Ctrl+C
                        (keyCode == 67 && e.ctrlKey === true) ||
                        // Allow: Ctrl+V
                        (keyCode == 86 && e.ctrlKey === true) ||
                        // Allow: home, end, left, right
                        (keyCode >= 35 && keyCode <= 39)) {
                        // let it happen, don't do anything
                        return;
                    }
                    
                    if (keyCode < 48 || keyCode > 105 || (keyCode > 57 && keyCode < 96)) {
                        e.preventDefault();
                    }
                })
                .focus()
                .select();
        };

        this.destroy = function () {
            $input.remove();
        };

        this.focus = function () {
            $input.focus();
        };

        this.isValueChanged = function () {
            return defaultValue != $input.val();
        };

        this.serializeValue = function () {
            return $input.val();
        };

        this.loadValue = function (item) {
            defaultValue = item[args.column.field] || "";
            $input.val(defaultValue);
            $input[0].defaultValue = defaultValue;
            $input.select();
        };

        this.applyValue = function (item, state) {
            item[args.column.field] = state;
        };

        this.validate = function () {
            // TODO: We mask input and validation will be performed server-side
            // Update when we have a client-side localizable formatter/validator
            return { valid: true, msg: "" }; 
        };

        this.init();
    }

    /* Formatters */
    function DateTimeFormatter (row, cell, value, columnDef, dataContext) {
        if (!value) {
            return "";
        }

        var sitecoreDate = value;

        var year = parseInt(sitecoreDate.substring(0, 4), 10);
        var month = parseInt(sitecoreDate.substring(4, 6), 10) - 1;
        var day = parseInt(sitecoreDate.substring(6, 8), 10);

        var hour = parseInt(sitecoreDate.substring(9, 11), 10);
        var minute = parseInt(sitecoreDate.substring(11, 13), 10);

        var dateValue = new Date(year, month, day, hour, minute);

        var userLanguage = CommerceUtilities.getClientRegionISO();

        // Regions should already be loaded by require.js
        var region = $.datepicker.regional[userLanguage];

        if (!region) {
            region = $.datepicker.regional[''];
        }

        var dateFormat = region.dateFormat;

        var dateString = $.datepicker.formatDate(dateFormat, dateValue);
        return dateString + " : " + dateValue.toLocaleTimeString();
    }

    function VariantFormatter(row, cell, value, columnDef, dataContext) {
        return '<div onclick="CommerceUtilities.openVariantDialog(' + row + ');" class="dialogDiv"></div>';
    }

    function RelationshipFormatter(row, cell, value, columnDef, dataContext) {
        var isProduct = false;
        if (dataContext._IsProduct) {
            isProduct = true;
        }

        return '<div onclick="CommerceUtilities.openRelationshipDialog(' + row + ', ' + isProduct + ');" class="dialogDiv"></div>';
    }
})(jQuery, _sc);