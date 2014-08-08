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
    var isMacWebkit = (navigator.userAgent.indexOf("Macintosh") !== -1 && navigator.userAgent.indexOf("WebKit") !== -1);

    /**
    * A panel that can handle a deforming view.
    * @class GenomeViewer.PowerPanel
    * @extends Views.BasePanel
    */
    var PowerPanel = (function (_super) {
        __extends(PowerPanel, _super);
        function PowerPanel(parent, name, role, args) {
            _super.call(this, parent, name, role, args);
            this.mouseDown = false;

            var zoom = d3.behavior.zoom().on("zoom", getScrollWheelDelta);
            var size = this.getOuterSize();
            this.background = this.svg.append("rect").attr("class", "background").attr("x", -10).attr("y", 0).attr("width", size[0] + 20).attr("height", size[1]).attr("fill", "white").attr("stroke-width", 1).attr("stroke", "silver");

            this.scale = powerfocus([0, 1], [0, this.width], null, 0, 1); // d3.interpolate is a BaseInterpolate

            var this_in_closure = this;
            var node = this.svg.node();

            // Note that all events exept mousedown only update the local mouse state information.
            function getScrollWheelDelta() {
                this_in_closure.getScrollWheelDelta();
            }
            this.svg.on("mousedown", function () {
                this_in_closure.mouseDown = true;
                this_in_closure.mousedownTime = (new Date()).getTime();
                this_in_closure.lastCoords = d3.mouse(node);

                // first absolute focus change
                // Check: Is this called on mousestilldown on some platforms?
                this_in_closure.adjustFocus(true);
                setTimeout(function () {
                    this_in_closure.checkMouseDown();
                }, 400);
                //d3.event.stopPropagation();
            }).on("mouseup", function () {
                this_in_closure.lastCoords = d3.mouse(node);
                this_in_closure.mouseDown = false;
                //d3.event.stopPropagation();
            }).on("mousemove", function () {
                this_in_closure.lastCoords = d3.mouse(node);
                //d3.event.stopPropagation();
            }).on("mouseleave", function () {
                this_in_closure.mouseDown = false;
                //d3.event.stopPropagation();
            }).call(zoom);
        }
        /**
        * This method is called on mousedown, and then calls itself with a delay until the mouse is known to be up.
        * @method GenomeViewer.PowerPanel#checkMouseDown
        */
        PowerPanel.prototype.checkMouseDown = function () {
            if (!this.mouseDown)
                return;
            var size = this.getSize();
            if (this.lastCoords[0] > size[0] + 10 || this.lastCoords[1] > size[1] + 10 || this.lastCoords[0] < -10 || this.lastCoords[1] < -10) {
                // out of scope
                this.mouseDown = false;
                return;
            }

            // and do a relative rather than absolute.
            this.adjustFocus(false);
            var this_in_closure = this;
            setTimeout(function () {
                this_in_closure.checkMouseDown();
            }, 400); // this might be too short. Experiment.
        };

        PowerPanel.prototype.doLayout = function () {
            var margin = this.getMargin();
            var x = margin[0];
            var y = margin[1];
            this.panels.forEach(function (p) {
                p.setPos(x, y);
                var psize = p.getOuterSize();
                y += psize[1];
            });
        };

        PowerPanel.prototype.setSize = function (w, h) {
            _super.prototype.setSize.call(this, w, h);
            if (this.background !== undefined) {
                var size = this.getOuterSize();
                this.background.attr("width", size[0] + 20).attr("height", size[1]);
            }
            if (this.scale !== undefined) {
                this.scale.range([0, this.width]);
                this.setScale(this.scale);
            }
        };

        PowerPanel.prototype.setScale = function (newScale, duration) {
            if (duration === undefined) {
                duration = 200;
            }
            _super.prototype.setScale.call(this, newScale, duration);
            d3.select("#focus_detail").text(newScale.focus());
            d3.select("#zoom_detail").text(newScale.exponent());
        };

        PowerPanel.prototype.getMargin = function () {
            // left, top, right, bottom
            return [0, 0, 40, 0];
        };

        PowerPanel.prototype.getScrollWheelDelta = function () {
            var delta = 0;
            var event = (sourceEvent());
            if (event instanceof WheelEvent) {
                var e = event;

                // following from Javascript definitive guide
                delta = e.deltaY * -30 || e.wheelDeltaY / 4 || (e.wheelDeltaY === undefined && e.wheelDelta / 4) || e.detail * -10 || 0; // property not defined

                // Most browsers generate one event with delta 120 per mousewheel click.
                // On Macs, however, the mousewheels seem to be velocity-sensitive and
                // the delta values are often larger multiples of 120, at
                // least with the Apple Mouse. Use browser-testing to defeat this.
                if (isMacWebkit) {
                    delta /= 30;
                }
                // there seems to be an error
            } else
                try  {
                    // not always defined.
                    if (event instanceof MouseWheelEvent) {
                        var mwevent = event;
                        delta = mwevent.wheelDelta / 120;
                    }
                } catch (ReferenceError) {
                }
            if (delta != 0) {
                this.adjustExponent(delta);
            }
            event.preventDefault();
        };

        PowerPanel.prototype.adjustExponent = function (delta) {
            // TODO: Delta should mean something now, be proportional.
            var delta = delta;
            var exponent = this.scale.exponent();
            if (delta > 0) {
                exponent = exponent * 1.51;
            } else if (delta < 0) {
                exponent = exponent * 0.66;
                if (exponent < 1) {
                    exponent = 1;
                }
            }
            var focus = this.scale.focus();
            var newScale = this.scale.copy();
            newScale.focus(focus);
            newScale.exponent(exponent);
            this.setScale(newScale);
        };

        PowerPanel.prototype.adjustFocus = function (absolute) {
            var focus = this.scale.invert(this.lastCoords[0]);
            ;
            if (!absolute) {
                var focusPos = this.scale(this.scale.focus());

                // delta inv. proportional to zoom...
                var delta = Math.round(this.scale.invDerivAtFocus() * (this.lastCoords[0] - focusPos) / 3);
                focus += delta;
                focus = Math.max(this.chromosome.start, Math.min(this.chromosome.end, focus));
            }
            var newScale = this.scale.copy();
            var exponent = this.scale.exponent();
            newScale.focus(focus);
            newScale.exponent(exponent);
            this.setScale(newScale);
        };

        PowerPanel.prototype.setChromosome = function (chromosome) {
            var mc = this.chromosome;
            if (mc === undefined) {
                // do not call super. We do not want to propagate this to subviews, unless deliberately
                this.chromosome = mc = new Model.MultiChromosome();
                this.getSubView("ticks").setChromosome(mc);
            }
            mc.addChromosome(chromosome);
            this.getSubView("featureFinder").setChromosome(mc);

            this.scale.domain([mc.start, mc.end]);
            this.scale.exponent(1);
            this.scale.focus(Math.round((mc.start + mc.end) / 2));
            this.setScale(this.scale);
        };

        PowerPanel.prototype.isEmpty = function () {
            return this.panels.length <= 1;
        };

        PowerPanel.prototype.getViewSetup = function () {
            return ["ticks:PowerTickPanel", "featureFinder:FeatureFinder"];
        };

        /**
        * Define the existing roles for subviews of this view. Ordered.
        * @method Views.View#getViewRoles
        * @return {string[]}
        */
        PowerPanel.prototype.getViewRoles = function () {
            return ['content', 'ticks', 'featureFinder'];
        };

        PowerPanel.create = function (parent, name, role, args) {
            return new PowerPanel(parent, name, role, args);
        };
        return PowerPanel;
    })(Views.BasePanel);
    GenomeViewer.PowerPanel = PowerPanel;

    Views.registry.registerVF(PowerPanel.create, "PowerPanel");

    function tickSort(a, b) {
        return a[0] - b[0];
    }

    /**
    * A Panel that shows the chromosome positions on a deforming scale.
    * @class GenomeViewer.PowerTickPanel
    * @extends Views.BasePanel
    */
    var PowerTickPanel = (function (_super) {
        __extends(PowerTickPanel, _super);
        function PowerTickPanel(parent, name, role, args) {
            _super.call(this, parent, name, role, args);
            this.g_ticks = this.svg.append("g").attr("class", "ticks");
            this.g_ticks.append("line").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 24).attr("stroke", "red").attr("id", "focus");

            this.g_tickLabels = this.svg.append("g").attr("class", "ticklabels");

            this.g_line = this.svg.append("line").attr("x1", 0).attr("x2", this.width).attr("y1", 0).attr("y2", 0).attr("style", "stroke:rgb(255,0,0);stroke-width:2");
        }
        PowerTickPanel.prototype.getMinSize = function () {
            return [600, 40];
        };

        PowerTickPanel.prototype.setSize = function (w, h) {
            _super.prototype.setSize.call(this, w, h);
            if (this.g_line !== undefined)
                this.g_line.attr("x2", w);
        };

        PowerTickPanel.prototype.setScale = function (newScale, duration) {
            var oldScale = this.scale;
            var scaleInterpolator = newScale.scaleInterpolate()(oldScale);
            if (duration === undefined) {
                duration = 400;
            }
            newScale.focus(Math.round(newScale.focus()));
            newScale.exponent(Math.round(newScale.exponent()));
            _super.prototype.setScale.call(this, newScale, duration);
            var ticks = newScale.powerticks();
            var focus = newScale.focus();
            var chroEnd = this.chromosome.end;
            var focusTickSel = this.g_ticks.selectAll("#focus");
            var focusTick = [focus, 12];
            ticks.sort(tickSort);
            focusTickSel.data([focusTick]);
            var ticksSel = this.g_ticks.selectAll("line").filter(function (d, i) {
                return d !== focusTick;
            }).data(ticks, function (d) {
                return d[0];
            });

            function pos(d) {
                return d[1];
            }
            function identity(d) {
                return d[0] === focus ? "focus" : d[0];
            }
            function cx_tween(tick, index, attrvalue) {
                return function (t) {
                    return scaleInterpolator(t)(tick[0]);
                };
            }
            function focus_tween(tick, index, attrvalue) {
                return function (t) {
                    var scale = scaleInterpolator(t);
                    return scale(scale.focus());
                };
            }

            focusTickSel.attr("x1", oldScale(focus)).attr("x2", oldScale(focus)).transition().duration(duration).attrTween("x1", focus_tween).attrTween("x2", focus_tween);

            ticksSel.exit().transition().duration(duration).attr("opacity", 0).attrTween("x1", cx_tween).attrTween("x2", cx_tween).remove();

            ticksSel.enter().append("line").attr("opacity", 0).attr("y1", 0).attr("y2", function (d) {
                return d[1] * 2;
            }).attr("stroke", function (d) {
                return d3.hcl(0, 0, Math.max(0, 100 - d[1] * 10));
            }).transition().duration(duration).attr("opacity", 1).attrTween("x1", cx_tween).attrTween("x2", cx_tween);

            ticksSel.transition().duration(duration).attrTween("x1", cx_tween).attrTween("x2", cx_tween);

            var maxpower = ticks[0][1];
            var minpower = 100;
            for (var i in ticks) {
                minpower = Math.min(ticks[i][1], minpower);
            }
            var mainTicks = [focusTick];
            function textFormat(d) {
                if (d[0] === focus) {
                    return focus + "";
                }
                if (d[0] === 0)
                    return "0";
                var power = d[1];
                if (power > 2) {
                    return (d[0] / Math.pow(10, d[1] - 1)) + "e" + d[1];
                } else {
                    return d[0] + "";
                }
            }
            var halfCharWidth = 4;
            var minSpace = 20;
            function addTicksWithin(scale, start, vstart, end, vend, power) {
                if (focus > start) {
                    for (var i = ticks.length - 1; i >= 0; i--) {
                        var tick = ticks[i];
                        if (tick[0] < start)
                            break;
                        if (tick[0] >= focus)
                            continue;
                        if (tick[1] < power)
                            continue;
                        var display_str = textFormat(tick);
                        var rightedge = scale(tick[0]) + halfCharWidth * display_str.length;
                        var leftedge = scale(tick[0]) - halfCharWidth * display_str.length;
                        if (rightedge > vend - 5)
                            continue;
                        if (leftedge < vstart + 5)
                            break;
                        mainTicks.push(tick);
                        if (power > minpower && (vend - rightedge > minSpace)) {
                            addTicksWithin(scale, tick[0], rightedge, end, vend, power - 1);
                        }
                        end = tick[0];
                        vend = leftedge;
                    }
                    if (power > minpower && vend - vstart > minSpace) {
                        addTicksWithin(scale, start, vstart, end, vend, power - 1);
                    }
                }
                if (focus < end) {
                    for (var i = 0; i < ticks.length; i++) {
                        var tick = ticks[i];
                        if (tick[0] > end)
                            break;
                        if (tick[0] <= focus)
                            continue;
                        if (tick[1] < power)
                            continue;
                        var display_str = textFormat(tick);
                        var rightedge = scale(tick[0]) + halfCharWidth * display_str.length;
                        var leftedge = scale(tick[0]) - halfCharWidth * display_str.length;
                        if (rightedge > vend - 5)
                            break;
                        if (leftedge < vstart + 5)
                            continue;
                        mainTicks.push(tick);
                        if (power > minpower && (leftedge - vstart > minSpace)) {
                            addTicksWithin(scale, start, vstart, tick[0], leftedge, power - 1);
                        }
                        start = tick[0];
                        vstart = rightedge;
                    }
                    if (power > minpower && vend - vstart > minSpace) {
                        addTicksWithin(scale, start, vstart, end, vend, power - 1);
                    }
                }
            }
            var display_str = textFormat(focus);
            addTicksWithin(newScale, 0, 0, focus, newScale(focus) - halfCharWidth * display_str.length, maxpower);
            addTicksWithin(newScale, focus, newScale(focus) + halfCharWidth * display_str.length, chroEnd, newScale(chroEnd), maxpower);
            mainTicks.sort(tickSort);

            var sel = this.g_tickLabels.selectAll("text").data(mainTicks, identity);

            /*
            // TODO: Use a tween function for opacity, so things dis/appear when there is enough space for them...
            // Difficulty: Requires knowing about exit data and the space it takes, as below.
            // maybe exit transition should be faster than enter transition, or some such.
            var e = sel.exit();
            if (!e.empty()) {
            var old = Array();
            e.each(function(d) {old.push(d);});
            }
            */
            sel.transition().attr("opacity", 1).duration(duration).attrTween("x", cx_tween);
            sel.exit().transition().duration(duration).attr("opacity", 0).attrTween("x", cx_tween).remove();
            sel.enter().append("text").attr("y", 30).text(textFormat).attr("fill", function (d) {
                return d[0] === focus ? "black" : d3.hcl(0, 0, Math.max(0, 100 - d[1] * 10)).toString();
            }).attr("opacity", 0).transition().duration(duration).attr("opacity", 1).attrTween("x", cx_tween);
        };

        PowerTickPanel.create = function (parent, name, role, args) {
            return new PowerTickPanel(parent, name, role, args);
        };
        return PowerTickPanel;
    })(Views.BasePanel);

    Views.registry.registerVF(PowerTickPanel.create, "PowerTickPanel");
})(GenomeViewer || (GenomeViewer = {}));
