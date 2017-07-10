/// <reference path="../../../../../../assets/vendors/lodash/lodash.min.js" />
/// <reference path="../../../../../../assets/vendors/Backbone/backbone.js" />
/// <reference path="../../../../../../assets/lib/dist/sitecore.js" />
/// <reference path="../../../../../../assets/vendors/KnockOut/knockout-2.1.0.js" />
//     Copyright (c) Sitecore Corporation 1999-2017
/*
* Local Storage
* Styling
* Close when clicking outside
* BDD tests
*/
/* jshint unused: vars */
define(["sitecore", "knockout", "bootstrap"], function (Sitecore, ko) {
    var ActionModel = function () {
        this.name = new ko.observable("");
        this.groups = new ko.observable("");
        this.id = new ko.observable("");
        this.text = new ko.observable("");
        this.tooltip = new ko.observable("");
        this.isIcon = new ko.observable(false);
        this.iconSrc = new ko.observable("");
        this.iconBackgroundPosition = new ko.observable("");
        this.isFavorite = new ko.observable(false);
        this.isDefaultAction = new ko.observable(false);
        this.click = new ko.observable("");
        this.isEnabled = new ko.observable(true);
        this.counter = new ko.observable("");
        this.isActive = new ko.observable(true);
        this.isVisible = new ko.observable(true);
    };

    ActionModel.prototype.invoke = function (app) {
        var click = this.click();
        if (click) {
            Sitecore.Helpers.invocation.execute(click, { control: this, app: app });
        }
    };

    var model = Sitecore.Definitions.Models.ControlModel.extend({
        initialize: function (options) {
            this._super();
            this.set("text", "");
            this.set("isOpen", false);
            this.set("actions", []);
            this.set("favorites", []);
            this.set("isVisible", true);
            this.set("listHeight", "");
            this.set("userProfileKey", "");
            this.set("actionsStatus", []);
        },

        getAction: function (actionName) {
            var actions = this.get("actions");
            
            for (var i = 0; i< actions.length; i++)
            {
                if (actions[i].name() == actionName) {
                    return actions[i];
                }
            }

            return null;
        },

        isTargetGroupInGroups: function (targetGroup, groups) {
            var listOfGroups = groups.split('|');
            for (var i = 0; i < listOfGroups.length; i++) {
                if (listOfGroups[i] == targetGroup) {
                    return true;
                }
            }

            return false;
        },

        isTargetGroupNotInGroups: function (targetGroup, groups) {
            var listOfGroups = groups.split('|');
            for (var i = 0; i < listOfGroups.length; i++) {
                if (listOfGroups[i] == targetGroup) {
                    return false;
                }
            }

            return true;
        },

        disableActionGroup: function (targetGroup) {
            var actions = this.get("actions");

            for (var i = 0; i < actions.length; i++) {
                if (this.isTargetGroupInGroups(targetGroup, actions[i].groups())) {
                    actions[i].isEnabled(false);
                }
            }
        },

        disableActionsNotInGroup: function (group) {
            var actions = this.get("actions");

            for (var i = 0; i < actions.length; i++) {
                if (this.isTargetGroupNotInGroups(group, actions[i].groups())) {
                    actions[i].isEnabled(false);
                }
            }
        },


        enableActionGroup: function (targetGroup) {
            var actions = this.get("actions");

            for (var i = 0; i < actions.length; i++) {
                if (this.isTargetGroupInGroups(targetGroup, actions[i].groups())) {
                    actions[i].isEnabled(true);
                }
            }
        },

        enableActionsNotInGroup: function (group) {
            var actions = this.get("actions");

            for (var i = 0; i < actions.length; i++) {
                if (this.isTargetGroupNotInGroups(group, actions[i].groups())) {
                    actions[i].isEnabled(true);
                }
            }
        },

        hideActionGroup: function (targetGroup) {
            var actions = this.get("actions");

            for (var i = 0; i < actions.length; i++) {
                if (this.isTargetGroupInGroups(targetGroup, actions[i].groups())) {
                    actions[i].isVisible(false);
                }
            }
        },

        hideActionsNotInGroup: function (group) {
            var actions = this.get("actions");

            for (var i = 0; i < actions.length; i++) {
                if (this.isTargetGroupNotInGroups(group, actions[i].groups())) {
                    actions[i].isVisible(false);
                }
            }
        },

        showActionGroup: function (targetGroup) {
            var actions = this.get("actions");

            for (var i = 0; i < actions.length; i++) {
                if (this.isTargetGroupInGroups(targetGroup, actions[i].groups())) {
                    actions[i].isVisible(true);
                }
            }
        },

        showActionsNotInGroup: function (group) {
            var actions = this.get("actions");

            for (var i = 0; i < actions.length; i++) {
                if (this.isTargetGroupNotInGroups(group, actions[i].groups())) {
                    actions[i].isVisible(true);
                }
            }
        }
    });

    ko.bindingHandlers.fadeVisible = {
        init: function (element, valueAccessor) {
            // Initially set the element to be instantly visible/hidden depending on the value
            var value = valueAccessor();
            var updatedValue = ko.utils.unwrapObservable(value);
            var oldValue = parseInt($(element).text());
            if (updatedValue == 0 || oldValue == NaN) {
                $(element).hide();
            }

        },

        update: function (element, valueAccessor) {
            // Whenever the value subsequently changes, show  highlight
            var value = valueAccessor();
            var updatedValue = ko.utils.unwrapObservable(value);
            var oldValue = parseInt($(element).text());
            if (updatedValue != oldValue) {
                $(element).effect("highlight");
            }

            if (updatedValue == 0 || oldValue == NaN) {
                $(element).hide();
            }
        }
    };

    var view = Sitecore.Definitions.Views.ControlView.extend({
        initialize: function (options) {
            this._super();
            this.model.set("userProfileKey", this.$el.data("sc-userprofilekey"));
            this.model.set("actionsStatus", this.$el.data("sc-actionsstatus"));
            this.model.set("text", this.$el.find(".dropdown-text").text());
            $(".nav-header").css("display", function () {
                if (this.innerText === "") {
                    $(".nav-header").parent().children(":last-child").css("margin-bottom", "0px");
                    return "none";
                } else {
                    display: "block"
                }
            });

            this.listenTo(_sc, "sc-action-isvisible", this.toggleVisibilityInBar, this);

            var actions = this.$el.find("[data-sc-actionid]").map(function () {
                var action = new ActionModel(),
                url = $(this).find("div").css('background-image');
                var backgroundPosition = $(this).find("div").css('background-position');

                action.name($(this).attr("data-sc-name"));
                action.groups($(this).attr("data-sc-groups"));
                action.id($(this).attr("data-sc-actionid"));
                action.text($(this).text());
                action.iconSrc(url);
                action.iconBackgroundPosition(backgroundPosition);
                action.isIcon(url ? true : false);

                action.isFavorite($(this).attr("data-sc-favorite") === "true");
                action.tooltip($(this).attr("data-sc-tooltip"));
                action.isDefaultAction($(this).attr("data-sc-favorite") === "true");
                action.click($(this).attr("data-sc-click"));
                action.isEnabled($(this).attr("data-sc-enabled") == "true" ? true : false);

                action.enable = new ko.computed(function () {
                    return action.isEnabled() === true ? "ActionEnabled" : "ActionDisabled";
                }, view);

                action.counter($(this).attr("data-sc-counter"));
                action.isActive($(this).attr("data-sc-active") == "true" ? true : false);

                action.isVisible($(this).attr("data-sc-visible") == "true" ? true : false);
                action.visible = new ko.computed(function () {
                    _sc.trigger("sc-action-isvisible", action);
                    return action.isVisible() === true ? "ActionVisible" : "ActionHidden";
                }, view);

                action.cssClasses = new ko.computed(function () {
                    return action.enable() + " " + action.visible();
                }, view);

                action.bubbleCount = new ko.observable("");
                action.bubbleClasses = new ko.computed(function () {

                    var bubble = "noDigitCircle";
                    action.bubbleCount = "noDigit";
                    var count = parseInt(action.counter());
                    if (count !== 0) {
                        if (count <= 9) {
                            bubble = "singleDigitCircle";
                            action.bubbleCount = "singleDigit";
                        } else if (count > 99) {
                            bubble = "threeDigitCircle";
                            action.bubbleCount = "threeDigit";
                        } else if (count > 9) {
                            bubble = "twoDigitCircle";
                            action.bubbleCount = "twoDigit";
                        }
                    }

                    return bubble;
                }, view);

                return action;
            });

            this.model.set("actions", actions);
            var listHeight = $(".sc-applicationContent-main").height() - 132;
            if (listHeight > window.outerHeight) {
                listHeight = window.outerHeight - 132;
            }
            this.model.set("listHeight", listHeight.toString() + "px");
            this.updateFavorites();
        },

        toggleVisibilityInBar: function (action) {

            var element = this.$el.find("[data-sc-actionid=" + action.id() + "]");
            if (action.isVisible())
            { element.show(); }
            else {
                element.hide();
            }
        },

        toggleIsOpen: function () {
            this.model.set("isOpen", !this.model.get("isOpen"));
        },

        toggleVisibility: function (action) {

            if (action !== null) {
                action.isActive(!action.isActive());
            }
        },

        toggleActive: function (action) {

            var image = action.iconSrc();

            var active = action.iconSrc().split("_")[(action.iconSrc().split("_").length - 1)].substr(0, 6);
            if (active != "active") {
                image = image.replace(".png", "_active.png");
            }
            else {
                image = image.replace("_active.png", ".png");
            }

            action.iconSrc(image);

            if (action !== null) {
                action.isActive(!action.isActive());

            }
        },

        setActiveState: function (action, active) {
            var image = action.iconSrc();

            if (active){
                image = image.replace(".png", "_active.png");
            }
            else{
                image = image.replace("_active.png", ".png");
            }

            action.iconSrc(image);

            if (action !== null) {
                action.isActive(active);
            }
        },

        toggleFavorite: function (data, event) {
            var action = this.getAction(event.target);

            if (action.isEnabled()) {
                $(event.target).toggleClass("selected");

                if (action !== null) {
                    action.isFavorite(!action.isFavorite());
                    this.updateActionsStatus(action);
                    this.updateFavorites();
                }
            }
        },

        invokeAction: function (data, event) {
            var action = this.getAction(event.target);

            if (!action) {
                this.model.set("isOpen", false);
            }
            else if (action.isEnabled()) {
                this.model.set("isOpen", false);
                action.invoke(this.app);
            }
        },

        invokeFavorite: function (action) {
            action.invoke(this.app);
        },

        getAction: function (target) {
            var source = $(target);
            if (!source.attr("data-sc-actionid")) {
                source = source.parents("[data-sc-actionid]");
            }

            if (source === null) {
                return null;
            }

            var id = $(source).attr("data-sc-actionid");
            if (!id) {
                return null;
            }

            return _.find(this.model.get("actions"), function (e) {
                return e.id() == id;
            });
        },

        updateFavorites: function () {
            var favorites = _.select(this.model.get("actions"), function (e) {
                return e.isFavorite();
            });

            this.model.set("favorites", favorites);
        },

        updateActionsStatus: function (action) {
            var foundAction = _.find(this.model.get("actionsStatus"), function (obj) { return obj.id == action.id(); });
            if (foundAction) {
                foundAction.isFavorite = action.isFavorite();
            } else {
                this.model.get("actionsStatus").push(
                  {
                      id: action.id(),
                      isFavorite: action.isFavorite()
                  });
            }

            this.setFavoritesInUserProfile();
        },

        setFavoritesInUserProfile: function () {
            var key = this.model.get("userProfileKey");
            var value = JSON.stringify(this.model.get("actionsStatus"));
            var token = Sitecore.Helpers.antiForgery.getAntiForgeryToken();
            var ajaxToken = {};
            ajaxToken[token.headerKey] = token.value;
            $.ajax({
                dataType: "text",
                headers: ajaxToken,
                error: CommerceUtilities.IsAuthenticated,
                data: "key=" + key + "&value=" + value,
                url: "/sitecore/shell/commerce/merchandising/Settings/SetUserProfileKey"
            });
        }
    });

    Sitecore.Factories.createComponent("CommerceActionControl", model, view, ".sc-cs-actioncontrol");
});