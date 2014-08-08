///<reference path="../node_modules/DefinitelyTyped/jqueryui/jqueryui.d.ts" />
///<reference path="mainView.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
* Main view classes of the genome viewer
* @namespace GenomeViewer
*/
var GenomeViewer;
(function (GenomeViewer) {
    /**
    * A text field with autocomplete, that allows access to all {@linkcode Model.NamedFeatures} in a chromosome.
    * When a feature is selected, zooms to the selection.
    *
    * @class GenomeViewer.FeatureFinder
    * @extends Views.BaseView
    */
    var FeatureFinder = (function (_super) {
        __extends(FeatureFinder, _super);
        function FeatureFinder(parent, name, role, args) {
            // TODO: get signal from focusView when multiple focusview; or create 1 FeatureFinder/FocusView
            _super.call(this, parent, name, role, args);
            try  {
                this.nameSelect = $("#features");
            } catch (ReferenceError) {
                console.log("no jquery");
            }
        }
        FeatureFinder.prototype.setChromosome = function (model) {
            _super.prototype.setChromosome.call(this, model);
            var this_in_closure = this;
            this.names = this.chromosome.getFeatureNames();
            function change(event, ui) {
                if (ui.item !== null && ui.item !== undefined)
                    this_in_closure.changeValue(ui.item.value);
                this_in_closure.changeValue(event.target.value);
            }
            if (this.nameSelect !== undefined) {
                this.nameSelect.autocomplete({
                    'source': this.names,
                    'close': change,
                    'change': change });
            }
        };

        FeatureFinder.prototype.changeValue = function (name) {
            var feature = this.chromosome.getNamedFeature(name);
            if (feature !== undefined && feature !== null) {
                var parent = this.parent;
                var scale = parent.getScale();
                var oldFocus = scale.focus();
                var newScale = scale.copy();
                newScale.regionFocus(feature.start, feature.end, 0.4);

                // TODO : Actually check that it did not come before end of previous change, we get interference with intermediates.
                // We may have to queue changes.
                if (oldFocus != newScale.focus() || scale.exponent() != newScale.exponent()) {
                    if (feature.start <= oldFocus && oldFocus <= feature.end) {
                        parent.setScale(newScale, 2000);
                    } else {
                        var intermediate = newScale.copy();
                        intermediate.regionFocus(Math.min(oldFocus, feature.start), Math.max(oldFocus, feature.end), 0.4);
                        if (intermediate.exponent() >= scale.exponent()) {
                            // don't bother to zoom in to common region!
                            parent.setScale(newScale, 2000);
                        } else {
                            parent.setScale(intermediate, 2000);
                            window.setTimeout(function () {
                                parent.setScale(newScale, 2000);
                            }, 2300);
                        }
                    }
                    // TODO: delay
                }
            }
        };

        FeatureFinder.create = function (parent, name, role, args) {
            return new FeatureFinder(parent, name, role, args);
        };
        return FeatureFinder;
    })(Views.BaseView);
    Views.registry.registerVF(FeatureFinder.create, "FeatureFinder");
})(GenomeViewer || (GenomeViewer = {}));
