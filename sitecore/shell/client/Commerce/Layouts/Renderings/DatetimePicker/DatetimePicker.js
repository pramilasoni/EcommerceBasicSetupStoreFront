// jshint ignore: start
// TODO: remove jshint ignore when stubbed portions of code are implemented. Requirejs as global?
//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {
 
    requirejs.config({
        paths: {
            'jquery': '/sitecore/shell/client/Speak/Assets/lib/core/1.1/deps/jQuery/jquery-2.1.1.min',
            'moment': '/sitecore/shell/client/Business Component Library/version 2/Assets/lib/deps/momentjs/moment-2.10.3-with-locales.min',
            'bootstrap': '/sitecore/shell/client/Speak/Assets/lib/ui/2.0/deps/bootstrap.min',
            'dateTimePicker': '/sitecore/shell/client/Commerce/Layouts/Renderings/DatetimePicker/bootstrap-datetimepicker.min'
        }
    });


    Speak.component(['jquery', 'moment', 'bootstrap', 'dateTimePicker'], function (jquery, moment) {
        this.moment = moment();
        return {

            initialize: function () {
                // Setup properties
                this.defineProperty("Region", "");
                this.defineProperty("regionInitialized", false);

                $('#datetimepicker_' + this.id).datetimepicker({
                    locale: navigator.language,
                    allowInputToggle: true
                });
            },

            initialized: function () {
                var self = this;

                $('#datetimepicker_' + this.id).on('dp.change', function (e) {
                    self.Value = self.parseDate(e.date);
                    if (!self.regionInitialized) {
                        // set locale after value initialized
                        self.setLocale(self.Region);
                        self.regionInitialized = true;
                    }
                });

                this.on("change:Value", function () {
                    $('#datetimepicker_' + this.id).data("DateTimePicker").date(this.Value);
                });
            },

            parseDate: function (date) {
                //01/01/0001 00:00:00 +00:00
                return moment(date).format();
            },

            setLocale: function (locale) {
                $('#datetimepicker_' + this.id).data("DateTimePicker").locale(locale);
            }
        };
    }, "DatetimePicker");
})(Sitecore.Speak);