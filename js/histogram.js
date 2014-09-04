///<reference path="focusView.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
* Views for Histogram maps
* @namespace Histogram
*/
var Histogram;
(function (Histogram) {
    /**
    * A panel for various kinds of horizontal graph functions.
    * @class Histogram.AbstractHistogramPanel
    * @extends Views.BasePanel
    */
    var AbstractHistogramPanel = (function (_super) {
        __extends(AbstractHistogramPanel, _super);
        function AbstractHistogramPanel(parent, name, role, iter, args) {
            _super.call(this, parent, name, role, args);
            var ob = this.svg.append("foreignObject").attr("width", this.width).attr("height", this.height);
            this.g_vbar = this.svg.append("line")
            .attr("x1", -10).attr("x2", -10)
            .attr("y1",   5).attr("y2",  35)
            .attr("class", "drag-bar")
            .attr("onmousedown", "mouseDragStart(event);")
            .attr("onmouseup",   "mouseDragEnd(event);")
            .attr("onmousemove", "mouseDrag(event);");
            this.canvas = ob.append("xhtml:canvas").attr("width", this.width).attr("height", this.height);
            this.drawContext = (this.canvas.node()).getContext("2d");
            this.iter = iter;
        }
        AbstractHistogramPanel.prototype.getMinSize = function () {
            return [600, 40];
        };

        AbstractHistogramPanel.prototype.setSize = function (w, h) {
            _super.prototype.setSize.call(this, w, h);
            if (this.canvas !== undefined) {
                this.canvas.attr("width", w);
                this.canvas.attr("height", h);
                this.canvas.node().parentNode.attributes['width'].value = w;
                this.canvas.node().parentNode.attributes['height'].value = h;
            }
        };

        AbstractHistogramPanel.prototype.setChromosome = function (chromosome) {
            _super.prototype.setChromosome.call(this, chromosome);
            this.iter.setChromosome(chromosome);
            this.globalMax = this.iter.moveTo(chromosome.end);
            this.scale.domain([chromosome.start, chromosome.end]);
            this.scale.exponent(1);
            this.scale.focus(chromosome.start);
            this.setScale(this.scale);
        };

        AbstractHistogramPanel.prototype.draw = function (pos, end, value) {
        };

        AbstractHistogramPanel.prototype.setScale = function (newScale, duration) {
            var scaleInterpolator = newScale.scaleInterpolate()(this.scale);
            if (duration === undefined) {
                duration = 250;
            }
            _super.prototype.setScale.call(this, newScale, duration);
            var ctx = this.drawContext;
            var width = this.width;
            var iter = this.iter;
            var globalMax = this.globalMax;
            var this_in_closure = this;
            ctx.fillStyle = "black";
            var canvas = this.canvas.node();
            this.canvas.transition().duration(duration).tween("canvas", function () {
                return function (t) {
                    var scale = scaleInterpolator(t);
                    var pos = 0;
                    iter.reset();
                    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                    while (pos < width) {
                        var endChro = iter.nextBreak();
                        var end = Math.max(pos + 1, Math.floor(scale(endChro)));
                        var endChro2 = scale.invert(end);
                        while (endChro2 > endChro && end > pos + 1) {
                            // corner case...
                            end--;
                            endChro2 = scale.invert(end);
                        }
                        endChro = endChro2;
                        var magI = iter.moveTo(endChro);
                        this_in_closure.draw(pos, end, magI);
                        pos = end;
                    }
                    canvas.style.display = 'none';
                    canvas.offsetHeight = canvas.offsetHeight;
                    canvas.style.display = 'block';
                };
            });
        };
        return AbstractHistogramPanel;
    })(Views.BasePanel);
    Histogram.AbstractHistogramPanel = AbstractHistogramPanel;

    /**
    * A panel that shows a min-max histogram using tick height
    * @class Histogram.HistogramPanel
    * @extends Histogram.AbstractHistogramPanel
    */
    var HistogramPanel = (function (_super) {
        __extends(HistogramPanel, _super);
        function HistogramPanel() {
            _super.apply(this, arguments);
        }
        HistogramPanel.prototype.draw = function (pos, end, value) {
            if (value[0] < 0 || value[1] > 0) {
                var min = -value[0] / this.globalMax[0];
                if (value[0] == 0) {
                    min = 0;
                }
                var max = value[1] / this.globalMax[1];
                this.drawContext.fillRect(pos, 20 - 20 * max, end - pos, (max - min) * 20);
            }
            pos = end;
        };
        return HistogramPanel;
    })(AbstractHistogramPanel);
    Histogram.HistogramPanel = HistogramPanel;

    /**
    * A panel that shows a histogram using tick brightness
    * @class Histogram.DensityPanel
    * @extends Histogram.AbstractHistogramPanel
    */
    var DensityPanel = (function (_super) {
        __extends(DensityPanel, _super);
        function DensityPanel() {
            _super.apply(this, arguments);
        }
        DensityPanel.prototype.draw = function (pos, end, value) {
            if (value > 0) {
                var mag = 1 - (value / this.globalMax);
                this.drawContext.fillStyle = "hsl(0,0%," + Math.floor(100 * mag) + "%)";
                this.drawContext.fillRect(pos, 0, end - pos, 10);
            }
        };
        return DensityPanel;
    })(AbstractHistogramPanel);
    Histogram.DensityPanel = DensityPanel;
})(Histogram || (Histogram = {}));
