//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {
    requirejs.config({
        paths: {
            'query-builder': '/sitecore/shell/client/Applications/PricingAndPromotionsManager/Renderings/QueryBuilder/assets/query-builder.standalone',
            'chosen': '/sitecore/shell/client/Applications/PricingAndPromotionsManager/Renderings/QueryBuilder/assets/chosen.jquery.min',
            'bootstrap': '/sitecore/shell/client/Speak/Assets/lib/ui/2.0/deps/bootstrap.min',
            'selectize': '/sitecore/shell/client/Applications/PricingAndPromotionsManager/Renderings/QueryBuilder/assets/selectize.min',
            'microplugin': '/sitecore/shell/client/Applications/PricingAndPromotionsManager/Renderings/QueryBuilder/assets/microplugin',
            'sifter': '/sitecore/shell/client/Applications/PricingAndPromotionsManager/Renderings/QueryBuilder/assets/sifter'

        },
        shim: {
            'query-builder': {
                exports: 'jQuery.fn.queryBuilder'
            }
        }
    });

    Speak.component(['query-builder', 'chosen', 'bootstrap', 'selectize'], function () {
        return {
            initialized: function () {
                this.defineProperty("builderInit", false);

                $('#' + this.id.replace(' ', '') + 'Container').on('afterCreateRuleFilters.queryBuilder', function (e, rule, error, value) {
                   
                    $(rule.$el.find("select")).chosen();
                });

                $('#' + this.id.replace(' ', '') + 'Container').on('getOperators.queryBuilder.filter', function (e, level) {

                    var info = e;
                });

                // Fix for Selectize
                $('#' + this.id.replace(' ', '') + 'Container').on('afterCreateRuleInput.queryBuilder', function (e, rule) {
                    if (rule.filter.plugin == 'selectize') {
                        rule.$el.find('.rule-value-container').css('min-width', '200px')
                          .find('.selectize-control').removeClass('form-control');
                    }
                });

                
            },

            setFilters: function (filters) {
                if(filters == null){
                    console.warn("Filters for QueryBuilder " + this.id.replace(' ', '') + 'Container' + " are empty");
                    return;
                }

                if (this.builderInit) {
                    $('#' + this.id.replace(' ', '') + 'Container').queryBuilder('setFilters', true, filters);
                } else {


                    $('#' + this.id.replace(' ', '') + 'Container').queryBuilder({
                        filters: filters,
                        plugins:['sortable', 'invert'],
                        allow_groups: this.AllowGroups,
                        allow_empty: this.AllowEmpty,
                        lang_code: this.LanguageCode,
                        display_empty_filter: this.DisplayEmptyFilter,
                        operators: [
  { type: 'equal', optgroup: 'equality' },
  { type: 'not_equal', optgroup: 'equality' },
  { type: 'in', optgroup: 'in or not' },
  { type: 'not_in', optgroup: 'in or not' },
    { type: 'is', apply_to: ['text'], nb_inputs: 1 },
  { type: 'is not', apply_to: ['text'], nb_inputs: 1 },
  { type: 'less', nb_inputs: 2, optgroup: 'Less great', apply_to: ['number'] },
  { type: 'less_or_equal', nb_inputs: 2, optgroup: 'Less great', apply_to: ['number'] },
  { type: 'great', nb_inputs: 2, optgroup: 'Less great', apply_to: ['number'] },
  { type: 'great_or_equal', nb_inputs: 2, optgroup: 'basic', apply_to: ['number'] },
  { type: 'geo', optgroup: 'custom', nb_inputs: 3, multiple: false, apply_to: ['number'] },
  { type: 'is item with tag', nb_inputs: 2, apply_to: ['text'] },
    { type: 'is not item with tag', nb_inputs: 2, apply_to: ['text'] }
                        ]
                    });
                    this.builderInit = true;
                }
            },

            setRules: function (rules) {
                if (rules == null) {
                    console.warn("Rules for QueryBuilder " + this.id.replace(' ', '') + 'Container' + " are empty");
                    return;
                }

                $('#' + this.id.replace(' ', '') + 'Container').queryBuilder('setRules', rules);
            },

            getRules: function() {
               return $('#' + this.id.replace(' ', '') + 'Container').queryBuilder('getRules');
            },

            reset: function() {
                $('#' + this.id.replace(' ', '') + 'Container').queryBuilder("reset");
            }
        };
    }, "QueryBuilder");

})(Sitecore.Speak);