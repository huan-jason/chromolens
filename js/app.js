'use strict';

var phonecatApp = angular.module('chromolens', [])


.value( "FILES", [
    {
        type:   "ISF",
        title:  "Interaction Standard Format (ISF) Files",
        files:  [
            {
                fileid:       "CMF001M",
                filename:     "files/CMF001M_cluster_INTRA_bothbs_highconfidence.isf",
                type:         "isf",
            },
            {
                fileid:       "CMF002M",
                filename:     "files/CMF002M_cluster_INTRA_bothbs_highconfidence.isf",
                type:         "isf",
            },
        ],
        panelTypes: [
            {
                value:  "isfPanel",
                title:  "ISF Panel",
            },
            {
                value:  "BindingDensityPanel",
                title:  "Binding Density Panel",
            },
        ],
    },
    {
        type:   "Bedgraph",
        title:  "BedGraph files",
        files: [
            {
                fileid:       "input_NPMko",
            filename:     "files/input_NPMko.bedgraph",
            type:         "bedGraph",
            },
            {
                fileid:       "input_NPMwt",
            filename:     "files/input_NPMwt.bedgraph",
            type:         "bedGraph",
            },
            {
                fileid:       "NPMko_CTCF",
            filename:     "files/NPMko_CTCF.bedgraph",
            type:         "bedGraph",
            },
            {
                fileid:       "NPMwt_CTCF",
            filename:     "files/NPMwt_CTCF.bedgraph",
            type:         "bedGraph",
            },
        ],
        panelTypes: [
            {
                value:  "BedGraphHistogramPanel",
            title:  "Histogram Panel",
            },
            {
                value:  "BedGraphDensityPanel",
            title:  "Density Panel",
            },
        ],
    },
    {
        type:   "GFF3",
        title:  "Generic Feature Format version 3 files",
        files: [
        ],
        panelTypes: [
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
    function(
        $scope,
        GENOMES,
        FILES
    ){
        $scope.files              = FILES;
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
            preload(filename, type, content, fileid);
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
    }
])

;
