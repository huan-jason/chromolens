"use strict";


var RIGHT_CLICK_EVENT   = null;
var MOVE_SOURCE         = null;
var NODES               = [];

function getSvgChild(elem) {
    //     while (elem.parentNode.id != "genomesvg") elem = elem.parentNode;
    while ( !elem.parentNode.classList.contains("PowerPanel") ) {
        elem = elem.parentNode;
        if (elem.id == "genomesvg") return null;
    }
    if ( elem.classList.contains("isfPanel") ) return elem;
    return null;
}


function getPanels() {
    return gv.viewsByName.get("MainPanel").panels[0].panels;
}


function refresh() {
    var mp = gv.viewsByName.get("MainPanel");
    mp.invalidated = true;
    mp.panels[0].invalidated = true; // PowerPanel
    mp.panels[0].panels.forEach( function(p) { p.invalidated = true; } );
    mp.layout();
}

// =======================================================================
// Drag & drop

/*
function translate(x,y) {
    return [x,y];
}
function getTransform(elem) {
    return $(elem).attr("transform");
}
function getTranslate(elem) {
    return eval( getTransform(elem) );
}
function getTranslateX(elem) {
    return parseInt(getTranslate(elem)[0]);
}
function getTranslateY(elem) {
    return parseInt(getTranslate(elem)[1]);
}
function getHeight(elem) {
    return parseInt($(elem).attr("height"));
}

function move(source, target) {
console.log(source, target)
    return;
    var s_transform = getTransform(source);
    var t_transform = getTransform(target);
    var s_height    = parseInt(getHeight(source));
    var t_height    = parseInt(getHeight(target));
    var s_Y         = parseInt(getTranslateY(source));
    var t_Y         = parseInt(getTranslateY(target));

    if (s_Y > t_Y) {
        $(source).attr( "transform", t_transform );
        var translate = "translate(20," + (t_Y + s_height) + ")";
        $(target).attr( "transform", translate);
    }
    else {
        $(target).attr( "transform", s_transform );
        var translate = "translate(20," + (s_Y + t_height) + ")";
        $(source).attr( "transform", translate);
    }
}
*/

function move(source, target) {
    var panels = getPanels();
    var names = [];
    for (var i=0, len=panels.length; i<len; i++) names.push(panels[i].name);

    var idx_source = names.indexOf( source.getAttribute("id") );
    assert(idx_source > -1);

    var idx_target = names.indexOf( target.getAttribute("id") );
    assert(idx_target > -1);

console.log(panels)

    target = panels.splice(idx_source,1)[0];

console.log(panels)

//     idx_target -= (idx_target > idx_source) ? 1 : 0;
    panels.splice(idx_target, 0, target);
console.log(panels)


    refresh();
}

function mouseDragStart(e) {
    var target = getSvgChild(e.target);
    if (!target) return;
    if (!target.classList.contains("isfPanel")) return;
    MOVE_SOURCE = target;
    $("#genomesvg").css("cursor", "move");
    $(MOVE_SOURCE).css("opacity", 0.5);
}

function mouseDrag(e) {
    if (!MOVE_SOURCE) return;
    var target = getSvgChild(e.target);
    if (!target) return;
    if (!target.classList.contains("isfPanel")) return;
    if (MOVE_SOURCE == target) return;
    move(MOVE_SOURCE, target);
}

function mouseDragEnd(e) {
    $("#genomesvg").css("cursor", "default");
    $(MOVE_SOURCE).css("opacity", 1);
    $(MOVE_SOURCE).find("rect.background").css({ "fill":"initial", "fill-opacity":"0" });
    MOVE_SOURCE = null;
}



function mouseUp(e) {
    $("#genomesvg").css("cursor", "default");
    $(MOVE_SOURCE).css("opacity", 1);
    $(MOVE_SOURCE).find("rect.background").css({ "fill":"initial", "fill-opacity":"0" });
    MOVE_SOURCE = null;
}

$("body").on("mouseup", mouseUp);





// =======================================================================
// Move Cytoband  to right - not required anymore; fixed in Github version

// $("#genomesvg").on('DOMNodeInserted', function(e) {
//     if (e.target.tagName == "CANVAS" ) {
//         $(e.target).css({ "margin-left":"23px", "padding-top":"2px" });
//     }
// })


// =======================================================================
// Right-click context menu

function isRightClick(e) {
    if (e.which) return e.which  == 3;
    else         return e.button == 2;
}

function mouseDown(e) {
    if ( isRightClick(e) ) {
        if (!getSvgChild(e.target)) return;
        $("#id_ctx_menu").css({ "top":e.screenY - 90, "left":e.screenX });
        $("#id_ctx_menu").css("display", "block");
        RIGHT_CLICK_EVENT = e;
        return;
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
        return panel;
        }
    };
    refresh();
}

// ================

function changeScale() {
    alert("Change Scale");
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
    $("#id_color_modal").css("display", "block");
}

function closeColorModal() {
    $("#id_color_modal").css("display", "none");
}

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
// Modals

function createColorPicker() {
    var contextMenuNode = document.createElement("div");
    contextMenuNode.setAttribute( "id",     "id_color_modal" );
    contextMenuNode.setAttribute( "class",  "col-xs-2" );
    var html =
        'Choose Colour<br>' +
        '<input id="id_color" type="color"><br>' +
        '<button type="button" onclick="setColor();">OK</button>' +
        '<button type="button" onclick="closeColorModal();">Cancel</button>'
    contextMenuNode.innerHTML = html;
$("body").prepend(contextMenuNode);
}


function createContextMenu() {
    var contextMenuNode = document.createElement("div");
    contextMenuNode.setAttribute( "id",     "id_ctx_menu" );
    contextMenuNode.setAttribute( "class",  "col-xs-1" );
    contextMenuNode.innerHTML =
    '<a href="javascript:closeTrack  ();"><div class="list-group-item">Close           </div></a>' +
    //'<a href="javascript:changeScale ();"><div class="list-group-item">Change scale... </div></a>' +
    '<a href="javascript:changeColour();"><div class="list-group-item">Change colour...</div></a>' +
    '<a href="javascript:changeLabel ();"><div class="list-group-item">Change label... </div></a>';
$("body").prepend(contextMenuNode);
}

(function() {
    createColorPicker();
    createContextMenu();
})();

// =======================================================================


