///<reference path="core.ts" />
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
    * The root view of the view hierarchy.
    * @class GenomeViewer.ChromosomeViewer
    */
    var ChromosomeViewer = (function (_super) {
        __extends(ChromosomeViewer, _super);
        function ChromosomeViewer() {
            _super.call(this, null, "main", "main");
            this.setupViews();
            Views.mainView = this;
        }
        ChromosomeViewer.prototype.setScale = function (scale, duration) {
            assert(false, "viewer has no scale");
        };

        ChromosomeViewer.prototype.getViewSetup = function () {
            return ["mainPanel:MainPanel", "modelsView:ModelsView"];
        };

        ChromosomeViewer.prototype.addView = function (view) {
            _super.prototype.addView.call(this, view);
            if (view.name == "mainPanel") {
                this.mainPanel = view;
            }
        };

        /**
        * Obtain the ancestor view (the furthest parent)
        * @method GenomeViewer.ChromosomeViewer#getRootView
        * @return {Views.View} the ancestor
        */
        ChromosomeViewer.prototype.getRootView = function () {
            return this;
        };
        return ChromosomeViewer;
    })(Views.BaseView);
    GenomeViewer.ChromosomeViewer = ChromosomeViewer;

    /**
    * The root panel of the panel hierarchy. Not associated with a specific chromosome.
    * @class GenomeViewer.MainPanel
    */
    var MainPanel = (function (_super) {
        __extends(MainPanel, _super);
        function MainPanel(parent, name, role, args) {
            _super.call(this, parent, name, role, args);
            this.svg = d3.selectAll("svg").filter(".genome");
            var svgNode = this.svg.node();
            var margin = this.getMargin();
            this.setSize(svgNode.clientWidth - margin[0] - margin[2], svgNode.clientHeight - margin[1] - margin[3]);
        }
        /**
        * Obtain the ancestor panel (the furthest parent)
        * @method GenomeViewer.MainPanel#getRootPanel
        * @return {Views.Panel} the ancestor
        */
        MainPanel.prototype.getRootPanel = function () {
            return this;
        };

        MainPanel.prototype.layout = function (w, h) {
            if (w === undefined) {
                var svgNode = this.svg.node();
                var margin = this.getMargin();
                w = svgNode.clientWidth;
            }
            if (h === undefined)
                h = 60;
            return _super.prototype.layout.call(this, w, h);
        };

        MainPanel.prototype.doLayout = function (w, h) {
            var margin = this.getMargin();
            var x = margin[0];
            var y = margin[1];
            this.panels.forEach(function (p) {
                p.setPos(x, y);
                var psize = p.getOuterSize();
                y += psize[1];
            });
        };

        MainPanel.prototype.getScale = function () {
            return undefined;
        };

        MainPanel.prototype.setScale = function (newScale, duration) {
            assert(false, "main panel has no scale");
        };

        MainPanel.prototype.remove = function () {
            throw "Cannot remove the main panel";
        };

        MainPanel.prototype.getMargin = function () {
            return [20, 20, 20, 20];
        };

        MainPanel.prototype.invalidate = function () {
            this.invalidated = true;
        };

        MainPanel.prototype.isEmpty = function () {
            return false;
        };

        MainPanel.create = function (parent, name, role, args) {
            return new MainPanel(parent, name, role, args);
        };
        return MainPanel;
    })(Views.BasePanel);

    Views.registry.registerVF(MainPanel.create, "MainPanel");
})(GenomeViewer || (GenomeViewer = {}));
