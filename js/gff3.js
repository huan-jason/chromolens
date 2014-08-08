///<reference path="focusView.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
//  Column 1: "seqid"
//  The ID of the Landmark used to establish the coordinate system for the current feature. IDs may contain any characters, but must escape any characters not in the set [a-zA-Z0-9.:^*$@!+_?-|]. In particular, IDs may not contain unescaped whitespace and must not begin with an unescaped ">".
//  Column 2: "source"
//  The source is a free text qualifier intended to describe the algorithm or operating procedure that generated this feature. Typically this is the name of a piece of software, such as "Genescan" or a database name, such as "Genbank." In effect, the source is used to extend the feature ontology by adding a qualifier to the type creating a new composite type that is a subclass of the type in the type column.
//  Column 3: "type"
//  The type of the feature (previously called the "method"). This is constrained to be either: (a)a term from the "lite" version of the Sequence Ontology - SOFA, a term from the full Sequence Ontology - it must be an is_a child of sequence_feature (SO:0000110) or (c) a SOFA or SO accession number. The latter alternative is distinguished using the syntax SO:000000.
//  Columns 4 & 5: "start" and "end"
//  The start and end coordinates of the feature are given in positive 1-based integer coordinates, relative to the Landmark given in column one. Start is always less than or equal to end. For features that cross the origin of a circular feature (e.g. most bacterial genomes, plasmids, and some viral genomes), the requirement for start to be less than or equal to end is satisfied by making end = the position of the end + the length of the Landmark feature.
//  For zero-length features, such as insertion sites, start equals end and the implied site is to the right of the indicated base in the direction of the Landmark.
//  Column 6: "score"
//  The score of the feature, a floating point number. As in earlier versions of the format, the semantics of the score are ill-defined. It is strongly recommended that E-values be used for sequence similarity features, and that P-values be used for ab initio gene prediction features.
//  Column 7: "strand"
//  The strand of the feature. + for positive strand (relative to the Landmark), - for minus strand, and . for features that are not stranded. In addition, ? can be used for features whose strandedness is relevant, but unknown.
//  Column 8: "phase"
//  For features of type "CDS", the phase indicates where the feature begins with reference to the reading frame. The phase is one of the integers 0, 1, or 2, indicating the number of bases that should be removed from the beginning of this feature to reach the first base of the next codon. In other words, a phase of "0" indicates that the next codon begins at the first base of the region described by the current line, a phase of "1" indicates that the next codon begins at the second base of this region, and a phase of "2" indicates that the codon begins at the third base of this region. This is NOT to be confused with the frame, which is simply start modulo 3.
//  For forward strand features, phase is counted from the start field. For reverse strand features, phase is counted from the end field.
//  The phase is REQUIRED for all CDS features.
//  Column 9: "attributes"
//  A list of feature attributes in the format tag=value. Multiple tag=value pairs are separated by semicolons. URL escaping rules are used for tags or values containing the following characters: ",=;". Spaces are allowed in this field, but tabs must be replaced with the %09 URL escape. Attribute values do not need to be and should not be quoted. The quotes should be included as part of the value by parsers and not stripped.
//  These tags have predefined meanings:
//  ID
//  Indicates the ID of the feature. IDs for each feature must be unique within the scope of the GFF file. In the case of discontinuous features (i.e. a single feature that exists over multiple genomic locations) the same ID may appear on multiple lines. All lines that share an ID collectively represent a single feature.
//  Name
//  Display name for the feature. This is the name to be displayed to the user. Unlike IDs, there is no requirement that the Name be unique within the file.
//  Alias
//  A secondary name for the feature. It is suggested that this tag be used whenever a secondary identifier for the feature is needed, such as locus names and accession numbers. Unlike ID, there is no requirement that Alias be unique within the file.
//  Parent
//  Indicates the parent of the feature. A parent ID can be used to group exons into transcripts, transcripts into genes, an so forth. A feature may have multiple parents. Parent can *only* be used to indicate a partof relationship.
//  Target
//  Indicates the target of a nucleotide-to-nucleotide or protein-to-nucleotide alignment. The format of the value is "target_id start end [strand]", where strand is optional and may be "+" or "-". If the target_id contains spaces, they must be escaped as hex escape %20.
//  Gap
//  The alignment of the feature to the target if the two are not collinear (e.g. contain gaps). The alignment format is taken from the CIGAR format described in the Exonerate documentation. (http://cvsweb.sanger.ac.uk/cgi-bin/cvsweb.cgi/exonerate ?cvsroot=Ensembl). See "THE GAP ATTRIBUTE" for a description of this format.
//  Derives_from
//  Used to disambiguate the relationship between one feature and another when the relationship is a temporal one rather than a purely structural "part of" one. This is needed for polycistronic genes. See "PATHOLOGICAL CASES" for further discussion.
//  Note
//  A free text note.
//  Dbxref
//  A database cross reference. See the section "Ontology Associations and Db Cross References" for details on the format.
//  Ontology_term
//  A cross reference to an ontology term. See the section "Ontology Associations and Db Cross References" for details.
//  Is_circular
//  A flag to indicate whether a feature is circular. See extended discussion below.
// ID attributes provided for features must be unique throughout the gff3 file.
// These ID's are used to make "part_of" (Parent) associations between features.
// Each line, if contains an ID, must be unique. For multi-feature features, such as alignments,
// multiple lines can share the same ID. If this is the case, the seqid, source, type (method),
// strand, target name and all other attributes other than target must be the same.
/**
* Handling GFF3 files.
* @namespace GFF3
*/
var GFF3;
(function (GFF3) {
    var hex_re = /%[0-0a-f][0-0a-f]/i;

    function unescape(input) {
        var r = hex_re.exec(input);
        while (r !== null) {
            input = input.substr(0, r.index) + String.fromCharCode(parseInt(input.substr(r.index + 1, r.index + 3), 16)) + input.substr(r.index + 3);
            r = hex_re.exec(input);
        }
        return input;
    }

    
    ;

    var feature_uid_counter;

    /**
    * The base class for {@linkcode GFF3.GFF3Feature}, {@linkcode GFF3.Landmark} and {@linkcode GFF3.Fragment}
    * @class GFF3.FeatureBase
    * @extends Model.NamedFeature
    */
    var FeatureBase = (function () {
        /**
        * @constructor GFF3.FeatureBase
        * @param  {string}    name  The feature name (GFF3 ID)
        * @param  {number}    start the starting position of the feature in the chromosome
        * @param  {number}    end   the ending position of the feature in the chromosome
        * @param  {string}    type  the type of feature (column 3 of GFF3)
        */
        function FeatureBase(name, start, end, type) {
            this.uid = feature_uid_counter++;
            this.name = name;
            this.start = start;
            this.end = end;
            this.type = type;
        }
        FeatureBase.prototype.clone = function () {
            return new FeatureBase(this.name, this.start, this.end, this.type);
        };

        FeatureBase.prototype.children = function () {
            return [];
        };
        FeatureBase.prototype.addChild = function (f) {
            throw "not implemented";
        };
        FeatureBase.prototype.removeChild = function (f) {
            throw "not implemented";
        };
        FeatureBase.prototype.merge = function (f) {
            throw "not implemented";
        };
        FeatureBase.prototype.calc_width = function () {
            return 1;
        };
        FeatureBase.prototype.key = function () {
            return this.name;
        };
        FeatureBase.prototype.parents_id = function () {
            return [];
        };

        /**
        * Visit this object and its children recursively
        * @method GFF3.FeatureBase#visit
        * @param  {FeatureVisitor} v the visitor
        */
        FeatureBase.prototype.visit = function (v) {
            var cont = v.visit(this);
            if (cont) {
                this.children().forEach(function f(c) {
                    c.visit(v);
                });
            }
        };

        /**
        * Visit this object and its children recursively.
        * The children list is copied, for it may be manipulated by the visitor.
        * @method GFF3.FeatureBase#safeVisit
        * @param  {FeatureVisitor} v the visitor
        */
        FeatureBase.prototype.safeVisit = function (v) {
            var cont = v.visit(this);
            if (cont) {
                var children = this.children();
                if (children.length > 0) {
                    children = children.slice(0);
                    children.forEach(function f(c) {
                        c.safeVisit(v);
                    });
                }
            }
        };
        FeatureBase.prototype.getFullType = function () {
            return this.type;
        };
        FeatureBase.prototype.treeString = function (indent) {
            var r = indent + this['constructor']['name'] + ' ' + this.type + ' ' + this.name + ' ' + this.pos_in_track;
            r += '\n';
            indent += '\t';
            this.children().forEach(function (c) {
                r += c.treeString(indent);
            });
            return r;
        };
        FeatureBase.prototype.optimize = function (m) {
        };
        return FeatureBase;
    })();

    function compareFeatureBase(a, b) {
        var r = a.start - b.start;
        if (r != 0)
            return r;

        // here we invert, so smaller features come after and are seen.
        r = b.end - a.end;
        if (r != 0)
            return r;

        // artefact: We want exon to be hidden by CDS... so inverse alpha here
        r = a.type.localeCompare(b.type);
        if (r != 0)
            return -r;
        if (a.name !== undefined && b.name !== undefined)
            return a.name.localeCompare(b.name);
        return a.uid - b.uid;
    }

    /**
    * A chromosome Landmark (declared in a GFF3 pragma)
    * @class GFF3.Landmark
    * @extends GFF3.FeatureBase
    */
    var Landmark = (function (_super) {
        __extends(Landmark, _super);
        function Landmark(name, start, end) {
            _super.call(this, name, start, end, "landmark");
            this._children = [];
        }
        Landmark.prototype.clone = function () {
            return new Landmark(this.name, this.start, this.end);
        };
        Landmark.prototype.addChild = function (f) {
            this._children.push(f);
            f.parent = this;
        };
        Landmark.prototype.removeChild = function (f) {
            this._children.splice(this._children.indexOf(f), 1);
            f.parent = undefined;
        };
        Landmark.prototype.children = function () {
            return this._children;
        };
        Landmark.prototype.visit = function (v) {
            var cont = v.visit(this);
        };
        Landmark.prototype.optimize = function (m) {
            this._children.sort(compareFeatureBase);
        };
        return Landmark;
    })(FeatureBase);

    /**
    * One single location of a multi-feature feature
    * @class GFF3.Fragment
    * @extends GFF3.FeatureBase
    */
    var Fragment = (function (_super) {
        __extends(Fragment, _super);
        function Fragment(f, pos) {
            _super.call(this, f.name, f.start, f.end, f.type);
            this.pos = pos;
            if (f instanceof GFF3Feature) {
                this.target = f.target;
            }
        }
        Fragment.prototype.children = function () {
            return [];
        };

        Fragment.prototype.clone = function () {
            // should I use this.target?
            var f = new Fragment(this, this.pos);
            f.target = this.target;
            return f;
        };
        Fragment.prototype.key = function () {
            return this.name + "_" + this.pos;
        };
        Fragment.prototype.parents_id = function () {
            return [this.name];
        };
        Fragment.prototype.getFullType = function () {
            return this.type + '__fragment';
        };
        return Fragment;
    })(FeatureBase);

    /**
    * A GFF3Feature. Corresponds to a single ID in the file.
    * @class GFF3.GFF3Feature
    * @extends GFF3.FeatureBase
    */
    var GFF3Feature = (function (_super) {
        __extends(GFF3Feature, _super);
        function GFF3Feature(name, start, end, type, target, source, score, strand, phase, display_name, alias, multi_attributes, parents_id) {
            _super.call(this, name, start, end, type);
            this._children = [];
            this.target = target;
            this.source = source;
            this.score = score;
            this.strand = strand;
            this.phase = phase;
            this.display_name = display_name;
            this.alias = alias;
            this.multi_attributes = multi_attributes;
            this._parents_id = parents_id;
        }
        GFF3Feature.from_parts = function (parts) {
            var args = d3.map();
            parts[8].split(';').forEach(function (a) {
                var kv = a.split('=', 2);

                var v = kv[1].split(',').map(function (v) {
                    return unescape(v);
                });

                args.set(kv[0], v);
            });
            var source = unescape(parts[1]);

            // TODO: Refer to SOFA?
            var type = unescape(parts[2]);
            var start = parseInt(parts[3], 10);
            var end = parseInt(parts[4], 10);
            var score = parseFloat(parts[5]);
            var strand = parts[6].charAt(0);
            var phase = parseInt(parts[7], 10);
            var name;
            var parents_id;
            var alias;
            var display_name;
            var target;
            var argvals;

            if (args.has('Parent')) {
                parents_id = args.get('Parent');
                args.remove('Parent');
            } else {
                parents_id = [parts[0]];
            }

            if (args.has('Alias')) {
                argvals = args.get('Alias');
                assert(argvals.length == 1);
                alias = argvals[0];
                args.remove('Alias');
            }

            if (args.has('Name')) {
                argvals = args.get('Name');
                assert(argvals.length == 1);
                display_name = argvals[0];
                args.remove('Name');
            }

            if (args.has('ID')) {
                argvals = args.get('ID');
                assert(argvals.length == 1);
                name = argvals[0];
                args.remove('ID');
            } else if (display_name !== undefined) {
                name = display_name;
            } else {
                // anomaly, but exists
            }

            if (args.has('Target')) {
                argvals = args.get('Target');
                assert(argvals.length == 1);
                target = argvals[0];
                args.remove('Target');
            }

            return new GFF3Feature(name, start, end, type, target, source, score, strand, phase, display_name, alias, args, parents_id);
        };

        GFF3Feature.prototype.clone = function () {
            assert(this._children.length == 0);
            return new GFF3Feature(this.name, this.start, this.end, this.type, this.target, this.source, this.score, this.strand, this.phase, this.display_name, this.alias, this.multi_attributes, this._parents_id);
        };

        GFF3Feature.prototype.children = function () {
            return this._children;
        };
        GFF3Feature.prototype.optimize = function (m) {
            this._children.sort(compareFeatureBase);
            if (m !== undefined) {
                if (this.display_name !== undefined) {
                    m.set(this.display_name, this);
                }
                if (this.alias !== undefined) {
                    m.set(this.alias, this);
                }
            }
        };

        GFF3Feature.prototype.merge = function (f) {
            if (this._children.length == 0) {
                this.addChild(new Fragment(this, 0));
            } else {
                // TODO: check that all children are fragments
                // (at this stange, before reparenting)
            }

            // TODO: check that the Fragment's data is the same as mine
            this.addChild(new Fragment(f, this._children.length));
            this.start = Math.min(this.start, f.start);
            this.end = Math.max(this.end, f.end);
            return this;
        };

        GFF3Feature.prototype.addChild = function (f) {
            this._children.push(f);
            f.parent = this;
        };

        GFF3Feature.prototype.removeChild = function (f) {
            this._children.splice(this._children.indexOf(f), 1);
            f.parent = undefined;
        };

        GFF3Feature.prototype.midpoint = function () {
            return (this.start + this.end) / 2;
        };
        GFF3Feature.prototype.parents_id = function () {
            return this._parents_id;
        };
        GFF3Feature.prototype.visit = function (v) {
            var cont = v.visit(this);
            if (cont) {
                this._children.forEach(function f(c) {
                    c.visit(v);
                });
            }
        };
        return GFF3Feature;
    })(FeatureBase);

    /**
    * Collate the set of types of all features, and call the optimize method on each feature
    * @class GFF3.CollateTypesAndOptimize
    * @extends GFF3.FeatureVisitor
    */
    var CollateTypesAndOptimize = (function () {
        function CollateTypesAndOptimize(features) {
            this.type_set = d3.set();
            this.features = features;
        }
        CollateTypesAndOptimize.prototype.visit = function (fb) {
            this.type_set.add(fb.type);
            fb.optimize(this.features);
            return true;
        };
        return CollateTypesAndOptimize;
    })();
    ;

    /**
    * Data model for chromosomes parsed from GFF3 files.
    * @class GFF3.ChromosomeGFF3Model
    * @extends Model.AbstractChromosomeModel
    */
    var ChromosomeGFF3Model = (function () {
        /**
        * @constructor GFF3.ChromosomeGFF3Model
        * @param {string} name the chromosome name
        */
        function ChromosomeGFF3Model(name) {
            /**
            * All features (excluding fragments and clones) indexed by name.
            * @member GFF3.ChromosomeGFF3Model#features
            * @type D3.Map
            */
            this.features = d3.map();
            /**
            * All feature types
            * @member GFF3.ChromosomeGFF3Model#types
            * @type string[]
            */
            this.types = [];
            /**
            * chromosome start position
            * @member GFF3.ChromosomeGFF3Model#start
            * @type number
            */
            this.start = 0;
            /**
            * chromosome start position
            * @member GFF3.ChromosomeGFF3Model#end
            * @type number
            */
            this.end = 1;
            this.name = name;
        }
        ChromosomeGFF3Model.prototype.getFeatureNames = function () {
            return this.features.keys();
        };

        ChromosomeGFF3Model.prototype.getNamedFeature = function (name) {
            return this.features.get(name);
        };

        ChromosomeGFF3Model.prototype.getFeatures = function () {
            return this.features.values();
        };

        /**
        * @member GFF3.ChromosomeGFF3Model#addFeature
        * @param {FeatureBase} feature a feature to be added
        */
        ChromosomeGFF3Model.prototype.addFeature = function (feature) {
            var name = feature.name;
            if (!this.features.has(name)) {
                this.features.set(name, feature);
            } else {
                this.features.get(name).merge(feature);
            }
        };

        /**
        * attach features to their parents;
        * construct top_features; place features in lanes.
        * @member GFF3.ChromosomeGFF3Model#optimize
        */
        ChromosomeGFF3Model.prototype.optimize = function () {
            var top_features_map = d3.map();
            var top_features = [];
            var start = this.start;
            var end = this.end;

            // attach features to their parents. add to top_features otherwise.
            this.features.forEach(function (name, f) {
                var parents_id = f.parents_id();
                if (parents_id.length > 0) {
                    var found = false;
                    for (var i = 0; i < parents_id.length; i++) {
                        var parent_name = parents_id[i];
                        if (parent_name == name) {
                            // silly bug in some files
                            top_features_map.set(f.name, f);
                            return;
                        }
                        if (this.has(parent_name)) {
                            var child = f;
                            if (i > 0) {
                                child = child.clone();
                            }
                            this.get(parent_name).addChild(child);
                            found = true;
                        }
                    }
                    if (found) {
                        return;
                    }
                }
                top_features_map.set(f.name, f);
            });

            // Note: ms markers are a benchmark of various phases with the human genome.
            // 450 ms
            // construct top_features, chromosome start and end.
            top_features_map.forEach(function (name, f) {
                top_features.push(f);
                start = Math.min(start, f.start);
                end = Math.max(end, f.end);
            });

            // TODO: check assumption that binding sites always differ by their start.
            top_features.sort(compareFeatureBase);
            this.top_features = top_features;
            this.start = start;
            this.end = end;

            // Ensure all sub-features are sorted, and get types
            var v = new CollateTypesAndOptimize(this.features);
            this.visit(v);
            this.types = v.type_set.values();

            // TODO: take max on all topfeatures. Not necessarily last.
            assert(this.top_features.length > 0);
        };

        ChromosomeGFF3Model.prototype.getAncestors = function (of_feature, of_type) {
            var processed = d3.map();
            var unprocessed = [of_feature];
            while (unprocessed.length) {
                var fb = unprocessed.pop();
                if (processed.has(fb.key())) {
                    continue;
                }
                processed.set(fb.key(), fb);
                var parents_id = fb.parents_id();
                for (var i in parents_id) {
                    var parent = this.features.get(parents_id[i]);
                    if (parent !== undefined) {
                        unprocessed.push(parent);
                    }
                }
            }

            //          processed.remove(of_feature.key());
            var result = processed.values();
            if (of_type !== undefined) {
                result = result.filter(function (f) {
                    return f.type == of_type;
                });
            }
            return result;
        };

        ChromosomeGFF3Model.prototype.visit = function (v) {
            this.top_features.forEach(function f(c) {
                c.visit(v);
            });
        };
        ChromosomeGFF3Model.prototype.safeVisit = function (v) {
            this.top_features.forEach(function f(c) {
                c.safeVisit(v);
            });
        };
        ChromosomeGFF3Model.prototype.treeString = function () {
            var r = "Chromosome " + this.name + '\n';
            this.top_features.forEach(function (c) {
                r += c.treeString('\t');
            });
            return r;
        };
        return ChromosomeGFF3Model;
    })();

    /**
    * A GFF3 chromosome set
    * @class GFF3.GFF3ChromosomeSet
    * @extends Model.ChromosomeSet
    */
    var GFF3ChromosomeSet = (function () {
        function GFF3ChromosomeSet(id, d) {
            this.type = "gff3";
            this.id = id;
            this.chromosomes = d;
        }
        GFF3ChromosomeSet.prototype.getChromosome = function (name) {
            return this.chromosomes.get(name);
        };
        GFF3ChromosomeSet.prototype.getChromosomeNames = function () {
            return this.chromosomes.keys();
        };
        return GFF3ChromosomeSet;
    })();

    /**
    * A parser for GFF3 files
    * @class GFF3.GFF3Parser
    * @extends Parsers.Parser
    */
    var GFF3Parser = (function () {
        function GFF3Parser() {
        }
        /**
        * Validates the header
        * @return {D3.Map} The map with the chromosomes extracted from the header
        */
        GFF3Parser.prototype.validateHeader = function (lineReader) {
            var lines = lineReader.getFirstLines(), len = lines.length, i = 0, line;

            var chromosomes = d3.map();

            for (; i < len; i += 1) {
                line = lines[i];

                if (!line) {
                    continue;
                }

                if (line.indexOf('gff-version') !== -1) {
                    assert(line.indexOf('3') !== -1, 'Invalid header for GFF3 format');
                }

                if (line.indexOf('sequence-region ') !== -1) {
                    var parts = line.split(' ');
                    assert(!chromosomes.has(parts[1]));

                    var chro = new ChromosomeGFF3Model(parts[1]);
                    chromosomes.set(parts[1], chro);
                    chro.start = parseInt(parts[2]);
                    chro.end = parseInt(parts[3]);
                }
            }

            return chromosomes;
        };

        /**
        *
        */
        GFF3Parser.prototype.parse_str = function (lines, name, desired_chroname) {
            this.time = (new Date()).getTime();

            feature_uid_counter = 0;

            var chromosomes = this.validateHeader(lines);
            ;
            var chro;
            var line;

            while ((line = lines.next()) !== null) {
                var parts = line.trim().split('\t');
                assert(parts.length >= 9);
                var f = GFF3Feature.from_parts(parts);
                var chroname = parts[0];
                chro = chromosomes.get(chroname);
                if (chro === undefined) {
                    chro = new ChromosomeGFF3Model(chroname);
                    chromosomes.set(chroname, chro);
                }
                chro.addFeature(f);
            }
            console.log("parse:" + ((new Date()).getTime() - this.time));

            // TODO: Delay until presentation? A lot of work is done later anyway.
            // In thac case, make optimize idempotent.
            chromosomes.forEach(function (key, chro) {
                chro.optimize();
            });
            console.log("end optimize:" + ((new Date()).getTime() - this.time));
            return new GFF3ChromosomeSet(name, chromosomes);
        };
        return GFF3Parser;
    })();
    Parsers.registry.register('gff3', new GFF3Parser());

    var baseTypeHandling = d3.map();
    var TypeHandling;
    (function (TypeHandling) {
        TypeHandling[TypeHandling["inlane"] = 0] = "inlane";
        TypeHandling[TypeHandling["hide"] = 1] = "hide";
        TypeHandling[TypeHandling["embed"] = 2] = "embed";
        TypeHandling[TypeHandling["end_recursion"] = 16] = "end_recursion";
    })(TypeHandling || (TypeHandling = {}));
    ;
    var recursion_mask = 16 /* end_recursion */ - 1;
    baseTypeHandling.set('mRNA', 1 /* hide */);
    baseTypeHandling.set('ncRNA', 1 /* hide */);
    baseTypeHandling.set('exon', 2 /* embed */); // it should be embed; after I have moved them!
    baseTypeHandling.set('CDS__fragment', 2 /* embed */);
    baseTypeHandling.set('TF_binding_site', 2 /* embed */);

    var adjustCDS = d3.set();
    adjustCDS.add("CDS");

    var reparents = d3.map();
    reparents.set('exon', 'CDS');

    /**
    * An algorithm for calculating the proper vertical position for each feature
    * Features are grouped by type; some types are hidden.
    * Each feature is placed in an available vertical position, so as to avoid overlap.
    * This algorithm has to be done in two parts, continued in {@linkcode GFF3.LaneAdjustor}
    * @class GFF3.LaneCalculator
    * @extends GFF3.FeatureVisitor
    */
    var LaneCalculator = (function () {
        function LaneCalculator(chro, type_handling) {
            /**
            * The number of "lanes" for each feature type.
            * Depends on how many features of one type are "active" simultaneously.
            * Calculated in optimize. (actually impacts visual height.)
            * @member GFF3.LaneCalculator#type_width
            * @type {}
            */
            this.type_width = {};
            this.active_by_type = d3.map();
            this.chro = chro;
            this.type_handling = type_handling;
        }
        LaneCalculator.prototype.visit = function (f) {
            // find vertical position for all features w/o collision
            // TODO: perfect this algorithm so "larger" features are in upper lanes.
            // Go breadth-first instead of depth-first?
            var type = f.type;
            var fulltype = f.getFullType();
            var pos = f.start;

            var treatment = this.type_handling.get(fulltype);
            var continue_visit = (treatment & 16 /* end_recursion */) == 0;
            treatment &= recursion_mask;
            if (treatment == 1 /* hide */) {
                f.pos_in_track = 0;
                return continue_visit;
            } else if (treatment == 2 /* embed */) {
                // will be done in second visit
                return continue_visit;
            }

            // treatment == inlane if undefined
            if (!this.active_by_type.has(type)) {
                this.active_by_type.set(type, [f]);
                f.pos_in_track = 0;
                this.type_width[type] = 1;
            } else {
                var active = this.active_by_type.get(type);
                var found = false;
                for (var j = 0; j < active.length; j++) {
                    if (active[j].end <= pos) {
                        active[j] = f;
                        found = true;
                        f.pos_in_track = j;
                        break;
                    }
                }
                if (!found) {
                    f.pos_in_track = active.length;
                    active.push(f);
                }

                // TODO: Order by end... would allow faster elimination above.
                this.type_width[type] = Math.max(this.type_width[type], active.length);
            }
            return continue_visit;
        };
        return LaneCalculator;
    })();
    ;

    /**
    * Adjust the vertical position of each group according to the vertical height of all preceding groups.
    * This algorithm continues the one of {@linkcode GFF3.LaneCalculator}
    * @class GFF3.LaneAdjustor
    * @extends GFF3.FeatureVisitor
    */
    var LaneAdjustor = (function () {
        function LaneAdjustor(chro, type_handling, type_width) {
            /**
            * The number of "lanes" for each feature type.
            * Depends on how many features of one type are "active" simultaneously.
            * Calculated in optimize. (actually impacts visual height.)
            * @member GFF3.LaneAdjustor#type_width
            * @type {}
            */
            this.type_width = {};
            this.lane_starts = {};
            this.chro = chro;
            this.type_width = type_width;
            this.type_handling = type_handling;
            var pos = 0;
            var lane_starts = {};
            var type_width = this.type_width;
            this.chro.types.forEach(function (t) {
                lane_starts[t] = pos;
                var width = type_width[t];
                if (width == undefined)
                    width = 0;
                pos += width;
            });
            this.lane_starts = lane_starts;
            this.total_width = pos;
        }
        LaneAdjustor.prototype.visit = function (f) {
            var type;
            var treatment = this.type_handling.get(f.getFullType()) & recursion_mask;
            if (treatment == 2 /* embed */) {
                f.pos_in_track = f.parent.pos_in_track;
                // TODO? : inlane sons of embedded... should not really happen
            } else if (treatment == 0 /* inlane */ || treatment == undefined) {
                f.pos_in_track += this.lane_starts[f.type];
            }
            return true;
        };
        return LaneAdjustor;
    })();
    ;

    /**
    * Adjust the chromosome position (start, end) of certain types to be that of its parent.
    * Used so that CDS takes as much space as its mRNA parent
    * @class GFF3.SizeAdjust
    * @extends GFF3.FeatureVisitor
    */
    var SizeAdjust = (function () {
        function SizeAdjust(types) {
            this.types = types;
        }
        SizeAdjust.prototype.visit = function (feature) {
            if (this.types.has(feature.getFullType()) && feature.parent !== undefined) {
                feature.start = Math.min(feature.start, feature.parent.start);
                feature.end = Math.max(feature.end, feature.parent.end);
            }
            return true;
        };
        return SizeAdjust;
    })();

    /**
    * Create clones of certain features under their siblings.
    * This is used for Exons, defined as under the mRNA but which must be shown in each CDS.
    * @class GFF3.Reparent
    * @extends GFF3.FeatureVisitor
    */
    var Reparent = (function () {
        function Reparent(types_map) {
            this.types_map = types_map;
            this.dest_types = types_map.values();
        }
        Reparent.prototype.visit = function (feature) {
            var ftype = feature.getFullType();
            if (this.types_map.has(ftype) && feature.parent !== undefined) {
                var dest_type = this.types_map.get(ftype);
                feature.parent.children().forEach(function (sibling) {
                    if (sibling.getFullType() == dest_type) {
                        sibling.addChild(feature.clone());
                        sibling.optimize();
                    }
                });
                feature.parent.removeChild(feature);
                return false;
            }

            // and no reparenting under dest types
            return this.dest_types.indexOf(ftype) < 0;
        };
        return Reparent;
    })();

    /**
    * Select a subset of features that are visible at a given scale.
    * @class GFF3.SelectVisible
    * @extends GFF3.FeatureVisitor
    */
    var SelectVisible = (function () {
        function SelectVisible(type_handling, scale) {
            this.features = [];
            this.type_handling = type_handling;
            this.scale = scale;
        }
        SelectVisible.prototype.visit = function (f) {
            var handling = this.type_handling.get(f.getFullType());
            var continue_rec = (handling & 16 /* end_recursion */) == 0;
            if ((handling & recursion_mask) == 1 /* hide */ && !continue_rec)
                return false;
            var start = this.scale(f.start);
            var end = this.scale(f.end);
            if ((handling & recursion_mask) != 1 /* hide */ && (end - start) > 2) {
                this.features.push(f);
            }
            return continue_rec && (end - start > 2);
        };
        return SelectVisible;
    })();

    /**
    * Select a subset of features whose name can be displayed at a given scale.
    * @class GFF3.SelectDisplayable
    * @extends GFF3.FeatureVisitor
    */
    var SelectDisplayable = (function () {
        function SelectDisplayable(type_handling, scale) {
            this.features = [];
            this.type_handling = type_handling;
            this.scale = scale;
        }
        SelectDisplayable.prototype.visit = function (f) {
            var handling = this.type_handling.get(f.getFullType());
            var continue_rec = (handling & 16 /* end_recursion */) == 0;
            if ((handling & recursion_mask) == 1 /* hide */ && !continue_rec)
                return false;
            var start = this.scale(f.start);
            var end = this.scale(f.end);
            if (f instanceof GFF3Feature) {
                var ff = f;
                if (ff.display_name !== undefined) {
                    if ((handling & recursion_mask) != 1 /* hide */ && (end - start) > 8.5 * ff.display_name.length) {
                        this.features.push(f);
                    }
                    return continue_rec && (end - start > 8.5 * ff.display_name.length);
                }
            }
        };
        return SelectDisplayable;
    })();

    /**
    * A panel that will display GFF3 data
    * @class GFF3.GFF3Panel
    * @extends Views.BasePanel
    */
    var GFF3Panel = (function (_super) {
        __extends(GFF3Panel, _super);
        function GFF3Panel(parent, name, role, args) {
            _super.call(this, parent, name, role, args);
            this.type_handling = baseTypeHandling;
        }
        GFF3Panel.prototype.getMinSize = function () {
            if (this.positions === undefined)
                return [600, 50];
            else
                return [600, (this.positions.total_width + 1) * 10];
        };

        // TODO: Optimize calculations
        GFF3Panel.prototype.featureSize = function (f) {
            var start = this.scale(f.start);
            var end = this.scale(f.end);
            return end - start;
        };

        GFF3Panel.prototype.setChromosome = function (chromosome) {
            _super.prototype.setChromosome.call(this, chromosome);
            var model = chromosome;
            this.scale.domain([model.start, model.end]);
            this.scale.exponent(1);
            this.scale.focus(model.start);
            this.chromosome.visit(new SizeAdjust(adjustCDS));
            this.chromosome.safeVisit(new Reparent(reparents));
            var laneCalculator = new LaneCalculator(this.chromosome, this.type_handling);
            this.chromosome.visit(laneCalculator);
            this.positions = new LaneAdjustor(this.chromosome, this.type_handling, laneCalculator.type_width);
            this.chromosome.visit(this.positions);

            //console.log(this.chromosome.treeString());
            this.setScale(this.scale);
            this.setSize(this.width, this.getMinSize()[1]);
        };

        GFF3Panel.prototype.setScale = function (newScale, duration) {
            var oldScale = this.scale;
            var scaleInterpolator = newScale.scaleInterpolate()(oldScale);
            var positions = this.positions;
            var type_handling = this.type_handling;
            if (duration === undefined) {
                duration = 250;
            }
            _super.prototype.setScale.call(this, newScale, duration);

            function vposRect(f) {
                return 20 + 30 * f.pos_in_track;
            }

            function vposText(f) {
                return 15 + 30 * f.pos_in_track;
            }

            var chro = this.chromosome;

            function showGFF3(f) {
                d3.select("#gff3_start").text(f.start);
                d3.select("#gff3_end").text(f.end);
                d3.select("#gff3_type").text(f.type);
                d3.select("#gff3_id").text(f.name);
                var genes = chro.getAncestors(f, "gene");
                var gene_names = [];
                genes.forEach(function (f) {
                    gene_names.push(f.name);
                });
                d3.select("#gff3_gene").text(gene_names.join(' '));
                if (f instanceof GFF3Feature) {
                    var ff = f;
                    d3.select("#gff3_name").text(ff.display_name);
                    d3.select("#gff3_strand").text(ff.strand);
                    d3.select("#gff3_comment").text(ff.source);
                }
                var event = sourceEvent();
                d3.select("#gff3_info").style("display", "block");
                d3.select("#gff3_legend").style("display", "block");
            }

            function hideGFF3() {
                d3.select("#gff3_info").style("display", "none");
                d3.select("#gff3_legend").style("display", "none");
            }

            var visible = new SelectVisible(type_handling, newScale);
            chro.visit(visible);

            function cx_tween(f, index, attrvalue) {
                return function (t) {
                    return scaleInterpolator(t)(f.start);
                };
            }
            function width_tween(f, index, attrvalue) {
                return function (t) {
                    var s = scaleInterpolator(t);
                    return s(f.end) - s(f.start);
                };
            }

            var selection = this.svg.selectAll("rect").data(visible.features, function (f, index) {
                return String(f.uid);
            });

            selection.style("opacity", 1).transition().duration(duration).attrTween("x", cx_tween).attrTween("width", width_tween);

            selection.enter().append("rect").style("opacity", 0).attr("height", 5).attr("y", vposRect).attr("class", function (f) {
                return "gff3 gff3_" + f.getFullType();
            }).on("mouseover", showGFF3).on("mouseout", hideGFF3).transition().duration(duration).attrTween("x", cx_tween).attrTween("width", width_tween).style("opacity", 1);

            selection.exit().transition().duration(duration).style("opacity", 0).attrTween("x", cx_tween).attrTween("width", width_tween).remove();

            var displayable = new SelectDisplayable(type_handling, newScale);
            chro.visit(displayable);

            var text = this.svg.selectAll("text").data(displayable.features, function (f, index) {
                return String(f.uid);
            });

            text.style("opacity", 1).transition().duration(duration).attrTween("x", cx_tween).attrTween("width", width_tween);

            text.enter().append("text").style("opacity", 0).attr("height", 5).attr("y", vposText).attr("class", function (f) {
                return "gff3 gff3_" + f.getFullType();
            }).on("mouseover", showGFF3).on("mouseout", hideGFF3).text(function (f) {
                if (f instanceof GFF3Feature) {
                    var ff = f;
                    return ff.display_name;
                } else {
                    return f.name;
                }
            }).transition().duration(duration).attrTween("x", cx_tween).attrTween("width", width_tween).style("opacity", 1);

            text.exit().transition().duration(duration).style("opacity", 0).attrTween("x", cx_tween).attrTween("width", width_tween).remove();
        };

        GFF3Panel.create = function (parent, name, role, args) {
            return new GFF3Panel(parent, name, role, args);
        };
        return GFF3Panel;
    })(Views.BasePanel);

    Views.registry.registerVF(GFF3Panel.create, "GFF3Panel", "gff3");
})(GFF3 || (GFF3 = {}));
