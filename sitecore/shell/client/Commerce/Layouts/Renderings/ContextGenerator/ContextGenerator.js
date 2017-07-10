//     Copyright (c) Sitecore Corporation 1999-2017
(function (Speak) {
    Speak.component({
        name: "ContextGenerator",

        initialized: function() {
            this.$el = $(this.el);
            var staticData = this.$el.attr("data-sc-staticData");
            if (staticData !== null) {
                try {
                    var jsonData = JSON.parse(staticData);
                    this.Items = jsonData;
                } catch (e) {
                    console.log("Error parsing JSON in " + this.id);
                }
            } else {
                this.Items = [];
            }
        }
    });

})(Sitecore.Speak);