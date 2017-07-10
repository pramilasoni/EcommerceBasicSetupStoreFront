//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {

    Speak.component({
        name: "CommerceDataSourceV2",

        completedQueryCallback: null,

        initialize: function () {
            // Setup properties
            this.defineProperty("AppendingPageIndex", 1);
            this.defineProperty("Exclusions", "");
        },

        initialized: function () {
            // Items must be initialized to an empty array to avoid error
            this.Items = [];

            // Add eventlisteners
            this.on("change:SearchTerm", $.proxy(this.refresh, this));
            this.on("change:Sorting", $.proxy(this.refresh, this));
            this.on("change:PageIndex", $.proxy(this.refresh, this));
            this.on("change:PageSize", $.proxy(this.refresh, this));
            this.on("change:FacetCriteria", $.proxy(this.refresh, this));
            this.on("change:ParentId", $.proxy(this.refresh, this));
            this.on("change:CommerceItemId", $.proxy(this.refresh, this));
            this.on("change:Headers", $.proxy(this.refresh, this));

            // Perform search
            this.refresh();
        },

        refresh: function () {
            var searchTerm = this.SearchTerm;
            var pageIndex = this.PageIndex;
            var pageSize = this.PageSize;
            var fields = this.Fields;
            var database = this.Database;
            var commerceItemId = this.CommerceItemId;
            var parentId = this.ParentId;
            var itemType = this.ItemType;
            var language = this.Language;
            var facetCriteria = this.FacetCriteria;
            var sorting = this.Sorting;
            var extendedParameters = this.ExtendedParameters;
            var headers = this.Headers;
            var exclusions = this.Exclusions;

            pageSize = pageSize * this.AppendingPageIndex;

            this.search(searchTerm, pageIndex, pageSize, fields, database, commerceItemId, parentId, itemType, language, facetCriteria, sorting, extendedParameters, headers, exclusions);
        },

        next: function () {
            // For infinite scrolling
            this.AppendingPageIndex++;

            var searchTerm = this.SearchTerm;
            var pageIndex = this.PageIndex;
            var pageSize = this.PageSize;
            var fields = this.Fields;
            var database = this.Database;
            var commerceItemId = this.CommerceItemId;
            var parentId = this.ParentId;
            var itemType = this.ItemType;
            var language = this.Language;
            var facetCriteria = this.FacetCriteria;
            var sorting = this.Sorting;
            var extendedParameters = this.ExtendedParameters;
            var headers = this.Headers;
            var exclusions = this.Exclusions;

            pageSize = this.AppendingPageIndex * pageSize;

            this.search(searchTerm, pageIndex, pageSize, fields, database, commerceItemId, parentId, itemType, language, facetCriteria, sorting, extendedParameters, headers, exclusions);
        },

        search: function (searchTerm, pageIndex, pageSize, fields, database, commerceItemId, parentId, itemType, language, facetCriteria, sorting, extendedParameters, headers, exclusions) {

            if (this.DataUrl && this.IsReady === true) {
                this.IsBusy = true;

                var dataPayload = {
                    searchTerm: searchTerm,
                    pageIndex: pageIndex,
                    pageSize: pageSize,
                    fields: fields,
                    database: database,
                    id: commerceItemId,
                    parentId: parentId,
                    itemType: itemType,
                    language: language,
                    facets: facetCriteria,
                    sorting: sorting,
                    headers: headers,
                    exclusions: exclusions
                };

                // Load extended parameters into the data payload
                if (extendedParameters) {
                    var extendedParametersList = extendedParameters.split("&");
                    for (var i = 0; i < extendedParametersList.length; i++) {
                        var property = extendedParametersList[i].split("=");
                        dataPayload[property[0].toString()] = property[1];
                    }
                }

                var token = Sitecore.Speak.utils.security.antiForgery.getAntiForgeryToken();
                var requestHeaders = {};
                requestHeaders[token.headerKey] = token.value;

                var self = this;
                $.ajax({
                    url: this.DataUrl,
                    type: "POST",
                    headers: requestHeaders,
                    data: dataPayload,
                    context: this,
                    success: function (data) {
                        self.Items = data.Items;
                        self.ResultCount = data.Items === null ? 0 : data.Items.length;
                        self.TotalItemCount = data.TotalItemCount;
                        self.HasItems = data.Items && data.Items.length > 0;
                        self.HasMoreItems = data.TotalItemCount > (pageIndex + 1) * pageSize;
                        self.IsBusy = false;

                        if (self.completedQueryCallback) {
                            self.completedQueryCallback();
                        }
                    }
                });
            }
        },

        setQueryCompletedCallback: function (callback) {
            this.completedQueryCallback = callback;
        }
    });

})(Sitecore.Speak);