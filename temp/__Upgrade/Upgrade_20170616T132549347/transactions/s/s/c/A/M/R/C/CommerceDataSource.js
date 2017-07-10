//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore", "jquery"], function (Sitecore, $) {

    var model = Sitecore.Definitions.Models.ControlModel.extend({

        completedQueryCallback: null,

        initialize: function (options) {
            this._super();

            // Create model properties
            this.set("searchTerm", null);
            this.set("pageIndex", 0);
            this.set("pageSize", 0);
            this.set("items", null);
            this.set("facets", null);
            this.set("dataUrl", null);
            this.set("fields", null);
            this.set("database", null);
            this.set("catalogName", null);
            this.set("commerceItemId", null);
            this.set("commerceItemType", null);
            this.set("facetCriteria", null);
            this.set("sorting", null);
            this.set("hasItems", false);
            this.set("resultCount", 0);
            this.set("totalItemCount", 0);
            this.set("extendedParameters", null);

            this.set("isReady", false);
            this.set("isBusy", false);
            this.set("hasMoreItems", null);
            this.set("appendingPageIndex", 1);
            this.set("isAutoRefresh", false);
            this.set("refreshTimeout", 3000);

            var target = CommerceUtilities.loadPageVar("target");
            var clickPath = CommerceUtilities.loadPageVar("p");

            this.set("target", target);
            this.set("clickPath", clickPath);

            this.on("change:sorting", this.refresh, this);
            this.on("change:facetCriteria", this.refresh, this);
            this.on("change:searchTerm", this.refresh, this);
            this.on("change:Headers", $.proxy(this.refresh, this));
        },

        setCompletedQueryCallback: function (callback) {
            this.completedQueryCallback = callback;
        },

        refresh: function () {
            this.set("isBusy", true);
            var isReady = this.get("isReady");
            var self = this;

            if (isReady === true) {
                var searchTerm = this.get("searchTerm");
                var pageIndex = this.get("pageIndex");
                var pageSize = this.get("pageSize");
                var dataUrl = this.get("dataUrl");
                var fields = this.get("fields");
                var database = this.get("database");
                var catalogName = this.get("catalogName");
                var commerceItemId = this.get("commerceItemId");
                var commerceItemType = this.get("commerceItemType");
                var facetCriteria = this.get("facetCriteria");
                var sorting = this.get("sorting");
                var exclusions = this.get("exclusions");
                var extendedParameters = this.get("extendedParameters");
                var headers = this.get("headers");

                this.search(searchTerm, pageIndex, pageSize, dataUrl, fields, database, catalogName, commerceItemId, commerceItemType, facetCriteria, sorting, exclusions, extendedParameters, headers);
            }
        },

        next: function () {
            var appendingPageIndex = this.get("appendingPageIndex");
            appendingPageIndex++;
            this.set("appendingPageIndex", appendingPageIndex);

            var searchTerm = this.get("searchTerm");
            var pageIndex = this.get("pageIndex");
            var pageSize = this.get("pageSize");
            var dataUrl = this.get("dataUrl");
            var fields = this.get("fields");
            var database = this.get("database");
            var catalogName = this.get("catalogName");
            var commerceItemId = this.get("commerceItemId");
            var commerceItemType = this.get("commerceItemType");
            var facetCriteria = this.get("facetCriteria");
            var sorting = this.get("sorting");
            var exclusions = this.get("exclusions");
            var extendedParameters = this.get("extendedParameters");
            var headers = this.get("headers");

            pageSize = appendingPageIndex * pageSize;

            this.search(searchTerm, pageIndex, pageSize, dataUrl, fields, database, catalogName, commerceItemId, commerceItemType, facetCriteria, sorting, exclusions, extendedParameters, headers);
        },

        search: function (searchTerm, pageIndex, pageSize, dataUrl, fields, database, catalogName, commerceItemId, commerceItemType, facetCriteria, sorting, exclusions, extendedParameters, headers) {
            this.set("isBusy", true);
            var isReady = this.get("isReady");
            var language = this.get("language");
            var self = this;

            if (isReady === true) {
                var sorting = this.get("sorting");
                var target = this.get("target");
                var clickPath = this.get("clickPath");
                if (dataUrl) {
                    var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
                    var ajaxToken = {};
                    ajaxToken[token.headerKey] = token.value;

                    var dataPayload = {
                        __RequestVerificationToken: token.value,
                        searchTerm: searchTerm,
                        pageIndex: pageIndex,
                        pageSize: pageSize,
                        fields: fields,
                        database: database,
                        catalogName: catalogName,
                        id: commerceItemId,
                        itemType: commerceItemType,
                        language: language,
                        facets: facetCriteria,
                        sorting: sorting,
                        exclusions: exclusions,
                        target: target,
                        clickPath: clickPath,
                        headers: headers
                    };

                    var extParameters = extendedParameters != "" ? extendedParameters.split('&') : null;
                    if (typeof extParameters != "undefined" && extParameters != null && extParameters.length > 0) {
                        for (var i = 0; i < extParameters.length; i++) {
                            var property = extParameters[i].split('=');
                            dataPayload[property[0].toString()] = property[1];
                        }
                    }

                    $.ajax({
                        url: dataUrl,
                        type: "POST",
                        headers: ajaxToken,
                        data: dataPayload,
                        context: this,
                        error: CommerceUtilities.IsAuthenticated,
                        success: function (data) {
                            this.set("items", data.Items);
                            this.set("facets", null); // ensures facets listeners are refreshed even if facets returned haven't changed.
                            this.set("facets", data.Facets);
                            this.set("hasItems", data.Items && data.Items.length > 0);
                            this.set("resultCount", data.Items === null ? 0 : data.Items.length);
                            this.set("totalItemCount", data.TotalCount);
                            this.set("hasMoreItems", data.TotalCount > (pageIndex + 1) * pageSize);
                            this.set("isBusy", false);

                            if (self.completedQueryCallback) {
                                self.completedQueryCallback();
                            }
                        }
                    });
                }
            }
        }
    });

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();

            // Get the design-time search properties
            var searchTerm = this.$el.attr("data-sc-searchTerm") || "";
            var pageIndex = parseInt(this.$el.attr("data-sc-pageIndex") || "0", 10);
            var pageSize = parseInt(this.$el.attr("data-sc-pageSize") || "0", 10);
            var dataUrl = this.$el.attr("data-sc-dataUrl") || "";
            var fields = this.$el.attr("data-sc-fields") || "";
            var database = this.$el.attr("data-sc-database") || "";
            var catalogName = this.$el.attr("data-sc-catalogName") || "";
            var commerceItemId = this.$el.attr("data-sc-commerceItemId") || "";
            var commerceItemType = this.$el.attr("data-sc-commerceItemType") || "";
            var facetCriteria = this.$el.attr("data-sc-facetCriteria") || "";
            var sortDirection = this.$el.attr("data-sc-sortDirection") || "";
            var sortProperty = this.$el.attr("data-sc-sortProperty") || "";
            var language = this.$el.attr("data-sc-language") || "";
            var extendedParameters = this.$el.attr("data-sc-extendedParameters") || "";
            var autoRefresh = this.$el.attr("data-sc-isAutoRefresh") === "1" || false;
            var timeout = this.$el.attr("data-sc-refreshTimeout") || 3000;
            var headers = this.$el.attr("data-sc-headers") || "";

            this.model.set("pageIndex", pageIndex);
            this.model.set("pageSize", pageSize);
            this.model.set("dataUrl", dataUrl);
            this.model.set("fields", fields);
            this.model.set("database", database);
            this.model.set("catalogName", catalogName);
            this.model.set("commerceItemId", commerceItemId);
            this.model.set("commerceItemType", commerceItemType);
            this.model.set("facetCriteria", facetCriteria);
            this.model.set("searchTerm", searchTerm);
            this.model.set("language", language);
            this.model.set("extendedParameters", extendedParameters);
            this.model.set("appendingPageIndex", pageIndex + 1);
            this.model.set("isAutoRefresh", autoRefresh);
            this.model.set("refreshTimeout", timeout);
            this.model.set("headers", headers);

            if (autoRefresh === true) {
                var refreshMethod = $.proxy(this.model.refresh, this.model);
                setInterval(refreshMethod, timeout);
            }
        }
    });

    Sitecore.Factories.createComponent("CommerceDataSource", model, view, ".sc-CommerceDataSource");
});
