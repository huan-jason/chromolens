"use strict";

var gv;
var LOADED  = {};
var LOADING = false;

function preload(filename, type, content, fileid) {
    if (LOADED[filename])   return;
    if (LOADING)            return;
    LOADING = true;
    showLoading();
    Views.mainView.getSubView('modelsView').loadFile(filename, type, content, fileid);
    hideLoading();
}

function setOptions(genomechoice) {
}

function displayfiles(genomechoice) {
}

function loaddata() {
    //                 debugger;
    gv = new GenomeViewer.ChromosomeViewer();
    preload((document.selectform.assembly.options[document.selectform.assembly.selectedIndex].value),'cytoband');
    setTimeout( function() {
        $("#add").click();
        $("#view_type option").remove();
        LOADING= false;
    }, 100 );
    LOADING= false;
}

// **************************************************************

(function($){

    var body = $(document.body),
    modal = $('#dropfile-modal'),
    re = /\.(\w+)$/,
    files = [],
    SELECT;

    SELECT =  "<select class='uploaded-select'>";
    SELECT += "<option value='bedGraph' data-search='bedgraph'>bedgraph</option>";
    SELECT += "<option value='gff3' data-search='gff'>gff</option>";
    SELECT += "<option value='isf' data-search='isf'>isf</option>";
    SELECT += "<option value='cytoband' data-search='txt'>txt</option>";
    SELECT += "</select>";

    body.on('dragenter', function(ev){
        modal.fadeIn();
        return false;
    });


    body.on("dragover", function(ev){
        return false;
    });

    modal.on('click', function(ev){
        ev.preventDefault();
        modal.fadeOut();
        return false;
    });

    modal.on('drop', function(ev){
        ev.preventDefault();
        modal.fadeOut();

        addFileToList(ev.originalEvent.dataTransfer.files[0]);
        return false;
    });

    $('#pcfile').on('change', function(ev){
        addFileToList(ev.currentTarget.files[0]);
        ev.currentTarget.value = '';
    });

    function addFileToList(file){

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

        $('#pcfiles-list-first').hide();
        files.push(file);
        var types = {
            isf :       "isf",
    bedgraph :  "bedGraph",
        };
        loadFile( file, getType(file.name) );
        //         updateFileList();
    }

    function updateFileList(){
        var list = $('#pcfiles-list');

        $.each(files, function(i, file){
            if( file.__added === true ){
                return;
            }
            file.__added = true;

            var li = $('<li>'),
                a = $('<input>').attr("type", 'button'),
                select = $(SELECT),
                type;

                if( re.test(file.name) ){
                    type = re.exec(file.name)[1];
                    var x = select.find('[data-search="'+type+'"]');
                    select.find('[data-search="'+type+'"]').attr('selected', 'selected');
                }

                a.attr('data-fileindex', i);
                a.val(file.name);

                a.on('click', function(ev){
                    var currentTarget = ev.currentTarget;
                    var select = currentTarget.nextElementSibling;
                    loadFileByIndex(currentTarget.getAttribute('data-fileindex'), select.value);
                    currentTarget.disabled = true;
                    currentTarget.classList.toggle("bg-success", true);
                    currentTarget.classList.toggle("loaded", true);
                    select.disabled = true;
                });

                li.append(a);
                li.append(select);
                list.append( li );
        });
    }

    function loadFileByIndex(index, type){
        var file = files[index],
    reader = new FileReader();

    reader.onprogress = showProgress;

    reader.onload = function (event) {
        preload(file.name, type, event.target.result);
        LOADING = false;
        $("#add").click();
    };

    reader.readAsText(file);
    }


    function loadFile(file, type){
        var reader = new FileReader();
        reader.onprogress = showProgress;
        reader.onload = function (event) {
            preload(file.name, type, event.target.result);
            LOADING = false;
            angular.element($("body")).scope().addUploadFile(file);
        };
        reader.readAsText(file);
    }

})(jQuery);

// **************************************************************
// **************************************************************

function isPanel(elem) {
    var panelTypes = [
        "isfPanel",
        "BedGraphHistogramPanel",
        "BedGraphDensityPanel",
        "BindingDensityPanel",
    ]
    var classList = elem.classList;
    for (var i=0, len=panelTypes.length; i<len; i++) {
        if ( classList.contains(panelTypes[i]) ) return true;
    }
    return false;
}

var RIGHT_CLICK_EVENT   = null;
var MOVE_SOURCE         = null;
var NODES               = [];

function getSvgChild(elem) {
    //     while (elem.parentNode.id != "genomesvg") elem = elem.parentNode;
    while ( !elem.parentNode.classList.contains("PowerPanel") ) {
        elem = elem.parentNode;
        if (elem.id == "genomesvg") return null;
    }
    if ( isPanel(elem) ) return elem;
    return null;
}

function getPanels() {
    return gv.viewsByName.get("MainPanel").panels[0].panels;
}


function refresh() {
    var mp = gv.viewsByName.get("MainPanel");
    var pp = mp.panels[0]
    mp.invalidated = true;
    pp.invalidated = true; // PowerPanel
    pp.panels.forEach( function(p) {
        p.invalidated = true;
    } );
    mp.layout();
}

// =======================================================================
// Drag & drop

function move(source, target) {
    var panels = getPanels();
    var names = [];
    for (var i=0, len=panels.length; i<len; i++) names.push(panels[i].name);

    var idx_source = names.indexOf( source.getAttribute("id") );
    assert(idx_source > -1);

    var idx_target = names.indexOf( target.getAttribute("id") );
    assert(idx_target > -1);

    target = panels.splice(idx_source,1)[0];

//     idx_target -= (idx_target > idx_source) ? 1 : 0;
    panels.splice(idx_target, 0, target);
    refresh();
}

function mouseDragStart(e) {
    if (mouseDown(e)) return;
    var target = getSvgChild(e.target);
    if (!target) return;
    if (!isPanel(target)) return;
    MOVE_SOURCE = target;
    $("#genomesvg").css("cursor", "move");
    $(MOVE_SOURCE).css("opacity", 0.5);
    $(MOVE_SOURCE).find("canvas").css("opacity", 0.5);
}

function mouseDrag(e) {
    if (!MOVE_SOURCE) return;
    var target = getSvgChild(e.target);
    if (!target) return;
    if (!isPanel(target)) return;
    if (MOVE_SOURCE == target) return;
    move(MOVE_SOURCE, target);
}

function mouseDragEnd(e) {
    $("#genomesvg").css("cursor", "default");
    $(MOVE_SOURCE).css("opacity", 1);
    $(MOVE_SOURCE).find("canvas").css("opacity", 1);
    $(MOVE_SOURCE).find("rect.background").css({ "fill":"initial", "fill-opacity":"0" });
    MOVE_SOURCE = null;
}



function mouseUp(e) {
    $("#genomesvg").css("cursor", "default");
    $(MOVE_SOURCE).css("opacity", 1);
    $(MOVE_SOURCE).find("canvas").css("opacity", 1);
    $(MOVE_SOURCE).find("rect.background").css({ "fill":"initial", "fill-opacity":"0" });
    MOVE_SOURCE = null;
}

$("body").on("mouseup", mouseUp);


// =======================================================================
// Right-click context menu event handlers

function isRightClick(e) {
    if (e.which) return e.which  == 3;
    else         return e.button == 2;
}

function mouseDown(e) {
    if ( isRightClick(e) ) {
        e.preventDefault();
        if (!getSvgChild(e.target)) return;
        $("#id_ctx_menu").css({ "top":e.screenY - 90, "left":e.screenX });
        $("#id_ctx_menu").css("display", "block");
        RIGHT_CLICK_EVENT = e;
        return true;
    }
}

$("#genomesvg").on('DOMNodeInserted', function(e) {
    var target  = e.target;
    if (target.parentNode.classList.contains("PowerPanel")) {
        target.addEventListener('mousedown', mouseDown, false);
    }
})


$("body").on("click", function(e) {
    if ( $("#id_ctx_menu").css("display") == "block" ) {
        $("#id_ctx_menu").css("display", "none");
    }
});


// =======================================================================
// Context menu

function closeTrack() {
    var elem = getSvgChild(RIGHT_CLICK_EVENT.target);
    if (!elem) return;
    var eid = elem.id;

    var powerpanel  = gv.viewsByName.get("MainPanel").panels[0];
    var panels      = powerpanel.panels;
    powerpanel.viewsByName.get(eid).remove();

    for (var i=0, len=panels.length; i<len; i++) {
        if (panels[i].name == eid) {
        var panel = panels.splice(i, 1);
        refresh();
        return panel;
        }
    };
}

// ================

function createLabel(text)
{
    var svgNS = "http://www.w3.org/2000/svg";
    var label = document.createElementNS(svgNS, "text");
    label.setAttributeNS(null,"x",      330);
    label.setAttributeNS(null,"y",      -35);
    label.setAttributeNS(null,"class",  "track_label");
    label.textContent = text;
    return label;
}

function changeLabel() {
    var elem = getSvgChild(RIGHT_CLICK_EVENT.target);
    if (!elem) return;
    var label = prompt("Label:","Dr. T the Great (who tickles cancer cells)");
    if (!label) return;
    var labelElem = $(elem).find("text.track_label");
    if (labelElem.length)  labelElem[0].textContent = label;
    else                   $(elem).append( createLabel(label) );
}

// ================

function changeColour() {
    $("#id_color_modal").modal();
}

// function closeColorModal() {
//     $("#id_color_modal").css("display", "none");
// }

function setColor() {
    var elem = getSvgChild(RIGHT_CLICK_EVENT.target);
    if (!elem) return;
    var color       = $("#id_color").val();
    var styleelem   = $("#id_style1")
    var style       = "#" + elem.getAttribute("id") + " .ii_arcs path { stroke: " + color + ";}";
    styleelem.html( styleelem.html() + style );
    closeColorModal();
}

// =======================================================================

