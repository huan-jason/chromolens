///<reference path="histogram.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
* Handling Bedgraph files.
* @namespace BedGraph
*/
var BedGraph;
(function (BedGraph) {
    //  chrom chromStart chromEnd dataValue
    /**
    * A bedgraph feature, with a simple intensity value
    * @class BedGraph.BedGraphFeature
    */
    var BedGraphFeature = (function () {
        function BedGraphFeature(start, end, value) {
            this.start = start;
            this.end = end;
            this.value = value;
        }
        BedGraphFeature.prototype.width = function () {
            return this.end - this.start;
        };
        return BedGraphFeature;
    })();

    /**
    * A BedGraph chromosome
    * @class BedGraph.BedGraphChromosomeModel
    */
    var BedGraphChromosomeModel = (function () {
        function BedGraphChromosomeModel(name) {
            this.values = [];
            this.start = 0;
            this.end = 1;
            this.name = name;
        }
        BedGraphChromosomeModel.prototype.getFeatureNames = function () {
            return [];
        };

        BedGraphChromosomeModel.prototype.getNamedFeature = function (name) {
            return undefined;
        };

        BedGraphChromosomeModel.prototype.getFeatures = function () {
            return this.values;
        };

        BedGraphChromosomeModel.prototype.addValue = function (v) {
            this.values.push(v);
        };

        BedGraphChromosomeModel.prototype.optimize = function () {
            this.values.sort(Model.compareFeatures);
            if (this.values.length > 0) {
                this.start = this.values[0].start;
                this.end = this.values[this.values.length - 1].end;
            }
        };
        return BedGraphChromosomeModel;
    })();

    /**
    * A BedGraph chromosome set
    * @class BedGraph.BedGraphChromosomeSet
    * @extends Model.ChromosomeSet
    */
    var BedGraphChromosomeSet = (function (_super) {
        __extends(BedGraphChromosomeSet, _super);
        function BedGraphChromosomeSet() {
            _super.apply(this, arguments);
            this.type = "bedGraph";
        }
        BedGraphChromosomeSet.prototype.getChromosome = function (name) {
            return _super.prototype.getChromosome.call(this, name);
        };
        return BedGraphChromosomeSet;
    })(Parsers.MultiPhaseChromosomeSet);

    /**
    * An iterator that returns the maximum of the absolute values of the graph
    * @class BedGraph.MaxAbsIterator
    * @extends Model.AbstractIterator
    */
    var MaxAbsIterator = (function (_super) {
        __extends(MaxAbsIterator, _super);
        function MaxAbsIterator() {
            _super.apply(this, arguments);
        }
        MaxAbsIterator.prototype.addValue = function (v) {
            this.accumulator = Math.max(this.accumulator, Math.abs(v.value));
        };
        MaxAbsIterator.prototype.initialValue = function () {
            return 0.0;
        };
        return MaxAbsIterator;
    })(Model.AbstractIterator);
    ;

    /**
    * An iterator that returns an array with the [minimum, maximum] of the values of the graph
    * @class BedGraph.MinMaxIterator
    * @extends Model.AbstractIterator
    */
    var MinMaxIterator = (function (_super) {
        __extends(MinMaxIterator, _super);
        function MinMaxIterator() {
            _super.apply(this, arguments);
        }
        MinMaxIterator.prototype.initialValue = function () {
            return [0, 0];
        };
        MinMaxIterator.prototype.addValue = function (v) {
            this.accumulator[0] = Math.min(this.accumulator[0], v.value);
            this.accumulator[1] = Math.max(this.accumulator[1], v.value);
        };
        return MinMaxIterator;
    })(Model.AbstractIterator);

    /**
    * An iterator that returns the integral of the values of the graph (i.e. sum/length)
    * @class BedGraph.IntegralIterator
    * @extends Model.AbstractIterator
    */
    var IntegralIterator = (function (_super) {
        __extends(IntegralIterator, _super);
        function IntegralIterator() {
            _super.apply(this, arguments);
        }
        IntegralIterator.prototype.addValue = function (v) {
            var width = Math.min(this.nextPos, v.end) - Math.max(this.pos, v.start);
            this.accumulator += (width * v.value);
        };
        IntegralIterator.prototype.finalValue = function () {
            return this.accumulator / (this.nextPos - this.pos);
        };
        IntegralIterator.prototype.initialValue = function () {
            return 0.0;
        };
        return IntegralIterator;
    })(Model.AbstractIterator);

    /**
    * An iterator that returns the integral of the absolute values of the graph (i.e. sum/length)
    * @class BedGraph.MagIntegralIterator
    * @extends Model.AbstractIterator
    */
    var MagIntegralIterator = (function (_super) {
        __extends(MagIntegralIterator, _super);
        function MagIntegralIterator() {
            _super.apply(this, arguments);
        }
        MagIntegralIterator.prototype.addValue = function (v) {
            var width = Math.min(this.nextPos, v.end) - Math.max(this.pos, v.start);
            this.accumulator += (width * Math.abs(v.value));
        };
        MagIntegralIterator.prototype.finalValue = function () {
            return this.accumulator / (this.nextPos - this.pos);
        };
        MagIntegralIterator.prototype.initialValue = function () {
            return 0.0;
        };
        return MagIntegralIterator;
    })(Model.AbstractIterator);

    /**
    * A Parser for bedgraph files.
    * @class BedGraph.BedGraphParser
    * @extends Parsers.Parser
    */
    var BedGraphParser = (function () {
        function BedGraphParser() {
        }
        /**
        * Validates the header
        * @return {D3.Map} The map with the chromosomes extracted from the header
        */
        BedGraphParser.prototype.validateHeader = function (lineReader) {
            var lines = lineReader.getFirstLines(), len = lines.length, i = 0, line;

            for (; i < len; i += 1) {
                var components = lines[i].split(' ');

                if (components.length == 1 && lines[i].indexOf('\t') >= 0) {
                    components = lines[i].split('\t');
                }

                if (components[0] == 'browser') {
                    continue;
                }

                if (components[0] == 'track') {
                    assert(components.indexOf('type=bedGraph') > 0);
                    continue;
                }
            }
        };

        /**
        * Parsers the given string and returns the Model.ChromosomeSet
        *
        * @return {Model.ChromosomeSet}
        */
        BedGraphParser.prototype.parse_str = function (lines, id, desired_chroname) {
            var time = (new Date()).getTime();

            this.validateHeader(lines);

            var cset = new BedGraphChromosomeSet(id, this, lines);
            if (desired_chroname == undefined) {
                cset.parseNames();
                return cset;
            }

            var chro = new BedGraphChromosomeModel(desired_chroname);
            var line;
            lines.setStartPoint(new RegExp(desired_chroname + "\\s"));

            while ((line = lines.next()) !== null) {
                var components = line.split('\t');

                assert(components.length == 4);
                var chroname = components[0];
                if (chroname == desired_chroname) {
                    chro.addValue(new BedGraphFeature(parseInt(components[1]), parseInt(components[2]), parseFloat(components[3])));
                } else {
                    break;
                }
            }
            chro.optimize();
            cset.addChromosome(desired_chroname, chro);
            return cset;
        };
        return BedGraphParser;
    })();
    Parsers.registry.register('bedGraph', new BedGraphParser());

    /**
    * A panel that shows histogram views on Bedgraph data
    * @class BedGraph.BedGraphHistogramPanel
    * @extends Histogram.HistogramPanel
    */
    var BedGraphHistogramPanel = (function (_super) {
        __extends(BedGraphHistogramPanel, _super);
        function BedGraphHistogramPanel(parent, name, role, args) {
            _super.call(this, parent, name, role, new MinMaxIterator());
        }
        BedGraphHistogramPanel.create = function (parent, name, role, args) {
            return new BedGraphHistogramPanel(parent, name, role, args);
        };
        return BedGraphHistogramPanel;
    })(Histogram.HistogramPanel);

    Views.registry.registerVF(BedGraphHistogramPanel.create, "BedGraphHistogramPanel", "bedGraph");

    /**
    * A panel that shows density views on Bedgraph data
    * @class BedGraph.BedGraphDensityPanel
    * @extends Histogram.DensityPanel
    */
    var BedGraphDensityPanel = (function (_super) {
        __extends(BedGraphDensityPanel, _super);
        function BedGraphDensityPanel(parent, name, role, args) {
            _super.call(this, parent, name, role, new MaxAbsIterator());
        }
        BedGraphDensityPanel.create = function (parent, name, role, args) {
            return new BedGraphDensityPanel(parent, name, role, args);
        };
        return BedGraphDensityPanel;
    })(Histogram.DensityPanel);

    Views.registry.registerVF(BedGraphDensityPanel.create, "BedGraphDensityPanel", "bedGraph");
})(BedGraph || (BedGraph = {}));
