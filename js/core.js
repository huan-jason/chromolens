///<reference path="interfaces.d.ts" />
///<reference path="powerfocus.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
* Blocks the screen and shows the loading message
*/
function showLoading() {
    jQuery("#Loading").addClass('is-shown');
}

/**
* Unblocks the screen and hides the loading message
*/
function hideLoading() {
    jQuery("#Loading").removeClass('is-shown');
    jQuery('#LoadingBarWrapper').hide();
}

/**
* Shows the loading message and the progress bar
* @event
* @param  {XMLHttpRequestProgressEvent} ev
*/
function showProgress(ev) {
    showLoading();
    jQuery('#LoadingBarWrapper').show();

    var value = (ev.loaded / ev.total) * 100;
    if (isFinite(value)) {
        jQuery('#LoadingBar').val(value.toString());

        if (value >= 100) {
            hideLoading();
        }
    }
}

/**
* False Assert function.
* Throws the message if the truth value is false.
* @param {boolean} t The truth value
* @param {string} [msg] An optional message
*/
function assert(t, msg) {
    if (!t)
        throw (msg || "failed assertion");
}

/**
* Get the DOM Event at the origin of the current D3.Event
* @function sourceEvent
* @return {Event}     The DOM Event
*/
function sourceEvent() {
    var e = d3.event;
    var s;
    while (s = e.sourceEvent)
        e = s;
    return e;
}

/**
* The View classes
* @namespace Views
*/
var Views;
(function (Views) {
    /**
    * The singleton registry of known views.
    * Each view has an ID (its classname) and may know about certain filetypes.
    * @class Views.ViewRegistry
    */
    var ViewRegistry = (function () {
        function ViewRegistry() {
            this.viewRegistry = d3.map();
            this.modelViewRegistry = d3.map();
        }
        /**
        * Register a view (through its view factory function) of a given name.
        * @method Views.ViewRegistry#registerVF
        * @param {Views.ViewFactory} vf the factory function
        * @param {string} name the name for the view type
        * @param {string} forModel the file types this view can handle (optional)
        */
        ViewRegistry.prototype.registerVF = function (vf, name, forModel) {
            this.viewRegistry.set(name, vf);
            if (forModel !== undefined) {
                if (!this.modelViewRegistry.has(forModel)) {
                    this.modelViewRegistry.set(forModel, [name]);
                } else {
                    this.modelViewRegistry.get(forModel).push(name);
                }
            }
        };

        /**
        * Get the view factory function for a given view name.
        * @method Views.ViewRegistry#getVF
        * @param {string} name the view (class) name
        * @return {Views.ViewFactory} a factory function
        */
        ViewRegistry.prototype.getVF = function (name) {
            return this.viewRegistry.get(name);
        };

        /**
        * get the name of views that can be used to display a model of a given type.
        * @method Views.ViewRegistry#getVFsForModel
        * @param {string} name the model type name (as registered with the {Parsers.registry})
        * @return {string[]} a set of view type names that can display that model type.
        */
        ViewRegistry.prototype.getVFsForModel = function (name) {
            return this.modelViewRegistry.get(name);
        };
        return ViewRegistry;
    })();
    Views.ViewRegistry = ViewRegistry;

    /**
    * The {Views.ViewRegistry} singleton
    * @variable {Views.registry}
    */
    Views.registry = new ViewRegistry();
    Views.mainView;

    /**
    * Abstract base class for all views on a chromosome.
    * @class Views.BaseView
    * @extends Views.View
    */
    var BaseView = (function () {
        /**
        * Create a new BaseView
        * @constructor Views.BaseView
        * @param {Views.View} parent the parent view
        * @param {string} name the name of this view
        * @param {string} role the role of this view in its parent
        */
        function BaseView(parent, name, role, args) {
            /**
            * Sub-views, dictionary by view ID.
            * @member Views.BaseView#viewsByName
            * @type {Object}
            * @private
            */
            this.viewsByName = d3.map();
            this.parent = parent;
            this.name = name;
            this.role = role;
        }
        /**
        * Add a child view
        * @method Views.BaseView#addView
        * @param {Views.View} view the child view
        */
        BaseView.prototype.addView = function (view) {
            var old = this.viewsByName.get(view.name);
            if (old !== view) {
                if (old !== undefined) {
                    this.removeView(old);
                }
                this.viewsByName.set(view.name, view);
            }
        };

        /**
        * Remove a child view
        * @method Views.BaseView#removeView
        * @param {Views.View} view the child view
        * @return Whether this view should be removed as a result.
        */
        BaseView.prototype.removeView = function (view) {
            var old = this.viewsByName.get(view.name);
            if (old !== undefined) {
                old.remove();
                this.viewsByName.remove(view.name);
            }
            return false;
        };

        /**
        * Obtain the ancestor view (the furthest parent)
        * @method Views.BaseView#getRootView
        * @return {Views.View} the ancestor
        */
        BaseView.prototype.getRootView = function () {
            return this.parent.getRootView();
        };

        /**
        * Called on a view when it is removed from its parent
        * @method Views.BaseView#remove
        */
        BaseView.prototype.remove = function () {
        };

        /**
        * Called for setup after the chromosome is set or changed.
        * @method Views.BaseView#setChromosome
        * @param {Model.AbstractChromosomeModel} chromosome the chromosome
        */
        BaseView.prototype.setChromosome = function (chromosome) {
            this.chromosome = chromosome;
            this.viewsByName.forEach(function (id, view) {
                view.setChromosome(chromosome);
            });
        };

        /**
        * get a direct child view by identifier
        * An identifier can be either # + the view ID, the role name, or @ + the view type name.
        * @method Views.BaseView#getSubView
        * @param {string} name the identifier
        * @return {Views.View} the child view
        */
        BaseView.prototype.getSubView = function (name) {
            var view = undefined;
            if (name.length == 0) {
                return this.getRootView();
            } else if (name.charAt(0) == '#') {
                return this.viewsByName.get(name.substring(1));
            } else if (name.charAt(0) == '@') {
                name = name.substring(1);
                this.viewsByName.forEach(function (n, v) {
                    if (v.getTypeName() == name) {
                        view = v;
                    }
                });
            } else {
                this.viewsByName.forEach(function (n, v) {
                    if (v.role == name) {
                        view = v;
                    }
                });
            }
            return view;
        };

        /**
        * get a view through a path of identifiers (as per getSubView)
        * @method Views.BaseView#getViewPath
        * @param {string[]} path the sequence of view IDs. (consumed)
        * @return {Views.View} the view
        */
        BaseView.prototype.getViewPath = function (path) {
            if (path.length == 0) {
                return this;
            }
            var step = path.shift();
            var view = this.getSubView(step);
            if (view !== undefined) {
                return view.getViewPath(path);
            }
            return undefined;
        };

        /**
        * A view may define a setup, that is a specification of subviews that it creates at construction.
        * Each subview is specified with a string of the following syntax:
        * id.id.id:typename:argn=argv:argn=argv
        *
        * A view of type typename (registered in the ViewManager) will be created with given argument values
        * at a position in the view hierarchy given by the id path. The IDs are relative to the current view,
        * unless prefixed with a '.' (absolute path.) Sub-subviews should be created after the subview, obviously.
        *
        * @method Views.BaseView#getViewSetup
        * @return {string[]}
        */
        BaseView.prototype.getViewSetup = function () {
            return [];
        };

        /**
        * Define the existing roles for subviews of this view. Ordered.
        * @method Views.View#getViewRoles
        * @return {string[]}
        */
        BaseView.prototype.getViewRoles = function () {
            return [];
        };

        /**
        * create subviews according to getViewSetup
        * @method Views.BaseView#setupViews
        */
        BaseView.prototype.setupViews = function () {
            // syntax: id.id.id:typename:argn=argv:argn=argv
            var setupDef = this.getViewSetup();
            var this_in_closure = this;
            setupDef.forEach(function (s) {
                var frag = s.split(':');
                assert(frag.length >= 2, "at least a : in view setup");
                var args = {};
                var typename = frag[1];
                var path = frag[0].split('.');
                assert(path.length > 0);
                var role = path.pop();
                var dest = this_in_closure.getViewPath(path);
                for (var i = 2; i < frag.length; i++) {
                    var frag2 = frag[i].split('=');
                    assert(frag2.length == 2);
                    args[frag2[0]] = frag2[1];
                }
                dest.createSubView(typename, typename, role, args);
            });
        };

        /**
        * create a view of a given type at a given position in the view hierarchy.
        * @method Views.BaseView#createSubView
        * @param {string} typename the view type
        * @param {string} name the proposed name of the view. May be changed by the parent to preserve uniqueness.
        * @param {string} role the name of the "role" of the view. Many subviews can have the same role.
        * @param [args] extra arguments for creating the view
        * @return {Views.View} the resulting view
        */
        BaseView.prototype.createSubView = function (typename, name, role, args) {
            var factory = Views.registry.getVF(typename);

            // TODO: Add args?
            var name = this.getUniqueChildName(name);
            var decorator = this.getDecorator(name, role);

            // view's parent is decorator or this.
            var parent = (decorator !== undefined) ? decorator : this;
            var subview = factory(parent, name, role, args);
            var view = subview;
            if (subview !== undefined) {
                parent.addView(subview);
                subview.setupViews();
                if (decorator !== undefined) {
                    view = decorator;
                    this.addView(view);
                }
            }

            return view;
        };

        /**
        * When a child panel is added, this method may propose to wrap it
        * in a "decorator" panel in the containment hierarchy.
        * @method Views.BasePanel#getDecorator
        * @param  {string}     name the name of the child panel
        * @param  {string}     role the role of the child panel
        * @return {Panel}      the decorator Panel, or undefined.
        */
        BaseView.prototype.getDecorator = function (name, role) {
            return undefined;
        };

        /**
        * Get a unique name for a view, from the base view name.
        * @method Views.BasePanel#getUniqueChildName
        * @param  {string}           basis base name
        * @return {string}                 unique name
        */
        BaseView.prototype.getUniqueChildName = function (basis) {
            var counter = 2;
            var name = basis;
            while (this.viewsByName.has(name)) {
                name = basis + ' ' + counter++;
            }
            return name;
        };

        /**
        * Get the type name of this view. Defaults to the class name.
        * @method Views.BaseView#getTypeName
        * @return {string}
        */
        BaseView.prototype.getTypeName = function () {
            return this['constructor']['name'];
        };
        return BaseView;
    })();
    Views.BaseView = BaseView;

    /**
    * Abstract class for Panels, those chromosome views that have a 2d manifestation.
    * @class Views.BasePanel
    * @extends Views.BaseView
    * @extends Views.Panel
    */
    var BasePanel = (function (_super) {
        __extends(BasePanel, _super);
        /**
        * Create a BasePanel
        * @constructor Views.BasePanel
        * @param {Views.View} parent the parent view
        * @param {string} name the name of this view
        * @param {string} role the role of this view in its parent
        * @param args extra arguments
        */
        function BasePanel(parent, name, role, args) {
            _super.call(this, parent, name, role, args);
            this.pos = [0, 0];
            this.panels = [];
            this.invalidated = true;
            if (parent instanceof BasePanel) {
                var parentPanel = parent;
                this.svg = parentPanel.createViewPort(this);
                this.scale = parentPanel.getScale();
                this.setSize(1, 1); // we want it to be wrong to force a recalc
            }
        }
        /**
        * Add a new child panel at a given position
        * @method Views.BasePanel#addPanelAt
        * @param {Panels.Panel} panel the child panel
        * @param {number} pos the position at which to add the panel
        */
        BasePanel.prototype.addPanelAt = function (panel, pos) {
            _super.prototype.addView.call(this, panel);
            if (pos < 0) {
                pos = pos + this.panels.length;
            }
            this.panels.splice(pos, 0, panel);
        };

        /**
        * Add a child view
        * @method Views.BasePanel#addView
        * @param {Views.View} view the child view
        */
        BasePanel.prototype.addView = function (view) {
            _super.prototype.addView.call(this, view);

            // silly typescript does not allow checking instanceof interface
            if (view instanceof BasePanel) {
                var panel = view;
                var roles = this.getViewRoles();
                var pos = this.panels.length;

                while (pos > 0 && roles.indexOf(this.panels[pos - 1].role) > roles.indexOf(panel.role)) {
                    pos--;
                }
                this.panels.splice(pos, 0, panel);
            }
        };

        /**
        * Remove a child view
        * @method Views.BasePanel#removeView
        * @param {Views.View} view the child view
        * @return {boolean} whether the view was found.
        */
        BasePanel.prototype.removeView = function (view) {
            var remove = _super.prototype.removeView.call(this, view);
            if (view instanceof BasePanel) {
                var panel = view;
                var remainder = [];
                this.panels.forEach(function (p) {
                    var remove = p.removeView(panel);
                    if (!remove)
                        remainder.push(p);
                });
                this.panels = remainder;
            }
            return this.panels.length == 0;
        };

        /**
        * Called on a view when it is removed from its parent
        * @method Views.BasePanel#remove
        */
        BasePanel.prototype.remove = function () {
            this.svg.remove();
        };

        /**
        * Whether this panel has subpanels. Disregard "structural" subpanels.
        * @method Views.BasePanel#isEmpty
        * @return {boolean}
        */
        BasePanel.prototype.isEmpty = function () {
            return this.panels.length == 0;
        };

        /**
        * Create a SVG group for a child panel
        * @method Views.BasePanel#createViewPort
        * @param  {Views.Panel}        child the child panel
        * @return {D3.Selection}       the {@linkcode D3.Selection} of the SVG group
        */
        BasePanel.prototype.createViewPort = function (child) {
            var port = this.svg.append("g").attr("class", child.getTypeName() + " r_" + child.role).attr("id", child.name);
            port.node().view = child;
            return port;
        };

        /**
        * Get the current position in the panel relative to the container panel
        * @method Views.BasePanel#getPos
        * @return {number[]} The x and y coordinates, in pixels.
        */
        BasePanel.prototype.getPos = function () {
            return this.pos;
        };

        /**
        * An offset for the data within this panel. Will be added to the translate operator.
        * @method Views.BasePanel#getOffset
        * @return {number[]} The [x, y] offsets, in pixels. Usually [0, 0].
        */
        BasePanel.prototype.getOffset = function () {
            return [0, 0];
        };

        /**
        * Set the current position of the panel, relative to the container panel
        * @method Views.BasePanel#setPos
        * @param  {number} x pixels
        * @param  {number} y pixels
        */
        BasePanel.prototype.setPos = function (x, y) {
            this.pos = [x, y];
            var margin = this.getMargin();
            var offset = this.getOffset();
            this.svg.attr("transform", "translate(" + (x + offset[0] + margin[0]) + "," + (y + offset[1] + margin[1]) + ")");
        };

        /**
        * Get the current size of this panel. (excluding the margin.)
        * @method Views.BasePanel#getSize
        * @return {number[]} The [width, height] of the panel.
        */
        BasePanel.prototype.getSize = function () {
            return [this.width, this.height];
        };

        /**
        * Get the current size of this panel. (including the margin.)
        * @method Views.BasePanel#getOuterSize
        * @return {number[]}   The [width, height] of the panel.
        */
        BasePanel.prototype.getOuterSize = function () {
            var margin = this.getMargin();
            return [
                this.width + margin[0] + margin[2],
                this.height + margin[1] + margin[3]];
        };

        /**
        * Set the actual inner size of the panel.
        * @method Views.BasePanel#setSize
        * @param  {number} w width
        * @param  {number} h [description]
        */
        BasePanel.prototype.setSize = function (w, h) {
            this.width = w;
            this.height = h;
            var outer = this.getOuterSize();
            this.svg.attr("width", outer[0]);
            this.svg.attr("height", outer[1]);
        };

        /**
        * Get the minimum (inner) size that the panel expects to occupy.
        * Actual size will depend on the parent's layout algorithm.
        * @method Views.BasePanel#getMinSize
        * @return {number[]} The minimum [width, height] of the panel.
        */
        BasePanel.prototype.getMinSize = function () {
            return [600, 10];
        };

        /**
        * Get the root panel, i.e. the topmost container in the visual hierarchy
        * @method Views.BasePanel#getRootPanel
        * @return {Views.Panel} the root panel
        */
        BasePanel.prototype.getRootPanel = function () {
            return this.parent.getRootPanel();
        };

        /**
        * Get a margin that will be applied around this panel.
        * @method Views.BasePanel#getMargin
        * @return {number[]} The [left, top, right, bottom] margins, in pixels.
        */
        BasePanel.prototype.getMargin = function () {
            return [0, 0, 0, 0];
        };

        /**
        * get the scale used by this panel
        * @method Views.BasePanel#getScale
        * @return {D3.Scale.LinearScale} the scale
        */
        BasePanel.prototype.getScale = function () {
            return this.scale;
        };

        /**
        * (re)set the scale used by this panel
        * @method Views.BasePanel#setScale
        * @param {D3.Scale.LinearScale} scale    the scale
        * @param {number}               [duration] the duration for the visual transition (ms)
        */
        BasePanel.prototype.setScale = function (newScale, duration) {
            this.scale = newScale;
            this.panels.forEach(function (view) {
                view.setScale(newScale, duration);
            });
        };

        /**
        * Mark this panel (and all its ancestors) as in need of re-layout.
        * @method Views.BasePanel#invalidate
        */
        BasePanel.prototype.invalidate = function () {
            this.invalidated = true;
            this.parent.invalidate();
        };

        /**
        * Layout this panel. If this panel was invalidated, it will layout its descendants and call doLayout.
        * @method Views.BasePanel#layout
        * @param  {number}   [width]  The suggested width for this panel
        * @param  {number}   [height] The suggested height for this panel
        * @return {number[]}        The effective [width, height] of this panel after layout
        */
        BasePanel.prototype.layout = function (w, h) {
            if (this.invalidated) {
                var margin = this.getMargin();
                var minSize = this.getMinSize();
                if (w === undefined)
                    w = 0;
                else
                    w -= (margin[0] + margin[2]);
                if (h === undefined)
                    h = 0;
                else
                    h -= (margin[1] + margin[3]);

                w = Math.max(w, minSize[0]);
                h = Math.max(h, minSize[1]);
                this.panels.forEach(function (p) {
                    p.layout(w, h);
                });
                this.doLayout(w, h);
                this.panels.forEach(function (p) {
                    var ppos = p.getPos();
                    var psize = p.getOuterSize();
                    w = Math.max(w, ppos[0] + psize[0] - margin[0]);
                    h = Math.max(h, ppos[1] + psize[1] - margin[1]);
                });
                this.setSize(w, h);
                this.invalidated = false;
            }
            return this.getSize();
        };

        /**
        * Actually do the layout, assuming the descendants are laid out properly.
        * @method Views.BasePanel#doLayout
        * @param  {number} width  The suggested width for this panel
        * @param  {number} height The suggested height for this panel
        */
        BasePanel.prototype.doLayout = function (w, h) {
        };
        return BasePanel;
    })(BaseView);
    Views.BasePanel = BasePanel;

    /**
    * A base class for panel "decorators".
    * These are panels that add functionality to their child panels.
    * Strictly speaking not decorators, as they find a place in the composition hierarchy.
    * @class Views.PanelDecorator
    * @extends Views.BasePanel
    */
    var PanelDecorator = (function (_super) {
        __extends(PanelDecorator, _super);
        function PanelDecorator(parent, name, role, args) {
            _super.call(this, parent, name, role, args);
        }
        PanelDecorator.prototype.addView = function (view) {
            _super.prototype.addView.call(this, view);
            assert(this.panels.length < 2);
            if (this.panels.length != 0)
                this.decoratedPanel = this.panels[0];
        };

        PanelDecorator.prototype.getMinSize = function () {
            if (this.decoratedPanel !== undefined) {
                var sub = this.decoratedPanel.getMinSize();
                var margins = this.getMargin();
                sub[0] += margins[0] + margins[2];
                sub[1] += margins[1] + margins[3];
                return sub;
            }
            return _super.prototype.getMinSize.call(this);
        };
        PanelDecorator.prototype.getOffset = function () {
            if (this.decoratedPanel !== undefined) {
                return this.decoratedPanel.getOffset();
            }
            return _super.prototype.getOffset.call(this);
        };
        return PanelDecorator;
    })(BasePanel);
    Views.PanelDecorator = PanelDecorator;
})(Views || (Views = {}));

/**
* The model base classes
* @namespace Model
*/
var Model;
(function (Model) {
    /**
    * The model manager; a singleton that manages all known chromosome sets.
    * @class Model.ModelManager
    */
    var ModelManager = (function () {
        /**
        * @constructor Model.ModelManager
        * @protected
        */
        function ModelManager() {
            this.chromosomeSets = d3.map();
        }
        /**
        * Get a ChromosomeSet by its Id
        * @method Model.ModelManager#getChromosomeSet
        * @param {string} id the Id of the set, often a filename.
        * @return {Model.ChromosomeSet} the chromosome set
        */
        ModelManager.prototype.getChromosomeSet = function (id) {
            return this.chromosomeSets.get(id);
        };

        /**
        * remove a chromosome set
        * @method Model.ModelManager#removeCSet
        * @param {Model.ChromosomeSet} cs the chromosome set
        */
        ModelManager.prototype.removeCSet = function (cs) {
            this.chromosomeSets.remove(cs.id);
        };

        /**
        * remove a chromosome set, by name
        * @method Model.ModelManager#removeCSetById
        * @param {string} id the chromosome set ID
        */
        ModelManager.prototype.removeCSetById = function (id) {
            this.chromosomeSets.remove(id);
        };

        /**
        *
        */
        ModelManager.prototype.load_str = function (content, id, type, chro) {
            var parser = Parsers.registry.getParser(type);
            assert(parser !== undefined);
            if (chro !== undefined && chro != '') {
                id += id + '#' + chro;
            }
            var lr = new Parsers.LineReaderImpl(content);
            var cs = parser.parse_str(lr, id, chro);
            this.chromosomeSets.set(id, cs);
            return cs;
        };

        /**
        *
        */
        ModelManager.prototype.load_url = function (url, type, chro) {
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.open("GET", url, false);
            xmlHttp.send(null);
            return this.load_str(xmlHttp.responseText, url, type, chro);
        };

        /**
        * get a Chromosome, defined by chromosome set name and chromosome name.
        * @method Model.ModelManager#getChromosome
        * @param {string} chro the chromosome set ID
        * @param {string} modelId the chromosome ID (optional)
        * @return {Model.AbstractChromosomeModel} the chromosome
        */
        ModelManager.prototype.getChromosome = function (chro, modelId) {
            if (modelId !== undefined) {
                var cs = this.chromosomeSets.get(modelId);
                return cs.getChromosome(chro);
            } else {
                this.chromosomeSets.forEach(function (id, cs) {
                    var chrom = cs.getChromosome(chro);
                    if (chrom !== undefined) {
                        return chrom;
                    }
                });
            }
            return undefined;
        };
        return ModelManager;
    })();
    Model.ModelManager = ModelManager;
    Model.manager = new ModelManager();

    /**
    * A comparator used to sort {@linkcode Model.Feature} by start and end.
    * @function Model.compareFeatures
    * @param  {Model.Feature}       a first feature
    * @param  {Model.Feature}       b second feature
    * @return {number}          a signed number indicating relative position
    */
    function compareFeatures(a, b) {
        var r = a.start - b.start;
        if (r != 0)
            return r;
        return a.end - b.end;
    }
    Model.compareFeatures = compareFeatures;

    /**
    * Iterates over a chromosome model for histogram/density maps.
    * @class Model.AbstractIterator
    * @extends Model.ChromosomeIterator
    * @abstract
    */
    var AbstractIterator = (function () {
        /**
        * @constructor Model.AbstractIterator
        */
        function AbstractIterator() {
            this.bisect = d3.bisector(function (f) {
                return f.start;
            }).left;
        }
        /**
        * Set the Chromosome for the iterator.
        * @method Model.AbstractIterator#setChromosome
        * @param {Model.AbstractChromosomeModel} chro the chromosome
        */
        AbstractIterator.prototype.setChromosome = function (chro) {
            this.chro = chro;
            this.features = this.chro.getFeatures();
            this.reset();
        };

        /**
        * Reset the iterator to the start of the chromosome.
        * @method Model.AbstractIterator#reset
        */
        AbstractIterator.prototype.reset = function () {
            this.idx = 0;
            this.pos = this.chro.start;
        };

        /**
        * Set the position of the iterator
        * @method Model.AbstractIterator#setPos
        * @param {number} pos the position of the iterator (in chromosome coordinates)
        */
        AbstractIterator.prototype.setPos = function (pos) {
            this.pos = pos;
            this.idx = this.bisect(this.features, pos);
        };

        /**
        * Compute the returned value after a step of iteration
        * @method Model.AbstractIterator#finalValue
        * @return {T}        the value accumulated during the iteration step
        */
        AbstractIterator.prototype.finalValue = function () {
            return this.accumulator;
        };

        /**
        * Give an initial empty value of the required type for an iteration step.
        * @method Model.AbstractIterator#initialValue
        * @abstract
        * @return {T}          the initial value
        */
        AbstractIterator.prototype.initialValue = function () {
            return undefined;
        };

        /**
        * Add data from the feature to the accumulator
        * @method Model.AbstractIterator#addValue
        * @abstract
        * @param  {Feature} f the feature
        */
        AbstractIterator.prototype.addValue = function (f) {
        };

        /**
        * Move to a new position and calculate a value for the interval from the current to the new position.
        * @method Model.AbstractIterator#moveTo
        * @param {number} pos the new chromosome position (in chromosome coordinates)
        * @return {T} the computed value for that interval.
        */
        AbstractIterator.prototype.moveTo = function (end) {
            // invariant: values[idx-1].end <= pos <= values[idx].start
            this.nextPos = end;
            this.accumulator = this.initialValue();
            var startI = this.idx;
            if (startI >= this.features.length) {
                return this.accumulator;
            }
            var f = this.features[startI];
            while (startI < this.features.length && f.start < end) {
                this.addValue(f);
                if (f.end > end) {
                    break;
                }
                startI++;
                f = this.features[startI];
            }
            this.idx = startI;
            var accumulator = this.finalValue();
            this.pos = end;
            return accumulator;
        };

        /**
        * Compute the position for the next "natural" break in values.
        * A moveTo within that position is guaranteed to have a uniform value.
        * @method Model.AbstractIterator#nextBreak
        * @return {number} a chromosome position
        */
        AbstractIterator.prototype.nextBreak = function () {
            if (this.idx >= this.features.length)
                return this.chro.end;
            var f = this.features[this.idx];
            if (this.pos <= f.start)
                return f.start;
            if (this.pos < f.end || this.idx + 1 >= this.features.length)
                return f.end;
            else
                return this.features[this.idx + 1].start;
        };
        return AbstractIterator;
    })();
    Model.AbstractIterator = AbstractIterator;

    /**
    * A chromosome composite that can stand in for a combination of multiple models of (hopefully the same) chromosome
    * @class Model.MultiChromosome
    * @extends Model.AbstractChromosomeModel
    */
    var MultiChromosome = (function () {
        function MultiChromosome() {
            /**
            * The latest chromosome's name
            * @member Model.MultiChromosome#name
            * @type {string}
            */
            this.name = "";
            /**
            * The minimum of all chromosome positions
            * @member Model.MultiChromosome#start
            * @type {number}
            */
            this.start = Number.POSITIVE_INFINITY;
            /**
            * The maximum of all chromosome positions
            * @member Model.MultiChromosome#end
            * @type {number}
            */
            this.end = 0;
            this.chromosomes = [];
        }
        MultiChromosome.prototype.addChromosome = function (chro) {
            if (this.chromosomes.indexOf(chro) !== -1) {
                return false;
            }
            this.chromosomes.push(chro);
            this.name = chro.name;
            var start = Math.min(this.start, chro.start);
            var end = Math.max(this.end, chro.end);
            if (start != this.start || end != this.end) {
                this.start = start;
                this.end = end;
                this.chromosomes.forEach(function (chro) {
                    chro.start = start;
                    chro.end = end;
                });
            }
            return true;
        };

        MultiChromosome.prototype.getFeatureNames = function () {
            var names = [];
            this.chromosomes.forEach(function (chro) {
                names = names.concat(chro.getFeatureNames());
            });
            return names;
        };

        MultiChromosome.prototype.getNamedFeature = function (name) {
            var features = [];
            this.chromosomes.forEach(function (chro) {
                features.push(chro.getNamedFeature(name));
            });

            // TODO: Take widest?
            if (features.length > 0) {
                return features[0];
            }
            return undefined;
        };

        MultiChromosome.prototype.getFeatures = function () {
            return [];
        };
        return MultiChromosome;
    })();
    Model.MultiChromosome = MultiChromosome;
})(Model || (Model = {}));

/**
* The base classes for the parsers for the various file formats.
* @namespace Parsers
*/
var Parsers;
(function (Parsers) {
    /**
    * A singleton registry for parsers for different file types.
    * @class Parsers.ParserRegistry
    */
    var ParserRegistry = (function () {
        function ParserRegistry() {
            this.registry = d3.map();
        }
        /**
        * the names of all parser types
        * @method Parsers.ParserRegistry#parserNames
        * @return {string[]}
        */
        ParserRegistry.prototype.parserNames = function () {
            return this.registry.keys();
        };

        /**
        * Register a parser for a given file type
        * @method Parsers.ParserRegistry#register
        * @param {string} name the name of the parser (and its file type)
        * @param {Parsers.Parser} parser the parser
        */
        ParserRegistry.prototype.register = function (name, parser) {
            this.registry.set(name, parser);
        };

        /**
        * get a parser by type
        * @method Parsers.ParserRegistry#getParser
        * @param {string} name the name of the parser
        * @return {Parsers.Parser} the parser
        */
        ParserRegistry.prototype.getParser = function (name) {
            return this.registry.get(name);
        };
        return ParserRegistry;
    })();
    Parsers.ParserRegistry = ParserRegistry;

    var LineReaderImpl = (function () {
        /**
        * @constructor
        */
        function LineReaderImpl(data) {
            /**
            * Current cursor position
            * @type {Number}
            */
            this.pos = 0;
            /**
            * File line separator
            * @type {String}
            */
            this.separator = '\n';
            this.data = data;

            var p = data.indexOf(this.separator);
            if (p == -1) {
                this.separator = '\r';
            } else if (p > 0) {
                if (data.charAt(p - 1) == '\r')
                    this.separator = '\r';
            }
        }
        /**
        * Returns the next line.
        * Doesn't matter whether it is a valid or not
        * @return {string} [description]
        */
        LineReaderImpl.prototype._next = function () {
            if (this.pos < 0)
                return null;

            var line = null;
            var nextPos = this.data.indexOf(this.separator, this.pos);

            while (nextPos == this.pos) {
                this.pos += 1;

                while (this.data.charAt(this.pos) == this.separator) {
                    this.pos += 1;
                }

                nextPos = this.data.indexOf(this.separator, this.pos);
            }

            if (nextPos == -1) {
                nextPos = this.data.length;
            }

            if (nextPos > this.pos) {
                line = this.data.substring(this.pos, nextPos);
                this.pos = nextPos + 1;

                while (this.data.charAt(this.pos) == this.separator) {
                    this.pos += 1;
                }
            } else {
                this.pos = -1;
            }

            return line;
        };

        /**
        * Returns the next valid line.
        * Null if the last line was already reached.
        *
        * Invalid lines:
        *  - line beginning with # character
        *
        * @return {string}
        */
        LineReaderImpl.prototype.next = function () {
            var line = this._next(), firstChar;

            if (!line) {
                return line;
            }

            firstChar = line[0];
            return firstChar === '#' || firstChar === '@' ? this.next() : line;
        };

        /**
        * Reset the cursor to the initial position
        */
        LineReaderImpl.prototype.reset = function () {
            this.pos = 0;
        };

        /**
        * Sets the position to read from the given point.
        * @type {RegExp} regex
        */
        LineReaderImpl.prototype.setStartPoint = function (regex) {
            var position = this.data.search(regex);
            if (position >= 0) {
                this.pos = position;
            }
        };

        /**
        * Returns the first 5 lines
        * @return {string[]}
        */
        LineReaderImpl.prototype.getFirstLines = function () {
            var lines = [], max = 5, i = 0;

            this.reset();

            for (; i < max; i += 1) {
                lines.push(this._next());
            }

            this.reset();
            return lines;
        };
        return LineReaderImpl;
    })();
    Parsers.LineReaderImpl = LineReaderImpl;

    var MultiPhaseChromosomeSet = (function () {
        function MultiPhaseChromosomeSet(id, parser, file) {
            this.chromosomes = d3.map();
            this.names = d3.set();
            this.id = id;
            this.parser = parser;
            this.file = file;
        }
        MultiPhaseChromosomeSet.prototype.parseNames = function () {
            // TODO: Put this in the parsers, so we can vary
            var lines = this.file;
            var line;
            lines.next(); // skip first
            while ((line = lines.next()) !== null) {
                var pos = line.indexOf(' ');
                if (pos == -1)
                    pos = line.indexOf('\t');
                assert(pos > 0);
                this.names.add(line.substring(0, pos));
            }
            lines.reset();
        };
        MultiPhaseChromosomeSet.prototype.addChromosome = function (name, chro) {
            this.chromosomes.set(name, chro);
        };
        MultiPhaseChromosomeSet.prototype.getChromosome = function (name) {
            if (this.chromosomes.has(name)) {
                return this.chromosomes.get(name);
            }
            this.file.reset();
            var crSet = this.parser.parse_str(this.file, this.id, name);
            var chro = crSet.getChromosome(name);
            if (chro !== undefined)
                this.chromosomes.set(name, chro);
            return chro;
        };
        MultiPhaseChromosomeSet.prototype.getChromosomeNames = function () {
            return this.names.values();
        };
        return MultiPhaseChromosomeSet;
    })();
    Parsers.MultiPhaseChromosomeSet = MultiPhaseChromosomeSet;

    /**
    * The {Parsers.ParserRegistry} singleton
    * @variable {Parsers.registry}
    */
    Parsers.registry = new ParserRegistry();
})(Parsers || (Parsers = {}));
