///<reference path="histogram.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
* Handling ISF files.
* @namespace ISF
*/
var ISF;
(function (ISF) {
    /**
    * a single binding in the ISF model
    * @class ISF.BindingFeature
    * @extends Model.Feature
    */
    var BindingFeature = (function () {
        function BindingFeature(start, end, network, direct, pValue, PET) {
            this.start = start - 0;
            this.end = end - 0;
            this.direct = (direct == "TRUE") ? true : false;
            this.network = network - 0;
            this.pValue = pValue - 0;
            this.PET = PET - 0.0;
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
    * An ISF chromosome
    * @class ISF.isfChromosomeModel
    * @extends Model.AbstractChromosomeModel
    */
    var isfChromosomeModel = (function () {
        function isfChromosomeModel(name) {
            this.name = name;
            this.bindings = [];
            this.pre_clusters = {};
            this.start = 0;
            this.end = 1;
        }
        isfChromosomeModel.prototype.getFeatureNames = function () {
            return [];
        };

        isfChromosomeModel.prototype.getNamedFeature = function (name) {
            return undefined;
        };

        isfChromosomeModel.prototype.getFeatures = function () {
            return this.bindings;
        };

        isfChromosomeModel.prototype.addBinding = function (start, end, network, cluster, direct, pValue, PET) {
            var binding = new BindingFeature(start, end, network, direct, pValue, PET);
            this.bindings.push(binding);
            if (this.pre_clusters[cluster] === undefined) {
                this.pre_clusters[cluster] = [];
            }
            this.pre_clusters[cluster].push(binding);
        };

        isfChromosomeModel.prototype.optimize = function () {
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
        return isfChromosomeModel;
    })();

    /**
    * An iterator that returns the maximum binding PET over iterated bindings
    * @class ISF.MaxBindingIterator
    * @extends Model.AbstractIterator
    */
    var MaxBindingIterator = (function (_super) {
        __extends(MaxBindingIterator, _super);
        function MaxBindingIterator() {
            _super.apply(this, arguments);
        }
        MaxBindingIterator.prototype.addValue = function (b) {
            this.accumulator = Math.max(this.accumulator, Math.abs(b.PET));
        };
        MaxBindingIterator.prototype.initialValue = function () {
            return 0;
        };
        return MaxBindingIterator;
    })(Model.AbstractIterator);
    ;

    /**
    * An ISF chromosome set
    * @class ISF.isfChromosomeSet
    * @extends Model.ChromosomeSet
    */
    var isfChromosomeSet = (function () {
        function isfChromosomeSet(id, d) {
            this.type = "isf";
            this.chromosomes = d;
        }
        isfChromosomeSet.prototype.getChromosome = function (name) {
            return this.chromosomes.get(name);
        };
        isfChromosomeSet.prototype.getChromosomeNames = function () {
            return this.chromosomes.keys();
        };
        return isfChromosomeSet;
    })();

    /**
    * The parser class for ISF files
    * @class ISF.isfParser
    * @extends Parsers.Parser
    */
    var isfParser = (function () {
        function isfParser() {
        }
        /**
        * Validates the header
        * @return {Boolean} true if the there is chromosome in the header
        */
        isfParser.prototype.validateHeader = function (lineReader, chro) {
            var lines = lineReader.getFirstLines();
            var headerType = lines[0].split('\t');
            var headerFile = lines[1].split('\t');
            var has_chro = (headerFile[0] == '#Chr');
            assert(has_chro || (chro !== undefined), '');
            assert(headerFile.length == (has_chro ? 8 : 7), '');

            return has_chro;
        };

        /**
        *
        */
        isfParser.prototype.parse_str = function (lines, id, chro) {
            var has_chro = this.validateHeader(lines, chro);

            var chromosomes = d3.map();
            var current_chro = chro;
            var chroModel;
            if (chro !== undefined) {
                chroModel = new isfChromosomeModel(chro);
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
                        chromosomes.set(current_chro, new isfChromosomeModel(current_chro));
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

            return new isfChromosomeSet(id, chromosomes);
        };
        return isfParser;
    })();
    Parsers.registry.register('isf', new isfParser());

    // ISF view class
    function bindFill(d) {
        return d.direct ? "black" : "white";
    }

    function peakColor(d) {
        return d3.hcl(0, 0, 50 - 5 * d.PET);
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
        d3.select("#isf_start").text(b.start);
        d3.select("#isf_end").text(b.end);
        d3.select("#isf_PET").text(b.PET);
        d3.select("#isf_pValue").text(b.pValue);
        d3.select("#isf_network").text(b.network);
        d3.select("#isf_direct").style("display", b.direct ? "inline" : "none");
        var event = sourceEvent();
        d3.select("#isf_info").style("display", "block");
    }

    function hideBinding(b) {
        d3.select("#isf_info").style("display", "none");
    }

    /**
    * A panel that displays an ISF model
    * @class ISF.isfPanel
    * @extends Views.BasePanel
    */
    var isfPanel = (function (_super) {
        __extends(isfPanel, _super);
        function isfPanel(parent, name, role, args) {
            _super.call(this, parent, name, role, args);
            this.complexArcs = (args['complexArcs'] === undefined) ? true : false;
            this.showAllBindings = (args['showAllBindings'] === undefined) ? false : true;
            this.g_line = this.svg.append("line").attr("x1", 0).attr("x2", this.width).attr("y1", 0).attr("y2", 0).attr("style", "stroke:rgb(255,0,0);stroke-width:2");
            this.g_arcs = this.svg.append("g").attr("class", "arcs");
            this.g_dd_arcs = this.svg.append("g").attr("class", "dd_arcs");
            this.g_ii_arcs = this.svg.append("g").attr("class", "ii_arcs");
            this.g_bindings = this.svg.append("g").attr("class", "bindings");
        }
        isfPanel.prototype.setSize = function (w, h) {
            _super.prototype.setSize.call(this, w, h);
            if (this.g_line !== undefined)
                this.g_line.attr("x2", w);
        };

        isfPanel.prototype.getMinSize = function () {
            return [600, 55];
        };

        // TODO: Optimize calculations
        isfPanel.prototype.arcSize = function (d) {
            if (d.length < 2) {
                return 0;
            }
            var start = this.scale(d[0].start);
            var end = this.scale(d[d.length - 1].end);
            return end - start;
        };

        isfPanel.prototype.setComplexArcs = function (complexArcs) {
            this.complexArcs = complexArcs;
        };

        isfPanel.prototype.setChromosome = function (chromosome) {
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

        isfPanel.prototype.setScale = function (newScale, duration) {
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

        isfPanel.prototype.getOffset = function () {
            return [0, 50];
        };

        isfPanel.create = function (parent, name, role, args) {
            return new isfPanel(parent, name, role, args);
        };
        return isfPanel;
    })(Views.BasePanel);

    Views.registry.registerVF(isfPanel.create, "isfPanel", "isf");

    /**
    * A panel that displays a histogram of binding density
    * @class ISF.BindingDensityPanel
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
    Views.registry.registerVF(BindingDensityPanel.create, "BindingDensityPanel", "isf");
})(ISF || (ISF = {}));
