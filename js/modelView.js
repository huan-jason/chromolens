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
    * The HTML-based view that shows all the available models.
    * @class GenomeViewer.ModelsView
    */
    var ModelsView = (function (_super) {
        __extends(ModelsView, _super);
        function ModelsView(parent, name, role, args) {
            _super.call(this, parent, name, role, args);
            this.filenames = [];
            var this_in_closure = this;
            var form = d3.selectAll("#ModelsView");
            this.parsersSelect = form.select("#parsers");
            var parsers = this.parsersSelect.selectAll("input").data(Parsers.registry.parserNames());
            var input_spans = parsers.enter().append("span").attr("class", function (d) {
                return d;
            });
            input_spans.append("input").attr("type", "radio").attr("name", "parsers_choice").attr("value", function (d) {
                return d;
            });
            input_spans.append("span").text(function (d) {
                return String(d);
            });

            this.fileLoadWidget = form.select("#file");
            this.fileLoadWidget.on("change", function () {
                showLoading();
                this_in_closure.fileLoad();
            });
            this.fileNamesSelect = form.select("#filenames").on("change", function () {
                this_in_closure.setChroView();
            });
            this.chroSelect = d3.select("#chromosomes");
            this.chroSelect.on("change", function () {
                this_in_closure.adjustViewSelect();
            });
            this.destViewSelect = form.select("#dest_view");
            this.viewTypeSelect = form.select("#view_type");
            this.forgetButton = form.select("#forget");
            this.forgetButton.attr("disable", true).on("click", function () {
                this_in_closure.forgetFile();
            });
            this.addButton = form.select("#add").on("click", function () {
                showLoading();
                this_in_closure.doAddView();
            });
        }
        ModelsView.prototype.setChroView = function (filename) {
            if (filename === undefined) {
                var opt = this.fileNamesSelect.selectAll("option").filter(function (d) {
                    return this.selected;
                }).node();
                filename = opt.value;
            }
            var cSet = Model.manager.getChromosomeSet(filename);
            var names = cSet.getChromosomeNames();
            var chro = this.chroSelect.selectAll("option").data(names);
            chro.enter().append("option");
            chro.text(function (d) {
                return d;
            });
            chro.exit().remove();
            var viewNames = Views.registry.getVFsForModel(cSet.type);
            var sel = this.viewTypeSelect.selectAll("option").data(viewNames);
            sel.enter().append("option");
            sel.text(function (d) {
                return d;
            });
            sel.exit().remove();
        };

        ModelsView.prototype.adjustViewSelect = function () {
            var opt = this.chroSelect.selectAll("option").filter(function (d) {
                return this.selected;
            }).node();
            var chromosome = opt.value;
            assert(chromosome !== undefined);
            var existingViews = this.destViewSelect.selectAll("option");
            var selectedView = existingViews.filter(function (d) {
                return this.selected;
            }).node();
            var correspondingView = existingViews.filter(function (d) {
                return this.value == chromosome;
            }).node();
            if (correspondingView === null) {
                correspondingView = existingViews.node(); // new view
            }
            if (selectedView !== undefined && correspondingView != selectedView) {
                selectedView.selected = null;
            }
            correspondingView.selected = true;
        };

        ModelsView.prototype.fileLoad = function () {
            var evt = d3.event;
            var target = sourceEvent().target;
            var files = target.files;
            var this_in_closure = this;
            if (files.length == 1) {
                var file = files[0];
                var reader = new FileReader();
                reader.onload = function (e) {
                    var radio = this_in_closure.parsersSelect.selectAll("input").filter(function (d) {
                        return this.checked;
                    }).node();
                    var parser_type = radio.value;
                    this_in_closure.loadFile(file.name, parser_type, reader.result);
                    target.value = null;
                    target.files = null;
                };
                reader.readAsText(file);
            }
        };

        ModelsView.prototype.loadFile = function (filename, parser_type, content, fileid) {
            var self = this;

            if (content === undefined) {
                showLoading();
                var req = new XMLHttpRequest();
                req.onload = function () {
                    if (this.responseText.substr(0,10) == "Cannot GET") {
                        alert( "Cannot load file '" + filename + "'." );
                        return;
                    }
                    self.loadFile(filename, parser_type, this.responseText);
                };
                req.open("get", filename, true);
                req.onprogress = function(e) { showProgress(e, filename, fileid) };

                try  {
                    req.send();
                } catch (e) {
                    alert(e);
                }
                return;
            }

            try  {
                hideLoading();
                var cSet = Model.manager.load_str(content, filename, parser_type);
                this.filenames.push(filename);
                var filenames = this.fileNamesSelect.selectAll("option").data(this.filenames);
                filenames.enter().append("option");
                filenames.attr("selected", function (d) {
                    return (d == filename) ? "selected" : "";
                }).text(function (d) {
                    return d;
                });
                this.setChroView(filename);
                this.addButton.attr('disabled', null);
                this.forgetButton.attr('disabled', null);
            } catch (e) {
                alert(e);
            }
        };

        ModelsView.prototype.forgetFile = function () {
            var currentFileSel = this.fileNamesSelect.selectAll("option").filter(function (d) {
                return this.selected;
            });
            var currentFile = currentFileSel.node();
            Model.manager.removeCSetById(currentFile.value);

            // TODO: Recompute chroSelect from scratch. Do not try to remove.
            currentFileSel.remove();
            if (this.fileNamesSelect.selectAll("option").empty()) {
                this.addButton.attr('disabled', true);
                this.forgetButton.attr('disabled', true);
            }
        };

        ModelsView.prototype.doAddView = function () {
            var currentFile = this.fileNamesSelect.selectAll("option").filter(function (d) {
                return this.selected;
            }).node();
            var currentChro = this.chroSelect.selectAll("option").filter(function (d) {
                return this.selected;
            }).node();
            var chro = Model.manager.getChromosome(currentChro.value, currentFile.value);
            assert(chro != null);
            var viewTypeName = this.viewTypeSelect.selectAll("option").filter(function (d) {
                return this.selected;
            }).node();
            var destViewName = this.destViewSelect.selectAll("option").filter(function (d) {
                return this.selected;
            }).node();
            if (!viewTypeName) {
                hideLoading();
                return;
            }
            var panel;
            var mainPanel = this.getViewPath(['', '#MainPanel']);
            if (destViewName.value == 'new') {
                panel = mainPanel.createSubView("PowerPanel", chro.name, 'panel');
                this.destViewSelect.append("option").text(panel.name);
                this.destViewSelect[0][0].selectedIndex=1;
            } else {
                panel = mainPanel.getSubView('#' + destViewName.value);
            }
            var view = panel.createSubView(viewTypeName.value, viewTypeName.value, "content", {});

            // sub view first
            view.setChromosome(chro);
            panel.setChromosome(chro);
            view.invalidate();
            mainPanel.layout();
            hideLoading();
        };

        ModelsView.create = function (parent, name, role, args) {
            return new ModelsView(parent, name, role, args);
        };
        return ModelsView;
    })(Views.BaseView);
    Views.registry.registerVF(ModelsView.create, "ModelsView");
})(GenomeViewer || (GenomeViewer = {}));
