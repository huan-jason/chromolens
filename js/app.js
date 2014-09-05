'use strict';

var phonecatApp = angular.module('chromolens', [])


.value( "PANELS", {
    isf:    [
        {
            value:  "isfPanel",
            title:  "ISF Panel",
        },
        {
            value:  "BindingDensityPanel",
            title:  "Binding Density Panel",
        },
    ],
    bedGraph:   [
        {
            value:  "BedGraphHistogramPanel",
            title:  "Histogram Panel",
        },
        {
            value:  "BedGraphDensityPanel",
            title:  "Density Panel",
        },
    ],
})


.value( "FILES", [
    {
        type:   "isf",
        title:  "Interaction Standard Format (ISF) Files",
        files:  [
            {
                fileid:       "CMF001M",
                filename:     "files/CMF001M_cluster_INTRA_bothbs_highconfidence.isf",
            },
            {
                fileid:       "CMF002M",
                filename:     "files/CMF002M_cluster_INTRA_bothbs_highconfidence.isf",
            },
        ],
    },
    {
        type:   "bedGraph",
        title:  "BedGraph files",
        files: [
            {
                fileid:       "input_NPMko",
                filename:     "files/input_NPMko.bedgraph",
            },
            {
                fileid:       "input_NPMwt",
                filename:     "files/input_NPMwt.bedgraph",
            },
            {
                fileid:       "NPMko_CTCF",
                filename:     "files/NPMko_CTCF.bedgraph",
            },
            {
                fileid:       "NPMwt_CTCF",
                filename:     "files/NPMwt_CTCF.bedgraph",
            },
        ],
    },
    {
        type:   "GFF3",
        title:  "Generic Feature Format version 3 files",
        files: [
        ],
    },
    {
        type:   "Upload",
        title:  "Uploaded files",
        files: [
        ],
    },
])


.value( "GENOMES", {

    "Homo Sapiens": {
        name:           "Homo Sapiens",
        chromosomes:    [
            "chr1",  "chr2",  "chr3",  "chr4",  "chr5",  "chr6",  "chr7",  "chr8",  "chr9",  "chr10",
            "chr11", "chr12", "chr13", "chr14", "chr15", "chr16", "chr17", "chr18", "chr19", "chr20",
            "chr21", "chr22",
            "chrX", "chrY",
        ],
        assemblies:     [
            {
                assembly:   'hg19',
                file:       'files/cytoBand.hg19.txt',
            },
            {
                assembly:   'hg18',
                file:       'files/cytoBand.hg18.txt',
            },
        ],
    },
    "Mus Musculus": {
        name:           "Mus Musculus",
        chromosomes:    [
            "chr1",  "chr2",  "chr3",  "chr4",  "chr5",  "chr6",  "chr7",  "chr8",  "chr9",  "chr10",
            "chr11", "chr12", "chr13", "chr14", "chr15", "chr16", "chr17", "chr18", "chr19",
            "chrX", "chrY",
        ],
        assemblies:     [
        {
            assembly:       'mm9',
            file:           'files/cytoBand.mm9.txt',
        },
        {
            assembly:       'mm10',
            file:           'files/cytoBand.mm10.txt',
        },
        ],
    },
})


.controller( "chromolensCtrl", [
    "$scope",
    "GENOMES",
    "FILES",
    "PANELS",
    function(
        $scope,
        GENOMES,
        FILES,
        PANELS
    ){
        $scope.files              = FILES;
        $scope.panels             = PANELS;
        $scope.loadedFiles        = {};
        $scope.genomes            = GENOMES;
        $scope.genome             = GENOMES["Mus Musculus"];
        $scope.chromosome         = $scope.genome.chromosomes[0];
        $scope.assembly           = $scope.genome.assemblies[0];

        $scope.setDefaultAssembly = function(){
            $scope.assembly = $scope.genome.assemblies[0];
        };

        $scope.load = function() {
            $scope.loaded = true;
        };

        $scope.preload = function ( filename, type, content, fileid ) {
            if (type != "Upload") {
                preload(filename, type, content, fileid);
            }
        };

        $scope.loadCompleted = function(fileid) {
            $scope.$apply( function() {
                $scope.loadedFiles[fileid] = true;
            })
        };

        $scope.addTrack = function(e, file, type) {
            if (!e.target.checked) return;
            var viewType = $("#view_type");
            var option   = viewType.children().filter( function() {
                return $(this).text() == type;
            });
            if (!option) viewType.append( "<option selected>"+type+"</option>" );
            else         option.attr("selected", "selected");
            $("#add").click();
        };

        $scope.addUploadFile= function(file) {
            $scope.$apply( function() {

                function getType(filename) {
                    var ext = filename.split(".");
                    if (ext.length < 2) return false;
                          ext = ext[ext.length - 1].toLowerCase();
                    var types = {
                        isf :       "isf",
                        bedgraph :  "bedGraph",
                    };
                    return types[ext];
                }
                var type = getType(file.name);
                if (type) {
                    var uploads = FILES[FILES.length - 1];  // uploaded file list is last in FILES
                    var uploaded = false;
                    for (var i=0, len=uploads.files.length; i<len; i++) {
                        if (uploads.files[i].fileid == file.name ) {
                            uploaded = true;
                            break;
                        };
                    };
                    if (!uploaded) {
                        uploads.files.push({
                            fileid:     file.name,
                            filename:   file.name,
                            type:       type,
                        });
                        $scope.loadedFiles[file.name] = true;
                        $("#id-panel-Upload").collapse("show");
                    };
                };

            })
        };

    }
])

;
