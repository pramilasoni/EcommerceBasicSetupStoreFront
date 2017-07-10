//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
require.config({
    config: {
        waitSeconds: 15
    },
    paths: {
        tp: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/jquery.timepicker.min",
        datepickerRegions: "/sitecore/shell/client/Applications/MerchandisingManager/Assets/libs/jquery.datepicker.regions"
    },
    shim: {
    'datepickerRegions': {
        deps: ['jqueryui'/*, 'css!dynatreecss'*/]
    }
}   
});

define(["sitecore", "tp", "datepickerRegions"], function (Sitecore, tp) {
    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("value", null);
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        updatingModel: false,
        updatingView: false,
        dateInputId: null,
        timeInputId: null,
        clearButtonId: null,
        initialize: function (options) {
            this._super();

            var renderingId = this.$el.attr("data-sc-id");
            var language = this.$el.attr("data-sc-language");
            var readOnly = this.$el.attr("data-sc-readOnly");
            var showTime = this.$el.attr("data-sc-showTime");

            this.dateInputId = renderingId + "DateInput";
            this.timeInputId = renderingId + "TimeInput";
            this.clearButtonId = renderingId + "ClearButton";

            var initialValue = this.$el.attr("data-sc-initialValue");

            var dateInput = $("[data-sc-id='" + this.dateInputId +  "']");
            var timeInput = $("[data-sc-id='" + this.timeInputId + "']");
            var clearButton = $("[data-sc-id='" + this.clearButtonId + "']");

            if (dateInput) {

                // Regions should already be loaded by require.js
                var region = $.datepicker.regional[language];

                if (!region) {
                    // Default to english US
                    region = $.datepicker.regional[''];
                }

                $.datepicker.setDefaults(region);
                
                if (readOnly == "False") {
                    dateInput.datepicker();
                } else {
                    dateInput.datepicker({ beforeShow: function (i) { return false; } });
                }

                dateInput.on("change", $.proxy(this.updateModelFromView, this));
            }

            if (timeInput) {
                timeInput.timepicker();
                timeInput.on("changeTime", $.proxy(this.updateModelFromView, this));

                if (showTime == "False") {
                    timeInput.hide();
                }
            }

            if (clearButton) {
                var self = this;

                if (readOnly == "False") {
                    clearButton.show();
                    clearButton.css('visibility', 'visible');
                    clearButton.on("click", function () {
                        self.model.set("value", null);
                        dateInput.trigger('change');
                    });
                } else {
                    clearButton.hide();
                }
            }

            this.model.on("change:value", this.updateViewFromModel, this);
            this.model.set("value", initialValue);
        },

        updateModelFromView: function () {

            var dateInput = $("[data-sc-id='" + this.dateInputId + "']");
            var timeInput = $("[data-sc-id='" + this.timeInputId + "']");
            var dateString = null;
            var timeString = null;

            if (dateInput) {
                var date = dateInput.datepicker('getDate');

                if (date) {

                    var year = date.getFullYear();
                    var month = date.getMonth() + 1;
                    var day = date.getDate();
                    var monthString = this.getTwoDigitString(month);
                    var dayString = this.getTwoDigitString(day);

                    dateString = year.toString() + monthString + dayString;

                } else {

                    // If date portion has been cleared, clear the entire control.
                    this.model.set("value", null);
                    return;
                }
            }

            if (timeInput) {
                var time = timeInput.timepicker('getTime');

                if (time) {
                    var hour = time.getHours();
                    var minutes = time.getMinutes();

                    var hourString = this.getTwoDigitString(hour);
                    var minuteString = this.getTwoDigitString(minutes);

                    timeString = "T" + hourString + minuteString + "00";

                } else {
                    timeString = "T000000";
                }
            }

            if (dateString !== null && timeString !== null) {
                var dateTimeString = dateString + timeString;
                this.updatingModel = true;
                this.model.set("value", dateTimeString);
                this.updatingModel = false;
            }
        },

        updateViewFromModel: function () {
            if (!this.updatingModel) {

                var dateInput = $("[data-sc-id='" + this.dateInputId + "']");
                var timeInput = $("[data-sc-id='" + this.timeInputId + "']");

                var modelValue = this.model.get("value");

                if (modelValue) {
                    var dateValue = this.parseDateFromModelValue();

                    dateInput.datepicker('setDate', dateValue);
                    $("#ui-datepicker-div").hide();

                    timeInput.timepicker('setTime', dateValue);

                    return;
                }

                dateInput.datepicker('setDate', null);
                timeInput.timepicker('setTime', null);
            }
        },

        parseDateFromModelValue: function () {
            var value = this.model.get("value");

            if (value) {

                var year = parseInt(value.substring(0, 4), 10);
                var month = parseInt(value.substring(4, 6), 10) - 1;
                var day = parseInt(value.substring(6, 8), 10);

                var hour = parseInt(value.substring(9, 11), 10);
                var minute = parseInt(value.substring(11, 13), 10);

                return new Date(year, month, day, hour, minute);
            }

            return null;
        },

        getTwoDigitString: function (number) {
            var twoDigitString = null;

            if (number !== null) {
                twoDigitString = number < 10 ? "0" + number.toString() : number.toString();
            }

            return twoDigitString;
        },

        getQueryStringVariable: function (sVar) {
            return unescape(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + escape(sVar).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
        }
    });

    Sitecore.Factories.createComponent("CommerceDateTime", model, view, ".sc-CommerceDateTime");
});
