//     Copyright (c) Sitecore Corporation 1999-2017
/* jshint unused: vars */
define(["sitecore"], function (Sitecore) {
    Sitecore.Factories.createBaseComponent({
        name: "DateText",
        base: "ControlBase",
        selector: ".sc-DateText",
        attributes: [
            { name: "text", value: "$el.text" }
        ]
    });
});