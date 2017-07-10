﻿(function (speak) {

  speak.component(["sitecore", "css!bclNvd3Style", "d3", "nvd3", "bclNvd3Models", "bclCombination"], function (Speak) {

    function handleItemClick(d) {
      this.SelectedItem = d;
      this.trigger("ItemSelected", this.SelectedItem);
    }

    /**
    * Component initialization.
    */
    return {
      refresh: function (isAnimationEnabled) {
        this.ChartComponent.bindData(this.DynamicData, isAnimationEnabled);
      },

      initialized: function () {
        this.DynamicData = [];
        var options = {
          el: this.el,
          xAxisLabel: this.XAxisLabel,
          legendMode: this.LegendMode,
          categoryLabelTrimming: this.CategoryLabelTrimming,
          isTitleVisible: this.IsTitleVisible,
          isLegendHidden: this.IsLegendHidden,
          leftLabelsWidth: this.LeftLabelsWidth,
          itemClicked: handleItemClick.bind(this),
          seriesDefinitions: this.SeriesDefinitions,
          isSegmentSelectionDisabled: this.IsSegmentSelectionDisabled
        };

        this.ChartComponent = new Sitecore.Speak.D3.components.Combination(options);
        this.on("change:DynamicData", function () {
          this.ChartComponent.bindData(this.DynamicData, true);
        }, this);

        this.on("change:IsVisible", function () {
          if (this.IsVisible) {
            setTimeout(function () {
              this.ChartComponent.bindData(this.DynamicData, true);
            }.bind(this), 0);
          };
        }, this);
      }
    };
  }, "CombinationChart");
})(Sitecore.Speak);
