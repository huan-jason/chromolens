///<reference path="focusView.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
//800 chromosome bands mapped to golden path by Terry Furey using fish data from BAC Resource Consortium
//Column 1:"chrom"
//string    Chromosome
//Column 2:"chromStart"
//integer   Start position in chromosome sequence
//Column 3:"chromEnd"
//integer   End position in chromosome sequence
//Column 4:"name"
//string    Name of cytonametic band
//Column 5:"gieStain"
//string    Giemsa stain results. Recognized stain values: gneg, gpos50, gpos75, gpos25, gpos100, acen, gvar, stalk (I added gpos33 gpos66 wich could be find sometimes)
/**
* Handling Cytoband files.
* @namespace Cytoband
*/
var Cytoband;
(function (Cytoband) {
    // chrom chromStart chromEnd name gieStain
    var BandType;
    (function (BandType) {
        BandType[BandType["band"] = 1] = "band";
        BandType[BandType["centromer_start"] = 2] = "centromer_start";
        BandType[BandType["centromer_end"] = 4] = "centromer_end";
        BandType[BandType["stalk"] = 8] = "stalk";
    })(BandType || (BandType = {}));

    /**
    * Features of Cytoband data.
    * @class Cytoband.CytobandFeature
    * @extends Model.NamedFeature
    */
    var CytobandFeature = (function () {
        function CytobandFeature(start, end, name, intensity, type) {
            this.start = start;
            this.end = end;
            this.name = name;
            this.intensity = intensity;
            this.type = type;
        }
        CytobandFeature.prototype.width = function () {
            return this.end - this.start;
        };
        return CytobandFeature;
    })();

    /**
    * A Cytoband chromosome
    * @class Cytoband.CytobandChromosomeModel
    * @extends Model.AbstractChromosomeModel
    */
    var CytobandChromosomeModel = (function () {
        function CytobandChromosomeModel(name) {
            this.values = [];
            this.values_by_name = d3.map();
            this.start = 0;
            this.end = 1;
            this.name = name;
        }
        CytobandChromosomeModel.prototype.getFeatureNames = function () {
            var names = [];
            this.values.forEach(function (val) {
                names.push(val.name);
            });
            return names;
        };

        CytobandChromosomeModel.prototype.getNamedFeature = function (name) {
            return this.values_by_name.get(name);
        };

        CytobandChromosomeModel.prototype.getFeatures = function () {
            return this.values;
        };

        CytobandChromosomeModel.prototype.addValue = function (v) {
            this.values.push(v);
            this.values_by_name.set(v.name, v);
        };

        CytobandChromosomeModel.prototype.optimize = function () {
            this.values.sort(Model.compareFeatures);
            if (this.values.length > 0) {
                this.start = this.values[0].start;
                this.end = this.values[this.values.length - 1].end;
            }
        };
        return CytobandChromosomeModel;
    })();

    /**
    * Iterator for the cytoband model
    * @class Cytoband.CytobandIterator
    * @extends Model.AbstractIterator
    */
    var CytobandIterator = (function (_super) {
        __extends(CytobandIterator, _super);
        function CytobandIterator() {
            _super.apply(this, arguments);
        }
        CytobandIterator.prototype.initialValue = function () {
            return [0, 0, "None"];
        };
        CytobandIterator.prototype.addValue = function (v) {
            this.accumulator[0] = Math.max(this.accumulator[0], v.intensity);
            this.accumulator[1] = this.accumulator[1] | v.type;
            this.accumulator[2] = v.name;
        };
        return CytobandIterator;
    })(Model.AbstractIterator);

    /**
    * A Cytoband chromosome set
    * @class Cytoband.CytobandChromosomeSet
    * @extends Model.ChromosomeSet
    */
    var CytobandChromosomeSet = (function () {
        function CytobandChromosomeSet(id, d) {
            this.type = "Cytoband";
            this.chromosomes = d3.map();
            this.chromosomes = d;
        }
        CytobandChromosomeSet.prototype.getChromosome = function (name) {
            return this.chromosomes.get(name);
        };
        CytobandChromosomeSet.prototype.getChromosomeNames = function () {
            return this.chromosomes.keys();
        };
        return CytobandChromosomeSet;
    })();

    /**
    * The parser for Cytoband data
    * @class Cytoband.CytobandParser
    * @extends Parsers.Parser
    */
    var CytobandParser = (function () {
        function CytobandParser() {
        }
        CytobandParser.prototype.parse_str = function (lines, id, desired_chroname) {
            this.time = (new Date()).getTime();
            var chromosomes = d3.map();
            var chro;
            var centromer_first = 0;
            var line;
            while ((line = lines.next()) !== null) {
                var components = line.split('\t');
                assert(components.length == 5);
                var chroname = components[0];
                chro = chromosomes.get(chroname);
                if (chro === undefined) {
                    chro = new CytobandChromosomeModel(chroname);
                    chromosomes.set(chroname, chro);
                }
                var start = parseInt(components[1]);
                var end = parseInt(components[2]);
                var name = components[3];
                var intensity = 0;
                var type;

                if (components[4] == "acen") {
                    if (centromer_first == 0) {
                        type = 2 /* centromer_start */;
                        centromer_first = 1;
                    } else {
                        type = 4 /* centromer_end */;
                        centromer_first = 0;
                    }
                } else if (components[4] == "stalk") {
                    type = 8 /* stalk */;
                } else {
                    type = 1 /* band */;
                    if (components[4] == "gneg") {
                    } else if (components[4] == "gpos25") {
                        intensity = 25;
                    } else if (components[4] == "gpos33") {
                        intensity = 33;
                    } else if (components[4] == "gpos50") {
                        intensity = 50;
                    } else if (components[4] == "gpos66") {
                        intensity = 66;
                    } else if (components[4] == "gpos75") {
                        intensity = 75;
                    } else if (components[4] == "gpos100") {
                        intensity = 100;
                    }
                }
                chro.addValue(new CytobandFeature(start, end, name, intensity, type));
            }
            chromosomes.forEach(function (key, chro) {
                chro.optimize();
            });
            return new CytobandChromosomeSet(id, chromosomes);
        };
        return CytobandParser;
    })();
    Parsers.registry.register('cytoband', new CytobandParser());

    /**
    * A panel that displays cytoband data
    * @class Cytoband.CytobandPanel
    * @extends Views.BasePanel
    */
    var CytobandPanel = (function (_super) {
        __extends(CytobandPanel, _super);
        function CytobandPanel(parent, name, role, iter, args) {
            _super.call(this, parent, name, role, args);
            var ob = this.svg.append("foreignObject").attr("width", this.width).attr("height", this.height);

            this.canvas = ob.append("xhtml:canvas").attr("width", this.width).attr("height", this.height);

            this.iter = iter;
        }
        CytobandPanel.prototype.getMinSize = function () {
            return [600, 15];
        };

        CytobandPanel.prototype.getMargin = function () {
            return [0, 10, 0, 10];
        };

        CytobandPanel.prototype.setSize = function (w, h) {
            _super.prototype.setSize.call(this, w, h);
            if (this.canvas !== undefined) {
                this.canvas.attr("width", w);
                this.canvas.attr("height", h);
                this.canvas.node().parentNode.attributes['width'].value = w;
                this.canvas.node().parentNode.attributes['height'].value = h;
            }
        };

        CytobandPanel.prototype.setChromosome = function (chromosome) {
            _super.prototype.setChromosome.call(this, chromosome);
            this.iter.setChromosome(chromosome);
            this.scale.domain([chromosome.start, chromosome.end]);
            this.scale.exponent(1);
            this.scale.focus(chromosome.start);
            this.setScale(this.scale);
        };

        CytobandPanel.prototype.setScale = function (newScale, duration) {
            var scaleInterpolator = newScale.scaleInterpolate()(this.scale);
            if (duration === undefined) {
                duration = 250;
            }
            _super.prototype.setScale.call(this, newScale, duration);
            var width = this.width;
            var iter = this.iter;
            var canvas = this.canvas.node();
            this.canvas.transition().duration(duration).tween("canvas", function () {
                return function (t) {
                    var ctx = canvas.getContext("2d");
                    var scale = scaleInterpolator(t);
                    var pos = 0;
                    iter.reset();
                    var canvasHeight = ctx.canvas.height;
                    ctx.clearRect(0, 0, ctx.canvas.width, canvasHeight);
                    var fontHeight = Math.floor(0.8 * canvasHeight);
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
                        var band = iter.moveTo(endChro);
                        var intensity = band[0];
                        var band_type = band[1];
                        var bandName = band[2];
                        if (band_type & 2 /* centromer_start */) {
                            ctx.fillStyle = "red";
                            ctx.beginPath();
                            ctx.moveTo(pos, 0);
                            ctx.lineTo(end, canvasHeight / 2);
                            ctx.lineTo(pos, canvasHeight);
                            ctx.lineTo(pos, 0);
                            ctx.fill();
                            ctx.stroke();
                            ctx.closePath();
                        } else if (band_type & 4 /* centromer_end */) {
                            ctx.fillStyle = "red";
                            ctx.beginPath();
                            ctx.moveTo(pos, canvasHeight / 2);
                            ctx.lineTo(end, 0);
                            ctx.lineTo(end, canvasHeight);
                            ctx.lineTo(pos, canvasHeight / 2);
                            ctx.fill();
                            ctx.stroke();
                            ctx.closePath();
                        } else if (band_type & 8 /* stalk */) {
                            ctx.fillStyle = "orange";
                            ctx.fillRect(pos, 0, end - pos, canvasHeight);
                            ctx.strokeStyle = "black";
                            ctx.strokeRect(pos, 0, end - pos, canvasHeight);
                            if (end - pos > 35) {
                                ctx.font = fontHeight + "px Georgia";
                                ctx.fillStyle = "black";
                                ctx.fillText(bandName, pos + (end - pos) / 2 - 15, canvasHeight - 3, end - pos);
                            }
                        } else if (band_type & 1 /* band */) {
                            ctx.fillStyle = "hsl(0, 0%, " + intensity + "%)";
                            ctx.fillRect(pos, 0, end - pos, canvasHeight);
                            ctx.strokeStyle = "black";
                            ctx.strokeRect(pos, 0, end - pos, canvasHeight);
                            if (end - pos > 35) {
                                ctx.font = fontHeight + "px Georgia";
                                if (intensity > 50) {
                                    ctx.fillStyle = "black";
                                } else {
                                    ctx.fillStyle = "white";
                                }
                                ctx.fillText(bandName, pos + (end - pos) / 2 - 15, canvasHeight - 3, end - pos);
                            }
                        } else {
                            endChro = endChro2;
                            pos = end;
                            continue;
                        }
                        endChro = endChro2;
                        pos = end;
                    }

                    // thanks http://www.eccesignum.org/blog/solving-display-refreshredrawrepaint-issues-in-webkit-browsers
                    canvas.style.display = 'none';
                    canvas.offsetHeight = canvas.offsetHeight;
                    canvas.style.display = 'block';
                };
            });
        };
        CytobandPanel.create = function (parent, name, role, args) {
            return new CytobandPanel(parent, name, role, new CytobandIterator(), args);
        };
        return CytobandPanel;
    })(Views.BasePanel);

    Views.registry.registerVF(CytobandPanel.create, "CytobandPanel", "Cytoband");
})(Cytoband || (Cytoband = {}));
