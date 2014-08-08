///<reference path="histogram.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
* Handling adjacency files.
* @namespace Adjacency
*/
var Adjacency;
(function (Adjacency) {
    /**
    * a single binding in the adjacency model
    * @class Adjacency.BindingFeature
    * @extends Model.Feature
    */
    var BindingFeature = (function () {
        function BindingFeature(start, end, direct, score) {
            this.start = start - 0;
            this.end = end - 0;
            this.direct = (direct == "TRUE") ? true : false;
            this.score = score - 0.0;
        }
        BindingFeature.prototype.midpoint = function () {
            return (this.start + this.end) / 2;
        };

        BindingFeature.prototype.scaledMidpoint = function (scale) {
            // TODO: Maybe memoize the scaled values?
            //return (scale(this.start)+scale(this.end))/2;
            return scale((this.start + this.end) / 2);
        };
        return BindingFeature;
    })();

    /**
    * An adjacency chromosome
    * @class Adjacency.AdjacencyChromosomeModel
    * @extends Model.AbstractChromosomeModel
    */
    var AdjacencyChromosomeModel = (function () {
        function AdjacencyChromosomeModel(name) {
            this.name = name;
            this.bindings = [];
            this.pre_clusters = {};
            this.start = 0;
            this.end = 1;
        }
        AdjacencyChromosomeModel.prototype.getFeatureNames = function () {
            return [];
        };

        AdjacencyChromosomeModel.prototype.getNamedFeature = function (name) {
            return undefined;
        };

        AdjacencyChromosomeModel.prototype.getFeatures = function () {
            return this.bindings;
        };

        AdjacencyChromosomeModel.prototype.addBinding = function (start, end, cluster, direct, score) {
            var binding = new BindingFeature(start, end, direct, score);
            this.bindings.push(binding);
            if (this.pre_clusters[cluster] === undefined) {
                this.pre_clusters[cluster] = [];
            }
            this.pre_clusters[cluster].push(binding);
        };

        AdjacencyChromosomeModel.prototype.optimize = function () {
            // TODO: check assumption that binding sites always differ by their start.
            this.bindings.sort(Model.compareFeatures);
            if (this.bindings.length > 0) {
                this.end = this.bindings[this.bindings.length - 1].end;
            }
            var clusters = [];
            for (var name in this.pre_clusters) {
                var cluster = this.pre_clusters[name];
                if (cluster.length > 1) {
                    cluster.sort(Model.compareFeatures);
                    clusters.push(cluster);
                }
            }
            delete this.pre_clusters;
            this.clusters = clusters;
        };
        return AdjacencyChromosomeModel;
    })();

    /**
    * An iterator that returns the maximum binding score over iterated bindings
    * @class Adjacency.MaxBindingIterator
    * @extends Model.AbstractIterator
    */
    var MaxBindingIterator = (function (_super) {
        __extends(MaxBindingIterator, _super);
        function MaxBindingIterator() {
            _super.apply(this, arguments);
        }
        MaxBindingIterator.prototype.addValue = function (b) {
            this.accumulator = Math.max(this.accumulator, Math.abs(b.score));
        };
        MaxBindingIterator.prototype.initialValue = function () {
            return 0;
        };
        return MaxBindingIterator;
    })(Model.AbstractIterator);
    ;

    /**
    * An Adjacency chromosome set
    * @class Adjacency.AdjacencyChromosomeSet
    * @extends Model.ChromosomeSet
    */
    var AdjacencyChromosomeSet = (function () {
        function AdjacencyChromosomeSet(id, d) {
            this.type = "adjacency";
            this.chromosomes = d;
        }
        AdjacencyChromosomeSet.prototype.getChromosome = function (name) {
            return this.chromosomes.get(name);
        };
        AdjacencyChromosomeSet.prototype.getChromosomeNames = function () {
            return this.chromosomes.keys();
        };
        return AdjacencyChromosomeSet;
    })();

    /**
    * The parser class for adjacency files
    * @class Adjacency.AdjacencyParser
    * @extends Parsers.Parser
    */
    var AdjacencyParser = (function () {
        function AdjacencyParser() {
        }
        AdjacencyParser.prototype.parse_str = function (lines, id, chro) {
            //try {
            var headers = lines.next().split('\t');
            var has_chro = (headers[0] == 'Chr');
            assert(has_chro || (chro !== undefined), '');
            assert(headers.length == (has_chro ? 6 : 5), '');
            var chromosomes = d3.map();
            var current_chro = chro;
            var chroModel;
            if (chro !== undefined) {
                chroModel = new AdjacencyChromosomeModel(chro);
                chromosomes.set(chro, chroModel);
            }
            var line;
            while ((line = lines.next()) !== null) {
                var vals = line.split('\t');
                if (has_chro) {
                    current_chro = vals.shift();
                }
                if (chro === undefined) {
                    if (!chromosomes.has(current_chro)) {
                        chromosomes.set(current_chro, new AdjacencyChromosomeModel(current_chro));
                    }
                    chroModel = chromosomes.get(current_chro);
                    chroModel.addBinding.apply(chroModel, vals);
                } else if (chro == current_chro) {
                    chroModel.addBinding.apply(chroModel, vals);
                }
            }
            chromosomes.forEach(function (key, chro) {
                chro.optimize();
            });
            return new AdjacencyChromosomeSet(id, chromosomes);
            //} catch (Exception) {
            //}
        };
        return AdjacencyParser;
    })();
    Parsers.registry.register('adjacency', new AdjacencyParser());

    // Adjacency view class
    function bindFill(d) {
        return d.direct ? "black" : "white";
    }

    function peakColor(d) {
        return d3.hcl(0, 0, 100 - 2 * d.score);
    }

    function num_direct(d) {
        var n = 0;
        d.forEach(function (b) {
            if (b.direct) {
                n++;
            }
        });
        return n;
    }

    function num_indirect(d) {
        var n = 0;
        d.forEach(function (b) {
            if (!b.direct) {
                n++;
            }
        });
        return n;
    }

    function arcPathWithScale(d, scale, height) {
        var path = [];
        var start = d[0].scaledMidpoint(scale);
        path.push("M", start, 0);
        for (var i = 1; i < d.length; i++) {
            var end = d[i].scaledMidpoint(scale);
            var xradius = (end - start) / 2;
            var yradius = Math.min(Math.max(4, (end - start) / 3), height / 2);
            path.push("A", xradius, yradius, 0, 0, 1, end, 0);
            start = end;
        }
        return path.join(' ');
    }

    function arcDDPathWithScale(d, scale, height) {
        var path = [];
        var directSubset = [];
        d.forEach(function (b) {
            if (b.direct) {
                directSubset.push(b);
            }
        });
        var start = directSubset[0].scaledMidpoint(scale);
        path.push("M", start, 0);
        for (var i = 1; i < directSubset.length; i++) {
            var end = directSubset[i].scaledMidpoint(scale);
            var xradius = (end - start) / 2;
            var yradius = Math.min(Math.max(4, (end - start) / 3), height / 2);
            path.push("A", xradius, yradius, 0, 0, 1, end, 0);
            start = end;
        }
        return path.join(' ');
    }

    function arcDIPathWithScale(d, scale, height) {
        var path = [];
        var directSubset = [];
        var indirectSubset = [];
        d.forEach(function (b) {
            if (b.direct) {
                directSubset.push(b);
            } else {
                indirectSubset.push(b);
            }
        });
        directSubset.forEach(function (direct_binding) {
            var start = direct_binding.scaledMidpoint(scale);
            indirectSubset.forEach(function (indirect_binding) {
                path.push("M", start, 0);
                var end = indirect_binding.scaledMidpoint(scale);
                var xradius = Math.abs(end - start) / 2;
                var yradius = Math.min(Math.max(4, Math.abs(end - start) / 3), height / 2);
                path.push("A", xradius, yradius, 0, 0, (end > start) ? 1 : 0, end, 0);
            });
        });
        return path.join(' ');
    }

    function showBinding(b) {
        d3.select("#binding_start").text(b.start);
        d3.select("#binding_end").text(b.end);
        d3.select("#binding_peak").text(b.score);
        d3.select("#binding_direct").style("display", b.direct ? "inline" : "none");
        var event = sourceEvent();
        d3.select("#binding_info").style("display", "block");
    }

    function hideBinding(b) {
        d3.select("#binding_info").style("display", "none");
    }

    /**
    * A panel that displays an adjacency model
    * @class Adjacency.AdjacencyPanel
    * @extends Views.BasePanel
    */
    var AdjacencyPanel = (function (_super) {
        __extends(AdjacencyPanel, _super);
        function AdjacencyPanel(parent, name, role, args) {
            _super.call(this, parent, name, role, args);
            this.complexArcs = (args['complexArcs'] === undefined) ? true : false;
            this.showAllBindings = (args['showAllBindings'] === undefined) ? false : true;
            this.g_line = this.svg.append("line").attr("x1", 0).attr("x2", this.width).attr("y1", 0).attr("y2", 0).attr("style", "stroke:rgb(255,0,0);stroke-width:2");
            this.g_arcs = this.svg.append("g").attr("class", "arcs");
            this.g_dd_arcs = this.svg.append("g").attr("class", "dd_arcs");
            this.g_ii_arcs = this.svg.append("g").attr("class", "ii_arcs");
            this.g_bindings = this.svg.append("g").attr("class", "bindings");
        }
        AdjacencyPanel.prototype.setSize = function (w, h) {
            _super.prototype.setSize.call(this, w, h);
            if (this.g_line !== undefined)
                this.g_line.attr("x2", w);
        };

        AdjacencyPanel.prototype.getMinSize = function () {
            return [600, 55];
        };

        // TODO: Optimize calculations
        AdjacencyPanel.prototype.arcSize = function (d) {
            if (d.length < 2) {
                return 0;
            }
            var start = this.scale(d[0].start);
            var end = this.scale(d[d.length - 1].end);
            return end - start;
        };

        AdjacencyPanel.prototype.setComplexArcs = function (complexArcs) {
            this.complexArcs = complexArcs;
        };

        AdjacencyPanel.prototype.setChromosome = function (chromosome) {
            _super.prototype.setChromosome.call(this, chromosome);
            var scale = this.scale;
            scale.domain([chromosome.start, chromosome.end]);
            scale.exponent(1);
            scale.focus(chromosome.start);
            this.setScale(scale);
            if (this.showAllBindings) {
                var selection = this.g_bindings.selectAll("circle").data(this.chromosome.bindings);

                selection.exit().remove();

                function correctedPos(binding) {
                    return binding.scaledMidpoint(scale);
                }

                selection.enter().append("circle").attr("cx", correctedPos).attr("cy", 0).attr("r", 2).attr("fill", bindFill).attr("stroke", peakColor).on("mouseover", showBinding).on("mouseout", hideBinding);
            }
        };

        AdjacencyPanel.prototype.setScale = function (newScale, duration) {
            // bring height into the closure for the next fns.
            var height = this.height;
            var scaleInterpolator = newScale.scaleInterpolate()(this.scale);
            if (duration === undefined) {
                duration = 250;
            }
            _super.prototype.setScale.call(this, newScale, duration);

            function arc_tween(arcFunction) {
                return function (datum, index, attrvalue) {
                    return function (t) {
                        var scale = scaleInterpolator(t);
                        return arcFunction(datum, scale, height);
                    };
                };
            }
            function cx_tween(binding, index, attrvalue) {
                return function (t) {
                    return binding.scaledMidpoint(scaleInterpolator(t));
                };
            }
            function correctedPos(binding) {
                return binding.scaledMidpoint(newScale);
            }

            function arcSize(d) {
                if (d.length < 2) {
                    return 0;
                }
                var start = newScale(d[0].start);
                var end = newScale(d[d.length - 1].end);
                return end - start;
            }

            function filterArcs(d) {
                return arcSize(d) > 3;
            }

            var somearcs = this.chromosome.clusters.filter(filterArcs);
            if (!this.showAllBindings) {
                var selectedBindings = d3.merge(somearcs);

                var selection = this.g_bindings.selectAll("circle").data(selectedBindings);

                selection.exit().transition().duration(duration).attrTween("cx", cx_tween).style("opacity", 0).remove();

                selection.style("opacity", 1).transition().duration(duration).attrTween("cx", cx_tween);

                selection.enter().append("circle").attr("cy", 0).attr("r", 2).attr("fill", bindFill).attr("stroke", peakColor).on("mouseover", showBinding).on("mouseout", hideBinding).transition().duration(duration).attrTween("cx", cx_tween);
            } else {
                this.g_bindings.selectAll("circle").transition().duration(duration).attrTween("cx", cx_tween);
            }
            function drawArcs(region, arcFunc, subset) {
                var selection = region.selectAll("path").data(subset);
                selection.exit().transition().duration(duration).style("opacity", 0).attrTween("d", arc_tween(arcFunc)).remove();
                selection.style("opacity", 1).transition().duration(duration).attrTween("d", arc_tween(arcFunc));
                selection.enter().append("path").transition().duration(duration).style("opacity", 1).attrTween("d", arc_tween(arcFunc));
            }

            if (this.complexArcs) {
                var subset1 = somearcs.filter(function (d) {
                    return num_direct(d) > 1;
                });
                drawArcs(this.g_dd_arcs, arcDDPathWithScale, subset1);
                drawArcs(this.g_ii_arcs, arcPathWithScale, somearcs.filter(function (d) {
                    return num_direct(d) === 0;
                }));
                drawArcs(this.g_arcs, arcDIPathWithScale, somearcs.filter(function (d) {
                    return num_direct(d) > 0 && num_indirect(d) > 0;
                }));
            } else {
                drawArcs(this.g_arcs, arcPathWithScale, somearcs);
            }
        };

        AdjacencyPanel.prototype.getOffset = function () {
            return [0, 50];
        };

        AdjacencyPanel.create = function (parent, name, role, args) {
            return new AdjacencyPanel(parent, name, role, args);
        };
        return AdjacencyPanel;
    })(Views.BasePanel);

    Views.registry.registerVF(AdjacencyPanel.create, "AdjacencyPanel", "adjacency");

    /**
    * A panel that displays a histogram of binding density
    * @class Adjacency.BindingDensityPanel
    * @extends Histogram.DensityPanel
    */
    var BindingDensityPanel = (function (_super) {
        __extends(BindingDensityPanel, _super);
        function BindingDensityPanel(parent, name, role, args) {
            _super.call(this, parent, name, role, new MaxBindingIterator());
        }
        BindingDensityPanel.create = function (parent, name, role, args) {
            return new BindingDensityPanel(parent, name, role, args);
        };
        return BindingDensityPanel;
    })(Histogram.DensityPanel);

    Views.registry.registerVF(BindingDensityPanel.create, "BindingDensityPanel", "adjacency");
})(Adjacency || (Adjacency = {}));
