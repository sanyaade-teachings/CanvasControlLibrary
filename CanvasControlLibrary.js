﻿/*
    Canvas Control Library Copyright 2012
    Created by Akshay Srinivasan [akshay.srin@gmail.com]
    This javascript code is provided as is with no warranty implied.
    Akshay Srinivasan are not liable or responsible for any consequence of 
    using this code in your applications.
    You are free to use it and/or change it for both commercial and non-commercial
    applications as long as you give credit to Akshay Srinivasan the creator 
    of this code.
*/


//Helper functions
function getlowcomp(value) {
    if (value > 0) {
        var x = Math.floor(value / 2), y = x.toString(16);
        if (y.length < 2) { return '0' + y; }
        return y;
    }
    return '00';
}

function gethighcomp(value) {
    if (value < 255) {
        var x = value + Math.floor(((255 - value) / 2));
        if (x <= 16) { return '0' + x.toString(16); }
        return x.toString(16);
    }
    return 'FF';
}

function canvasGetOffsetLeft(obj) {
    var curleft = 0;
    if (obj.offsetParent) {
        do {
            curleft += ((parseInt(obj.offsetLeft) >= 0 || parseInt(obj.offsetLeft) < 0) && parseInt(obj.offsetLeft).toString() ==
                obj.offsetLeft.toString() ? obj.offsetLeft : 0);
        } while (obj = obj.offsetParent);
        return curleft;
    }
}

function canvasGetOffsetTop(obj) {
    var curtop = 0;
    if (obj.offsetParent) {
        do {
            curtop += ((parseInt(obj.offsetTop) >= 0 || parseInt(obj.offsetTop) < 0) && parseInt(obj.offsetTop).toString() == obj.offsetTop.toString() ? obj.offsetTop : 0);
        } while (obj = obj.offsetParent);
        return curtop;
    }
}

function drawEllipse(ctx, x, y, w, h) {
    var kappa = 0.5522848;
    var ox = (w / 2) * kappa, // control point offset horizontal
    oy = (h / 2) * kappa, // control point offset vertical
    xe = x + w,           // x-end
    ye = y + h,           // y-end
    xm = x + w / 2,       // x-middle
    ym = y + h / 2;       // y-middle

    ctx.beginPath();
    ctx.moveTo(x, ym);
    ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
    ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
    ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
    ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
    ctx.closePath();
}

//Window Manager Code starts here
var canvases = new Array();
var ctxs = new Array();
var windows = new Array();
var windowCount = 0;
var highestDepth = 0;
var clickFunctions = new Array();
var doubleClickFunctions = new Array();
var dragFunctions = new Array();
var dragEndFunctions = new Array();
var dragEnterFunctions = new Array();
var dragLeaveFunctions = new Array();
var dragOverFunctions = new Array();
var dragStartFunctions = new Array();
var dropFunctions = new Array();
var mouseDownFunctions = new Array();
var mouseMoveFunctions = new Array();
var mouseOutFunctions = new Array();
var mouseOverFunctions = new Array();
var mouseUpFunctions = new Array();
var mouseWheelFunctions = new Array();
var scrollFunctions = new Array();
var windowDrawFunctions = new Array();
var windowIdWithFocus = new Array();
var modalWindows = new Array();
var hiddenWindows = new Array();
var gotFocusFunctions = new Array();
var lostFocusFunctions = new Array();
var keyPressFunctions = new Array();
var keyDownFunctions = new Array();
var doingClickEvent = 0;
var doingMouseUp = 0;
var doingMouseDown = 0;
var doingEventForWindowID = -1;
var intervalID = -1;
var windowWithAnimationCount = new Array();
var suspendDraw = 0;
var sessionID = null;
var donotredaw = null;

function animatedDraw() {
    for (var i = 0; i < windowWithAnimationCount.length; i++) {
        var wprops = getWindowProps(windowWithAnimationCount[i].CanvasID, windowWithAnimationCount[i].WindowID);
        if (wprops) {
            invalidateRect(windowWithAnimationCount[i].CanvasID, null, wprops.X, wprops.Y, wprops.Width, wprops.Height);
        }
    }
}

function registerAnimatedWindow(canvasid, windowid) {
    for (var i = 0; i < windowWithAnimationCount.length; i++) {
        if (windowWithAnimationCount[i].CanvasID == canvasid && windowWithAnimationCount[i].WindowID == windowid) {
            if (intervalID == -1) {
                intervalID = setInterval(animatedDraw, 20);
            }
            return;
        }
    }
    windowWithAnimationCount.push({ CanvasID: canvasid, WindowID: windowid });
    intervalID = setInterval(animatedDraw, 20);
}

function unregisterAnimatedWindow(canvasid, windowid) {
    for (var i = 0; i < windowWithAnimationCount.length; i++) {
        if (windowWithAnimationCount[i].CanvasID == canvasid && windowWithAnimationCount[i].WindowID == windowid) {
            windowWithAnimationCount.splice(i, 1);
            break;
        }
    }
    var found = 0;
    for (var i = 0; i < windowWithAnimationCount.length; i++) {
        if (windowWithAnimationCount[i].CanvasID == canvasid) {
            found = 1;
            break;
        }
    }
    if (!found) {
        clearInterval(intervalID);
    }
}

function doesWindowHaveFocus(canvasid, windowid) {
    for (var i = 0; i < windowIdWithFocus.length; i++) {
        if (windowIdWithFocus[i][0] == canvasid && windowIdWithFocus[i][1] == windowid) {
            return 1;
        }
    }
    return 0;
}

function correctEvent(canvasid, e) {
    e = e || window.event;
    var canvas = document.getElementById(canvasid);
    if (e.pageX || e.pageY) {
        e.calcX = e.pageX - canvasGetOffsetLeft(canvas);
        e.calcY = e.pageY - canvasGetOffsetTop(canvas);
    } else if (e.clientX || e.clientY) {
        e.calcX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - canvasGetOffsetLeft(canvas);
        e.calcY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop - canvasGetOffsetTop(canvas);
    }
    return e;
}

function pointEvent(eventArray, canvasId, e, parentwindowid, suppressPreventDefault) {
    e = correctEvent(canvasId, e);
    var x = e.calcX;
    var y = e.calcY;
    var consumeevent = 0;
    var dodrawforwindowids = new Array();
    var dodraw = 0;
    for (var d = highestDepth; d >= 0; d--) {
        for (var i = 0; i < windows.length; i++) {
            if (windows[i].ParentWindowID == parentwindowid && checkIfModalWindow(canvasId, windows[i].WindowCount) == 1 &&
                checkIfHiddenWindow(canvasId, windows[i].WindowCount) == 0 && windows[i].CanvasID == canvasId && windows[i].Depth == d &&
                x >= windows[i].X && x <= windows[i].X + windows[i].Width && y >= windows[i].Y && y <= windows[i].Y + windows[i].Height) {
                doingEventForWindowID = windows[i].WindowCount;
                if (doingClickEvent == 1 || doingMouseUp == 1 || doingMouseDown == 1) {
                    var found = 0;
                    consumeevent = 1;
                    for (var k = 0; k < windowIdWithFocus.length; k++) {
                        if (windowIdWithFocus[k][0] == canvasId && windowIdWithFocus[k][1] != windows[i].WindowCount && windowIdWithFocus[k][1] != -1) {
                            found = 1;
                            for (var f = 0; f < lostFocusFunctions.length; f++) {
                                if (lostFocusFunctions[f][0] == canvasId && lostFocusFunctions[f][1] == windowIdWithFocus[k][1] &&
                                    lostFocusFunctions[f][1] != windows[i].WindowCount) {
                                    lostFocusFunctions[f][2](canvasId, windowIdWithFocus[k][1]);
                                    if (!donotredaw) {
                                        dodrawforwindowids.push(lostFocusFunctions[f][1]);
                                    }
                                }
                            }
                            windowIdWithFocus[k][1] = windows[i].WindowCount;
                            for (var f = 0; f < gotFocusFunctions.length; f++) {
                                if (gotFocusFunctions[f][0] == canvasId && gotFocusFunctions[f][1] == windowIdWithFocus[k][1]) {
                                    gotFocusFunctions[f][2](canvasId, windowIdWithFocus[k][1]);
                                    if (!donotredaw) {
                                        dodrawforwindowids.push(gotFocusFunctions[f][1]);
                                    }
                                }
                            }
                            dodraw = 1;
                        } else if (windowIdWithFocus[k][0] == canvasId && windowIdWithFocus[k][1] == windows[i].WindowCount) {
                            found = 1;
                        }
                    }
                    if (found == 0) {
                        setFocusToWindowID(canvasId, windows[i].WindowCount);
                        for (var f = 0; f < gotFocusFunctions.length; f++) {
                            if (gotFocusFunctions[f][0] == canvasId && gotFocusFunctions[f][1] == windows[i].WindowCount && windowIdWithFocus[k][1] != -1) {
                                gotFocusFunctions[f][2](canvasId, windows[i].WindowCount);
                                if (!donotredaw) {
                                    dodrawforwindowids.push(gotFocusFunctions[f][1]);
                                }
                            }
                        }
                        dodraw = 1;
                    }
                }
                for (var u = 0; u < eventArray.length; u++) {
                    if (eventArray[u][0] == windows[i].WindowCount) {
                        if (windows[i].ChildWindowIDs && windows[i].ChildWindowIDs.length > 0) {
                            if (pointEvent(eventArray, canvasId, e, windows[i].WindowCount, suppressPreventDefault) != 1) {
                                eventArray[u][1](canvasId, windows[i].WindowCount, e);
                            }
                        } else {
                            eventArray[u][1](canvasId, windows[i].WindowCount, e);
                        }
                        if (!donotredaw) {
                            invalidateRect(canvasId, null, windows[i].X, windows[i].Y, windows[i].Width, windows[i].Height);
                            if (windows[i].ControlType == 'ScrollBar') {
                                var scrollbarprops = getScrollBarProps(canvasId, windows[i].WindowCount);
                                var parentofscrollbarwindowprops = getWindowProps(canvasId, scrollbarprops.OwnedByWindowID);
                                if (parentofscrollbarwindowprops) {
                                    invalidateRect(canvasId, null, parentofscrollbarwindowprops.X, parentofscrollbarwindowprops.Y,
                                        parentofscrollbarwindowprops.Width, parentofscrollbarwindowprops.Height);
                                    if (scrollbarprops.DrawFunction) {
                                        scrollbarprops.DrawFunction(canvasId, windows[i].WindowCount);
                                    } else {
                                        drawScrollBar(canvasId, windows[i].WindowCount);
                                    }
                                }
                            }
                        }
                        if (windows[i].ControlType != 'TextBox' && suppressPreventDefault != 1) {
                            if (e.preventDefault)
                                e.preventDefault();
                            e.returnValue = false;
                        }
                        /*
                        if (windows[i].ControlType != 'Splitter') {
                            return 1;
                        }*/
                    }
                }
                return 1;
            }
        }
    }
    for (var d = highestDepth; d >= 0; d--) {
        for (var i = 0; i < windows.length; i++) {
            if (windows[i].ParentWindowID == parentwindowid && checkIfModalWindow(canvasId, windows[i].WindowCount) == 0 && checkIfHiddenWindow(canvasId, windows[i].WindowCount) == 0 &&
                windows[i].CanvasID == canvasId && windows[i].Depth == d && x >= windows[i].X && x <= windows[i].X + windows[i].Width &&
                y >= windows[i].Y && y <= windows[i].Y + windows[i].Height) {
                doingEventForWindowID = windows[i].WindowCount;
                if (doingClickEvent == 1 || doingMouseUp == 1 || doingMouseDown == 1) {
                    var found = 0;
                    consumeevent = 1;
                    for (var k = 0; k < windowIdWithFocus.length; k++) {
                        if (windowIdWithFocus[k][0] == canvasId && windowIdWithFocus[k][1] != windows[i].WindowCount && windowIdWithFocus[k][1] != -1) {
                            found = 1;
                            for (var f = 0; f < lostFocusFunctions.length; f++) {
                                if (lostFocusFunctions[f][0] == canvasId && lostFocusFunctions[f][1] == windowIdWithFocus[k][1] &&
                                    lostFocusFunctions[f][1] != windows[i].WindowCount) {
                                    lostFocusFunctions[f][2](canvasId, windowIdWithFocus[k][1]);
                                    if (!donotredaw) {
                                        dodrawforwindowids.push(lostFocusFunctions[f][1]);
                                    }
                                }
                            }
                            windowIdWithFocus[k][1] = windows[i].WindowCount;
                            for (var f = 0; f < gotFocusFunctions.length; f++) {
                                if (gotFocusFunctions[f][0] == canvasId && gotFocusFunctions[f][1] == windowIdWithFocus[k][1]) {
                                    gotFocusFunctions[f][2](canvasId, windowIdWithFocus[k][1]);
                                    if (!donotredaw) {
                                        dodrawforwindowids.push(gotFocusFunctions[f][1]);
                                    }
                                }
                            }
                            dodraw = 1;
                        } else if (windowIdWithFocus[k][0] == canvasId && windowIdWithFocus[k][1] == windows[i].WindowCount && windowIdWithFocus[k][1] != -1) {
                            found = 1;
                        }
                    }
                    if (found == 0) {
                        setFocusToWindowID(canvasId, windows[i].WindowCount);
                        for (var f = 0; f < gotFocusFunctions.length; f++) {
                            if (gotFocusFunctions[f][0] == canvasId && gotFocusFunctions[f][1] == windows[i].WindowCount) {
                                gotFocusFunctions[f][2](canvasId, windows[i].WindowCount);
                                if (!donotredaw) {
                                    dodrawforwindowids.push(gotFocusFunctions[f][1]);
                                }
                            }
                        }
                        dodraw = 1;
                    }
                }
                for (var u = 0; u < eventArray.length; u++) {
                    if (eventArray[u][0] == windows[i].WindowCount) {
                        if (windows[i].ChildWindowIDs && windows[i].ChildWindowIDs.length > 0) {
                            doingEvent = 0;
                            if (pointEvent(eventArray, canvasId, e, windows[i].WindowCount, suppressPreventDefault) != 1) {
                                eventArray[u][1](canvasId, windows[i].WindowCount, e);
                            }
                        } else {
                            eventArray[u][1](canvasId, windows[i].WindowCount, e);
                        }
                        if (!donotredaw) {
                            invalidateRect(canvasId, null, windows[i].X, windows[i].Y, windows[i].Width, windows[i].Height);
                            if (windows[i].ControlType == 'ScrollBar') {
                                var scrollbarprops = getScrollBarProps(canvasId, windows[i].WindowCount);
                                var parentofscrollbarwindowprops = getWindowProps(canvasId, scrollbarprops.OwnedByWindowID);
                                if (parentofscrollbarwindowprops) {
                                    invalidateRect(canvasId, null, parentofscrollbarwindowprops.X, parentofscrollbarwindowprops.Y,
                                        parentofscrollbarwindowprops.Width, parentofscrollbarwindowprops.Height);
                                    if (scrollbarprops.DrawFunction) {
                                        scrollbarprops.DrawFunction(canvasId, windows[i].WindowCount);
                                    } else {
                                        drawScrollBar(canvasId, windows[i].WindowCount);
                                    }
                                }
                            }
                        }
                        if (windows[i].ControlType != 'TextBox' && suppressPreventDefault != 1) {
                            if (e.preventDefault)
                                e.preventDefault();
                            e.returnValue = false;
                        }
                        /*
                        if (windows[i].ControlType != 'Splitter') {
                            return 1;
                        }*/
                    }
                }
                return 1;
            }
        }
    }
    if (consumeevent == 1) {
        return 1;
    }
    if (doingClickEvent == 1 || doingMouseUp == 1 || doingMouseDown == 1) {
        for (var q = 0; q < windowIdWithFocus.length; q++) {
            if (windowIdWithFocus[q][0] == canvasId) {
                doingEventForWindowID = -1;
                for (var f = 0; f < lostFocusFunctions.length; f++) {
                    if (lostFocusFunctions[f][0] == canvasId && lostFocusFunctions[f][1] == windowIdWithFocus[q][1] && windowIdWithFocus[q][1] != -1) {
                        lostFocusFunctions[f][2](canvasId, windowIdWithFocus[q][1]);
                        if (!donotredaw) {
                            dodrawforwindowids.push(lostFocusFunctions[f][1]);
                        }
                    }
                }
                windowIdWithFocus[q][1] = -1;
                dodraw = 1;
            }
        }
    }
    if (dodraw == 1 && !donotredaw) {
        for (var i = 0; i < dodrawforwindowids.length; i++) {
            var wprops = getWindowProps(canvasId, dodrawforwindowids[i]);
            if (wprops) {
                invalidateRect(canvasId, null, wprops.X, wprops.Y, wprops.Width, wprops.Height);
            }
        }
    }
    donotredaw = null;
    return 0;
}

function setFocusToWindowID(canvasId, windowid) {
    for (var i = 0; windowIdWithFocus.length; i++) {
        if (windowIdWithFocus[i][0] == canvasId) {
            windowIdWithFocus[i][1] = windowid;
            return;
        }
    }
    windowIdWithFocus.push([canvasId, windowid]);
}

function canvasOnClick(canvasId, e) {
    doingClickEvent = 1;
    pointEvent(clickFunctions, canvasId, e);
    doingClickEvent = 0;
}

function canvasOnDblClick(canvasId, e) {
    pointEvent(doubleClickFunctions, canvasId, e);
}

function canvasOnDrag(canvasId, e) {
    pointEvents(dragFunctions, canvasId, e);
}

function canvasOnDragEnd(canvasId, e) {
    pointEvent(dragEndFunctions, canvasId, e);
}

function canvasOnDragEnter(canvasId, e) {
    pointEvent(dragEnterFunctions, canvasId, e);
}

function canvasOnDragLeave(canvasId, e) {
    pointEvent(dragLeaveFunctions, canvasId, e);
}

function canvasOnDragOver(canvasId, e) {
    pointEvent(dragOverFunctions, canvasId, e);
}

function canvasOnDragStart(canvasId, e) {
    pointEvent(dragStartFunctions, canvasId, e);
}

function canvasOnDrop(canvasId, e) {
    pointEvent(dropFunctions, canvasId, e);
}

function canvasOnMouseDown(canvasId, e) {
    doingMouseDown = 1;
    pointEvent(mouseDownFunctions, canvasId, e);
    doingMouseDown = 0;
}

function canvasOnMouseMove(canvasId, e) {
    pointEvent(mouseMoveFunctions, canvasId, e);
}

function canvasOnMouseOut(canvasId, e) {
    pointEvent(mouseOutFunctions, canvasId, e);
}

function canvasOnMouseOver(canvasId, e) {
    pointEvent(mouseOverFunctions, canvasId, e);
}

function canvasOnMouseUp(canvasId, e) {
    doingMouseUp = 1;
    pointEvent(mouseUpFunctions, canvasId, e);
    doingMouseUp = 0;
}

function canvasOnMouseWheel(canvasId, e) {
    pointEvent(mouseWheelFunctions, canvasId, e);
}

function canvasOnScroll(canvasId, e) {
    pointEvent(scrollFunctions, canvasId, e);
}

function registerCanvasElementId(canvasId) {
    var canvas = document.getElementById(canvasId);
    canvases.push([canvasId, canvas]);
    ctxs.push([canvasId, canvas.getContext('2d')]);
    canvas.onclick = function (e) { canvasOnClick(canvasId, e); };
    canvas.ondblclick = function (e) { canvasOnDblClick(canvasId, e); };
    canvas.addEventListener('ondrag', function (e) { canvasOnDrag(canvasId, e); });
    canvas.addEventListener('ondragend', function (e) { canvasOnDragEnd(canvasId, e); });
    canvas.addEventListener('ondragenter', function (e) { canvasOnDragEnter(canvasId, e); });
    canvas.addEventListener('ondragleave', function (e) { canvasOnDragLeave(canvasId, e); });
    canvas.addEventListener('ondragover', function (e) { canvasOnDragOver(canvasId, e); });
    canvas.addEventListener('ondragstart', function (e) { e.dataTransfer.setData('text/plain', 'Dragging'); canvasOnDragStart(canvasId, e); });
    canvas.addEventListener('ondrop', function (e) { canvasOnDrop(canvasId, e); });
    canvas.onkeypress = function (e) {
        for (var i = 0; i < keyPressFunctions.length; i++) {
            for (var j = 0; j < windowIdWithFocus.length; j++) {
                if (windowIdWithFocus[j][0] == keyPressFunctions[i].CanvasID && windowIdWithFocus[j][1] == keyPressFunctions[i].WindowID) {
                    keyPressFunctions[i].KeyPressFunction(keyPressFunctions[i].CanvasID, keyPressFunctions[i].WindowID, e);
                    var wprops = getWindowProps(keyPressFunctions[i].CanvasID, keyPressFunctions[i].WindowID);
                    if (wprops) {
                        invalidateRect(keyPressFunctions[i].CanvasID, null, wprops.X, wprops.Y, wprops.Width, wprops.Height);
                    }
                    if (e.preventDefault)
                        e.preventDefault();
                    e.returnValue = false;
                }
            }
        }
    };
    canvas.onkeydown = function (e) {
        for (var i = 0; i < keyDownFunctions.length; i++) {
            for (var j = 0; j < windowIdWithFocus.length; j++) {
                if (windowIdWithFocus[j][0] == keyDownFunctions[i].CanvasID && windowIdWithFocus[j][1] == keyDownFunctions[i].WindowID) {
                    keyDownFunctions[i].KeyDownFunction(keyDownFunctions[i].CanvasID, keyDownFunctions[i].WindowID, e);
                    var wprops = getWindowProps(keyDownFunctions[i].CanvasID, keyDownFunctions[i].WindowID);
                    if (wprops) {
                        invalidateRect(keyDownFunctions[i].CanvasID, null, wprops.X, wprops.Y, wprops.Width, wprops.Height);
                    }
                    if (e.preventDefault)
                        e.preventDefault();
                    e.returnValue = false;
                }
            }
        }
    };
    if (navigator.userAgent.toLowerCase().indexOf('android') > -1 || navigator.userAgent.toLowerCase().indexOf('ipad') > -1 || navigator.userAgent.toLowerCase().indexOf('iphone') > -1 || navigator.userAgent.toLowerCase().indexOf('ipod') > -1) {
        canvas.addEventListener("touchstart", function (e) {
            e.pageX = e.touches[0].pageX;
            e.pageY = e.touches[0].pageY;
            pointEvent(mouseDownFunctions, canvasId, e, null);
        }, false);
        canvas.addEventListener("touchmove", function (e) {
            e.pageX = e.touches[0].pageX;
            e.pageY = e.touches[0].pageY;
            pointEvent(mouseMoveFunctions, canvasId, e, null);
        }, false);
        canvas.addEventListener("touchend", function (e) {
            e.pageX = e.touches[0].pageX;
            e.pageY = e.touches[0].pageY;
            pointEvent(mouseUpFunctions, canvasId, e, null, 1);
        }, false);
    } else {
        canvas.onmousedown = function (e) { canvasOnMouseDown(canvasId, e); };
        canvas.onmousemove = function (e) { canvasOnMouseMove(canvasId, e); };
        canvas.onmouseup = function (e) { canvasOnMouseUp(canvasId, e); };
        canvas.onmouseout = function (e) { canvasOnMouseOut(canvasId, e); };
        canvas.onmouseover = function (e) { canvasOnMouseOver(canvasId, e); };
        canvas.onmousewheel = function (e) { canvasOnMouseWheel(canvasId, e); };
        canvas.onscroll = function (e) { canvasOnScroll(canvasId, e); };
    }
}

function createWindow(canvasId, x, y, width, height, depth, parentwindowid, controlTypeNameString, controlNameId) {
    if (depth > highestDepth)
        highestDepth = depth;
    ++windowCount;
    windows.push({
        WindowCount: windowCount, X: x, Y: y, Width: width, Height: height, Depth: depth, CanvasID: canvasId, ParentWindowID: parentwindowid, ChildWindowIDs: new Array(),
        ControlType: controlTypeNameString, ControlNameID: controlNameId
    });
    return windowCount;
}

function getWindowControlPropsByWindowProps(windowProps) {
    switch (windowProps.ControlType) {
        case 'Panel':
            return getPanelProps(windowProps.CanvasID, windowProps.WindowCount);
        case "Label":
            return getLabelProps(windowProps.CanvasID, windowProps.WindowCount);
        case "Button":
            return getButtonProps(windowProps.CanvasID, windowProps.WindowCount);
        case "ScrollBar":
            return getScrollBarProps(windowProps.CanvasID, windowProps.WindowCount);
        case "Grid":
            return getGridProps(windowProps.CanvasID, windowProps.WindowCount);
        case "ComboBoxTextArea":
            return getComboboxPropsByTextAreaWindowId(windowProps.CanvasID, windowProps.WindowCount);
        case "CheckBox":
            return getcheckboxProps(windowProps.CanvasID, windowProps.WindowCount);
        case "RadioButtonGroup":
            return getRadioButtonProps(windowProps.CanvasID, windowProps.WindowCount);
        case "Image":
            return getImageControlProps(windowProps.CanvasID, windowProps.WindowCount);
        case "TreeView":
            return getTreeViewProps(windowProps.CanvasID, windowProps.WindowCount);
        case "Calender":
            return getCalenderProps(windowProps.CanvasID, windowProps.WindowCount);
        case "ProgressBar":
            return getProgressBarProps(windowProps.CanvasID, windowProps.WindowCount);
        case "Slider":
            return getSliderProps(windowProps.CanvasID, windowProps.WindowCount);
        case "DatePickerTextArea":
            return getDatePickerPropsByTextBoxAreaWindowID(windowProps.CanvasID, windowProps.WindowCount);
        case "BarGraph":
            return getBarGraphProps(windowProps.CanvasID, windowProps.WindowCount);
        case "PieChart":
            return getPieChartProps(windowProps.CanvasID, windowProps.WindowCount);
        case "LineGraph":
            return getLineGraphProps(windowProps.CanvasID, windowProps.WindowCount);
        case "Gauge":
            return getGaugeChartProps(windowProps.CanvasID, windowProps.WindowCount);
        case "RadarGraph":
            return getRadarGraphProps(windowProps.CanvasID, windowProps.WindowCount);
        case "LineAreaGraph":
            return getLineAreaGraphProps(windowProps.CanvasID, windowProps.WindowCount);
        case "CandlesticksGraph":
            return getCandlesticksGraphProps(windowProps.CanvasID, windowProps.WindowCount);
        case "DoughnutChart":
            return getDoughnutChartProps(windowProps.CanvasID, windowProps.WindowCount);
        case "BarsMixedWithLabeledLineGraph":
            return getBarsMixedWithLabledLineGraphProps(windowProps.CanvasID, windowProps.WindowCount);
        case "StackedBarGraph":
            return getstackedBarGraphProps(windowProps.CanvasID, windowProps.WindowCount);
        case "Tab":
            return getTabProps(windowProps.CanvasID, windowProps.WindowCount);
        case "ImageMap":
            return getImageMapProps(windowProps.CanvasID, windowProps.WindowCount);
        case "SubMenu":
            return getSubMenuBarProps(windowProps.CanvasID, windowProps.WindowCount);
        case "MenuBar":
            return getMenuBarProps(windowProps.CanvasID, windowProps.WindowCount);
        case "TextBox":
            return getTextBoxProps(windowProps.CanvasID, windowProps.WindowCount);
        case "ImageFader":
            return getImageFaderProps(windowProps.CanvasID, windowProps.WindowCount);
        case "ImageSlider":
            return getImageSliderProps(windowProps.CanvasID, windowProps.WindowCount);
        case "MultiLineLabel":
            return getMultiLineLabelProps(windowProps.CanvasID, windowProps.WindowCount);
        case "WordProcessor":
            return getWordProcessorProps(windowProps.CanvasID, windowProps.WindowCount);
    }
}

function registerChildWindow(canvasid, windowid, parentwindowid) {
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].WindowCount == parentwindowid) {
            windows[i].ChildWindowIDs.push(windowid);
            var wprops = getWindowProps(canvasid, windowid);
            if (wprops) {
                wprops.ParentWindowID = parentwindowid;
            }
        }
    }
}

function registerKeyPressFunction(canvasid, func, windowid) {
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].CanvasID == canvasid && windows[i].WindowCount == windowid) {
            keyPressFunctions.push({ CanvasID: canvasid, KeyPressFunction: func, WindowID: windowid });
        }
    }
}

function registerKeyDownFunction(canvasid, func, windowid) {
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].CanvasID == canvasid && windows[i].WindowCount == windowid) {
            keyDownFunctions.push({ CanvasID: canvasid, KeyDownFunction: func, WindowID: windowid });
        }
    }
}

function registerEvent(windowid, eventfunction, canvasId, eventfunctionarray) {
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].CanvasID == canvasId && windows[i].WindowCount == windowid) {
            eventfunctionarray.push([windowid, eventfunction, canvasId]);
        }
    }
}

function registerClickFunction(windowid, clickFunction, canvasId) {
    registerEvent(windowid, clickFunction, canvasId, clickFunctions);
}

function registerDoubleClickFunction(windowid, doubleClickFunction, canvasId) {
    registerEvent(windowid, doubleClickFunction, canvasId, doubleClickFunctions);
}

function registerDragFunction(windowid, dragFunction, canvasId) {
    registerEvent(windowid, dragFunction, canvasId, dragFunctions);
}

function registerDragEndFunction(windowid, dragEndFunction, canvasId) {
    registerEvent(windowid, dragEndFunction, canvasId, dragEndFunctions);
}

function registerDragEnterFunction(windowid, dragEnterFunction, canvasId) {
    registerEvent(windowid, dragEnterFunction, canvasId, dragEnterFunctions);
}

function registerDragLeaveFunction(windowid, dragLeaveFunction, canvasId) {
    registerEvent(windowid, dragLeaveFunction, canvasId, dragLeaveFunctions);
}

function registerDragOverFunction(windowid, dragOverFunction, canvasId) {
    registerEvent(windowid, dragOverFunction, canvasId, dragOverFunctions);
}

function registerDragStartFunction(windowid, dragStartFunction, canvasId) {
    registerEvent(windowid, dragStartFunction, canvasId, dragStartFunctions);
}

function registerDropFunction(windowid, dropFunction, canvasId) {
    registerEvent(windowid, dropFunction, canvasId, dropFunctions);
}

function registerMouseDownFunction(windowid, mouseDownFunction, canvasId) {
    registerEvent(windowid, mouseDownFunction, canvasId, mouseDownFunctions);
}

function registerMouseMoveFunction(windowid, mouseMoveFunction, canvasId) {
    registerEvent(windowid, mouseMoveFunction, canvasId, mouseMoveFunctions);
}

function registerMouseOutFunction(windowid, mouseOutFunction, canvasId) {
    registerEvent(windowid, mouseOutFunction, canvasId, mouseOutFunctions);
}

function registerMouseOverFunction(windowid, mouseOverFunction, canvasId) {
    registerEvent(windowid, mouseOverFunction, canvasId, mouseOverFunctions);
}

function registerMouseUpFunction(windowid, mouseUpFunction, canvasId) {
    registerEvent(windowid, mouseUpFunction, canvasId, mouseUpFunctions);
}

function registerMouseWheelFunction(windowid, mouseWheelFunction, canvasId) {
    registerEvent(windowid, mouseWheelFunction, canvasId, mouseWheelFunctions);
}

function registerScrollFunction(windowid, scrollFunction, canvasId) {
    registerEvent(windowid, scrollFunction, canvasId, scrollFunctions);
}

function registerWindowDrawFunction(windowid, windowDrawFunction, canvasId) {
    registerEvent(windowid, windowDrawFunction, canvasId, windowDrawFunctions);
}

function getWindowDepth(windowid, canvasid) {
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].WindowCount == windowid && windows[i].CanvasID == canvasid) {
            return windows[i].Depth;
        }
    }
}

function setWindowDepth(canvasid, windowid, depth) {
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].WindowCount == windowid && windows[i].CanvasID == canvasid) {
            windows[i].Depth = depth;
            if (depth > highestDepth)
                highestDepth = depth;
            return;
        }
    }
}

function checkIfModalWindow(canvasid, windowid) {
    for (var i = 0; i < modalWindows.length; i++) {
        if(modalWindows[i].CanvasID == canvasid && modalWindows[i].WindowID == windowid){
            return 1;
        }
    }
    return 0;
}

function registerModalWindow(canvasid, windowid) {
    modalWindows.push({ CanvasID: canvasid, WindowID: windowid });
}

function checkIfHiddenWindow(canvasid, windowid) {
    for (var i = 0; i < hiddenWindows.length; i++) {
        if (hiddenWindows[i].CanvasID == canvasid && hiddenWindows[i].WindowID == windowid) {
            return hiddenWindows[i].HiddenStatus;
        }
    }
    return 0;
}

function registerHiddenWindow(canvasid, windowid, status) {
    hiddenWindows.push({ CanvasID: canvasid, WindowID: windowid, HiddenStatus: status });
}

function setHiddenWindowStatus(canvasid, windowid, status) {
    for (var i = 0; i < hiddenWindows.length; i++) {
        if (hiddenWindows[i].HiddenStatus != status && hiddenWindows[i].CanvasID == canvasid && hiddenWindows[i].WindowID == windowid) {
            hiddenWindows[i].HiddenStatus = status;
            /*
            var wprops = getWindowProps(hiddenWindows[i].CanvasID, hiddenWindows[i].WindowID);
            if (wprops) {
                invalidateRect(hiddenWindows[i].CanvasID, null, wprops.X, wprops.Y, wprops.Width, wprops.Height);
            }
            */
        }
    }
}

function registerLostFocusFunction(canvasid, windowid, func) {
    lostFocusFunctions.push([canvasid, windowid, func]);
}

function registerGotFocusFunction(canvasid, windowid, func) {
    gotFocusFunctions.push([canvasid, windowid, func]);
}

function getWindowProps(canvasid, windowid) {
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].CanvasID == canvasid && windows[i].WindowCount == windowid) {
            return windows[i];
        }
    }
}

/*
function draw(canvasId, parentwindowid) {
    if (suspendDraw == 0) {
        var canvas = getCanvas(canvasId);
        if (parentwindowid == null) {
            getCtx(canvasId).clearRect(0, 0, canvas.width, canvas.height);
        }
        for (var d = 0; d <= highestDepth; d++) {
            for (var i = 0; i < windowDrawFunctions.length; i++) {
                var windowProps = getWindowProps(canvasId, windowDrawFunctions[i][0]);
                if (windowProps.ParentWindowID == parentwindowid && checkIfHiddenWindow(canvasId, windowDrawFunctions[i][0]) == 0 &&
                    checkIfModalWindow(canvasId, windowDrawFunctions[i][0]) == 0 &&
                    getWindowDepth(windowDrawFunctions[i][0], windowDrawFunctions[i][2]) == d && windowDrawFunctions[i][2] == canvasId) {
                    var ctx = getCtx(canvasId);
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(windowProps.X, windowProps.Y, windowProps.Width, windowProps.Height);
                    ctx.clip();
                    windowDrawFunctions[i][1](canvasId, windowDrawFunctions[i][0]);
                    if (windowProps.ChildWindowIDs && windowProps.ChildWindowIDs.length > 0) {
                        draw(canvasId, windowDrawFunctions[i][0]);
                    }
                    ctx.restore();
                }
            }
        }
        for (var i = 0; i < windowDrawFunctions.length; i++) {
            var windowProps = getWindowProps(canvasId, windowDrawFunctions[i][0]);
            if (windowProps.ParentWindowID == parentwindowid && checkIfHiddenWindow(canvasId, windowDrawFunctions[i][0]) == 0 &&
                checkIfModalWindow(canvasId, windowDrawFunctions[i][0]) == 1 &&
                windowDrawFunctions[i][2] == canvasId) {
                var ctx = getCtx(canvasId);
                ctx.save();
                ctx.beginPath();
                ctx.rect(windowProps.X, windowProps.Y, windowProps.Width, windowProps.Height);
                ctx.clip();
                windowDrawFunctions[i][1](canvasId, windowDrawFunctions[i][0]);
                if (windowProps.ChildWindowIDs && windowProps.ChildWindowIDs.length > 0) {
                    draw(canvasId, windowDrawFunctions[i][0]);
                }
                ctx.restore();
            }
        }
    }
}
*/

function invalidateRect(canvasId, parentwindowid, x, y, width, height) {
    if (suspendDraw == 0) {
        var canvas = getCanvas(canvasId);
        if (parentwindowid == null) {
            getCtx(canvasId).clearRect(x, y, width, height);
        }
        for (var d = 0; d <= highestDepth; d++) {
            for (var i = 0; i < windowDrawFunctions.length; i++) {
                var windowProps = getWindowProps(canvasId, windowDrawFunctions[i][0]);
                if (windowProps && windowProps.ParentWindowID == parentwindowid && checkIfHiddenWindow(canvasId, windowDrawFunctions[i][0]) == 0 &&
                    checkIfModalWindow(canvasId, windowDrawFunctions[i][0]) == 0 &&
                    getWindowDepth(windowDrawFunctions[i][0], windowDrawFunctions[i][2]) == d && windowDrawFunctions[i][2] == canvasId &&
                    x < windowProps.X + windowProps.Width && x + width > windowProps.X && y < windowProps.Y + windowProps.Height && y + height > windowProps.Y) {
                    var ctx = getCtx(canvasId);
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(windowProps.X, windowProps.Y, windowProps.Width, windowProps.Height);
                    ctx.clip();
                    windowDrawFunctions[i][1](canvasId, windowDrawFunctions[i][0]);
                    if (windowProps.ChildWindowIDs && windowProps.ChildWindowIDs.length > 0) {
                        invalidateRect(canvasId, windowDrawFunctions[i][0], x, y, width, height);
                    }
                    ctx.restore();
                }
            }
        }
        for (var d = 0; d <= highestDepth; d++) {
            for (var i = 0; i < windowDrawFunctions.length; i++) {
                var windowProps = getWindowProps(canvasId, windowDrawFunctions[i][0]);
                if (windowProps && windowProps.ParentWindowID == parentwindowid && checkIfHiddenWindow(canvasId, windowDrawFunctions[i][0]) == 0 &&
                    checkIfModalWindow(canvasId, windowDrawFunctions[i][0]) == 1 &&
                    getWindowDepth(windowDrawFunctions[i][0], windowDrawFunctions[i][2]) == d && windowDrawFunctions[i][2] == canvasId &&
                    x < windowProps.X + windowProps.Width && x + width > windowProps.X && y < windowProps.Y + windowProps.Height && y + height > windowProps.Y) {
                    var ctx = getCtx(canvasId);
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(windowProps.X, windowProps.Y, windowProps.Width, windowProps.Height);
                    ctx.clip();
                    windowDrawFunctions[i][1](canvasId, windowDrawFunctions[i][0]);
                    if (windowProps.ChildWindowIDs && windowProps.ChildWindowIDs.length > 0) {
                        invalidateRect(canvasId, windowDrawFunctions[i][0], x, y, width, height);
                    }
                    ctx.restore();
                }
            }
        }
    }
}

function getCtx(canvasId) {
    for (var i = 0; i < ctxs.length; i++) {
        if (ctxs[i][0] == canvasId) {
            return ctxs[i][1];
        }
    }
}

function getCanvas(canvasId) {
    for (var i = 0; i < canvases.length; i++) {
        if (canvases[i][0] == canvasId) {
            return canvases[i][1];
        }
    }
}

function destroyControl(canvasid, windowid) {
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].CanvasID == canvasid && windows[i].WindowCount == windowid) {
            destroyControlByWindowObj(windows[i]);
        }
    }
}

function destroyControlByNameID(controlNameID) {
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].ControlNameID == controlNameID) {
            destroyControlByWindowObj(windows[i]);
        }
    }
}

function destroyWindow(canvasid, windowid){
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].CanvasID == canvasid && windows[i].WindowCount == windowid) {
            removeEventHooks(windows[i]);
            windows.splice(i, 1);
            unregisterAnimatedWindow(canvasid, windowid);
        }
    }
}

function removeEventFunctions(eventarr, canvasid, windowid) {
    for (var i = eventarr.length - 1; i >= 0; i--) {
        if (eventarr[i][2] == canvasid && eventarr[i][0] == windowid) {
            eventarr.splice(i, 1);
        }
    }
}

function removeEventHooks(w) {
    removeEventFunctions(clickFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(doubleClickFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(dragFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(dragEndFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(dragEnterFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(dragLeaveFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(dragOverFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(dragStartFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(dropFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(mouseDownFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(mouseMoveFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(mouseOutFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(mouseOverFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(mouseUpFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(mouseWheelFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(scrollFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(windowDrawFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(gotFocusFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(lostFocusFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(keyPressFunctions, w.CanvasID, w.WindowCount);
    removeEventFunctions(keyDownFunctions, w.CanvasID, w.WindowCount);
}

function destroyControlByWindowObj(w) {
    for (var i = 0; w.ChildWindowIDs && i < w.ChildWindowIDs.length; i++) {
        for (var x = 0; x < windows.length; x++) {
            if (windows[x].CanvasID == w.CanvasID && windows[x].WindowID == w.ChildWindowIDs[i]) {
                destroyControlByWindowObj(windows[x]);
            }
        }
    }
    switch (w.ControlType) {
        case "Label":
            for (var i = labelPropsArray.length - 1; i >= 0 ; i--) {
                if (labelPropsArray[i].CanvasID == w.CanvasID && labelPropsArray[i].WindowID == w.WindowCount) {
                    labelPropsArray.splice(i, 1);
                }
            }
            break;
        case "Button":
            for (var i = buttonPropsArray.length - 1; i >= 0 ; i--) {
                if (buttonPropsArray[i].CanvasID == w.CanvasID && buttonPropsArray[i].WindowID == w.WindowCount) {
                    buttonPropsArray.splice(i, 1);
                }
            }
            break;
        case "ScrollBar":
            for (var i = scrollBarPropsArray.length - 1; i >= 0 ; i--) {
                if (scrollBarPropsArray[i].CanvasID == w.CanvasID && scrollBarPropsArray[i].WindowID == w.WindowCount) {
                    scrollBarPropsArray.splice(i, 1);
                }
            }
            break;
        case "Grid":
            for (var i = gridPropsArray.length - 1; i >= 0 ; i--) {
                if (gridPropsArray[i].CanvasID == w.CanvasID && gridPropsArray[i].WindowID == w.WindowCount) {
                    gridPropsArray.splice(i, 1);
                }
            }
            break;
        case "ComboBoxTextArea":
            for (var i = comboboxPropsArray.length - 1; i >= 0 ; i--) {
                if (comboboxPropsArray[i].CanvasID == w.CanvasID && comboboxPropsArray[i].WindowID == w.WindowCount) {
                    destroyWindow(w.CanvasID, comboboxPropsArray[i].ButtonWindowID);
                    destroyWindow(w.CanvasID, comboboxPropsArray[i].ListAreaWindowID);
                    comboboxPropsArray.splice(i, 1);
                }
            }
            break;
        case "CheckBox":
            for (var i = checkboxPropsArray.length - 1; i >= 0 ; i--) {
                if (checkboxPropsArray[i].CanvasID == w.CanvasID && checkboxPropsArray[i].WindowID == w.WindowCount) {
                    checkboxPropsArray.splice(i, 1);
                }
            }
            break;
        case "RadioButtonGroup":
            for (var i = radiobuttonPropsArray.length - 1; i >= 0 ; i--) {
                if (radiobuttonPropsArray[i].CanvasID == w.CanvasID && radiobuttonPropsArray[i].WindowID == w.WindowCount) {
                    radiobuttonPropsArray.splice(i, 1);
                }
            }
            break;
        case "Image":
            for (var i = imageControlPropsArray.length - 1; i >= 0 ; i--) {
                if (imageControlPropsArray[i].CanvasID == w.CanvasID && imageControlPropsArray[i].WindowID == w.WindowCount) {
                    imageControlPropsArray.splice(i, 1);
                }
            }
            break;
        case "TreeView":
            for (var i = treeViewPropsArray.length - 1; i >= 0 ; i--) {
                if (treeViewPropsArray[i].CanvasID == w.CanvasID && treeViewPropsArray[i].WindowID == w.WindowCount) {
                    treeViewPropsArray.splice(i, 1);
                }
            }
            break;
        case "Calender":
            for (var i = calenderPropsArray.length - 1; i >= 0 ; i--) {
                if (calenderPropsArray[i].CanvasID == w.CanvasID && calenderPropsArray[i].WindowID == w.WindowCount) {
                    calenderPropsArray.splice(i, 1);
                }
            }
            break;
        case "ProgressBar":
            for (var i = progressBarPropsArray.length - 1; i >= 0 ; i--) {
                if (progressBarPropsArray[i].CanvasID == w.CanvasID && progressBarPropsArray[i].WindowID == w.WindowCount) {
                    progressBarPropsArray.splice(i, 1);
                }
            }
            break;
        case "Slider":
            for (var i = sliderPropsArray.length - 1; i >= 0 ; i--) {
                if (sliderPropsArray[i].CanvasID == w.CanvasID && sliderPropsArray[i].WindowID == w.WindowCount) {
                    sliderPropsArray.splice(i, 1);
                }
            }
            break;
        case "DatePickerTextArea":
            for (var i = datePickerPropsArray.length - 1; i >= 0 ; i--) {
                if (datePickerPropsArray[i].CanvasID == w.CanvasID && datePickerPropsArray[i].WindowID == w.WindowCount) {
                    destroyWindow(w.CanvasID, datePickerPropsArray[i].ButtonWindowID);
                    destroyControl(w.CanvasID, datePickerPropsArray[i].CalenderWindowID);
                    datePickerPropsArray.splice(i, 1);
                }
            }
            break;
        case "Panel":
            for (var i = panelPropsArray.length - 1; i >= 0 ; i--) {
                if (panelPropsArray[i].CanvasID == w.CanvasID && panelPropsArray[i].WindowID == w.WindowCount) {
                    panelPropsArray.splice(i, 1);
                }
            }
            break;
        case "BarGraph":
            for (var i = barGraphsPropsArray.length - 1; i >= 0 ; i--) {
                if (barGraphsPropsArray[i].CanvasID == w.CanvasID && barGraphsPropsArray[i].WindowID == w.WindowCount) {
                    barGraphsPropsArray.splice(i, 1);
                }
            }
            break;
        case "PieChart":
            for (var i = pieChartsPropsArray.length - 1; i >= 0 ; i--) {
                if (pieChartsPropsArray[i].CanvasID == w.CanvasID && pieChartsPropsArray[i].WindowID == w.WindowCount) {
                    pieChartsPropsArray.splice(i, 1);
                }
            }
            break;
        case "LineGraph":
            for (var i = lineGraphsPropsArray.length - 1; i >= 0 ; i--) {
                if (lineGraphsPropsArray[i].CanvasID == w.CanvasID && lineGraphsPropsArray[i].WindowID == w.WindowCount) {
                    lineGraphsPropsArray.splice(i, 1);
                }
            }
            break;
        case "Gauge":
            for (var i = gaugeChartPropsArray.length - 1; i >= 0 ; i--) {
                if (gaugeChartPropsArray[i].CanvasID == w.CanvasID && gaugeChartPropsArray[i].WindowID == w.WindowCount) {
                    gaugeChartPropsArray.splice(i, 1);
                }
            }
            break;
        case "RadarGraph":
            for (var i = radarGraphPropsArray.length - 1; i >= 0 ; i--) {
                if (radarGraphPropsArray[i].CanvasID == w.CanvasID && radarGraphPropsArray[i].WindowID == w.WindowCount) {
                    radarGraphPropsArray.splice(i, 1);
                }
            }
            break;
        case "LineAreaGraph":
            for (var i = lineAreaGraphPropsArray.length - 1; i >= 0 ; i--) {
                if (lineAreaGraphPropsArray[i].CanvasID == w.CanvasID && lineAreaGraphPropsArray[i].WindowID == w.WindowCount) {
                    lineAreaGraphPropsArray.splice(i, 1);
                }
            }
            break;
        case "CandlesticksGraph":
            for (var i = candlesticksGraphPropsArray.length - 1; i >= 0 ; i--) {
                if (candlesticksGraphPropsArray[i].CanvasID == w.CanvasID && candlesticksGraphPropsArray[i].WindowID == w.WindowCount) {
                    candlesticksGraphPropsArray.splice(i, 1);
                }
            }
            break;
        case "DoughnutChart":
            for (var i = doughnutChartPropsArray.length - 1; i >= 0 ; i--) {
                if (doughnutChartPropsArray[i].CanvasID == w.CanvasID && doughnutChartPropsArray[i].WindowID == w.WindowCount) {
                    doughnutChartPropsArray.splice(i, 1);
                }
            }
            break;
        case "BarsMixedWithLabeledLineGraph":
            for (var i = barsMixedWithLabledLineGraphsPropsArray.length - 1; i >= 0 ; i--) {
                if (barsMixedWithLabledLineGraphsPropsArray[i].CanvasID == w.CanvasID && barsMixedWithLabledLineGraphsPropsArray[i].WindowID == w.WindowCount) {
                    barsMixedWithLabledLineGraphsPropsArray.splice(i, 1);
                }
            }
            break;
        case "StackedBarGraph":
            for (var i = stackedBarGraphPropsArray.length - 1; i >= 0 ; i--) {
                if (stackedBarGraphPropsArray[i].CanvasID == w.CanvasID && stackedBarGraphPropsArray[i].WindowID == w.WindowCount) {
                    stackedBarGraphPropsArray.splice(i, 1);
                }
            }
            break;
        case "Tab":
            for (var i = tabPropsArray.length - 1; i >= 0 ; i--) {
                if (tabPropsArray[i].CanvasID == w.CanvasID && tabPropsArray[i].WindowID == w.WindowCount) {
                    tabPropsArray.splice(i, 1);
                }
            }
            break;
        case "ImageMap":
            for (var i = imageMapPropsArray.length - 1; i >= 0 ; i--) {
                if (imageMapPropsArray[i].CanvasID == w.CanvasID && imageMapPropsArray[i].WindowID == w.WindowCount) {
                    imageMapPropsArray.splice(i, 1);
                }
            }
            break;
        case "SubMenu":
            for (var i = subMenuBarPropsArray.length - 1; i >= 0 ; i--) {
                if (subMenuBarPropsArray[i].CanvasID == w.CanvasID && subMenuBarPropsArray[i].WindowID == w.WindowCount) {
                    for (var y = 0; y < subMenuBarPropsArray[i].ChildMenuWindowIDs.length; y++) {
                        destroyControl(w.CanvasID, subMenuBarPropsArray[i].ChildMenuWindowIDs[y]);
                    }
                    subMenuBarPropsArray.splice(i, 1);
                }
            }
            break;
        case "MenuBar":
            for (var i = menuBarPropsArray.length - 1; i >= 0 ; i--) {
                if (menuBarPropsArray[i].CanvasID == w.CanvasID && menuBarPropsArray[i].WindowID == w.WindowCount) {
                    for (var y = 0; y < menuBarPropsArray[i].ChildMenuWindowIDs.length; y++) {
                        destroyControl(w.CanvasID, menuBarPropsArray[i].ChildMenuWindowIDs[y]);
                    }
                    menuBarPropsArray.splice(i, 1);
                }
            }
            break;
        case "TextBox":
            for (var i = textBoxPropsArray.length - 1; i >= 0 ; i--) {
                if (textBoxPropsArray[i].CanvasID == w.CanvasID && textBoxPropsArray[i].WindowID == w.WindowCount) {
                    textBoxPropsArray.splice(i, 1);
                }
            }
            break;
        case "ImageFader":
            for (var i = imageFaderPropsArray.length - 1; i >= 0 ; i--) {
                if (imageFaderPropsArray[i].CanvasID == w.CanvasID && imageFaderPropsArray[i].WindowID == w.WindowCount) {
                    imageFaderPropsArray.splice(i, 1);
                }
            }
            break;
        case "ImageSlider":
            for (var i = imageSliderPropsArray.length - 1; i >= 0 ; i--) {
                if (imageSliderPropsArray[i].CanvasID == w.CanvasID && imageSliderPropsArray[i].WindowID == w.WindowCount) {
                    imageSliderPropsArray.splice(i, 1);
                }
            }
            break;
        case "MultiLineLabel":
            for (var i = multiLineLabelPropsArray.length - 1; i >= 0 ; i--) {
                if (multiLineLabelPropsArray[i].CanvasID == w.CanvasID && multiLineLabelPropsArray[i].WindowID == w.WindowCount) {
                    multiLineLabelPropsArray.splice(i, 1);
                }
            }
            break;
        case "WordProcessor":
            for (var i = wordProcessorPropsArray.length - 1; i >= 0 ; i--) {
                if (wordProcessorPropsArray[i].CanvasID == w.CanvasID && wordProcessorPropsArray[i].WindowID == w.WindowCount) {
                    wordProcessorPropsArray.splice(i, 1);
                }
            }
            break;
        case "VirtualKeyboard":
            for (var i = virtualKeyboardPropsArray.length - 1; i >= 0 ; i--) {
                if (virtualKeyboardPropsArray[i].CanvasID == w.CanvasID && virtualKeyboardPropsArray[i].WindowID == w.WindowCount) {
                    virtualKeyboardPropsArray.splice(i, 1);
                }
            }
            break;
        case "Splitter":
            for (var i = splitterPropsArray.length - 1; i >= 0 ; i--) {
                if (splitterPropsArray[i].CanvasID == w.CanvasID && splitterPropsArray[i].WindowID == w.WindowCount) {
                    splitterPropsArray.splice(i, 1);
                }
            }
            break;
    }
    destroyWindow(w.CanvasID, w.WindowCount);
}

function getWindowByControlNameID(controlNameID) {
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].ControlNameID == controlNameID) {
            return windows[i];
        }
    }
}

//Code for labels starts here
var labelPropsArray = new Array();

function getLabelProps(canvasid, windowid) {
    for (var i = 0; i < labelPropsArray.length; i++) {
        if (labelPropsArray[i].CanvasID == canvasid && labelPropsArray[i].WindowID == windowid) {
            return labelPropsArray[i];
        }
    }
}

function createLabel(canvasid, controlNameId, x, y, width, height, text, textColor, textHeight, textFontString, drawFunction, depth,
    alignment, clickFunction, backgroundColor, autoAdjustWidth, tag, isHyperlink, url, nobrowserhistory, isnewbrowserwindow,
    nameofnewbrowserwindow, widthofnewbrowserwindow, heightofnewbrowserwindow, newbrowserwindowisresizable, newbrowserwindowhasscrollbars,
    newbrowserwindowhastoolbar, newbrowserwindowhaslocationorurloraddressbox, newbroserwindowhasdirectoriesorextrabuttons,
    newbrowserwindowhasstatusbar, newbrowserwindowhasmenubar, newbrowserwindowcopyhistory) {
    if (autoAdjustWidth == 1) {
        var ctx = getCtx(canvasid);
        ctx.font = textFontString;
        width = ctx.measureText(text).width;
    }
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'Label', controlNameId);
    labelPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Text: text,
        TextHeight: textHeight, TextFontString: textFontString, TextColor: textColor, IsHyperlink: isHyperlink, URL: url,
        NoBrowserHistory: nobrowserhistory, IsNewBrowserWindow: isnewbrowserwindow,
        NameOfNewBrowserWindow: nameofnewbrowserwindow, WidthOfNewBrowserWindow: widthofnewbrowserwindow,
        HeightOfNewBrowserWindow: heightofnewbrowserwindow, NewBrowserWindowIsResizable: newbrowserwindowisresizable,
        NewBrowserWindowHasScrollBars: newbrowserwindowhasscrollbars, NewBrowserWindowHasToolbar: newbrowserwindowhastoolbar,
        NewBrowserWindowHasLocationOrURLOrAddressBox: newbrowserwindowhaslocationorurloraddressbox,
        NewBrowserWindowHasDirectoriesOrExtraButtons: newbroserwindowhasdirectoriesorextrabuttons,
        NewBrowserWindowHasStatusBar: newbrowserwindowhasstatusbar, NewBrowserWindowHasMenuBar: newbrowserwindowhasmenubar,
        NewBrowserWindowCopyHistory: newbrowserwindowcopyhistory, DrawFunction: drawFunction, Alignment: alignment,
        ClickFunction: clickFunction, BackGroundColor: backgroundColor, Tag: tag
    });
    if (drawFunction != undefined && drawFunction != null)
        registerWindowDrawFunction(windowid, function (canvasid1, windowid1) { var lp = getLabelProps(canvasid1, windowid1); lp.DrawFunction(canvasid1, windowid1); }, canvasid);
    else
        registerWindowDrawFunction(windowid, function () {
            var ctx = getCtx(canvasid);
            var labelProps = getLabelProps(canvasid, windowid);
            ctx.font = labelProps.TextFontString;
            if (labelProps.BackGroundColor) {
                ctx.fillStyle = labelProps.BackGroundColor;
                ctx.beginPath();
                ctx.rect(labelProps.X, labelProps.Y, labelProps.Width, labelProps.Height);
                ctx.fill();
            }
            ctx.fillStyle = labelProps.TextColor;
            ctx.fillText(labelProps.Text, labelProps.X + (labelProps.Alignment == 'center' ? ((labelProps.Width - ctx.measureText(labelProps.Text).width) / 2) : 0), labelProps.Y + labelProps.Height - ((labelProps.Height - labelProps.TextHeight) / 2));
        }, canvasid);
    if (clickFunction != null) {
        registerClickFunction(windowid, clickFunction, canvasid);
    } else if (isHyperlink == 1) {
        registerClickFunction(windowid, function () {
            if (isnewbrowserwindow == 1) {
                var str = '';
                var wroteone = 0;
                if (widthofnewbrowserwindow != null) {
                    str += 'width=' + widthofnewbrowserwindow;
                    wroteone = 1;
                }
                if (heightofnewbrowserwindow != null) {
                    str += (wroteone == 1 ? ',' : '') + 'height=' + heightofnewbrowserwindow;
                }
                if (newbrowserwindowisresizable != null) {
                    str += (wroteone == 1 ? ',' : '') + 'resizable=' + newbrowserwindowisresizable;
                }
                if (newbrowserwindowhasscrollbars != null) {
                    str += (wroteone == 1 ? ',' : '') + 'scrollbars=' + newbrowserwindowhasscrollbars;
                }
                if (newbrowserwindowhastoolbar != null) {
                    str += (wroteone == 1 ? ',' : '') + 'toolbar=' + newbrowserwindowhastoolbar;
                }
                if (newbrowserwindowhaslocationorurloraddressbox != null) {
                    str += (wroteone == 1 ? ',' : '') + 'location=' + newbrowserwindowhaslocationorurloraddressbox;
                }
                if (newbroserwindowhasdirectoriesorextrabuttons != null) {
                    str += (wroteone == 1 ? ',' : '') + 'directories=' + newbroserwindowhasdirectoriesorextrabuttons;
                }
                if (newbrowserwindowhasstatusbar != null) {
                    str += (wroteone == 1 ? ',' : '') + 'status=' + newbrowserwindowhasstatusbar;
                }
                if (newbrowserwindowhasmenubar != null) {
                    str += (wroteone == 1 ? ',' : '') + 'menubar=' + newbrowserwindowhasmenubar;
                }
                if (newbrowserwindowcopyhistory != null) {
                    str += (wroteone == 1 ? ',' : '') + 'copyhistory=' + newbrowserwindowcopyhistory;
                }
                window.open(url, nameofnewbrowserwindow, str);
            } else {
                if (nobrowserhistory == 1) {
                    window.location.replace(url);
                } else {
                    window.location.href = url;
                }
            }
        }, canvasid);
    }
    return windowid;
}

//Code for Buttons starts here
var buttonPropsArray = new Array();

function getButtonProps(canvasid, windowid) {
    for (var i = 0; i < buttonPropsArray.length; i++) {
        if (buttonPropsArray[i].CanvasID == canvasid && buttonPropsArray[i].WindowID == windowid) {
            return buttonPropsArray[i];
        }
    }
}

function defaultButtonDrawFunction(canvasid, windowid) {
    var buttonOffsetX = 0;
    var buttonOffsetY = 0;
    var ctx = getCtx(canvasid);
    ctx.save();
    var buttonProps = getButtonProps(canvasid, windowid);
    if (buttonProps.IsPressed == 1) {
        buttonProps.IsPressed = 0;
        buttonOffsetX = 5;
        buttonOffsetY = 5;
    }
    if (buttonProps.Theme == 1) {
        ctx.beginPath();
        ctx.moveTo(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius,
            buttonProps.EdgeRadius, Math.PI, (Math.PI / 180) * 270, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y +
            buttonProps.EdgeRadius, buttonProps.EdgeRadius, (Math.PI / 180) * 270, Math.PI * 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width, buttonOffsetY + buttonProps.Y + buttonProps.Height - buttonProps.EdgeRadius);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y +
            buttonProps.Height - buttonProps.EdgeRadius, buttonProps.EdgeRadius, 0, Math.PI / 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y + buttonProps.Height);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y + buttonProps.Height -
            buttonProps.EdgeRadius, buttonProps.EdgeRadius, Math.PI / 2, Math.PI, false);
        ctx.closePath();
        var g = ctx.createLinearGradient(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y, buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + buttonProps.Height);
        g.addColorStop(0, '#536fa0');
        g.addColorStop(1, '#274580');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = '#1f3a73';
        ctx.stroke();
        g = ctx.createLinearGradient(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + ((buttonProps.Height - buttonProps.TextHeight) / 2), buttonOffsetX + buttonProps.X,
            buttonOffsetY + buttonProps.Y - ((buttonProps.Height - buttonProps.TextHeight) / 2) + buttonProps.Height);
        g.addColorStop(0, '#fafbfc');
        g.addColorStop(1, '#dde2ea');
        ctx.fillStyle = g;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#636e7f';
        ctx.font = buttonProps.TextFontString;
        ctx.fillText(buttonProps.Text, buttonOffsetX + buttonProps.X + ((buttonProps.Width - ctx.measureText(buttonProps.Text).width) / 2),
            buttonOffsetY + buttonProps.Y + buttonProps.Height - ((buttonProps.Height - buttonProps.TextHeight) / 2));
    } else if (buttonProps.Theme == 2) {
        var g = ctx.createLinearGradient(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y, buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + buttonProps.Height);
        g.addColorStop(0, '#7888ff');
        g.addColorStop(1, '#d0d3fe');
        ctx.shadowBlur = 5;
        ctx.shadowColor = g;
        ctx.beginPath();
        ctx.moveTo(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius,
            buttonProps.EdgeRadius, Math.PI, (Math.PI / 180) * 270, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 5, buttonOffsetY + buttonProps.Y);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 5, buttonOffsetY + buttonProps.Y +
            buttonProps.EdgeRadius, buttonProps.EdgeRadius, (Math.PI / 180) * 270, Math.PI * 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width - 5, buttonOffsetY + buttonProps.Y + buttonProps.Height - buttonProps.EdgeRadius - 5);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 5, buttonOffsetY + buttonProps.Y +
            buttonProps.Height - buttonProps.EdgeRadius - 5, buttonProps.EdgeRadius, 0, Math.PI / 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y + buttonProps.Height - 5);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y + buttonProps.Height -
            buttonProps.EdgeRadius - 5, buttonProps.EdgeRadius, Math.PI / 2, Math.PI, false);
        ctx.closePath();
        g = ctx.createLinearGradient(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + 9, buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + buttonProps.Height - 9);
        g.addColorStop(0, '#7a83c6');
        g.addColorStop(1, '#5787dc');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(buttonOffsetX + buttonProps.X + 1, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius + 1);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius + 1, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius + 1,
            buttonProps.EdgeRadius, Math.PI, (Math.PI / 180) * 270, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 6, buttonOffsetY + buttonProps.Y + 1);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 6, buttonOffsetY + buttonProps.Y +
            buttonProps.EdgeRadius + 1, buttonProps.EdgeRadius, (Math.PI / 180) * 270, Math.PI * 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width - 6, buttonOffsetY + buttonProps.Y + buttonProps.Height - buttonProps.EdgeRadius - 6);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 6, buttonOffsetY + buttonProps.Y +
            buttonProps.Height - buttonProps.EdgeRadius - 6, buttonProps.EdgeRadius, 0, Math.PI / 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius + 1, buttonOffsetY + buttonProps.Y + buttonProps.Height - 6);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius + 1, buttonOffsetY + buttonProps.Y + buttonProps.Height -
            buttonProps.EdgeRadius - 6, buttonProps.EdgeRadius, Math.PI / 2, Math.PI, false);
        ctx.closePath();
        g = ctx.createLinearGradient(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + 1, buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + buttonProps.Height - 6);
        g.addColorStop(0, '#a0abe9');
        g.addColorStop(1, '#80b2fb');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(buttonOffsetX + buttonProps.X + 2, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius + 2);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius + 2, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius + 2,
            buttonProps.EdgeRadius, Math.PI, (Math.PI / 180) * 270, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 7, buttonOffsetY + buttonProps.Y + 2);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 7, buttonOffsetY + buttonProps.Y +
            buttonProps.EdgeRadius + 2, buttonProps.EdgeRadius, (Math.PI / 180) * 270, Math.PI * 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width - 7, buttonOffsetY + buttonProps.Y + buttonProps.Height - buttonProps.EdgeRadius - 7);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 7, buttonOffsetY + buttonProps.Y +
            buttonProps.Height - buttonProps.EdgeRadius - 7, buttonProps.EdgeRadius, 0, Math.PI / 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius + 2, buttonOffsetY + buttonProps.Y + buttonProps.Height - 7);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius + 2, buttonOffsetY + buttonProps.Y + buttonProps.Height -
            buttonProps.EdgeRadius - 7, buttonProps.EdgeRadius, Math.PI / 2, Math.PI, false);
        ctx.closePath();
        g = ctx.createLinearGradient(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + 2, buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + buttonProps.Height - 7);
        g.addColorStop(0, '#99a4e4');
        g.addColorStop(1, '#4c7ce2');
        ctx.fillStyle = g;
        ctx.fill();
        g = ctx.createLinearGradient(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + ((buttonProps.Height - buttonProps.TextHeight) / 2), buttonOffsetX + buttonProps.X,
            buttonOffsetY + buttonProps.Y - ((buttonProps.Height - buttonProps.TextHeight) / 2) + buttonProps.Height);
        g.addColorStop(0, '#fafbfc');
        g.addColorStop(1, '#dde2ea');
        ctx.fillStyle = g;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#636e7f';
        ctx.font = buttonProps.TextFontString;
        ctx.fillText(buttonProps.Text, buttonOffsetX + buttonProps.X + ((buttonProps.Width - ctx.measureText(buttonProps.Text).width - 5) / 2),
            buttonOffsetY + buttonProps.Y + buttonProps.Height - 5 - ((buttonProps.Height - buttonProps.TextHeight - 5) / 2));
    } else {
        ctx.beginPath();
        ctx.moveTo(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius,
            buttonProps.EdgeRadius, Math.PI, (Math.PI / 180) * 270, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y +
            buttonProps.EdgeRadius, buttonProps.EdgeRadius, (Math.PI / 180) * 270, Math.PI * 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width, buttonOffsetY + buttonProps.Y + buttonProps.Height - buttonProps.EdgeRadius);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y +
            buttonProps.Height - buttonProps.EdgeRadius, buttonProps.EdgeRadius, 0, Math.PI / 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y + buttonProps.Height);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y + buttonProps.Height -
            buttonProps.EdgeRadius, buttonProps.EdgeRadius, Math.PI / 2, Math.PI, false);
        ctx.closePath();
        ctx.fillStyle = buttonProps.BorderColor;
        ctx.fill();
        var g1 = ctx.createLinearGradient(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y, buttonOffsetX +
            buttonProps.X, buttonOffsetY + buttonProps.Y + buttonProps.Height);
        g1.addColorStop(0, buttonProps.TopColorStart);
        g1.addColorStop(1, buttonProps.TopColorEnd);
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.rect(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius,
            buttonProps.Width - (2 * buttonProps.EdgeRadius), (buttonProps.Height / 2) - buttonProps.EdgeRadius);
        ctx.fill();
        var g2 = ctx.createLinearGradient(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y, buttonOffsetX +
            buttonProps.X, buttonOffsetY + buttonProps.Y + buttonProps.Height);
        g2.addColorStop(0, buttonProps.BottomColorStart);
        g2.addColorStop(1, buttonProps.BottomColorEnd);
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.rect(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius, buttonOffsetY + buttonProps.Y + (buttonProps.Height / 2),
            buttonProps.Width - (2 * buttonProps.EdgeRadius), (buttonProps.Height / 2) - buttonProps.EdgeRadius);
        ctx.fill();
        ctx.font = buttonProps.TextFontString;
        ctx.fillStyle = buttonProps.TextColor;
        ctx.fillText(buttonProps.Text, buttonOffsetX + buttonProps.X + ((buttonProps.Width - ctx.measureText(buttonProps.Text).width) / 2),
            buttonOffsetY + buttonProps.Y + buttonProps.Height - ((buttonProps.Height - buttonProps.TextHeight) / 2));
    }
    if (buttonProps.HasGloss == 1) {
        ctx.beginPath();
        ctx.moveTo(buttonOffsetX + buttonProps.X + 2, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius + 2);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius + 2, buttonOffsetY + buttonProps.Y + buttonProps.EdgeRadius + 2,
            buttonProps.EdgeRadius, Math.PI, (Math.PI / 180) * 270, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 2, buttonOffsetY + buttonProps.Y + 2);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 2, buttonOffsetY + buttonProps.Y +
            buttonProps.EdgeRadius + 2, buttonProps.EdgeRadius, (Math.PI / 180) * 270, Math.PI * 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.Width - 2, buttonOffsetY + buttonProps.Y + ((buttonProps.Height - 4) / 2) - buttonProps.EdgeRadius + 2);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.Width - buttonProps.EdgeRadius - 2, buttonOffsetY + buttonProps.Y +
            ((buttonProps.Height - 4) / 2) - buttonProps.EdgeRadius + 2, buttonProps.EdgeRadius, 0, Math.PI / 2, false);
        ctx.lineTo(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius + 2, buttonOffsetY + buttonProps.Y + ((buttonProps.Height - 4) / 2) + 2);
        ctx.arc(buttonOffsetX + buttonProps.X + buttonProps.EdgeRadius + 2, buttonOffsetY + buttonProps.Y + ((buttonProps.Height - 4) / 2) -
            buttonProps.EdgeRadius + 2, buttonProps.EdgeRadius, Math.PI / 2, Math.PI, false);
        ctx.closePath();
        var g = ctx.createLinearGradient(buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + 2, buttonOffsetX + buttonProps.X, buttonOffsetY + buttonProps.Y + ((buttonProps.Height - 4) / 2) + 5);
        g.addColorStop(0, 'rgba(255,255,255,0.4)');
        g.addColorStop(1, 'rgba(255,255,255,0.05)');
        ctx.fillStyle = g;
        ctx.fill();
    }
    ctx.restore();
}

function createButton(canvasid, controlNameId, x, y, width, height, text, textColor, textHeight, textFontString, edgeRadius, depth, theme, hasgloss, clickFunction,
    drawFunction, bottomColorStart, bottomColorEnd, topColorStart, topColorEnd, borderColor, tag, isHyperlink, url, nobrowserhistory, isnewbrowserwindow,
    nameofnewbrowserwindow, widthofnewbrowserwindow, heightofnewbrowserwindow, newbrowserwindowisresizable, newbrowserwindowhasscrollbars,
    newbrowserwindowhastoolbar, newbrowserwindowhaslocationorurloraddressbox, newbroserwindowhasdirectoriesorextrabuttons,
    newbrowserwindowhasstatusbar, newbrowserwindowhasmenubar, newbrowserwindowcopyhistory) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'Button', controlNameId);
    buttonPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Text: text,
        EdgeRadius: edgeRadius, BottomColorStart: bottomColorStart, BottomColorEnd: bottomColorEnd, 
        TopColorStart: topColorStart, TopColorEnd: topColorEnd, TextHeight: textHeight, TextFontString: textFontString,
        TextColor: textColor, IsPressed: 0, BorderColor: borderColor, IsHyperlink: isHyperlink, URL: url, 
        NoBrowserHistory: nobrowserhistory, IsNewBrowserWindow: isnewbrowserwindow,
        NameOfNewBrowserWindow: nameofnewbrowserwindow, WidthOfNewBrowserWindow: widthofnewbrowserwindow, 
        HeightOfNewBrowserWindow: heightofnewbrowserwindow, NewBrowserWindowIsResizable: newbrowserwindowisresizable, 
        NewBrowserWindowHasScrollBars: newbrowserwindowhasscrollbars, NewBrowserWindowHasToolbar: newbrowserwindowhastoolbar, 
        NewBrowserWindowHasLocationOrURLOrAddressBox: newbrowserwindowhaslocationorurloraddressbox, 
        NewBrowserWindowHasDirectoriesOrExtraButtons: newbroserwindowhasdirectoriesorextrabuttons,
        NewBrowserWindowHasStatusBar: newbrowserwindowhasstatusbar, NewBrowserWindowHasMenuBar: newbrowserwindowhasmenubar, 
        NewBrowserWindowCopyHistory: newbrowserwindowcopyhistory, Tag: tag, Theme: theme, HasGloss: hasgloss
    });
    registerClickFunction(windowid, function () {
        if (isHyperlink == 1) {
            if(isnewbrowserwindow == 1){
                var str = '';
                var wroteone = 0;
                if (widthofnewbrowserwindow != null) {
                    str += 'width=' + widthofnewbrowserwindow;
                    wroteone = 1;
                }
                if (heightofnewbrowserwindow != null) {
                    str += (wroteone == 1 ? ',' : '') + 'height=' + heightofnewbrowserwindow;
                }
                if (newbrowserwindowisresizable != null) {
                    str += (wroteone == 1 ? ',' : '') + 'resizable=' + newbrowserwindowisresizable;
                }
                if (newbrowserwindowhasscrollbars != null) {
                    str += (wroteone == 1 ? ',' : '') + 'scrollbars=' + newbrowserwindowhasscrollbars;
                }
                if (newbrowserwindowhastoolbar != null) {
                    str += (wroteone == 1 ? ',' : '') + 'toolbar=' + newbrowserwindowhastoolbar;
                }
                if (newbrowserwindowhaslocationorurloraddressbox != null) {
                    str += (wroteone == 1 ? ',' : '') + 'location=' + newbrowserwindowhaslocationorurloraddressbox;
                }
                if (newbroserwindowhasdirectoriesorextrabuttons != null) {
                    str += (wroteone == 1 ? ',' : '') + 'directories=' + newbroserwindowhasdirectoriesorextrabuttons;
                }
                if (newbrowserwindowhasstatusbar != null) {
                    str += (wroteone == 1 ? ',' : '') + 'status=' + newbrowserwindowhasstatusbar;
                }
                if (newbrowserwindowhasmenubar != null) {
                    str += (wroteone == 1 ? ',' : '') + 'menubar=' + newbrowserwindowhasmenubar;
                }
                if (newbrowserwindowcopyhistory != null) {
                    str += (wroteone == 1 ? ',' : '') + 'copyhistory=' + newbrowserwindowcopyhistory;
                }
                window.open(url, (navigator.userAgent.toLowerCase().indexOf('msie') == -1 ? nameofnewbrowserwindow : nameofnewbrowserwindow.replace(/ /g,'')), str);
            } else{
                if (nobrowserhistory == 1) {
                    window.location.replace(url);
                } else {
                    window.location.href = url;
                }
            }
        } else {
            getButtonProps(canvasid, windowid).IsPressed = 0;
            clickFunction(canvasid, windowid);
        }
    }, canvasid);
    registerMouseDownFunction(windowid, function (canvasid, windowid) { getButtonProps(canvasid, windowid).IsPressed = 1; }, canvasid);
    registerMouseUpFunction(canvasid, function (canvasid, windowid) { getButtonProps(canvasid, windowid).IsPressed = 0; }, canvasid);
    if (drawFunction != undefined && drawFunction != null)
        registerWindowDrawFunction(windowid, function () { drawFunction(canvasid, windowid); }, canvasid);
    else
        registerWindowDrawFunction(windowid, function () { defaultButtonDrawFunction(canvasid, windowid); }, canvasid);
    return windowid;
}

//Code for Scrollbar
var scrollBarPropsArray = new Array();

function getScrollBarProps(canvasid, windowid) {
    for (var i = 0; i < scrollBarPropsArray.length; i++) {
        if (scrollBarPropsArray[i].CanvasID == canvasid && scrollBarPropsArray[i].WindowID == windowid) {
            return scrollBarPropsArray[i];
        }
    }
}

function drawScrollBar(canvasid, windowid) {
    var scrollBarProps = getScrollBarProps(canvasid, windowid);
    var x = scrollBarProps.X, y = scrollBarProps.Y, len = scrollBarProps.Len, maxitems = (scrollBarProps.MaxItems == 0 ? 1 : scrollBarProps.MaxItems), selindex = scrollBarProps.SelectedID;
    var ctx = getCtx(canvasid);
    if (scrollBarProps.Alignment == 1) {
        ctx.clearRect(scrollBarProps.X, scrollBarProps.Y, 15, scrollBarProps.Len);
        var g = ctx.createLinearGradient(x, y, x + 15, y);
        g.addColorStop(0, '#e3e3e3');
        g.addColorStop(0.5, '#ededed');
        g.addColorStop(1, '#e5e5e5');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.rect(x, y, 15, len);
        ctx.fill();
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#3c7fb1';
        ctx.beginPath();
        ctx.rect(x, y, 15, 15);
        ctx.stroke();
        ctx.fillStyle = '#dcf0fb';
        ctx.beginPath();
        ctx.rect(x + 1, y + 1, 6, 13);
        ctx.fill();
        ctx.fillStyle = '#a7d8f3';
        ctx.beginPath();
        ctx.rect(x + 8, y + 1, 6, 13);
        ctx.fill();
        ctx.strokeStyle = '#c0e4f8';
        ctx.beginPath();
        ctx.moveTo(x + 7, y + 1);
        ctx.lineTo(x + 7, y + 14);
        ctx.stroke();
        var g = ctx.createLinearGradient(x + 7, y + 6, x + 7, y + 10);
        g.addColorStop(0, '#4e9ac4');
        g.addColorStop(1, '#0d2a3a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 6);
        ctx.lineTo(x + 11, y + 10);
        ctx.lineTo(x + 4, y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#3c7fb1';
        ctx.beginPath();
        ctx.rect(x, y + len - 15, 15, 15);
        ctx.stroke();
        ctx.fillStyle = '#dcf0fb';
        ctx.beginPath();
        ctx.rect(x + 1, y + len - 15 + 1, 6, 13);
        ctx.fill();
        ctx.fillStyle = '#a7d8f3';
        ctx.beginPath();
        ctx.rect(x + 8, y + len - 15 + 1, 6, 13);
        ctx.fill();
        ctx.strokeStyle = '#c0e4f8';
        ctx.beginPath();
        ctx.moveTo(x + 7, y + len - 15 + 1);
        ctx.lineTo(x + 7, y + len - 15 + 14);
        ctx.stroke();
        var g = ctx.createLinearGradient(x + 7, y + len - 15 + 6, x + 7, y + len - 15 + 10);
        g.addColorStop(0, '#0d2a3a');
        g.addColorStop(1, '#4e9ac4');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + len - 15 + 6);
        ctx.lineTo(x + 11, y + len - 15 + 6);
        ctx.lineTo(x + 7, y + len - 15 + 10);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#15598a';
        ctx.beginPath();
        ctx.rect(x, y + ((selindex * (len - 55)) / maxitems) + 16, 15, 25);
        ctx.stroke();
        ctx.fillStyle = '#6ac1e5';
        ctx.beginPath();
        ctx.rect(x + 8, y + ((selindex * (len - 55)) / maxitems) + 16 + 1, 6, 23);
        ctx.fill();
        ctx.fillStyle = '#b7e4f7';
        ctx.beginPath();
        ctx.rect(x + 1, y + ((selindex * (len - 55)) / maxitems) + 16 + 1, 6, 23);
        ctx.fill();
        ctx.strokeStyle = '#8fd5f3';
        ctx.beginPath();
        ctx.moveTo(x + 8, y + ((selindex * (len - 55)) / maxitems) + 16 + 1);
        ctx.lineTo(x + 8, y + ((selindex * (len - 55)) / maxitems) + 16 + 22);
        ctx.stroke();
        var g = ctx.createLinearGradient(x + 4, y + ((selindex * (len - 55)) / maxitems) + 16 + 8, x + 10, y + ((selindex * (len - 55)) / maxitems) + 16 + 8);
        g.addColorStop(0, '#2b404b');
        g.addColorStop(1, '#5888a1');
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + ((selindex * (len - 55)) / maxitems) + 16 + 8);
        ctx.lineTo(x + 10, y + ((selindex * (len - 55)) / maxitems) + 16 + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 4, y + ((selindex * (len - 55)) / maxitems) + 16 + 11);
        ctx.lineTo(x + 10, y + ((selindex * (len - 55)) / maxitems) + 16 + 11);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 4, y + ((selindex * (len - 55)) / maxitems) + 16 + 14);
        ctx.lineTo(x + 10, y + ((selindex * (len - 55)) / maxitems) + 16 + 14);
        ctx.stroke();
        var g = ctx.createLinearGradient(x + 4, y + ((selindex * (len - 55)) / maxitems) + 16 + 8, x + 10, y + ((selindex * (len - 55)) / maxitems) + 16 + 8);
        g.addColorStop(0, '#447791');
        g.addColorStop(1, '#96bed3');
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + ((selindex * (len - 55)) / maxitems) + 16 + 9);
        ctx.lineTo(x + 10, y + ((selindex * (len - 55)) / maxitems) + 16 + 9);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 4, y + ((selindex * (len - 55)) / maxitems) + 16 + 12);
        ctx.lineTo(x + 10, y + ((selindex * (len - 55)) / maxitems) + 16 + 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 4, y + ((selindex * (len - 55)) / maxitems) + 16 + 15);
        ctx.lineTo(x + 10, y + ((selindex * (len - 55)) / maxitems) + 16 + 15);
        ctx.stroke();
    } else {
        ctx.clearRect(scrollBarProps.X, scrollBarProps.Y, scrollBarProps.Len, 15);
        var g = ctx.createLinearGradient(x, y, x, y + 15);
        g.addColorStop(0, '#e3e3e3');
        g.addColorStop(0.5, '#ededed');
        g.addColorStop(1, '#e5e5e5');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.rect(x, y, len, 15);
        ctx.fill();
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#3c7fb1';
        ctx.beginPath();
        ctx.rect(x, y, 15, 15);
        ctx.stroke();
        ctx.fillStyle = '#dcf0fb';
        ctx.beginPath();
        ctx.rect(x + 1, y + 1, 13, 6);
        ctx.fill();
        ctx.fillStyle = '#a7d8f3';
        ctx.beginPath();
        ctx.rect(x + 1, y + 8, 13, 6);
        ctx.fill();
        ctx.strokeStyle = '#c0e4f8';
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 7);
        ctx.lineTo(x + 14, y + 7);
        ctx.stroke();
        var g = ctx.createLinearGradient(x + 6, y + 7, x + 10, y + 7);
        g.addColorStop(0, '#4e9ac4');
        g.addColorStop(1, '#0d2a3a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 8);
        ctx.lineTo(x + 10, y + 11);
        ctx.lineTo(x + 10, y + 4);
        ctx.closePath();
        ctx.fill();
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#3c7fb1';
        ctx.beginPath();
        ctx.rect(x + len - 15, y, 15, 15);
        ctx.stroke();
        ctx.fillStyle = '#dcf0fb';
        ctx.beginPath();
        ctx.rect(x + len - 15 + 1, y, 13, 6);
        ctx.fill();
        ctx.fillStyle = '#a7d8f3';
        ctx.beginPath();
        ctx.rect(x + len - 15 + 1, y + 8, 13, 6);
        ctx.fill();
        ctx.strokeStyle = '#c0e4f8';
        ctx.beginPath();
        ctx.moveTo(x + len - 15 + 1, y + 7);
        ctx.lineTo(x + len - 1, y + 7);
        ctx.stroke();
        var g = ctx.createLinearGradient(x + len - 15 + 6, y + 7, x + len - 15 + 10, y + 7);
        g.addColorStop(0, '#0d2a3a');
        g.addColorStop(1, '#4e9ac4');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + len - 15 + 6, y + 4);
        ctx.lineTo(x + len - 15 + 10, y + 8);
        ctx.lineTo(x + len - 15 + 6, y + 11);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#15598a';
        ctx.beginPath();
        ctx.rect(x + ((selindex * (len - 55)) / maxitems) + 16, y, 25, 15);
        ctx.stroke();
        ctx.fillStyle = '#6ac1e5';
        ctx.beginPath();
        ctx.rect(x + ((selindex * (len - 55)) / maxitems) + 16 + 1, y + 8, 23, 6);
        ctx.fill();
        ctx.fillStyle = '#b7e4f7';
        ctx.beginPath();
        ctx.rect(x + ((selindex * (len - 55)) / maxitems) + 16 + 1, y + 1, 23, 6);
        ctx.fill();
        ctx.strokeStyle = '#8fd5f3';
        ctx.beginPath();
        ctx.moveTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 1, y + 8);
        ctx.lineTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 22, y + 8);
        ctx.stroke();
        var g = ctx.createLinearGradient(x + ((selindex * (len - 55)) / maxitems) + 16 + 8, y + 4, x + ((selindex * (len - 55)) / maxitems) + 16 + 8, y + 10);
        g.addColorStop(0, '#2b404b');
        g.addColorStop(1, '#5888a1');
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 8, y + 4);
        ctx.lineTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 8, y + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 11, y + 4);
        ctx.lineTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 11, y + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 14, y + 4);
        ctx.lineTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 14, y + 10);
        ctx.stroke();
        var g = ctx.createLinearGradient(x + ((selindex * (len - 55)) / maxitems) + 16 + 8, y + 4, x + ((selindex * (len - 55)) / maxitems) + 16 + 8, y + 10);
        g.addColorStop(0, '#447791');
        g.addColorStop(1, '#96bed3');
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 9, y + 4);
        ctx.lineTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 9, y + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 12, y + 4);
        ctx.lineTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 12, y + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 15, y + 4);
        ctx.lineTo(x + ((selindex * (len - 55)) / maxitems) + 16 + 15, y + 10);
        ctx.stroke();
    }
}

function scrollBarClick(canvasid, windowid, e) {
    var scrollBarProps = getScrollBarProps(canvasid, windowid);
    var xm = e.calcX;
    var ym = e.calcY;
    if (scrollBarProps.Alignment == 1) {
        if (xm > scrollBarProps.X && xm < scrollBarProps.X + 15 && ym > scrollBarProps.Y && ym < scrollBarProps.Y + 15 && scrollBarProps.SelectedID - 1 >= 0) {
            if (scrollBarProps.CustomIncrementFunction) {
                scrollBarProps.CustomIncrementFunction(scrollBarProps.SelectedTag, scrollBarProps, 0);
            }
            --scrollBarProps.SelectedID;
        } else if (xm > scrollBarProps.X && xm < scrollBarProps.X + 15 && ym > scrollBarProps.Y + scrollBarProps.Len - 15 &&
            ym < scrollBarProps.Y + scrollBarProps.Len && scrollBarProps.SelectedID + 1 < scrollBarProps.MaxItems) {
            if (scrollBarProps.CustomIncrementFunction) {
                scrollBarProps.CustomIncrementFunction(scrollBarProps.SelectedTag, scrollBarProps, 1);
            }
            ++scrollBarProps.SelectedID;
        }
    } else {
        if (xm > scrollBarProps.X && xm < scrollBarProps.X + 15 && ym > scrollBarProps.Y && ym < scrollBarProps.Y + 15 && scrollBarProps.SelectedID - 1 >= 0) {
            if (scrollBarProps.CustomIncrementFunction) {
                scrollBarProps.CustomIncrementFunction(scrollBarProps.SelectedTag, scrollBarProps, 0);
            }
            --scrollBarProps.SelectedID;
        } else if (xm > scrollBarProps.X + scrollBarProps.Len - 15 && xm < scrollBarProps.X + scrollBarProps.Len &&
            ym > scrollBarProps.Y && ym < scrollBarProps.Y + 15 && scrollBarProps.SelectedID + 1 < scrollBarProps.MaxItems) {
            if (scrollBarProps.CustomIncrementFunction) {
                scrollBarProps.CustomIncrementFunction(scrollBarProps.SelectedTag, scrollBarProps, 1);
            }
            ++scrollBarProps.SelectedID;
        }
    }
    var wprops = getWindowProps(canvasid, scrollBarProps.OwnedByWindowID);
    if (wprops) {
        invalidateRect(canvasid, null, wprops.X, wprops.Y, wprops.Width, wprops.Height);
    }
}

function scrollBarMouseDown(canvasid, windowid, e) {
    var scrollBarProps = getScrollBarProps(canvasid, windowid);
    var x = e.calcX;
    var y = e.calcY;
    if (scrollBarProps.Alignment == 1) {
        if (x > scrollBarProps.X && x < scrollBarProps.X + 15 && y > scrollBarProps.Y +
            ((scrollBarProps.SelectedID * (scrollBarProps.Len - 55)) / scrollBarProps.MaxItems) + 16 &&
            y < scrollBarProps.Y + ((scrollBarProps.SelectedID * (scrollBarProps.Len - 55)) / scrollBarProps.MaxItems) + 16 + 25) {
            scrollBarProps.MouseDownState = 1;
        }
    } else {
        if (y > scrollBarProps.Y && y < scrollBarProps.Y + 15 && x > scrollBarProps.X +
            ((scrollBarProps.SelectedID * (scrollBarProps.Len - 55)) / scrollBarProps.MaxItems) + 16 &&
            x < scrollBarProps.X + ((scrollBarProps.SelectedID * (scrollBarProps.Len - 55)) / scrollBarProps.MaxItems) + 16 + 25) {
            scrollBarProps.MouseDownState = 1;
        }
    }
}

function scrollBarMouseMove(canvasid, windowid, e) {
    var scrollBarProps = getScrollBarProps(canvasid, windowid);
    var tmp = scrollBarProps.SelectedID;
    if (scrollBarProps.MouseDownState == 1) {
        if (scrollBarProps.Alignment == 1) {
            var y = e.calcY;
            if (y < scrollBarProps.Y) {
                scrollBarProps.SelectedID = 1;
            } else if (y > scrollBarProps.Y + scrollBarProps.Len) {
                scrollBarProps.SelectedID = scrollBarProps.MaxItems;
            } else {
                scrollBarProps.SelectedID = Math.floor(((y - scrollBarProps.Y) * scrollBarProps.MaxItems) / scrollBarProps.Len);
            }
        } else {
            var x = e.calcX;
            if (x < scrollBarProps.X) {
                scrollBarProps.SelectedID = 1;
            } else if (x > scrollBarProps.X + scrollBarProps.Len) {
                scrollBarProps.SelectedID = scrollBarProps.MaxItems;
            } else {
                scrollBarProps.SelectedID = Math.floor(((x - scrollBarProps.X) * scrollBarProps.MaxItems) / scrollBarProps.Len);
            }
        }
        if (scrollBarProps.CustomMouseMoveFunction != null) {
            scrollBarProps.CustomMouseMoveFunction(scrollBarProps, scrollBarProps.SelectedID);
        }
    }
    /*
    if (scrollBarProps.SelectedID != tmp) {
        var wprops = getWindowProps(canvasid, scrollBarProps.OwnedByWindowID);
        if (wprops) {
            invalidateRect(canvasid, null, wprops.X, wprops.Y, wprops.Width, wprops.Height);
        }
    }*/
}

function scrollBarMouseUp(canvasid, windowid) {
    var scrollBarProps = getScrollBarProps(canvasid, windowid);
    scrollBarProps.MouseDownState = 0;
}

function scrollBarLostFocus(canvasid, windowid) {
    var scrollBarProps = getScrollBarProps(canvasid, windowid);
    scrollBarProps.MouseDownState = 0;
}

function createScrollBar(canvasid, controlNameId, x, y, len, depth, maxitems, alignment, ownedbywindowid, drawFunction, clickFunction, tag,
    customIncrementFunction, selectedTag, customMouseMoveFunction) {
    var windowid;
    if (alignment == 1) {
        windowid = createWindow(canvasid, x, y, 15, len, depth, null, 'ScrollBar', controlNameId);
    } else {
        windowid = createWindow(canvasid, x, y, len, 15, depth, null, 'ScrollBar', controlNameId);
    }
    scrollBarPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Len: len, SelectedID: 0,
        MaxItems: maxitems, Alignment: alignment, MouseDownState: 0, Tag: tag, OwnedByWindowID: ownedbywindowid, DrawFunction: drawFunction,
        CustomIncrementFunction: customIncrementFunction, SelectedTag: selectedTag, CustomMouseMoveFunction: customMouseMoveFunction
    });
    if (clickFunction == null) {
        registerClickFunction(windowid, scrollBarClick, canvasid);
    } else {
        registerClickFunction(windowid, clickFunction, canvasid);
    }
    if (drawFunction == null) {
        registerWindowDrawFunction(windowid, function () { drawScrollBar(canvasid, windowid); }, canvasid);
    } else {
        registerWindowDrawFunction(windowid, function () { drawFunction(canvasid, windowid); }, canvasid);
    }
    registerMouseDownFunction(windowid, scrollBarMouseDown, canvasid);
    registerMouseMoveFunction(windowid, scrollBarMouseMove, canvasid);
    registerMouseUpFunction(windowid, scrollBarMouseUp, canvasid);
    registerLostFocusFunction(canvasid, windowid, scrollBarLostFocus);
    return windowid;
}

//Code for Listbox starts here

var gridPropsArray = new Array();

function getGridProps(canvasid, windowid) {
    for (var i = 0; i < gridPropsArray.length; i++) {
        if (gridPropsArray[i].CanvasID == canvasid && gridPropsArray[i].WindowID == windowid) {
            return gridPropsArray[i];
        }
    }
}

function createGrid(canvasid, controlNameId, x, y, width, height, depth, rowData, headerData, rowDataTextColor, rowDataTextHeight, rowDataTextFontString,
    headerDataTextColor, headerDataTextHeight, headerDataTextFontString, drawRowDataCellFunction, drawHeaderCellFunction,
    cellClickFunction, dataRowHeight, headerRowHeight, columnWidthArray, hasBorder, borderColor, borderLineWidth,
    headerbackgroundstartcolor, headerbackgroundendcolor, altrowbgcolorstart1, altrowbgcolorend1, altrowbgcolorstart2, altrowbgcolorend2, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'Grid');
    var effectiveWidth = 0;
    for (var i = 0; i < columnWidthArray.length; i++) {
        effectiveWidth += columnWidthArray[i];
    }
    var effectiveHeight = headerRowHeight + (dataRowHeight * rowData.length);
    var vscrollBarWindowId = null;
    if (effectiveHeight > height) {
        vscrollBarWindowId = createScrollBar(canvasid, controlNameId + 'VS', x + width, y, height, depth, rowData.length, 1, windowid);
    }
    var hscrollBarWindowId = null;
    if (effectiveWidth > width) {
        hscrollBarWindowId = createScrollBar(canvasid, controlNameId + 'HS', x, y + height, width, depth, columnWidthArray.length, 0, windowid);
    }
    gridPropsArray.push({CanvasID: canvasid, WindowID: windowid,
        X: x, Y: y, 
        Width: width, Height: height,
        RowData: rowData, HeaderData: headerData, 
        RowDataTextColor: rowDataTextColor,
        RowDataTextFontString: rowDataTextFontString, HeaderDataTextColor: headerDataTextColor, 
        HeaderDataTextHeight: headerDataTextHeight, HeaderDataTextFontString: headerDataTextFontString,
        CellClickFunction: cellClickFunction, DataRowHeight: dataRowHeight,
        ColumnWidthArray: columnWidthArray, HeaderRowHeight: headerRowHeight, 
        HasBorder: hasBorder, BorderColor: borderColor, 
        BorderLineWidth: borderLineWidth, VScrollBarWindowId: vscrollBarWindowId,
        HScrollBarWindowId: hscrollBarWindowId, HeaderBackgroundStartColor: headerbackgroundstartcolor, 
        HeaderBackgroundEndColor: headerbackgroundendcolor, AltRowBgColorStart1: altrowbgcolorstart1, 
        AltRowBgColorEnd1: altrowbgcolorend1, AltRowBgColorStart2: altrowbgcolorstart2,
        AltRowBgColorEnd2: altrowbgcolorend2, Tag: tag
    });
    registerWindowDrawFunction(windowid, function () { drawGrid(canvasid, windowid); }, canvasid);
    registerClickFunction(windowid, function () { clickGrid(canvasid, windowid); }, canvasid);
    return windowid;
}

function drawGrid(canvasid, windowid) {
    var gridProps = getGridProps(canvasid, windowid);
    var vscrollBarProps = getScrollBarProps(canvasid, gridProps.VScrollBarWindowId);
    var hscrollBarProps = getScrollBarProps(canvasid, gridProps.HScrollBarWindowId);
    var ctx = getCtx(canvasid);
    var startRow = 0;
    if (vscrollBarProps != null) {
        startRow = vscrollBarProps.SelectedID;
    }
    var startCol = 0;
    if (hscrollBarProps != null) {
        startCol = hscrollBarProps.SelectedID;
    }
    var totalWidth = 0;
    for (var c = startCol; c < gridProps.ColumnWidthArray.length; c++) {
        if (totalWidth >= gridProps.Width) {
            break;
        }
        totalWidth += gridProps.ColumnWidthArray[c];
        var g = ctx.createLinearGradient(gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y,
            gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y + gridProps.HeaderRowHeight);
        g.addColorStop(0, gridProps.HeaderBackgroundStartColor);
        g.addColorStop(1, gridProps.HeaderBackgroundEndColor);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.rect(gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y, (totalWidth > gridProps.Width ?
            gridProps.ColumnWidthArray[c] + gridProps.Width - totalWidth : gridProps.ColumnWidthArray[c]), gridProps.HeaderRowHeight);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.rect(gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y, (totalWidth > gridProps.Width ?
            gridProps.ColumnWidthArray[c] + gridProps.Width - totalWidth : gridProps.ColumnWidthArray[c]), gridProps.HeaderRowHeight);
        ctx.clip();
        ctx.fillStyle = gridProps.HeaderDataTextColor;
        ctx.font = gridProps.HeaderDataTextFontString;
        ctx.fillText(gridProps.HeaderData[c], gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y +
            gridProps.HeaderRowHeight - ((gridProps.HeaderRowHeight - gridProps.HeaderDataTextHeight) / 2));
        ctx.restore();
        if (gridProps.HasBorder == 1) {
            ctx.strokeStyle = gridProps.BorderColor;
            ctx.lineWidth = gridProps.BorderLineWidth;
            ctx.beginPath();
            ctx.rect(gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y, gridProps.ColumnWidthArray[c] +
                gridProps.Width - totalWidth, gridProps.HeaderRowHeight);
            ctx.stroke();
        }
    }
    var altrow = 0;
    for (var r = startRow; r < gridProps.RowData.length; r++) {
        if (((r - startRow) * gridProps.DataRowHeight) + gridProps.HeaderRowHeight >= gridProps.Height) {
            break;
        }
        var totalWidth = 0;
        for (var c = startCol; c < gridProps.ColumnWidthArray.length; c++) {
            if (totalWidth >= gridProps.Width) {
                break;
            }
            totalWidth += gridProps.ColumnWidthArray[c];
            ctx.save();
            ctx.beginPath();
            ctx.rect(gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y + ((r - startRow) * gridProps.DataRowHeight) +
                gridProps.HeaderRowHeight, (totalWidth > gridProps.Width ? gridProps.ColumnWidthArray[c] + gridProps.Width - totalWidth :
                gridProps.ColumnWidthArray[c]), gridProps.DataRowHeight);
            ctx.clip();
            var g2 = ctx.createLinearGradient(gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y + ((r - startRow) * gridProps.DataRowHeight) +
                gridProps.HeaderRowHeight, gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y + ((r - startRow) * gridProps.DataRowHeight) +
                gridProps.HeaderRowHeight + gridProps.DataRowHeight);
            if (altrow == 0) {
                g2.addColorStop(0, gridProps.AltRowBgColorStart1);
                g2.addColorStop(1, gridProps.AltRowBgColorEnd1);
            } else {
                g2.addColorStop(0, gridProps.AltRowBgColorStart2);
                g2.addColorStop(1, gridProps.AltRowBgColorEnd2);
            }
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.rect(gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y + ((r - startRow) * gridProps.DataRowHeight) +
                gridProps.HeaderRowHeight, (totalWidth > gridProps.Width ? gridProps.ColumnWidthArray[c] + gridProps.Width - totalWidth :
                gridProps.ColumnWidthArray[c]), gridProps.DataRowHeight);
            ctx.fill();
            ctx.fillStyle = gridProps.RowDataTextColor;
            ctx.font = gridProps.RowDataTextFontString;
            ctx.fillText(gridProps.RowData[r][c], gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y + ((r - startRow) *
                gridProps.DataRowHeight) - ((gridProps.DataRowHeight - gridProps.HeaderDataTextHeight) / 2) + gridProps.HeaderRowHeight + gridProps.DataRowHeight);
            ctx.restore();
            if (gridProps.HasBorder == 1) {
                ctx.strokeStyle = gridProps.BorderColor;
                ctx.lineWidth = gridProps.BorderLineWidth;
                ctx.beginPath();
                ctx.rect(gridProps.X + totalWidth - gridProps.ColumnWidthArray[c], gridProps.Y + ((r - startRow) *
                    gridProps.DataRowHeight) + gridProps.HeaderRowHeight, gridProps.ColumnWidthArray[c] + gridProps.Width - totalWidth, gridProps.DataRowHeight);
                ctx.stroke();
            }
        }
        if (altrow == 1) {
            altrow = 0;
        } else {
            altrow = 1;
        }
    }
}

function clickGrid(canvasid, windowid, e) {
    
    var gridProps = getGridProps(canvasid, windowid);
    var vscrollBarProps = getScrollBarProps(canvasid, gridProps.VScrollBarWindowId);
    var hscrollBarProps = getScrollBarProps(canvasid, gridProps.HScrollBarWindowId);
    var x = e.calcX;
    var y = e.calcY;
    var startRow = 0;
    if (vscrollBarProps != null) {
        startRow = vscrollBarProps.SelectedID;
    }
    var startCol = 0;
    if (hscrollBarProps != null) {
        startCol = hscrollBarProps.SelectedID;
    }
    for (var r = startRow; r < gridProps.RowData.length; r++) {
        if (((r - startRow) * gridProps.DataRowHeight) + gridProps.HeaderRowHeight >= gridProps.Height) {
            break;
        }
        var totalWidth = 0;
        for (var c = startCol; c < gridProps.ColumnWidthArray.length; c++) {
            if (totalWidth >= gridProps.Width) {
                break;
            }
            totalWidth += gridProps.ColumnWidthArray[c];
            if (x > gridProps.X + totalWidth - gridProps.ColumnWidthArray[c] && y > gridProps.Y + ((r - startRow) * gridProps.DataRowHeight) +
                gridProps.HeaderRowHeight && x < gridProps.X + totalWidth - gridProps.ColumnWidthArray[c] + (totalWidth > gridProps.Width ?
                gridProps.ColumnWidthArray[c] + gridProps.Width - totalWidth :
                gridProps.ColumnWidthArray[c]) && y < gridProps.DataRowHeight + gridProps.Y + ((r - startRow) * gridProps.DataRowHeight) +
                gridProps.HeaderRowHeight) {
                gridProps.CellClickFunction(canvasid, windowid, c + 1, r + 1);
                return;
            }
        }
    }
}

//Combobox code starts here

var comboboxPropsArray = new Array();

function getComboboxPropsByTextAreaWindowId(canvasid, windowid) {
    for (var i = 0; i < comboboxPropsArray.length; i++) {
        if (comboboxPropsArray[i].CanvasID == canvasid && comboboxPropsArray[i].TextAreaWindowID == windowid) {
            return comboboxPropsArray[i];
        }
    }
}

function getComboboxPropsByButtonWindowId(canvasid, windowid) {
    for (var i = 0; i < comboboxPropsArray.length; i++) {
        if (comboboxPropsArray[i].CanvasID == canvasid && comboboxPropsArray[i].ButtonWindowID == windowid) {
            return comboboxPropsArray[i];
        }
    }
}

function getComboboxPropsByListAreaWindowId(canvasid, windowid) {
    for (var i = 0; i < comboboxPropsArray.length; i++) {
        if (comboboxPropsArray[i].CanvasID == canvasid && comboboxPropsArray[i].ListAreaWindowID == windowid) {
            return comboboxPropsArray[i];
        }
    }
}

function getComboboxPropsByScrollBarWindowId(canvasid, windowid) {
    for (var i = 0; i < comboboxPropsArray.length; i++) {
        if (comboboxPropsArray[i].CanvasID == canvasid && comboboxPropsArray[i].VScrollBarWindowID == windowid) {
            return comboboxPropsArray[i];
        }
    }
}

function createComboBox(canvasid, controlNameId, x, y, width, height, depth, data, drawTextAreaFunction, drawButtonFunction, drawListAreaFunction, buttonClickFunction,
    listAreaClickFunction, textAreaTextColor, textAreaTextHeight, textAreaFontString, listAreaTextColor, listAreaTextHeight, listAreaFontString, onSelectionChanged, tag) {
    var textareawindowid = createWindow(canvasid, x, y, width - height, height, depth, null, 'ComboBoxTextArea', controlNameId + 'ComboBoxTextArea');
    var buttonwindowid = createWindow(canvasid, x + width - height, y, height, height, depth, null, 'ComboBoxButton', controlNameId + 'ComboBoxButton');
    var dropdownlistareawindowid = createWindow(canvasid, x, y + height, width - 15, 100, depth, null, 'ComboBoxListArea', controlNameId + 'ComboBoxListArea');
    var vscrollBarComboboxWindowId = createScrollBar(canvasid, controlNameId + 'VS', x + width - 15, y + height, 100, depth, data.length, 1, dropdownlistareawindowid,
        function () { drawComboboxScrollBar(canvasid, vscrollBarComboboxWindowId); }, null);
    comboboxPropsArray.push({
        CanvasID: canvasid, WindowID: textareawindowid, TextAreaWindowID: textareawindowid,
        ButtonWindowID: buttonwindowid, ListAreaWindowID: dropdownlistareawindowid,
        VScrollBarWindowID: vscrollBarComboboxWindowId, X: x, Y: y, Width: width,
        Height: height, Data: data, SelectedID: 0,
        TextAreaTextColor: textAreaTextColor, TextAreaTextHeight: textAreaTextHeight,
        TextAreaFontString: textAreaFontString, ListAreaTextColor: listAreaTextColor,
        ListAreaTextHeight: listAreaTextHeight, ListAreaFontString: listAreaFontString,
        OnSelectionChanged: onSelectionChanged, Tag: tag, DrawListAreaFunction: drawListAreaFunction
    });
    if (drawTextAreaFunction != null) {
        registerWindowDrawFunction(textareawindowid, function () { drawTextAreaFunction(canvasid, textareawindowid); }, canvasid);
    } else {
        registerWindowDrawFunction(textareawindowid, function () { drawComboboxTextArea(canvasid, textareawindowid); }, canvasid);
    }
    if (drawButtonFunction != null) {
        registerWindowDrawFunction(buttonwindowid, function () { drawButtonFunction(canvasid, buttonwindowid); }, canvasid);
    } else {
        registerWindowDrawFunction(buttonwindowid, function () { drawComboboxButton(canvasid, buttonwindowid); }, canvasid);
    }
    if (drawListAreaFunction != null) {
        registerWindowDrawFunction(dropdownlistareawindowid, function () { drawListAreaFunction(canvasid, dropdownlistareawindowid); }, canvasid);
    } else {
        registerWindowDrawFunction(dropdownlistareawindowid, function () { drawComboboxListArea(canvasid, dropdownlistareawindowid); }, canvasid);
    }
    if (buttonClickFunction != null) {
        registerClickFunction(buttonwindowid, buttonClickFunction, canvasid);
    } else {
        registerClickFunction(buttonwindowid, comboboxButtonClick, canvasid);
    }
    if (listAreaClickFunction != null) {
        registerClickFunction(dropdownlistareawindowid, listAreaClickFunction, canvasid);
    } else {
        registerClickFunction(dropdownlistareawindowid, comboboxListAreaClick, canvasid);
    }
    registerModalWindow(canvasid, dropdownlistareawindowid);
    registerHiddenWindow(canvasid, dropdownlistareawindowid, 1);
    registerModalWindow(canvasid, vscrollBarComboboxWindowId);
    registerHiddenWindow(canvasid, vscrollBarComboboxWindowId, 1);
    registerLostFocusFunction(canvasid, dropdownlistareawindowid, function () { comboboxListAreaLostFocus(canvasid, dropdownlistareawindowid); });
    registerLostFocusFunction(canvasid, textareawindowid, function () { comboboxTextAreaLostFocus(canvasid, textareawindowid); });
    registerLostFocusFunction(canvasid, vscrollBarComboboxWindowId, function () { comboboxScrollBarLostFocus(canvasid, vscrollBarComboboxWindowId); });
    registerLostFocusFunction(canvasid, buttonwindowid, function () { comboboxButtonLostFocus(canvasid, buttonwindowid); });
    return textareawindowid;
}

function drawComboboxScrollBar(canvasid, windowid) {
    drawScrollBar(canvasid, windowid);
}

function drawComboboxTextArea(canvasid, windowid) {
    var comboboxProps = getComboboxPropsByTextAreaWindowId(canvasid, windowid);
    var ctx = getCtx(canvasid);
    ctx.clearRect(comboboxProps.X, comboboxProps.Y, comboboxProps.Width, comboboxProps.Height);
    ctx.fillStyle = comboboxProps.TextAreaTextColor;
    ctx.font = comboboxProps.TextAreaFontString;
    if (comboboxProps.SelectedID < comboboxProps.Data.length && comboboxProps.SelectedID >= 0) {
        ctx.fillText(comboboxProps.Data[comboboxProps.SelectedID], comboboxProps.X + 5, comboboxProps.Y + comboboxProps.Height - (comboboxProps.TextAreaTextHeight / 2));
    } else {
        ctx.fillText(comboboxProps.Data[0], comboboxProps.X + 5, comboboxProps.Y + comboboxProps.Height - (comboboxProps.TextAreaTextHeight / 2));
    }
    ctx.strokeStyle = '#b7bfc8';
    ctx.beginPath();
    ctx.rect(comboboxProps.X, comboboxProps.Y, comboboxProps.Width - comboboxProps.Height, comboboxProps.Height);
    ctx.stroke();
}

function drawComboboxButton(canvasid, windowid) {
    var comboboxProps = getComboboxPropsByButtonWindowId(canvasid, windowid);
    var ctx = getCtx(canvasid);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#3c7fb1';
    ctx.beginPath();
    ctx.rect(comboboxProps.X + comboboxProps.Width - comboboxProps.Height, comboboxProps.Y, comboboxProps.Height, comboboxProps.Height);
    ctx.stroke();
    ctx.fillStyle = '#dcf0fb';
    ctx.beginPath();
    ctx.rect(comboboxProps.X + comboboxProps.Width - comboboxProps.Height + 1, comboboxProps.Y + 1, (comboboxProps.Height / 2) - 2, comboboxProps.Height - 2);
    ctx.fill();
    ctx.strokeStyle = '#c0e4f8';
    ctx.moveTo(comboboxProps.X + comboboxProps.Width - (comboboxProps.Height / 2) + 1, comboboxProps.Y + 1);
    ctx.lineTo(comboboxProps.X + comboboxProps.Width - (comboboxProps.Height / 2) + 1, comboboxProps.Y + comboboxProps.Height - 1);
    ctx.stroke();
    ctx.fillStyle = '#a7d8f3';
    ctx.beginPath();
    ctx.rect(comboboxProps.X + comboboxProps.Width - (comboboxProps.Height / 2) + 1, comboboxProps.Y + 1,
        (comboboxProps.Height / 2) - 2, comboboxProps.Height - 2);
    ctx.fill();
    var g = ctx.createLinearGradient(comboboxProps.X + comboboxProps.Width - (comboboxProps.Height / 2) - 1, comboboxProps.Y + (comboboxProps.Height / 2) - 1,
        comboboxProps.X + comboboxProps.Width - (comboboxProps.Height / 2) - 1, comboboxProps.Y + (comboboxProps.Height / 2) + 3);
    g.addColorStop(0, '#0d2a3a');
    g.addColorStop(1, '#4e9ac4');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(comboboxProps.X + comboboxProps.Width - (comboboxProps.Height / 2) - 4, comboboxProps.Y + (comboboxProps.Height / 2) - 1);
    ctx.lineTo(comboboxProps.X + comboboxProps.Width - (comboboxProps.Height / 2) + 3, comboboxProps.Y + (comboboxProps.Height / 2) - 1);
    ctx.lineTo(comboboxProps.X + comboboxProps.Width - (comboboxProps.Height / 2) - 1, comboboxProps.Y + (comboboxProps.Height / 2) + 3);
    ctx.closePath();
    ctx.fill();
}

function comboboxButtonClick(canvasid, windowid) {
    var comboboxProps = getComboboxPropsByButtonWindowId(canvasid, windowid);
    if (checkIfHiddenWindow(canvasid, comboboxProps.ListAreaWindowID) == 1) {
        setHiddenWindowStatus(canvasid, comboboxProps.VScrollBarWindowID, 0);
        setHiddenWindowStatus(canvasid, comboboxProps.ListAreaWindowID, 0);
    } else {
        setHiddenWindowStatus(canvasid, comboboxProps.VScrollBarWindowID, 1);
        setHiddenWindowStatus(canvasid, comboboxProps.ListAreaWindowID, 1);
    }
    invalidateRect(canvasid, null, comboboxProps.X, comboboxProps.Y, comboboxProps.Width + 1, comboboxProps.Height + 101);
}

function drawComboboxListArea(canvasid, windowid) {
    var comboboxProps = getComboboxPropsByListAreaWindowId(canvasid, windowid);
    var vscrollBarProps = getScrollBarProps(canvasid, comboboxProps.VScrollBarWindowID);
    var ctx = getCtx(canvasid);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.rect(comboboxProps.X, comboboxProps.Y + comboboxProps.Height, comboboxProps.Width - 15, 100);
    ctx.fill();
    ctx.fillStyle = comboboxProps.ListAreaTextColor;
    ctx.font = comboboxProps.ListAreaFontString;
    for (var i = vscrollBarProps.SelectedID; i < comboboxProps.Data.length && ((comboboxProps.ListAreaTextHeight + 6) *
        (i - vscrollBarProps.SelectedID + 1)) < 100; i++) {
        ctx.fillText(comboboxProps.Data[i], comboboxProps.X + 5, comboboxProps.Y + comboboxProps.Height +
            ((comboboxProps.ListAreaTextHeight + 6) * (i - vscrollBarProps.SelectedID + 1)));
    }
    ctx.strokeStyle = '#b7bfc8';
    ctx.beginPath();
    ctx.rect(comboboxProps.X, comboboxProps.Y + comboboxProps.Height, comboboxProps.Width - 15, 100);
    ctx.stroke();
}

function comboboxListAreaClick(canvasid, windowid, e) {
    var comboboxProps = getComboboxPropsByListAreaWindowId(canvasid, windowid);
    var vscrollBarProps = getScrollBarProps(canvasid, comboboxProps.VScrollBarWindowID);
    var x = e.calcX;
    var y = e.calcY;
    for (var i = vscrollBarProps.SelectedID; i < comboboxProps.Data.length && ((comboboxProps.ListAreaTextHeight + 6) * (i - vscrollBarProps.SelectedID + 1)) < 100; i++) {
        if (x > comboboxProps.X && y > comboboxProps.Y + comboboxProps.Height + ((comboboxProps.ListAreaTextHeight + 6) * (i - vscrollBarProps.SelectedID)) &&
            x < comboboxProps.X + comboboxProps.Width - 15 && y < comboboxProps.Y + comboboxProps.Height + ((comboboxProps.ListAreaTextHeight + 6) *
            (i - vscrollBarProps.SelectedID + 1))) {
            if(comboboxProps.SelectedID != i) {
                comboboxProps.SelectedID = i;
                setHiddenWindowStatus(canvasid, comboboxProps.VScrollBarWindowID, 1);
                setHiddenWindowStatus(canvasid, comboboxProps.ListAreaWindowID, 1);
                var canvas = getCanvas(canvasid);
                invalidateRect(canvasid, null, 0, 0, canvas.width, canvas.height);
                if (comboboxProps.OnSelectionChanged != null) {
                    comboboxProps.OnSelectionChanged(canvasid, comboboxProps.TextAreaWindowID, i);
                }
            }
            return;
        }
    }
}

function comboboxListAreaLostFocus(canvasid, windowid) {
    var comboboxProps = getComboboxPropsByListAreaWindowId(canvasid, windowid);
    if (doesWindowHaveFocus(canvasid, comboboxProps.VScrollBarWindowID) == 0 &&
        doesWindowHaveFocus(canvasid, comboboxProps.TextAreaWindowID) == 0 &&
        doesWindowHaveFocus(canvasid, comboboxProps.ButtonWindowID) == 0 &&
        doingEventForWindowID != comboboxProps.ListAreaWindowID &&
        doingEventForWindowID != comboboxProps.VScrollBarWindowID) {
        setHiddenWindowStatus(canvasid, comboboxProps.VScrollBarWindowID, 1);
        setHiddenWindowStatus(canvasid, comboboxProps.ListAreaWindowID, 1);
        invalidateRect(canvasid, null, comboboxProps.X, comboboxProps.Y, comboboxProps.Width + 1, comboboxProps.Height + 101);
        /*
        var vswprops = getWindowProps(canvasid, comboboxProps.VScrollBarWindowID);
        if (vswprops) {
            invalidateRect(canvasid, null, vswprops.X, vswprops.Y, vswprops.Width, vswprops.Height);
        }
        var lawprops = getWindowProps(canvasid, comboboxProps.ListAreaWindowID);
        if (lawprops) {
            invalidateRect(canvasid, null, lawprops.X, lawprops.Y, lawprops.Width, lawprops.Height);
        }
        */
    }
}

function comboboxTextAreaLostFocus(canvasid, windowid) {
    var comboboxProps = getComboboxPropsByTextAreaWindowId(canvasid, windowid);
    if (doesWindowHaveFocus(canvasid, comboboxProps.VScrollBarWindowID) == 0 &&
        doesWindowHaveFocus(canvasid, comboboxProps.ListAreaWindowID) == 0 &&
        doesWindowHaveFocus(canvasid, comboboxProps.ButtonWindowID) == 0 &&
        doingEventForWindowID != comboboxProps.ListAreaWindowID &&
        doingEventForWindowID != comboboxProps.VScrollBarWindowID) {
        setHiddenWindowStatus(canvasid, comboboxProps.VScrollBarWindowID, 1);
        setHiddenWindowStatus(canvasid, comboboxProps.ListAreaWindowID, 1);
        invalidateRect(canvasid, null, comboboxProps.X, comboboxProps.Y, comboboxProps.Width + 1, comboboxProps.Height + 101);
        /*
        var vswprops = getWindowProps(canvasid, comboboxProps.VScrollBarWindowID);
        if (vswprops) {
            invalidateRect(canvasid, null, vswprops.X, vswprops.Y, vswprops.Width, vswprops.Height);
        }
        var lawprops = getWindowProps(canvasid, comboboxProps.ListAreaWindowID);
        if (lawprops) {
            invalidateRect(canvasid, null, lawprops.X, lawprops.Y, lawprops.Width, lawprops.Height);
        }*/
    }
}

function comboboxButtonLostFocus(canvasid, windowid) {
    var comboboxProps = getComboboxPropsByButtonWindowId(canvasid, windowid);
    if (doesWindowHaveFocus(canvasid, comboboxProps.VScrollBarWindowID) == 0 &&
        doesWindowHaveFocus(canvasid, comboboxProps.ListAreaWindowID) == 0 &&
        doesWindowHaveFocus(canvasid, comboboxProps.TextAreaWindowID) == 0 &&
        doingEventForWindowID != comboboxProps.ListAreaWindowID &&
        doingEventForWindowID != comboboxProps.VScrollBarWindowID) {
        setHiddenWindowStatus(canvasid, comboboxProps.VScrollBarWindowID, 1);
        setHiddenWindowStatus(canvasid, comboboxProps.ListAreaWindowID, 1);
        invalidateRect(canvasid, null, comboboxProps.X, comboboxProps.Y, comboboxProps.Width + 1, comboboxProps.Height + 101);
        /*
        var vswprops = getWindowProps(canvasid, comboboxProps.VScrollBarWindowID);
        if (vswprops) {
            invalidateRect(canvasid, null, vswprops.X, vswprops.Y, vswprops.Width, vswprops.Height);
        }
        var lawprops = getWindowProps(canvasid, comboboxProps.ListAreaWindowID);
        if (lawprops) {
            invalidateRect(canvasid, null, lawprops.X, lawprops.Y, lawprops.Width, lawprops.Height);
        }*/
    }
}

function comboboxScrollBarLostFocus(canvasid, windowid) {
    var comboboxProps = getComboboxPropsByScrollBarWindowId(canvasid, windowid);
    if (doesWindowHaveFocus(canvasid, comboboxProps.TextAreaWindowID) == 0 &&
        doesWindowHaveFocus(canvasid, comboboxProps.ListAreaWindowID) == 0 &&
        doesWindowHaveFocus(canvasid, comboboxProps.ButtonWindowID) == 0 &&
        doingEventForWindowID != comboboxProps.ListAreaWindowID &&
        doingEventForWindowID != comboboxProps.VScrollBarWindowID) {
        setHiddenWindowStatus(canvasid, comboboxProps.VScrollBarWindowID, 1);
        setHiddenWindowStatus(canvasid, comboboxProps.ListAreaWindowID, 1);
        invalidateRect(canvasid, null, comboboxProps.X, comboboxProps.Y, comboboxProps.Width + 1, comboboxProps.Height + 101);
        /* var vswprops = getWindowProps(canvasid, comboboxProps.VScrollBarWindowID);
        if (vswprops) {
            invalidateRect(canvasid, null, vswprops.X, vswprops.Y, vswprops.Width, vswprops.Height);
        }
        var lawprops = getWindowProps(canvasid, comboboxProps.ListAreaWindowID);
        if (lawprops) {
            invalidateRect(canvasid, null, lawprops.X, lawprops.Y, lawprops.Width, lawprops.Height);
        }*/
    }
}

//Checkbox code begins here

var checkboxPropsArray = new Array();

function getcheckboxProps(canvasid, windowid) {
    for (var i = 0; i < checkboxPropsArray.length; i++) {
        if (checkboxPropsArray[i].CanvasID == canvasid && checkboxPropsArray[i].WindowID == windowid) {
            return checkboxPropsArray[i];
        }
    }
}

function drawCheckbox(canvasid, windowid) {
    var checkboxProps = getcheckboxProps(canvasid, windowid);
    var ctx = getCtx(canvasid);
    ctx.save();
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#e3e3e3';
    ctx.strokeStyle = '#3c7fb1';
    ctx.beginPath();
    ctx.rect(checkboxProps.X, checkboxProps.Y, 15, 15);
    ctx.stroke();
    ctx.lineCap = 'round';
    if (checkboxProps.Status == 1) {
        ctx.lineWidth = 4;
        var g = ctx.createLinearGradient(checkboxProps.X, checkboxProps.Y, checkboxProps.X + 15, checkboxProps.Y + 15);
        g.addColorStop(0, '#abffaf');
        g.addColorStop(1, '#00ff0c');
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(checkboxProps.X + 3, checkboxProps.Y + 9);
        ctx.lineTo(checkboxProps.X + 6, checkboxProps.Y + 12);
        ctx.lineTo(checkboxProps.X + 18, checkboxProps.Y - 3);
        ctx.stroke();
    } else {
        ctx.lineWidth = 3;
        var g = ctx.createLinearGradient(checkboxProps.X, checkboxProps.Y, checkboxProps.X + 15, checkboxProps.Y + 15);
        g.addColorStop(0, '#ff2a2a');
        g.addColorStop(1, '#ff6b6b');
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(checkboxProps.X + 4, checkboxProps.Y + 4);
        ctx.lineTo(checkboxProps.X + 11, checkboxProps.Y + 11);
        ctx.moveTo(checkboxProps.X + 11, checkboxProps.Y + 4);
        ctx.lineTo(checkboxProps.X + 4, checkboxProps.Y + 11);
        ctx.stroke();
    }
    ctx.restore();
}

function createCheckbox(canvasid, controlNameId, x, y, depth, status, tag) {
    var windowid = createWindow(canvasid, x, y, 15, 15, depth, null, 'CheckBox', controlNameId);
    checkboxPropsArray.push({ CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Status: status, Tag: tag });
    registerClickFunction(windowid, function () {
        var checkboxProps = getcheckboxProps(canvasid, windowid);
        if (checkboxProps.Status == 1) {
            checkboxProps.Status = 0;
        } else {
            checkboxProps.Status = 1;
        }
    }, canvasid);
    registerWindowDrawFunction(windowid, function () { drawCheckbox(canvasid, windowid); }, canvasid);
    return windowid;
}

//Radio button code starts here

var radiobuttonPropsArray = new Array();

function getRadioButtonProps(canvasid, windowid) {
    for (var i = 0; i < radiobuttonPropsArray.length; i++) {
        if (radiobuttonPropsArray[i].CanvasID == canvasid && radiobuttonPropsArray[i].WindowID == windowid) {
            return radiobuttonPropsArray[i];
        }
    }
}

function createRadioButtonGroup(canvasid, controlNameId, x, y, alignment, depth, groupname, labels, selectedid, labelTextColor, labelFontString, labelTextHeight, radius, tag) {
    var canvas = document.getElementById(canvasid);
    var ctx = canvas.getContext('2d');
    ctx.font = labelFontString;
    var height = 0;
    if (2 * radius >= labelTextHeight + 8) {
        height = 2 * radius;
    } else {
        height = labelTextHeight + 8;
    }
    var width = 0;
    for (var i = 0; i < labels.length; i++) {
        var tw = ctx.measureText(labels[i]).width;
        width += tw + 8 + (2 * radius);
    }
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'RadioButtonGroup', controlNameId);
    radiobuttonPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Alignment: alignment, GroupName: groupname,
        Labels: labels, SelectedID: selectedid, LabelTextColor: labelTextColor, LabelFontString: labelFontString, Radius: radius,
        ButtonExtents: new Array(), LabelTextHeight: labelTextHeight, Tag: tag
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var radioButtonProps = getRadioButtonProps(canvasid1, windowid1);
        var ctx = getCtx(canvasid1);
        var widthOffset = 0;
        ctx.font = radioButtonProps.LabelFontString;
        var buttonExtents = new Array();
        for (var i = 0; i < radioButtonProps.Labels.length; i++) {
            ctx.fillStyle = radioButtonProps.LabelTextColor;
            ctx.fillText(radioButtonProps.Labels[i], radioButtonProps.X + widthOffset, radioButtonProps.Y + radioButtonProps.Height -
                ((radioButtonProps.Height - radioButtonProps.LabelTextHeight) / 2));
            var tw = ctx.measureText(radioButtonProps.Labels[i]).width;
            ctx.fillStyle = '#fcfcfc';
            ctx.beginPath();
            ctx.arc(radioButtonProps.X + widthOffset + tw + 4 + radioButtonProps.Radius, radioButtonProps.Y + radioButtonProps.Radius +
                ((radioButtonProps.Height - (radioButtonProps.Radius * 2)) / 2), radioButtonProps.Radius, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#c4c4c4';
            ctx.beginPath();
            ctx.arc(radioButtonProps.X + widthOffset + tw + 4 + radioButtonProps.Radius, radioButtonProps.Y + radioButtonProps.Radius +
                ((radioButtonProps.Height - (radioButtonProps.Radius * 2)) / 2), radioButtonProps.Radius - 1, (Math.PI / 180) * 315, (Math.PI / 180) * 135, false);
            ctx.stroke();
            ctx.strokeStyle = '#141414';
            ctx.beginPath();
            ctx.arc(radioButtonProps.X + widthOffset + tw + 4 + radioButtonProps.Radius, radioButtonProps.Y + radioButtonProps.Radius +
                ((radioButtonProps.Height - (radioButtonProps.Radius * 2)) / 2), radioButtonProps.Radius - 1, (Math.PI / 180) * 135, (Math.PI / 180) * 315, false);
            ctx.stroke();
            ctx.strokeStyle = '#808080';
            ctx.beginPath();
            ctx.arc(radioButtonProps.X + widthOffset + tw + 4 + radioButtonProps.Radius, radioButtonProps.Y + radioButtonProps.Radius +
                ((radioButtonProps.Height - (radioButtonProps.Radius * 2)) / 2), radioButtonProps.Radius - 1, (Math.PI / 180) * 135, (Math.PI / 180) * 315, false);
            ctx.stroke();
            if (i == radioButtonProps.SelectedID) {
                ctx.fillStyle = '#51852f';
                ctx.beginPath();
                ctx.arc(radioButtonProps.X + widthOffset + tw + 4 + radioButtonProps.Radius, radioButtonProps.Y + radioButtonProps.Radius +
                ((radioButtonProps.Height - (radioButtonProps.Radius * 2)) / 2), radioButtonProps.Radius - 4, 0, Math.PI * 2, false);
                ctx.fill();
            }
            buttonExtents.push({ X: radioButtonProps.X + widthOffset + tw + 4, Y: radioButtonProps.Y, Width: radioButtonProps.Radius * 2, Height: radioButtonProps.Height });
            widthOffset += tw + 8 + (2 * radioButtonProps.Radius);
        }
        radioButtonProps.ButtonExtents = buttonExtents;
    }, canvasid);
    registerClickFunction(windowid, function (canvasid2, windowid2, e) {
        var radioButtonProps = getRadioButtonProps(canvasid2, windowid2);
        var clickx = e.calcX;
        var clicky = e.calcY;
        for (var i = 0; i < radioButtonProps.ButtonExtents.length; i++) {
            if (clickx > radioButtonProps.ButtonExtents[i].X && clickx < radioButtonProps.ButtonExtents[i].X + radioButtonProps.ButtonExtents[i].Width &&
                clicky > radioButtonProps.ButtonExtents[i].Y && clicky < radioButtonProps.ButtonExtents[i].Y + radioButtonProps.ButtonExtents[i].Height) {
                radioButtonProps.SelectedID = i;
                break;
            }
        }
    }, canvasid);
    return windowid;
}

//Image Control Code Starts Here

var imageControlPropsArray = new Array();

function getImageControlProps(canvasid, windowid) {
    for (var i = 0; i < imageControlPropsArray.length; i++) {
        if (imageControlPropsArray[i].CanvasID == canvasid && imageControlPropsArray[i].WindowID == windowid) {
            return imageControlPropsArray[i];
        }
    }
}

function createImage(canvasid, controlNameId, x, y, width, height, depth, imgurl, clickFunction, tile, tag,
    isHyperlink, url, nobrowserhistory, isnewbrowserwindow,
    nameofnewbrowserwindow, widthofnewbrowserwindow, heightofnewbrowserwindow, newbrowserwindowisresizable, newbrowserwindowhasscrollbars,
    newbrowserwindowhastoolbar, newbrowserwindowhaslocationorurloraddressbox, newbroserwindowhasdirectoriesorextrabuttons,
    newbrowserwindowhasstatusbar, newbrowserwindowhasmenubar, newbrowserwindowcopyhistory) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'Image', controlNameId);
    var image = new Image();
    image.onload = function () {
        invalidateRect(canvasid, null, x, y, width, height);
    };
    imageControlPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width,
        Height: height, ImageURL: imgurl, ClickFunction: clickFunction, Image: image, AlreadyDrawnImage: 0, IsHyperlink: isHyperlink, URL: url,
        NoBrowserHistory: nobrowserhistory, IsNewBrowserWindow: isnewbrowserwindow,
        NameOfNewBrowserWindow: nameofnewbrowserwindow, WidthOfNewBrowserWindow: widthofnewbrowserwindow,
        HeightOfNewBrowserWindow: heightofnewbrowserwindow, NewBrowserWindowIsResizable: newbrowserwindowisresizable,
        NewBrowserWindowHasScrollBars: newbrowserwindowhasscrollbars, NewBrowserWindowHasToolbar: newbrowserwindowhastoolbar,
        NewBrowserWindowHasLocationOrURLOrAddressBox: newbrowserwindowhaslocationorurloraddressbox,
        NewBrowserWindowHasDirectoriesOrExtraButtons: newbroserwindowhasdirectoriesorextrabuttons,
        NewBrowserWindowHasStatusBar: newbrowserwindowhasstatusbar, NewBrowserWindowHasMenuBar: newbrowserwindowhasmenubar,
        NewBrowserWindowCopyHistory: newbrowserwindowcopyhistory, Tag: tag, Tile: tile
    });
    image.src = imgurl;
    registerWindowDrawFunction(windowid, function (canvasid, windowid) {
        var ctx = getCtx(canvasid);
        var imageProps = getImageControlProps(canvasid, windowid);
        if (imageProps.Image && imageProps.Image.complete == true) {
            if (imageProps.Tile == 1) {
                var windowProps = getWindowProps(canvasid, windowid);
                if (windowProps) {
                    var tilex = Math.ceil(windowProps.Width / imageProps.Image.width);
                    var tiley = Math.ceil(windowProps.Height / imageProps.Image.height);
                    for (var ytile = 0; ytile < tiley; ytile++) {
                        for (var xtile = 0; xtile < tilex; xtile++) {
                            ctx.drawImage(imageProps.Image, imageProps.X + (xtile * imageProps.Image.width), imageProps.Y + (ytile * imageProps.Image.height));
                        }
                    }
                }
            } else {
                ctx.drawImage(imageProps.Image, imageProps.X, imageProps.Y);
            }
        }
    }, canvasid);
    if (clickFunction != null) {
        registerClickFunction(windowid, function () { clickFunction(canvasid, windowid); }, canvasid);
    } else if (isHyperlink == 1) {
        registerClickFunction(windowid, function () {
            if (isnewbrowserwindow == 1) {
                var str = '';
                var wroteone = 0;
                if (widthofnewbrowserwindow != null) {
                    str += 'width=' + widthofnewbrowserwindow;
                    wroteone = 1;
                }
                if (heightofnewbrowserwindow != null) {
                    str += (wroteone == 1 ? ',' : '') + 'height=' + heightofnewbrowserwindow;
                }
                if (newbrowserwindowisresizable != null) {
                    str += (wroteone == 1 ? ',' : '') + 'resizable=' + newbrowserwindowisresizable;
                }
                if (newbrowserwindowhasscrollbars != null) {
                    str += (wroteone == 1 ? ',' : '') + 'scrollbars=' + newbrowserwindowhasscrollbars;
                }
                if (newbrowserwindowhastoolbar != null) {
                    str += (wroteone == 1 ? ',' : '') + 'toolbar=' + newbrowserwindowhastoolbar;
                }
                if (newbrowserwindowhaslocationorurloraddressbox != null) {
                    str += (wroteone == 1 ? ',' : '') + 'location=' + newbrowserwindowhaslocationorurloraddressbox;
                }
                if (newbroserwindowhasdirectoriesorextrabuttons != null) {
                    str += (wroteone == 1 ? ',' : '') + 'directories=' + newbroserwindowhasdirectoriesorextrabuttons;
                }
                if (newbrowserwindowhasstatusbar != null) {
                    str += (wroteone == 1 ? ',' : '') + 'status=' + newbrowserwindowhasstatusbar;
                }
                if (newbrowserwindowhasmenubar != null) {
                    str += (wroteone == 1 ? ',' : '') + 'menubar=' + newbrowserwindowhasmenubar;
                }
                if (newbrowserwindowcopyhistory != null) {
                    str += (wroteone == 1 ? ',' : '') + 'copyhistory=' + newbrowserwindowcopyhistory;
                }
                window.open(url, nameofnewbrowserwindow, str);
            } else {
                if (nobrowserhistory == 1) {
                    window.location.replace(url);
                } else {
                    window.location.href = url;
                }
            }
        }, canvasid);
    }
    return windowid;
}

//TreeView code starts here

var treeViewPropsArray = new Array();

function getTreeViewProps(canvasid, windowid) {
    for (var i = 0; i < treeViewPropsArray.length; i++) {
        if (treeViewPropsArray[i].CanvasID == canvasid && treeViewPropsArray[i].WindowID == windowid) {
            return treeViewPropsArray[i];
        }
    }
}

function findNumberOfExpandedNodesInAll(nodes) {
    var count = 0;
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].Expanded == 1)
            count++;
        if(nodes[i].ChildNodes.length > 0) {
            count += findNumberOfExpandedNodesInAll(nodes[i].ChildNodes);
        }
    }
    return count;
}

function findIfImageAlreadyInIconImages(imageurl, iconimages) {
    for (var i = 0; i < iconimages.length; i++) {
        if (iconimages[i].ImageURL == imageurl) {
            return 1;
        }
    }
    return 0;
}

function fillIconImages(nodes, images) {
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].ImageURL != null && nodes[i].ImageURL.length > 0 && findIfImageAlreadyInIconImages(nodes[i].ImageURL, images) == 0) {
            var image = new Image();
            image.onload = function () {  };
            image.src = nodes[i].ImageURL;
            images.push({ ImageURL: nodes[i].ImageURL, Image: image });
        }
        if (nodes[i].ChildNodes.length > 0) {
            fillIconImages(nodes[i].ChildNodes, images);
        }
    }
    return images;
}

function findNodeIndex(node, childnodes) {
    for (var i = 0; i < childnodes.length; i++) {
        if (node == childnodes[i]) {
            return i;
        } else if (childnodes[i].ChildNodes && childnodes[i].ChildNodes.length > 0) {
            return i + findNodeIndex(node, childnodes[i].ChildNodes);
        }
    }
    return 0;
}

function treeviewVSCustomIncrementFunction(currNode, scrollbarProps, incordec) {
    var nodearray = new Array();
    for (var i = 0; i < currNode.TreeviewNodeInstancesRootNodes.length; i++) {
        nodearray.push(currNode.TreeviewNodeInstancesRootNodes[i]);
        if (currNode.TreeviewNodeInstancesRootNodes[i].ChildNodes.length > 0 && currNode.TreeviewNodeInstancesRootNodes[i].Expanded == 1) {
            fillChildNodes(currNode.TreeviewNodeInstancesRootNodes[i].ChildNodes, nodearray);
        }
    }
    for (var i = 0; i < nodearray.length; i++) {
        if (scrollbarProps.SelectedTag == nodearray[i]) {
            if (incordec == 1) {
                if (i + 1 < nodearray.length) {
                    scrollbarProps.SelectedTag = nodearray[i + 1];
                }
            } else {
                if (i - 1 >= 0) {
                    scrollbarProps.SelectedTag = nodearray[i - 1];
                }
            }
            break;
        }
    }
    for (var i = 0; i < treeViewPropsArray.length; i++) {
        if (treeViewPropsArray[i].Nodes == currNode.TreeviewNodeInstancesRootNodes) {
            invalidateRect(treeViewPropsArray[i].CanvasID, null, treeViewPropsArray[i].X, treeViewPropsArray[i].Y, treeViewPropsArray[i].Width, treeViewPropsArray[i].Height);
            treeViewPropsArray[i].SelectedNode = scrollbarProps.SelectedTag;
            break;
        }
    }
}

function treeviewVSCustomMouseMoveFunction(scrollBarProps, selectedID) {
    var treeviewprops = null;
    for (var i = 0; i < treeViewPropsArray.length; i++) {
        if (scrollBarProps.WindowID == treeViewPropsArray[i].VScrollBarWindowID) {
            treeviewprops = treeViewPropsArray[i];
        }
    }
    if (treeviewprops != null) {
        var nodearray = new Array();
        for (var i = 0; i < treeviewprops.Nodes.length; i++) {
            nodearray.push(treeviewprops.Nodes[i]);
            if (treeviewprops.Nodes[i].ChildNodes.length > 0 && treeviewprops.Nodes[i].Expanded == 1) {
                fillChildNodes(treeviewprops.Nodes[i].ChildNodes, nodearray);
            }
        }
        if (selectedID >= 0 && selectedID < nodearray.length) {
            scrollBarProps.SelectedTag = nodearray[selectedID];
            treeviewprops.SelectedNode = nodearray[selectedID];
        }
    }
}

function createTreeView(canvasid, controlNameId, x, y, width, height, depth, nodes,
    textcolor, textfontstring, textheight, clickNodeFunction, tag, hasicons, iconwidth, iconheight, selectednode) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'TreeView', controlNameId);
    var shownitemscount = findNumberOfExpandedNodesInAll(nodes);
    var iconimages = (hasicons == 1 ? fillIconImages(nodes, new Array()) : new Array());
    var vscrollbarwindowid = createScrollBar(canvasid, controlNameId + 'VS', x + width, y, height, depth, shownitemscount, 1, windowid, null, null, null,
        treeviewVSCustomIncrementFunction, selectednode != null ? selectednode : nodes != null && nodes.length > 0 ? nodes[0] : null,
        treeviewVSCustomMouseMoveFunction);
    var hscrollbarwindowid = createScrollBar(canvasid, controlNameId + 'HS', x, y + height, width, depth, shownitemscount, 0, windowid);
    var clickButtonExtents = new Array();
    var clickLabelExtents = new Array();
    treeViewPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height,
        Nodes: nodes, VScrollBarWindowID: vscrollbarwindowid, HScrollBarWindowID: hscrollbarwindowid, 
        ClickButtonExtents: clickButtonExtents, ClickLabelExtents: clickLabelExtents, ClickNodeFunction: clickNodeFunction,
        SelectedNode: selectednode != null ? selectednode : nodes != null && nodes.length > 0 ? nodes[0] : null, Tag: tag, HasIcons: hasicons, IconWidth: iconwidth,
        IconHeight: iconheight, IconImages: iconimages, TextColor: textcolor, TextFontString: textfontstring, TextHeight: textheight
    });
    registerWindowDrawFunction(windowid, drawTreeView, canvasid);
    registerClickFunction(windowid, clickTreeView, canvasid);
    return windowid;
}

function toggleNodeExpandedState(treeViewProps, p) {
    if (p.Expanded == 0) {
        p.Expanded = 1;
    } else {
        p.Expanded = 0;
    }
}

function clickTreeView(canvasid, windowid, e) {
    var treeViewProps = getTreeViewProps(canvasid, windowid);
    var scrollBarProps = getScrollBarProps(canvasid, treeViewProps.VScrollBarWindowID);
    var x = e.calcX;
    var y = e.calcY;
    for (var i = 0; i < treeViewProps.ClickButtonExtents.length; i++) {
        if (treeViewProps.ClickButtonExtents[i].Node && x > treeViewProps.ClickButtonExtents[i].X &&
            x < treeViewProps.ClickButtonExtents[i].X + 9 && y > treeViewProps.ClickButtonExtents[i].Y &&
            y < treeViewProps.ClickButtonExtents[i].Y + 9) {
            toggleNodeExpandedState(treeViewProps, treeViewProps.ClickButtonExtents[i].Node);
            scrollBarProps.MaxItems = checkHowManyChildNodesAreExpandedInAll(treeViewProps.Nodes);
            invalidateRect(canvasid, null, treeViewProps.X, treeViewProps.Y, treeViewProps.Width, treeViewProps.Height);
            return;
        }
    }
    if (treeViewProps.ClickNodeFunction != null) {
        for (var i = 0; i < treeViewProps.ClickLabelExtents.length; i++) {
            if (treeViewProps.ClickLabelExtents[i].Node && x > treeViewProps.ClickLabelExtents[i].X &&
                x < treeViewProps.ClickLabelExtents[i].X + treeViewProps.ClickLabelExtents[i].Width &&
                y > treeViewProps.ClickLabelExtents[i].Y && y < treeViewProps.ClickLabelExtents[i].Y + treeViewProps.ClickLabelExtents[i].TextHeight) {
                treeViewProps.ClickNodeFunction(canvasid, windowid, treeViewProps.ClickLabelExtents[i].Node);
                treeViewProps.SelectedNode = treeViewProps.ClickLabelExtents[i].Node;
                invalidateRect(canvasid, null, treeViewProps.X, treeViewProps.Y, treeViewProps.Width, treeViewProps.Height);
                return;
            }
        }
    }
}

function checkIfParentsAreExpanded(treeViewProps, node) {
    if (node.TreeviewNodeInstancesParentNode == null) {
        return 1;
    }
    var currNode = node;
    while (currNode.TreeviewNodeInstancesParentNode != null) {
        if (currNode.Expanded == 0)
            return 0;
        currNode = currNode.TreeviewNodeInstancesParentNode;
    }
    return 1;
}

function checkIfStringAndConvertToInt(o) {
    if (typeof o == 'string') {
        return parseInt(o);
    }
    return o;
}

function fillChildNodes(childnodes, nodearray) {
    for (var i = 0; i < childnodes.length; i++) {
        nodearray.push(childnodes[i]);
        if (childnodes[i].ChildNodes.length > 0 && childnodes[i].Expanded == 1) {
            fillChildNodes(childnodes[i].ChildNodes, nodearray);
        }
    }
}

function drawTreeView(canvasid, windowid) {
    var treeViewProps = getTreeViewProps(canvasid, windowid);
    var ctx = getCtx(canvasid);
    ctx.save();
    ctx.strokeStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.rect(treeViewProps.X, treeViewProps.Y, treeViewProps.Width, treeViewProps.Height);
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(treeViewProps.X, treeViewProps.Y, treeViewProps.Width, treeViewProps.Height);
    ctx.clip();
    ctx.fillStyle = treeViewProps.TextColor;
    ctx.font = treeViewProps.TextFontString;
    var heightoffset = 0;
    treeViewProps.ClickButtonExtents = new Array();
    treeViewProps.ClickLabelExtents = new Array();
    var nodearray = new Array();
    for (var i = 0; i < treeViewProps.Nodes.length; i++) {
        nodearray.push(treeViewProps.Nodes[i]);
        if (treeViewProps.Nodes[i].ChildNodes.length > 0 && treeViewProps.Nodes[i].Expanded == 1) {
            fillChildNodes(treeViewProps.Nodes[i].ChildNodes, nodearray);
        }
    }
    var foundnode = 0;
    for (var i = 0; i < nodearray.length && heightoffset < treeViewProps.Height; i++) {
        if (nodearray[i] == treeViewProps.SelectedNode) {
            foundnode = 1;
        }
        if (foundnode == 1) {
            var y = 4 + treeViewProps.Y + heightoffset;
            var level = findNodeLevel(nodearray[i]);
            drawTreeViewNode(ctx, nodearray[i], 4 + treeViewProps.X, 4 + treeViewProps.Y + heightoffset,
                treeViewProps.TextColor, treeViewProps.TextFontString, treeViewProps.TextHeight, level,
                treeViewProps.IconWidth, treeViewProps.IconHeight, treeViewProps.IconImages, treeViewProps);
            heightoffset += (treeViewProps.TextHeight > treeViewProps.IconHeight ? (treeViewProps.TextHeight > 9 ? treeViewProps.TextHeight : 9) :
                (treeViewProps.IconHeight > 9 ? treeViewProps.IconHeight : 9)) + 8;
        }
    }
    ctx.restore();
}

function findNodeLevel(node) {
    if (node.TreeviewNodeInstancesParentNode == null)
        return 0;
    else
        return 1 + findNodeLevel(node.TreeviewNodeInstancesParentNode);
}

function numberOfChildNodes(node) {
    var count = node.ChildNodes.length;
    if (count > 0) {
        for (var i = 0; i < node.ChildNodes.length; i++) {
            count += numberOfChildNodes(node.ChildNodes[i]);
        }
    }
    return count;
}

function checkHowManyChildNodesAreExpanded(node) {
    var count = node.ChildNodes.length;
    if (count > 0) {
        for (var i = 0; i < node.ChildNodes.length; i++) {
            if (node.ChildNodes[i].Expanded == 1) {
                count++;
                if (node.ChildNodes[i].ChildNodes.length > 0) {
                    count += checkHowManyChildNodesAreExpanded(node.ChildNodes[i]);
                }
            }
        }
    }
    return count;
}

function checkHowManyChildNodesAreExpandedInAll(nodes) {
    var count = 0;
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].Expanded == 1) {
            count++;
            if (nodes[i].ChildNodes.length > 0) {
                count += nodes[i].ChildNodes.length;
                count += checkHowManyChildNodesAreExpandedInAll(nodes[i].ChildNodes);
            }
        }
    }
    return count;
}

function drawTreeViewNode(ctx, node, x, y, textcolor, textfontstring, textHeight, level, iconWidth, iconHeight, iconImages, treeviewProps) {
    x += level * 8 + (level == 0 ? 2 : 10);
    if (node.ChildNodes.length > 0) {
        ctx.strokeStyle = '#3c7fb1';
        ctx.beginPath();
        ctx.rect(x, y, 10, 10);
        treeviewProps.ClickButtonExtents.push({ X: x, Y: y, Node: node });
        ctx.stroke();
        ctx.fillStyle = '#dcf0fb';
        ctx.beginPath();
        ctx.rect(x + 1, y + 1, 8, 5);
        ctx.fill();
        ctx.fillStyle = '#a7d8f3';
        ctx.beginPath();
        ctx.rect(x + 1, y + 6, 8, 4);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 5);
        ctx.lineTo(x + 8, y + 5);
        ctx.stroke();
        if (node.Expanded == 0) {
            ctx.beginPath();
            ctx.moveTo(x + 5, y + 2);
            ctx.lineTo(x + 5, y + 8);
            ctx.stroke();
        }
        numOfChildNodes = checkHowManyChildNodesAreExpanded(node);
        if (node.ChildNodes.length > 0) {
            if (numOfChildNodes == 0) {
                ctx.strokeStyle = '#000000';
                ctx.beginPath();
                ctx.moveTo(x + 5, y + 2);
                ctx.lineTo(x + 5, y + 8);
                ctx.stroke();
            }
            /*
            if (level > 0) {
                ctx.strokeStyle = '#C0C0C0';
                ctx.beginPath();
                ctx.moveTo(x - 11, y + 5);
                ctx.lineTo(x, y + 5);
                ctx.stroke();
            }
            */
        }
    } else {
        /*
        ctx.strokeStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.moveTo(x - 11, y + 5);
        ctx.lineTo(x + 9, y + 5);
        ctx.stroke();*/
    }
    var xoffset = 0;
    if (node.ImageURL != null) {
        for (var w = 0; w < iconImages.length; w++) {
            if (node.ImageURL == iconImages[w].ImageURL) {
                ctx.drawImage(iconImages[w].Image, x + 13, y);
                xoffset += iconWidth + 5;
                break;
            }
        }
    }
    ctx.fillStyle = textcolor;
    ctx.font = textfontstring;
    ctx.fillText(node.Label, x + 13 + xoffset, y + textHeight);
    treeviewProps.ClickLabelExtents.push({ X: x + 13, Y: y, Width: ctx.measureText(node.Label).width + xoffset, TextHeight: textHeight, TreeviewClickLabelExtentsNode: node });
}

function insertTreeviewNode(canvasid, windowid, nodeidtoinsertbefore, nodearraydata) {
    var treeviewProps = getTreeViewProps(canvasid, windowid);
    for (var i = 0; i < treeviewProps.Data.length; i++) {
        if (nodeidtoinsertbefore) {
            if (treeviewProps.Data[i][0] == nodeidtoinsertbefore) {
                treeviewProps.Data.splice(i, 0, nodearraydata);
            }
        } else {
            treeviewProps.Data.push(nodearraydata);
        }
    }
}

function addChildNodes(nodes, parentnode, imageurl, expanded, label, customextrainfo) {
    var node = {
        TreeviewNodeInstancesParentNode: parentnode, TreeviewNodeInstancesRootNodes: nodes, ImageURL: imageurl, Expanded: expanded, ChildNodes: new Array(), Label: label,
        CustomExtraInfo: customextrainfo
    };
    if (parentnode == null) {
        nodes.push(node);
    } else {
        parentnode.ChildNodes.push(node);
    }
    return node;
}

//Calender Control Code Starts Here
var calenderPropsArray = new Array();

function getCalenderProps(canvasid, windowid) {
    for (var i = 0; i < calenderPropsArray.length; i++) {
        if (calenderPropsArray[i].CanvasID == canvasid && calenderPropsArray[i].WindowID == windowid) {
            return calenderPropsArray[i];
        }
    }
}

function drawCalender(canvasid, windowid) {
    var calenderProps = getCalenderProps(canvasid, windowid);
    var ctx = getCtx(canvasid);
    var visibleMonth = new Date('1 ' + calenderProps.VisibleMonth + ' ' + calenderProps.VisibleYear);
    var todaysDate = new Date();
    ctx.fillStyle = calenderProps.HeaderBackgroundColor;
    ctx.beginPath();
    ctx.rect(calenderProps.X, calenderProps.Y, calenderProps.Width, calenderProps.HeaderHeight);
    ctx.fill();
    ctx.fillStyle = calenderProps.BodyBackgroundColor;
    ctx.beginPath();
    ctx.rect(calenderProps.X, calenderProps.Y + calenderProps.HeaderHeight, calenderProps.Width, calenderProps.Height - calenderProps.HeaderHeight);
    ctx.fill();
    var buttonClickExtents = new Array();
    ctx.fillStyle = '#C0C0C0';
    ctx.font = calenderProps.TextHeaderFontString;
    var maxmonthwidth = ctx.measureText('September').width;
    var maxyearwidth = ctx.measureText('0000').width;
    var headeroffsetx = calenderProps.X + ((calenderProps.Width - (68 + maxmonthwidth + maxyearwidth)) / 2);
    ctx.beginPath();
    ctx.moveTo(headeroffsetx + 4, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2) + 6);
    ctx.lineTo(headeroffsetx + 15, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2));
    ctx.lineTo(headeroffsetx + 15, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2) + 11);
    ctx.closePath();
    ctx.fill();
    buttonClickExtents.push({ X: headeroffsetx + 4, Y: calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2), Width: 11, Height: 11 });
    ctx.beginPath();
    ctx.moveTo(headeroffsetx + 23 + maxmonthwidth, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2));
    ctx.lineTo(headeroffsetx + 23 + maxmonthwidth, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2) + 11);
    ctx.lineTo(headeroffsetx + 34 + maxmonthwidth, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2) + 6);
    ctx.closePath();
    ctx.fill();
    buttonClickExtents.push({ X: headeroffsetx + 23 + maxmonthwidth, Y: calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2), Width: 11, Height: 11 });
    ctx.beginPath();
    ctx.moveTo(headeroffsetx + 38 + maxmonthwidth, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2) + 6);
    ctx.lineTo(headeroffsetx + 49 + maxmonthwidth, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2));
    ctx.lineTo(headeroffsetx + 49 + maxmonthwidth, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2) + 11);
    ctx.closePath();
    ctx.fill();
    buttonClickExtents.push({ X: headeroffsetx + 38 + maxmonthwidth, Y: calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2), Width: 11, Height: 11 });
    ctx.beginPath();
    ctx.moveTo(headeroffsetx + 57 + maxmonthwidth + maxyearwidth, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2));
    ctx.lineTo(headeroffsetx + 57 + maxmonthwidth + maxyearwidth, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2) + 11);
    ctx.lineTo(headeroffsetx + 68 + maxmonthwidth + maxyearwidth, calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2) + 6);
    ctx.closePath();
    ctx.fill();
    buttonClickExtents.push({ X: headeroffsetx + 57 + maxmonthwidth + maxyearwidth, Y: calenderProps.Y + ((calenderProps.HeaderHeight - 11) / 2), Width: 11, Height: 11 });
    calenderProps.ButtonClickExtents = buttonClickExtents;
    ctx.fillStyle = calenderProps.TextHeaderColor;
    ctx.fillText(calenderProps.VisibleMonth, headeroffsetx + 19 + ((maxmonthwidth - ctx.measureText(calenderProps.VisibleMonth).width) / 2),
        calenderProps.Y + ((calenderProps.HeaderHeight - calenderProps.TextHeaderHeight) / 2) + calenderProps.TextHeaderHeight);
    ctx.fillText(calenderProps.VisibleYear, headeroffsetx + 53 + maxmonthwidth, calenderProps.Y + ((calenderProps.HeaderHeight -
        calenderProps.TextHeaderHeight) / 2) + calenderProps.TextHeaderHeight);
    var currday = (visibleMonth.getDay() > 0 ? new Date(visibleMonth.getTime() - (visibleMonth.getDay() * 24 * 60 * 60 * 1000)) : visibleMonth);
    var dateClickExtents = new Array();
    var daylabel = null;
    for (var i = 0; i < 7; i++) {
        switch (i) {
            case 0:
                daylabel = 'Sun';
                break;
            case 1:
                daylabel = 'Mon';
                break;
            case 2:
                daylabel = 'Tue';
                break;
            case 3:
                daylabel = 'Wed';
                break;
            case 4:
                daylabel = 'Thu';
                break;
            case 5:
                daylabel = 'Fri';
                break;
            case 6:
                daylabel = 'Sat';
                break;
        }
        ctx.fillStyle = calenderProps.DayLabelTextColor;
        ctx.font = calenderProps.DayLabelTextFontString;
        ctx.fillText(daylabel, calenderProps.X + 4 + ((i % 7) * calenderProps.DayCellWidth) +
            ((calenderProps.DayCellWidth - ctx.measureText(daylabel).width) / 2),
            calenderProps.Y + calenderProps.HeaderHeight + 4 + calenderProps.DayCellHeight - ((calenderProps.DayCellHeight -
            calenderProps.DayLabelTextHeight) / 2));
    }
    for (var i = 0; i < 42; i++, currday = new Date(currday.getTime() + (24 * 60 * 60 * 1000))) {
        dateClickExtents.push({
            X: calenderProps.X + 4 + ((i % 7) * calenderProps.DayCellWidth),
            Y: calenderProps.Y + calenderProps.HeaderHeight + 4 + ((Math.floor(i / 7.0) + 1) * calenderProps.DayCellHeight),
            Date: currday
        });
        var mousehover = 0;
        if (calenderProps.MouseHoverDate != null && currday.getMonth() == calenderProps.MouseHoverDate.getMonth() &&
            currday.getDate() == calenderProps.MouseHoverDate.getDate() && currday.getFullYear() == calenderProps.MouseHoverDate.getFullYear()) {
            mousehover = 1;
            ctx.fillStyle = calenderProps.MouseOverHightLightColor;
            ctx.beginPath();
            ctx.rect(calenderProps.X + 4 + ((i % 7) * calenderProps.DayCellWidth), calenderProps.Y + calenderProps.HeaderHeight + 4 +
                ((Math.floor(i / 7.0) + 1) * calenderProps.DayCellHeight), calenderProps.DayCellWidth, calenderProps.DayCellHeight);
            ctx.fill();
        }
        if (currday.getMonth() != visibleMonth.getMonth()) {
            ctx.fillStyle = calenderProps.DayDateInactiveTextColor;
            ctx.font = calenderProps.DayDateInactiveTextFontString;
            ctx.fillText(currday.getDate().toString(), calenderProps.X + 4 + ((i % 7) * calenderProps.DayCellWidth) +
                ((calenderProps.DayCellWidth - ctx.measureText(currday.getDate().toString()).width) / 2),
                calenderProps.Y + calenderProps.HeaderHeight + 4 + ((Math.floor(i / 7.0) + 2) * calenderProps.DayCellHeight) - ((calenderProps.DayCellHeight -
                    calenderProps.TodayTextHeight) / 2));
        } else {
            if (calenderProps.SelectedDay != null && currday.getMonth() == calenderProps.SelectedDay.getMonth() &&
                currday.getDate() == calenderProps.SelectedDay.getDate() && currday.getFullYear() == calenderProps.SelectedDay.getFullYear()) {
                ctx.fillStyle = calenderProps.SelectedDayHighLightColor;
                ctx.beginPath();
                ctx.rect(calenderProps.X + 4 + ((i % 7) * calenderProps.DayCellWidth), calenderProps.Y + calenderProps.HeaderHeight + 4 +
                    ((Math.floor(i / 7.0) + 1) * calenderProps.DayCellHeight), calenderProps.DayCellWidth, calenderProps.DayCellHeight);
                ctx.fill();
                ctx.fillStyle = calenderProps.SelectedDayTextColor;
                ctx.font = calenderProps.SelectedDayTextFontString;
                ctx.fillText(currday.getDate().toString(), calenderProps.X + 4 + ((i % 7) * calenderProps.DayCellWidth) +
                    ((calenderProps.DayCellWidth - ctx.measureText(currday.getDate().toString()).width) / 2),
                    calenderProps.Y + calenderProps.HeaderHeight + 4 + ((Math.floor(i / 7.0) + 2) * calenderProps.DayCellHeight) - ((calenderProps.DayCellHeight -
                    calenderProps.SelectedDayTextHeight) / 2));
            } else if (currday.getMonth() == todaysDate.getMonth() && currday.getDate() == todaysDate.getDate() && currday.getFullYear() == todaysDate.getFullYear()) {
                if (mousehover == 0) {
                    ctx.fillStyle = calenderProps.TodayHighLightColor;
                    ctx.beginPath();
                    ctx.rect(calenderProps.X + 4 + ((i % 7) * calenderProps.DayCellWidth), calenderProps.Y + calenderProps.HeaderHeight + 4 +
                        ((Math.floor(i / 7.0) + 1) * calenderProps.DayCellHeight), calenderProps.DayCellWidth, calenderProps.DayCellHeight);
                    ctx.fill();
                }
                ctx.fillStyle = calenderProps.TodayTextColor;
                ctx.font = calenderProps.TodayTextFontString;
                ctx.fillText(currday.getDate().toString(), calenderProps.X + 4 + ((i % 7) * calenderProps.DayCellWidth) +
                    ((calenderProps.DayCellWidth - ctx.measureText(currday.getDate().toString()).width) / 2),
                    calenderProps.Y + calenderProps.HeaderHeight + 4 + ((Math.floor(i / 7.0) + 2) * calenderProps.DayCellHeight) - ((calenderProps.DayCellHeight -
                    calenderProps.TodayTextHeight) / 2));
            } else {
                ctx.fillStyle = calenderProps.DayDateActiveColor;
                ctx.font = calenderProps.DayDateActiveTextFontString;
                ctx.fillText(currday.getDate().toString(), calenderProps.X + 4 + ((i % 7) * calenderProps.DayCellWidth) +
                    ((calenderProps.DayCellWidth - ctx.measureText(currday.getDate().toString()).width) / 2),
                    calenderProps.Y + calenderProps.HeaderHeight + 4 + ((Math.floor(i / 7.0) + 2) * calenderProps.DayCellHeight) - ((calenderProps.DayCellHeight -
                    calenderProps.DayDateActiveTextHeight) / 2));
            }
        }
    }
    calenderProps.DateClickExtents = dateClickExtents;
}

function createCalendar(canvasid, controlNameId, x, y, width, height, depth, visibleMonth, visibileYear, selectedDay, dayCellWidth, dayCellHeight, headerHeight,
    headerBackgroundColor, bodyBackgroundColor, textHeaderColor, textHeaderHeight, textHeaderFontString,
    dayDateActiveColor, dayDateActiveTextHeight, dayDateActiveTextFontString,
    dayDateInactiveTextColor, dayDateInactiveTextHeight, dayDateInactiveTextFontString, selectedDayTextColor, selectedDayTextHeight,
    selectedDayTextFontString, selectedDayHighLightColor, todayTextColor, todayTextHeight, todayTextFontString, todayHighLightColor,
    mouseoverHightlightColor, ondayClickFunction, dayLabelTextColor, dayLabelTextHeight, dayLabelTextFontString, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'Calender', controlNameId);
    calenderPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, VisibleMonth: visibleMonth, VisibleYear: visibileYear,
        SelectedDay: new Date(selectedDay), DayCellWidth: dayCellWidth, DayCellHeight: dayCellHeight, HeaderHeight: headerHeight,
        TextHeaderColor: textHeaderColor, TextHeaderHeight: textHeaderHeight, TextHeaderFontString: textHeaderFontString,
        DayDateActiveColor: dayDateActiveColor, DayDateActiveTextHeight: dayDateActiveTextHeight,
        DayDateActiveTextFontString: dayDateActiveTextFontString, DayDateInactiveTextColor: dayDateInactiveTextColor,
        DayDateInactiveTextHeight: dayDateInactiveTextHeight, DayDateInactiveTextFontString: dayDateInactiveTextFontString,
        SelectedDayTextColor: selectedDayTextColor, SelectedDayTextHeight: selectedDayTextHeight,
        SelectedDayTextFontString: selectedDayTextFontString, SelectedDayHighLightColor: selectedDayHighLightColor,
        TodayTextColor: todayTextColor, TodayTextHeight: todayTextHeight, TodayTextFontString: todayTextFontString,
        TodayHighLightColor: todayHighLightColor, OnDayClickFunction: ondayClickFunction,
        HeaderBackgroundColor: headerBackgroundColor, BodyBackgroundColor: bodyBackgroundColor,
        MouseOverHightLightColor: mouseoverHightlightColor, MouseHoverDate: null, ButtonClickExtents: null, DateClickExtents: null,
        DayLabelTextColor: dayLabelTextColor, DayLabelTextHeight: dayLabelTextHeight, Tag: tag, DayLabelTextFontString: dayLabelTextFontString
    });
    registerWindowDrawFunction(windowid, drawCalender, canvasid);
    registerClickFunction(windowid, calenderClick, canvasid);
    registerMouseOverFunction(windowid, calenderMouseOver, canvasid);
    return windowid;
}

function getMonthName(x) {
    switch (x) {
        case 0:
            return 'January';
        case 1:
            return 'Febuary';
        case 2:
            return 'March';
        case 3:
            return 'April';
        case 4:
            return 'May';
        case 5:
            return 'June';
        case 6:
            return 'July';
        case 7:
            return 'August';
        case 8:
            return 'September';
        case 9:
            return 'October';
        case 10:
            return 'November';
        case 11:
            return 'December';
    }
}

function calenderClick(canvasid, windowid, e) {
    var calenderProps = getCalenderProps(canvasid, windowid);
    var x = e.calcX;
    var y = e.calcY;
    var visibleMonth = new Date('1 ' + calenderProps.VisibleMonth + ' ' + calenderProps.VisibleYear);
    for (var i = 0; i < calenderProps.ButtonClickExtents.length; i++) {
        if (x > calenderProps.ButtonClickExtents[i].X && x < calenderProps.ButtonClickExtents[i].X + calenderProps.ButtonClickExtents[i].Width &&
            y > calenderProps.ButtonClickExtents[i].Y && y < calenderProps.ButtonClickExtents[i].Y + calenderProps.ButtonClickExtents[i].Height) {
            switch (i) {
                case 0:
                    if (visibleMonth.getMonth() == 0) {
                        calenderProps.VisibleMonth = 'December';
                        calenderProps.VisibleYear = (parseInt(calenderProps.VisibleYear, 10) - 1).toString();
                    } else {
                        calenderProps.VisibleMonth = getMonthName(visibleMonth.getMonth() - 1);
                    }
                    return;
                case 1:
                    if (visibleMonth.getMonth() == 11) {
                        calenderProps.VisibleMonth = 'January';
                        calenderProps.VisibleYear = (parseInt(calenderProps.VisibleYear, 10) + 1).toString();
                    } else {
                        calenderProps.VisibleMonth = getMonthName(visibleMonth.getMonth() + 1);
                    }
                    return;
                case 2:
                    calenderProps.VisibleYear = (parseInt(calenderProps.VisibleYear, 10) - 1).toString();
                    return;
                case 3:
                    calenderProps.VisibleYear = (parseInt(calenderProps.VisibleYear, 10) + 1).toString();
                    return;
            }
        }
    }
    for (var i = 0; i < calenderProps.DateClickExtents.length; i++) {
        if (x > calenderProps.DateClickExtents[i].X && x < calenderProps.DateClickExtents[i].X + calenderProps.DayCellWidth &&
            y > calenderProps.DateClickExtents[i].Y && y < calenderProps.DateClickExtents[i].Y + calenderProps.DayCellHeight) {
            calenderProps.SelectedDay = calenderProps.DateClickExtents[i].Date;
            if (calenderProps.OnDayClickFunction != null) {
                calenderProps.OnDayClickFunction(calenderProps.CanvasID, calenderProps.WindowID, calenderProps.SelectedDay);
            }
            return;
        }
    }
}

function calenderMouseOver(canvasid, windowid, e) {
    var calenderProps = getCalenderProps(canvasid, windowid);
    var x = e.calcX;
    var y = e.calcY;
    for (var i = 0; i < calenderProps.DateClickExtents.length; i++) {
        if (x > calenderProps.DateClickExtents[i].X && x < calenderProps.DateClickExtents[i].X + calenderProps.DayCellWidth &&
            y > calenderProps.DateClickExtents[i].Y && y < calenderProps.DateClickExtents[i].Y + calenderProps.DayCellHeight) {
            calenderProps.MouseHoverDate = calenderProps.DateClickExtents[i].Date;
            return;
        }
    }
}

//ProgressBar Code starts here

var progressBarPropsArray = new Array();

function getProgressBarProps(canvasid, windowid) {
    for (var i = 0; i < progressBarPropsArray.length; i++) {
        if (progressBarPropsArray[i].CanvasID == canvasid && progressBarPropsArray[i].WindowID == windowid) {
            return progressBarPropsArray[i];
        }
    }
}

function createProgressBar(canvasid, controlNameId, x, y, width, height, depth, color, maxvalue, minvalue, currentvalue, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'ProgressBar', controlNameId);
    progressBarPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Color: color, MaxValue: maxvalue,
        MinValue: minvalue, CurrentValue: currentvalue, Tag: tag
    });
    registerWindowDrawFunction(windowid, drawProgressBar, canvasid);
    return windowid;
}

function setProgressBarCurrentValue(canvasid, windowid, value) {
    var progressBarProps = getProgressBarProps(canvasid, windowid);
    progressBarProps.CurrentValue = value;
    invalidateRect(canvasid, null, progressBarProps.X, progressBarProps.Y, progressBarProps.Width, progressBarProps.Height);
}

function drawProgressBar(canvasid, windowid) {
    var progressBarProps = getProgressBarProps(canvasid, windowid);
    var ctx = getCtx(canvasid);
    var g = ctx.createLinearGradient(progressBarProps.X, progressBarProps.Y, progressBarProps.X, progressBarProps.Y + progressBarProps.Height);
    g.addColorStop(0, '#f4f5f6');
    g.addColorStop(1, '#eaeced');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(progressBarProps.X, progressBarProps.Y + 5);
    ctx.arc(progressBarProps.X + 5, progressBarProps.Y + 5, 5, Math.PI, (Math.PI * 270) / 180, false);
    ctx.lineTo(progressBarProps.X + progressBarProps.Width - 5, progressBarProps.Y);
    ctx.arc(progressBarProps.X + progressBarProps.Width - 5, progressBarProps.Y + 5, 5, (Math.PI * 270) / 180, Math.PI * 2, false);
    ctx.lineTo(progressBarProps.X + progressBarProps.Width, progressBarProps.Y + progressBarProps.Height - 5);
    ctx.arc(progressBarProps.X + progressBarProps.Width - 5, progressBarProps.Y + progressBarProps.Height - 5, 5, 0, Math.PI / 2, false);
    ctx.lineTo(progressBarProps.X + 5, progressBarProps.Y + progressBarProps.Height);
    ctx.arc(progressBarProps.X + 5, progressBarProps.Y + progressBarProps.Height - 5, 5, Math.PI / 2, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a9b2bb';
    ctx.beginPath();
    ctx.moveTo(progressBarProps.X, progressBarProps.Y + 5);
    ctx.arc(progressBarProps.X + 5, progressBarProps.Y + 5, 5, Math.PI, (Math.PI * 270) / 180, false);
    ctx.lineTo(progressBarProps.X + progressBarProps.Width - 5, progressBarProps.Y);
    ctx.arc(progressBarProps.X + progressBarProps.Width - 5, progressBarProps.Y + 5, 5, (Math.PI * 270) / 180, Math.PI * 2, false);
    ctx.stroke();
    ctx.strokeStyle = '#768694';
    ctx.beginPath();
    ctx.moveTo(progressBarProps.X + progressBarProps.Width, progressBarProps.Y + 5);
    ctx.lineTo(progressBarProps.X + progressBarProps.Width, progressBarProps.Y + progressBarProps.Height - 5);
    ctx.arc(progressBarProps.X + progressBarProps.Width - 5, progressBarProps.Y + progressBarProps.Height - 5, 5, 0, Math.PI / 2, false);
    ctx.moveTo(progressBarProps.X + 5, progressBarProps.Y + progressBarProps.Height);
    ctx.arc(progressBarProps.X + 5, progressBarProps.Y + progressBarProps.Height - 5, 5, Math.PI / 2, Math.PI, false);
    ctx.lineTo(progressBarProps.X, progressBarProps.Y + 5);
    ctx.stroke();
    ctx.strokeStyle = '#657582';
    ctx.beginPath();
    ctx.moveTo(progressBarProps.X + 5, progressBarProps.Y + progressBarProps.Height);
    ctx.lineTo(progressBarProps.X + progressBarProps.Width - 5, progressBarProps.Y + progressBarProps.Height);
    ctx.stroke();
    var pgwidth = ((progressBarProps.CurrentValue - progressBarProps.MinValue) * progressBarProps.Width)/(progressBarProps.MaxValue - progressBarProps.MinValue);
    var g2 = ctx.createLinearGradient(progressBarProps.X, progressBarProps.Y, progressBarProps.X, progressBarProps.Y + progressBarProps.Height);
    var redcomp = parseInt(progressBarProps.Color.substr(1, 2), 16);
    var greencomp = parseInt(progressBarProps.Color.substr(3, 2), 16);
    var bluecomp = parseInt(progressBarProps.Color.substr(5, 2), 16);
    g2.addColorStop(0.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
    g2.addColorStop(0.5, progressBarProps.Color);
    g2.addColorStop(1.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(progressBarProps.X + 2, progressBarProps.Y + 7);
    ctx.arc(progressBarProps.X + 7, progressBarProps.Y + 7, 5, Math.PI, (Math.PI * 270) / 180, false);
    ctx.lineTo(progressBarProps.X + pgwidth - 7, progressBarProps.Y + 2);
    ctx.arc(progressBarProps.X + pgwidth - 7, progressBarProps.Y + 7, 5, (Math.PI * 270) / 180, Math.PI * 2, false);
    ctx.lineTo(progressBarProps.X + pgwidth - 2, progressBarProps.Y + progressBarProps.Height - 7);
    ctx.arc(progressBarProps.X + pgwidth - 7, progressBarProps.Y + progressBarProps.Height - 7, 5, 0, Math.PI / 2, false);
    ctx.lineTo(progressBarProps.X + 7, progressBarProps.Y + progressBarProps.Height - 2);
    ctx.arc(progressBarProps.X + 7, progressBarProps.Y + progressBarProps.Height - 7, 5, Math.PI / 2, Math.PI, false);
    ctx.closePath();
    ctx.fill();
}

//Slider Control code starts here

var sliderPropsArray = new Array();

function getSliderProps(canvasid, windowid) {
    for (var i = 0; i < sliderPropsArray.length; i++) {
        if (sliderPropsArray[i].CanvasID == canvasid && sliderPropsArray[i].WindowID == windowid) {
            return sliderPropsArray[i];
        }
    }
}

function drawSlider(canvasid, windowid) {
    var sliderProps = getSliderProps(canvasid, windowid);
    var ctx = getCtx(canvasid);
    ctx.strokeStyle = '#a3aeb9';
    ctx.beginPath();
    ctx.rect(sliderProps.X, sliderProps.Y + (sliderProps.HandleHeight / 2) - 1, sliderProps.Width, 3);
    ctx.stroke();
    ctx.strokeStyle = '#e6eff7';
    ctx.beginPath();
    ctx.moveTo(sliderProps.X + 1, sliderProps.Y + (sliderProps.HandleHeight / 2));
    ctx.lineTo(sliderProps.X + sliderProps.Width - 1, sliderProps.Y + (sliderProps.HandleHeight / 2));
    ctx.stroke();
    var pgwidth = ((sliderProps.CurrentValue - sliderProps.MinValue) * sliderProps.Width) / (sliderProps.MaxValue - sliderProps.MinValue) - (sliderProps.HandleWidth / 2);
    var g = ctx.createLinearGradient(sliderProps.X + pgwidth, sliderProps.Y, sliderProps.X + pgwidth, sliderProps.Y + sliderProps.HandleHeight);
    g.addColorStop(0, '#fdfdfd');
    g.addColorStop(1, '#ced4d9');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.rect(sliderProps.X + pgwidth, sliderProps.Y, sliderProps.HandleWidth, sliderProps.HandleHeight);
    ctx.fill();
    ctx.strokeStyle = '#a0abb7';
    ctx.beginPath();
    ctx.moveTo(sliderProps.X + pgwidth + 1, sliderProps.Y);
    ctx.lineTo(sliderProps.X + pgwidth + sliderProps.HandleWidth - 1, sliderProps.Y);
    ctx.stroke();
    ctx.strokeStyle = '#8094a4';
    ctx.beginPath();
    ctx.moveTo(sliderProps.X + pgwidth, sliderProps.Y + 1);
    ctx.lineTo(sliderProps.X + pgwidth, sliderProps.Y + sliderProps.HandleHeight - 1);
    ctx.moveTo(sliderProps.X + pgwidth + sliderProps.HandleWidth, sliderProps.Y + 1);
    ctx.lineTo(sliderProps.X + pgwidth + sliderProps.HandleWidth, sliderProps.Y + sliderProps.HandleHeight - 1);
    ctx.stroke();
    ctx.strokeStyle = '#617584';
    ctx.beginPath();
    ctx.moveTo(sliderProps.X + pgwidth + 1, sliderProps.Y + sliderProps.HandleHeight);
    ctx.lineTo(sliderProps.X + pgwidth + sliderProps.HandleWidth - 1, sliderProps.Y + sliderProps.HandleHeight);
    ctx.stroke();
}

function sliderMouseDown(canvasid, windowid) {
    var sliderProps = getSliderProps(canvasid, windowid);
    sliderProps.MouseDownState = 1;
}

function sliderMouseMove(canvasid, windowid, e) {
    var sliderProps = getSliderProps(canvasid, windowid);
    if (sliderProps.MouseDownState == 1) {
        var x = e.calcX;
        if (x < sliderProps.X) {
            sliderProps.CurrentValue = sliderProps.MinValue;
        } else if (x > sliderProps.X + sliderProps.Width) {
            sliderProps.CurrentValue = sliderProps.MaxValue;
        } else {
            sliderProps.CurrentValue = sliderProps.MinValue + (((x - sliderProps.X) * (sliderProps.MaxValue - sliderProps.MinValue)) / sliderProps.Width);
        }
    }
}

function sliderMouseUp(canvasid, windowid) {
    var sliderProps = getSliderProps(canvasid, windowid);
    sliderProps.MouseDownState = 0;
}

function createSlider(canvasid, controlNameId, x, y, width, height, depth, handlewidth, maxvalue, minvalue, value, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'Slider', controlNameId);
    sliderPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, HandleWidth: handlewidth,
        HandleHeight: height, MaxValue: maxvalue, MinValue: minvalue, CurrentValue: value, MouseDownState: 0, Tag: tag
    });
    registerWindowDrawFunction(windowid, drawSlider, canvasid);
    registerMouseDownFunction(windowid, sliderMouseDown, canvasid);
    registerMouseUpFunction(windowid, sliderMouseUp, canvasid);
    registerMouseMoveFunction(windowid, sliderMouseMove, canvasid);
    return windowid;
}

//DatePicker code starts here

var datePickerPropsArray = new Array();

function getDatePickerPropsByTextBoxAreaWindowID(canvasid, windowid) {
    for (var i = 0; i < datePickerPropsArray.length; i++) {
        if (datePickerPropsArray[i].CanvasID == canvasid && datePickerPropsArray[i].TextBoxAreaWindowID == windowid) {
            return datePickerPropsArray[i];
        }
    }
}

function getDatePickerPropsByButtonWindowID(canvasid, windowid) {
    for (var i = 0; i < datePickerPropsArray.length; i++) {
        if (datePickerPropsArray[i].CanvasID == canvasid && datePickerPropsArray[i].ButtonWindowID == windowid) {
            return datePickerPropsArray[i];
        }
    }
}

function getDatePickerPropsByCalenderWindowID(canvasid, windowid) {
    for (var i = 0; i < datePickerPropsArray.length; i++) {
        if (datePickerPropsArray[i].CanvasID == canvasid && datePickerPropsArray[i].CalenderWindowID == windowid) {
            return datePickerPropsArray[i];
        }
    }
}

function createDatePicker(canvasid, controlNameId, x, y, width, height, depth, visibleMonth, visibileYear, selectedDay, dayCellWidth, dayCellHeight, headerHeight,
    headerBackgroundColor, bodyBackgroundColor, textHeaderColor, textHeaderHeight, textHeaderFontString,
    dayDateActiveColor, dayDateActiveTextHeight, dayDateActiveTextFontString,
    dayDateInactiveTextColor, dayDateInactiveTextHeight, dayDateInactiveTextFontString, selectedDayTextColor, selectedDayTextHeight,
    selectedDayTextFontString, selectedDayHighLightColor, todayTextColor, todayTextHeight, todayTextFontString, todayHighLightColor,
    mouseoverHightlightColor, ondayClickFunction, dayLabelTextColor, dayLabelTextHeight, dayLabelTextFontString, textboxAreaTextColor,
    textboxAreaTextHeight, textboxAreaTextFontString, calenderHeight, tag) {
    var textboxAreaWindowID = createWindow(canvasid, x, y, width - height, height, depth, null, 'DatePickerTextArea', controlNameId + 'DatePickerTextArea');
    var buttonWindowID = createWindow(canvasid, x + width - height, y, height, height, depth, null, 'DatePickerButton', controlNameId + 'DatePickerButton');
    var calenderWindowID = createCalendar(canvasid, controlNameId + 'DatePickerCalender', x, y + height, width, calenderHeight, depth, visibleMonth, visibileYear, selectedDay,
        dayCellWidth, dayCellHeight, headerHeight,
        headerBackgroundColor, bodyBackgroundColor, textHeaderColor, textHeaderHeight, textHeaderFontString,
        dayDateActiveColor, dayDateActiveTextHeight, dayDateActiveTextFontString,
        dayDateInactiveTextColor, dayDateInactiveTextHeight, dayDateInactiveTextFontString, selectedDayTextColor, selectedDayTextHeight,
        selectedDayTextFontString, selectedDayHighLightColor, todayTextColor, todayTextHeight, todayTextFontString, todayHighLightColor,
        mouseoverHightlightColor, function () {
            var datePickerProps = getDatePickerPropsByTextBoxAreaWindowID(canvasid, textboxAreaWindowID);
            var calenderProps = getCalenderProps(canvasid, datePickerProps.CalenderWindowID);
            if (ondayClickFunction != null) {
                ondayClickFunction(canvasid, datePickerProps.CalenderWindowID, calenderProps.SelectedDay);
            }
            setHiddenWindowStatus(canvasid, datePickerProps.CalenderWindowID, 1);
        }, dayLabelTextColor, dayLabelTextHeight, dayLabelTextFontString);
    datePickerPropsArray.push({
        CanvasID: canvasid, WindowID: textboxAreaWindowID, TextBoxAreaWindowID: textboxAreaWindowID, ButtonWindowID: buttonWindowID,
        CalenderWindowID: calenderWindowID, X: x, Y: y, Width: width, Height: height, TextBoxAreaTextColor: textboxAreaTextColor,
        TextBoxAreaTextHeight: textboxAreaTextHeight, TextBoxAreaTextFontString: textboxAreaTextFontString, Tag: tag
    });
    registerModalWindow(canvasid, calenderWindowID);
    registerHiddenWindow(canvasid, calenderWindowID, 1);
    registerClickFunction(buttonWindowID, function (canvasid2, windowid2) {
        var datePickerProps = getDatePickerPropsByButtonWindowID(canvasid2, windowid2);
        if (checkIfHiddenWindow(canvasid, datePickerProps.CalenderWindowID) == 1) {
            setHiddenWindowStatus(canvasid, datePickerProps.CalenderWindowID, 0);
        } else {
            setHiddenWindowStatus(canvasid, datePickerProps.CalenderWindowID, 1);
        }
    }, canvasid);
    registerWindowDrawFunction(textboxAreaWindowID, function (canvasid3, windowid3) {
        var datePickerProps = getDatePickerPropsByTextBoxAreaWindowID(canvasid3, windowid3);
        var calenderProps = getCalenderProps(canvasid3, datePickerProps.CalenderWindowID);
        var ctx = getCtx(canvasid3);
        ctx.strokeStyle = '#a3aeb9';
        ctx.beginPath();
        ctx.rect(datePickerProps.X, datePickerProps.Y, datePickerProps.Width - datePickerProps.Height, datePickerProps.Height);
        ctx.stroke();
        if (calenderProps.SelectedDay != null) {
            ctx.fillStyle = datePickerProps.TextBoxAreaTextColor;
            ctx.font = datePickerProps.TextBoxAreaTextFontString;
            var seldaystr = calenderProps.SelectedDay.getDate().toString() + '/' + (calenderProps.SelectedDay.getMonth() + 1).toString() +
                '/' + calenderProps.SelectedDay.getFullYear().toString();
            ctx.fillText(seldaystr, datePickerProps.X + 4, datePickerProps.Y + datePickerProps.Height -
                ((datePickerProps.Height - datePickerProps.TextBoxAreaTextHeight) / 2));
        }
    }, canvasid);
    registerWindowDrawFunction(buttonWindowID, function (canvasid4, windowid4) {
        var datePickerProps = getDatePickerPropsByButtonWindowID(canvasid4, windowid4);
        var ctx = getCtx(canvasid4);
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#3c7fb1';
        ctx.beginPath();
        ctx.rect(datePickerProps.X + datePickerProps.Width - datePickerProps.Height, datePickerProps.Y, datePickerProps.Height, datePickerProps.Height);
        ctx.stroke();
        ctx.fillStyle = '#dcf0fb';
        ctx.beginPath();
        ctx.rect(datePickerProps.X + datePickerProps.Width - datePickerProps.Height + 1, datePickerProps.Y + 1, (datePickerProps.Height / 2) - 2, datePickerProps.Height - 2);
        ctx.fill();
        ctx.strokeStyle = '#c0e4f8';
        ctx.moveTo(datePickerProps.X + datePickerProps.Width - (datePickerProps.Height / 2) + 1, datePickerProps.Y + 1);
        ctx.lineTo(datePickerProps.X + datePickerProps.Width - (datePickerProps.Height / 2) + 1, datePickerProps.Y + datePickerProps.Height - 1);
        ctx.stroke();
        ctx.fillStyle = '#a7d8f3';
        ctx.beginPath();
        ctx.rect(datePickerProps.X + datePickerProps.Width - (datePickerProps.Height / 2) + 1, datePickerProps.Y + 1,
            (datePickerProps.Height / 2) - 2, datePickerProps.Height - 2);
        ctx.fill();
        var g = ctx.createLinearGradient(datePickerProps.X + datePickerProps.Width - (datePickerProps.Height / 2) - 1, datePickerProps.Y + (datePickerProps.Height / 2) - 1,
            datePickerProps.X + datePickerProps.Width - (datePickerProps.Height / 2) - 1, datePickerProps.Y + (datePickerProps.Height / 2) + 3);
        g.addColorStop(0, '#0d2a3a');
        g.addColorStop(1, '#4e9ac4');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(datePickerProps.X + datePickerProps.Width - (datePickerProps.Height / 2) - 4, datePickerProps.Y + (datePickerProps.Height / 2) - 1);
        ctx.lineTo(datePickerProps.X + datePickerProps.Width - (datePickerProps.Height / 2) + 3, datePickerProps.Y + (datePickerProps.Height / 2) - 1);
        ctx.lineTo(datePickerProps.X + datePickerProps.Width - (datePickerProps.Height / 2) - 1, datePickerProps.Y + (datePickerProps.Height / 2) + 3);
        ctx.closePath();
        ctx.fill();
    }, canvasid);
    registerModalWindow(canvasid, calenderWindowID);
    registerHiddenWindow(canvasid, calenderWindowID, 1);
    registerLostFocusFunction(canvasid, calenderWindowID, function () { datePickerCalenderWindowLostFocus(canvasid, calenderWindowID); });
    registerLostFocusFunction(canvasid, textboxAreaWindowID, function () { datePickerTextBoxWindowLostFocus(canvasid, textboxAreaWindowID); });
    registerLostFocusFunction(canvasid, buttonWindowID, function () { datePickerButtonLostFocus(canvasid, buttonWindowID); });
    return textboxAreaWindowID;
}

function datePickerCalenderWindowLostFocus(canvasid, windowid) {
    var datePickerProps = getDatePickerPropsByCalenderWindowID(canvasid, windowid);
    if (doesWindowHaveFocus(canvasid, datePickerProps.TextBoxAreaWindowID) == 0 &&
        doesWindowHaveFocus(canvasid, datePickerProps.ButtonWindowID) == 0 &&
        doingEventForWindowID != datePickerProps.CalenderWindowID) {
        setHiddenWindowStatus(canvasid, datePickerProps.CalenderWindowID, 1);
    }
}

function datePickerTextBoxWindowLostFocus(canvasid, windowid) {
    var datePickerProps = getDatePickerPropsByTextBoxAreaWindowID(canvasid, windowid);
    if (doesWindowHaveFocus(canvasid, datePickerProps.CalenderWindowID) == 0 &&
        doesWindowHaveFocus(canvasid, datePickerProps.ButtonWindowID) == 0 &&
        doingEventForWindowID != datePickerProps.CalenderWindowID) {
        setHiddenWindowStatus(canvasid, datePickerProps.CalenderWindowID, 1);
    }
}

function datePickerButtonLostFocus(canvasid, windowid) {
    var datePickerProps = getDatePickerPropsByButtonWindowID(canvasid, windowid);
    if (doesWindowHaveFocus(canvasid, datePickerProps.CalenderWindowID) == 0 &&
        doesWindowHaveFocus(canvasid, datePickerProps.TextBoxAreaWindowID) == 0 &&
        doingEventForWindowID != datePickerProps.CalenderWindowID) {
        setHiddenWindowStatus(canvasid, datePickerProps.CalenderWindowID, 1);
    }
}

//Panel control code starts here

var panelPropsArray = new Array();

function getPanelProps(canvasid, windowid) {
    for (var i = 0; i < panelPropsArray.length; i++) {
        if (panelPropsArray[i].CanvasID == canvasid && panelPropsArray[i].WindowID == windowid) {
            return panelPropsArray[i];
        }
    }
}

function createPanel(canvasid, controlNameId, x, y, width, height, depth, hasBorder, borderColor, hasBackgroundGradient, backgroundStartColor, backgroundEndColor,
    iscollapsable, collapsedWidth, collapsedHeight, panellabel, panelLabelTextColor, panelLabelTextHeight, panelLabelTextFontString,
    headerBackgroundStartColor, headerBackgroundEndColor, headerheight, expandCollapseButtonColor, isexpanded, expandCollapseButtonRadius, tag) {
    var windowid = createWindow(canvasid, x, y, (iscollapsable == 1 ? (isexpanded == 1 ? width : collapsedWidth) : width),
        (iscollapsable == 1 ? (isexpanded == 1 ? height : headerheight) : height), depth, null, 'Panel', controlNameId);
    panelPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, ExpandedWidth: width, ExpandedHeight: height,
        CollapsedWidth: collapsedWidth, CollapsedHeight: collapsedHeight, IsCollapsable: iscollapsable, HasBorder: hasBorder, BorderColor: borderColor,
        HasBackgroundGradient: hasBackgroundGradient, BackgroundStartColor: backgroundStartColor, BackgroundEndColor: backgroundEndColor, 
        HeaderHeight: headerheight, HeaderBackgroundStartColor: headerBackgroundStartColor, HeaderBackgroundEndColor: headerBackgroundEndColor,
        ExpandCollapseButtonColor: expandCollapseButtonColor, IsExpanded: isexpanded, ExpandCollapseButtonRadius: expandCollapseButtonRadius,
        PanelLabel: panellabel, PanelLabelTextColor: panelLabelTextColor, PanelLabelTextHeight: panelLabelTextHeight, 
        PanelLabelTextFontString: panelLabelTextFontString, OriginalWidth: width, OriginalHeight: height, Tag: tag
    });
    registerWindowDrawFunction(windowid, function (canvasid2, windowid2) {
        var panelProps = getPanelProps(canvasid2, windowid2);
        var ctx = getCtx(canvasid2);
        if (panelProps.IsCollapsable == 1) {
            if (panelProps.IsExpanded == 1) {
                if (panelProps.HasBackgroundGradient == 1) {
                    var g = ctx.createLinearGradient(panelProps.X, panelProps.Y, panelProps.X, panelProps.Y + panelProps.Height);
                    g.addColorStop(0, panelProps.BackgroundStartColor);
                    g.addColorStop(1, panelProps.BackgroundEndColor);
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.rect(panelProps.X, panelProps.Y, panelProps.Width, panelProps.Height);
                    ctx.fill();
                }
                if (panelProps.HasBorder == 1) {
                    ctx.strokeStyle = panelProps.BorderColor;
                    ctx.beginPath();
                    ctx.rect(panelProps.X, panelProps.Y, panelProps.Width, panelProps.Height);
                    ctx.stroke();
                }
            } else {
                if (panelProps.HasBorder == 1) {
                    ctx.strokeStyle = panelProps.BorderColor;
                    ctx.beginPath();
                    ctx.rect(panelProps.X, panelProps.Y, panelProps.Width, panelProps.HeaderHeight);
                    ctx.stroke();
                }
            }
            var g1 = ctx.createLinearGradient(panelProps.X, panelProps.Y, panelProps.X, panelProps.Y + panelProps.HeaderHeight);
            g1.addColorStop(0, panelProps.HeaderBackgroundStartColor);
            g1.addColorStop(1, panelProps.HeaderBackgroundEndColor);
            ctx.fillStyle = g1;
            ctx.beginPath();
            ctx.rect(panelProps.X, panelProps.Y, panelProps.Width, panelProps.HeaderHeight);
            ctx.fill();
            ctx.fillStyle = panelProps.PanelLabelTextColor;
            ctx.font = panelProps.PanelLabelTextFontString;
            ctx.fillText(panelProps.PanelLabel, panelProps.X + ((panelProps.Width - panelProps.ExpandCollapseButtonRadius -
                ctx.measureText(panelProps.PanelLabel).width) / 2), panelProps.Y + panelProps.HeaderHeight -
                ((panelProps.HeaderHeight - panelProps.PanelLabelTextHeight) / 2));
            var g2 = ctx.createRadialGradient(panelProps.X + panelProps.Width - 4 - panelProps.ExpandCollapseButtonRadius,
                panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2)
                - panelProps.ExpandCollapseButtonRadius, 0,
                panelProps.X + panelProps.Width - 4 - panelProps.ExpandCollapseButtonRadius,
                panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2)
                - panelProps.ExpandCollapseButtonRadius,
                panelProps.ExpandCollapseButtonRadius);
            var redcomp = parseInt(panelProps.ExpandCollapseButtonColor.substr(1, 2), 16);
            var greencomp = parseInt(panelProps.ExpandCollapseButtonColor.substr(3, 2), 16);
            var bluecomp = parseInt(panelProps.ExpandCollapseButtonColor.substr(5, 2), 16);
            g2.addColorStop(0.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
            g2.addColorStop(0.9, panelProps.ExpandCollapseButtonColor);
            g2.addColorStop(1.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
            ctx.fillStyle = g2;
            ctx.beginPath();
            ctx.arc(panelProps.X + panelProps.Width - 4 - panelProps.ExpandCollapseButtonRadius,
                panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2)
                - panelProps.ExpandCollapseButtonRadius,
                panelProps.ExpandCollapseButtonRadius, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.beginPath();
            if (panelProps.IsExpanded == 1) {
                ctx.moveTo(panelProps.X + panelProps.Width - 8 - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) + 4
                     - panelProps.ExpandCollapseButtonRadius);
                ctx.lineTo(panelProps.X + panelProps.Width - 4 - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) - 2
                     - panelProps.ExpandCollapseButtonRadius);
                ctx.lineTo(panelProps.X + panelProps.Width - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) + 4
                     - panelProps.ExpandCollapseButtonRadius);
                ctx.moveTo(panelProps.X + panelProps.Width - 8 - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) + 1
                     - panelProps.ExpandCollapseButtonRadius);
                ctx.lineTo(panelProps.X + panelProps.Width - 4 - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) - 5
                     - panelProps.ExpandCollapseButtonRadius);
                ctx.lineTo(panelProps.X + panelProps.Width - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) + 1
                     - panelProps.ExpandCollapseButtonRadius);
            } else {
                ctx.moveTo(panelProps.X + panelProps.Width - 8 - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) - 4
                     - panelProps.ExpandCollapseButtonRadius);
                ctx.lineTo(panelProps.X + panelProps.Width - 4 - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) + 2
                     - panelProps.ExpandCollapseButtonRadius);
                ctx.lineTo(panelProps.X + panelProps.Width - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) - 4
                     - panelProps.ExpandCollapseButtonRadius);
                ctx.moveTo(panelProps.X + panelProps.Width - 8 - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) - 1
                     - panelProps.ExpandCollapseButtonRadius);
                ctx.lineTo(panelProps.X + panelProps.Width - 4 - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) + 5
                     - panelProps.ExpandCollapseButtonRadius);
                ctx.lineTo(panelProps.X + panelProps.Width - panelProps.ExpandCollapseButtonRadius,
                    panelProps.Y + panelProps.HeaderHeight - ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) - 1
                     - panelProps.ExpandCollapseButtonRadius);
            }
            ctx.stroke();
        } else {
            if (panelProps.HasBackgroundGradient == 1) {
                var g = ctx.createLinearGradient(panelProps.X, panelProps.Y, panelProps.X, panelProps.Y + panelProps.Height);
                g.addColorStop(0, panelProps.BackgroundStartColor);
                g.addColorStop(1, panelProps.BackgroundEndColor);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.rect(panelProps.X, panelProps.Y, panelProps.Width, panelProps.Height);
                ctx.fill();
            }
            if (panelProps.HasBorder == 1) {
                ctx.strokeStyle = panelProps.BorderColor;
                ctx.beginPath();
                ctx.rect(panelProps.X, panelProps.Y, panelProps.Width, panelProps.Height);
                ctx.stroke();
            }
        }
    }, canvasid);
    if (iscollapsable == 1) {
        registerClickFunction(windowid, function (canvasid3, windowid3, e) {
            var panelProps = getPanelProps(canvasid3, windowid3);
            var windowProps = getWindowProps(canvasid3, windowid3);
            if (windowProps) {
                var x = e.calcX;
                var y = e.calcY;
                if (x > panelProps.X + panelProps.Width - 4 - (panelProps.ExpandCollapseButtonRadius * 2) &&
                    x < panelProps.X + panelProps.Width - 4 && y > panelProps.Y + +
                    ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2) &&
                    y < panelProps.Y + panelProps.HeaderHeight -
                    ((panelProps.HeaderHeight - (panelProps.ExpandCollapseButtonRadius * 2)) / 2)) {
                    if (panelProps.IsExpanded == 1) {
                        panelProps.IsExpanded = 0;
                        panelProps.Width = panelProps.CollapsedWidth;
                        panelProps.Height = panelProps.HeaderHeight + panelProps.CollapsedHeight;
                        windowProps.Width = panelProps.CollapsedWidth;
                        windowProps.Height = panelProps.HeaderHeight + panelProps.CollapsedHeight;
                    } else {
                        panelProps.IsExpanded = 1;
                        panelProps.Width = panelProps.OriginalWidth;
                        panelProps.Height = panelProps.OriginalHeight;
                        windowProps.Width = panelProps.OriginalWidth;
                        windowProps.Height = panelProps.OriginalHeight;
                    }
                }
            }
        }, canvasid);
    } else {
        registerClickFunction(windowid, function () { }, canvasid);
    }
    registerMouseDownFunction(windowid, function () { }, canvasid);
    registerMouseMoveFunction(windowid, function () { }, canvasid);
    registerMouseUpFunction(windowid, function () { }, canvasid);
    return windowid;
}

//Bar graph control code starts here

var barGraphsPropsArray = new Array();

function getBarGraphProps(canvasid, windowid) {
    for (var i = 0; i < barGraphsPropsArray.length; i++) {
        if (barGraphsPropsArray[i].CanvasID == canvasid && barGraphsPropsArray[i].WindowID == windowid) {
            return barGraphsPropsArray[i];
        }
    }
}

function createBarGraph(canvasid, controlNameId, x, y, width, height, depth, data, maxvalue, nummarksy, title, titletextcolor, 
    titletextheigth, titletextfontstring, barwidth, axisLabelsTextColor, axisLabelsTextHeight, axisLabelsTextFontString,
    marginleft, gapbetweenbars, barClickFunction, haslegend, marginright, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'BarGraph', controlNameId);
    barGraphsPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Data: data,
        MaxValue: maxvalue, NumMarksY: nummarksy, Title: title, TitleTextColor: titletextcolor, TitleTextHeight: titletextheigth,
        TitleTextFontString: titletextfontstring, BarWidth: barwidth, BarLabelsWithBoundingBoxes: new Array(),
        H: height - axisLabelsTextHeight - 8 - 20, AxisLabelsTextHeight: axisLabelsTextHeight,
        AxisLabelsTextFontString: axisLabelsTextFontString, AxisLabelsTextColor: axisLabelsTextColor, MarginLeft: marginleft,
        GapBetweenBars: gapbetweenbars, BarClickFunction: barClickFunction, AlreadyUnregisteredAnimation: 0,
        HasLegend: haslegend, MarginRight: marginright, Tag: tag
    });
    registerClickFunction(windowid, function (canvasid1, windowid1, e) {
        
        var barGraphProps = getBarGraphProps(canvasid1, windowid1);
        var clickx = e.calcX;
        var clicky = e.calcY;
        for (var i = 0; i < barGraphProps.BarLabelsWithBoundingBoxes.length; i++) {
            if (clickx >= barGraphProps.BarLabelsWithBoundingBoxes[i].X && clickx <= barGraphProps.BarLabelsWithBoundingBoxes[i].X +
                barGraphProps.BarLabelsWithBoundingBoxes[i].Width && clicky >= barGraphProps.BarLabelsWithBoundingBoxes[i].Y &&
                clicky <= barGraphProps.BarLabelsWithBoundingBoxes[i].Y + barGraphProps.BarLabelsWithBoundingBoxes[i].Height) {
                if (barGraphProps.BarClickFunction != null) {
                    barGraphProps.BarClickFunction(canvasid1, windowid1, i);
                    return;
                }
            }
        }
    }, canvasid);
    registerWindowDrawFunction(windowid, function (canvasid2, windowid2) {
        var barGraphProps = getBarGraphProps(canvasid2, windowid2);
        var ctx = getCtx(canvasid2);
        var h = barGraphProps.H;
        if (barGraphProps.AlreadyUnregisteredAnimation == 0 && h < barGraphProps.TitleTextHeight + 8) {
            barGraphProps.AlreadyUnregisteredAnimation = 1;
            unregisterAnimatedWindow(canvasid2, windowid2);
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.fillStyle = barGraphProps.TitleTextColor;
        ctx.font = barGraphProps.TitleTextFontString;
        ctx.lineWidth = 2;
        ctx.fillText(barGraphProps.Title, barGraphProps.X + (barGraphProps.Width - ctx.measureText(barGraphProps.Title).width) / 2,
            barGraphProps.Y + barGraphProps.TitleTextHeight + 4);
        ctx.lineWidth = 1;
        ctx.fillStyle = barGraphProps.AxisLabelsTextColor;
        ctx.font = barGraphProps.AxisLabelsTextFontString;
        var yaxisheight = barGraphProps.Height - barGraphProps.TitleTextHeight - barGraphProps.AxisLabelsTextHeight - 16;
        ctx.beginPath();
        ctx.moveTo(barGraphProps.X + barGraphProps.MarginLeft, barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + yaxisheight);
        ctx.lineTo(barGraphProps.X + barGraphProps.MarginLeft, barGraphProps.Y + barGraphProps.TitleTextHeight + 8);
        ctx.stroke();
        for (var c = 0; c < barGraphProps.NumMarksY; c++) {
            var val = (barGraphProps.MaxValue / barGraphProps.NumMarksY) * c;
            val = Math.round(val * 100) / 100;
            var tw = ctx.measureText(val.toString()).width;
            var yval = yaxisheight / barGraphProps.NumMarksY;
            ctx.fillText(val.toString(), barGraphProps.X + barGraphProps.MarginLeft - tw - 5, barGraphProps.Y + barGraphProps.TitleTextHeight +
                8 + (barGraphProps.AxisLabelsTextHeight / 2) + yaxisheight - (c * yval));
            ctx.beginPath();
            ctx.moveTo(barGraphProps.X + barGraphProps.MarginLeft, barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + yaxisheight - (c * yval));
            ctx.lineTo(barGraphProps.X + barGraphProps.MarginLeft + (barGraphProps.Data.length * (barGraphProps.BarWidth +
                barGraphProps.GapBetweenBars)) + barGraphProps.GapBetweenBars, barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + yaxisheight - (c * yval));
            ctx.stroke();
        }
        barGraphProps.BarLabelsWithBoundingBoxes = new Array();
        for (var i = 0; i < barGraphProps.Data.length; i++) {
            if (barGraphProps.HasLegend != 1) {
                var w = ctx.measureText(barGraphProps.Data[i][0]).width;
                ctx.fillStyle = barGraphProps.AxisLabelsTextColor;
                ctx.font = barGraphProps.AxisLabelsTextFontString;
                if (w < barGraphProps.BarWidth) {
                    ctx.fillText(barGraphProps.Data[i][0], barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars +
                        (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)) + ((barGraphProps.BarWidth - w) / 2), barGraphProps.Y + barGraphProps.Height - 4);
                } else {
                    ctx.fillText(barGraphProps.Data[i][0], barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars +
                        (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)) - ((w - barGraphProps.BarWidth) / 2), barGraphProps.Y + barGraphProps.Height - 4);
                }
            }
            drawrect(canvasid2, windowid2, ctx, barGraphProps, i, yaxisheight);
        }
        if (barGraphProps.HasLegend == 1) {
            for (var o = 0; o < barGraphProps.Data.length; o++) {
                ctx.fillStyle = data[o][2];
                ctx.fillRect(barGraphProps.X + barGraphProps.Width - barGraphProps.MarginRight, barGraphProps.Y + barGraphProps.Height
                    - 8 - barGraphProps.AxisLabelsTextHeight - (o * (8 + barGraphProps.AxisLabelsTextHeight)), 30, barGraphProps.AxisLabelsTextHeight);
                ctx.fillText(data[o][0], barGraphProps.X + barGraphProps.Width - barGraphProps.MarginRight + 35, barGraphProps.Y + barGraphProps.Height
                    - 8 - (o * (8 + barGraphProps.AxisLabelsTextHeight)));
            }
        }
        if (h >= barGraphProps.TitleTextHeight + 8) {
            barGraphProps.H -= 5;
        }
        ctx.restore();
    }, canvasid);
    registerAnimatedWindow(canvasid, windowid);
    return windowid;
}


function drawrect(canvasid, windowid, ctx, barGraphProps, i, yaxisheight) {
    var hthis = barGraphProps.H;
    if (barGraphProps.H < barGraphProps.TitleTextHeight + 8 + yaxisheight - ((yaxisheight * barGraphProps.Data[i][1]) / barGraphProps.MaxValue)) {
        hthis = yaxisheight - ((yaxisheight * barGraphProps.Data[i][1]) / barGraphProps.MaxValue);
    }
    barGraphProps.BarLabelsWithBoundingBoxes.push({
        X: barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars +
            (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)), Y: barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + hthis,
        Width: barGraphProps.BarWidth, Height: yaxisheight - hthis
    });
    var gradient = ctx.createLinearGradient(barGraphProps.X, barGraphProps.Y + barGraphProps.TitleTextHeight + 8, barGraphProps.X,
        barGraphProps.Y + barGraphProps.Height - barGraphProps.AxisLabelsTextHeight - 8);
    var colorstr = barGraphProps.Data[i][2];
    var redcomp = parseInt(colorstr.substr(1, 2), 16);
    var greencomp = parseInt(colorstr.substr(3, 2), 16);
    var bluecomp = parseInt(colorstr.substr(5, 2), 16);
    gradient.addColorStop(0.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
    gradient.addColorStop(0.5, colorstr);
    gradient.addColorStop(1.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
    ctx.fillStyle = gradient;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp);
    ctx.beginPath();
    ctx.moveTo(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)),
        barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + 5 + hthis);
    ctx.arc(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)) + 5,
        barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + 5 + hthis, 5, Math.PI, (Math.PI / 180) * 270, false);
    ctx.lineTo(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + barGraphProps.BarWidth - 5 +
        (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)), barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + hthis);
    ctx.arc(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + barGraphProps.BarWidth - 5 +
        (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)), barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + 5 + hthis, 5, (Math.PI / 180) * 270, 0, false);
    ctx.lineTo(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + barGraphProps.BarWidth + (i * (barGraphProps.BarWidth + 20)),
        barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + yaxisheight);
    ctx.lineTo(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)),
        barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + yaxisheight);
    ctx.closePath();
    ctx.fill();
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = '#FFFFFF';
    gradient = ctx.createLinearGradient(0, 0, 50, 300);
    gradient.addColorStop(0.0, '#FFFFFF');
    gradient.addColorStop(0.5, '#000000');
    gradient.addColorStop(1.0, '#FFFFFF');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.moveTo(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)) + 5,
        barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + 5 + hthis);
    ctx.arc(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)) + 10,
        barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + 10 + hthis, 5, Math.PI, (Math.PI / 180) * 270, false);
    ctx.lineTo(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + barGraphProps.BarWidth - 10 +
        (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)), barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + hthis + 5);
    ctx.arc(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + barGraphProps.BarWidth - 10 +
        (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)), barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + 10 + hthis, 5, (Math.PI / 180) * 270, 0, false);
    ctx.lineTo(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + barGraphProps.BarWidth + (i * (barGraphProps.BarWidth + 20)) - 5,
        barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + yaxisheight);
    ctx.lineTo(barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars + (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)) + 5,
        barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + yaxisheight);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
    var vw = ctx.measureText(barGraphProps.Data[i][1].toString()).width;
    if (vw < barGraphProps.BarWidth) {
        ctx.fillText(barGraphProps.Data[i][1].toString(), barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars +
            (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)) + ((barGraphProps.BarWidth + - vw) / 2),
            barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + barGraphProps.AxisLabelsTextHeight + hthis + ((yaxisheight - hthis) / 2));
    } else {
        ctx.fillText(barGraphProps.Data[i][1].toString(), barGraphProps.X + barGraphProps.MarginLeft + barGraphProps.GapBetweenBars +
            (i * (barGraphProps.BarWidth + barGraphProps.GapBetweenBars)) - ((vw - barGraphProps.BarWidth) / 2),
            barGraphProps.Y + barGraphProps.TitleTextHeight + 8 + barGraphProps.AxisLabelsTextHeight + hthis + ((yaxisheight - hthis) / 2));
    }
}

//Pie Chart Control code starts here

var pieChartsPropsArray = new Array();

function getPieChartProps(canvasid, windowid) {
    for (var i = 0; i < barGraphsPropsArray.length; i++) {
        if (pieChartsPropsArray[i].CanvasID == canvasid && pieChartsPropsArray[i].WindowID == windowid) {
            return pieChartsPropsArray[i];
        }
    }
}

function createPieChart(canvasid, controlNameId, x, y, width, height, depth, data, title, titletextcolor, titletextheight, titletextfontstring,
    labeltextcolor, labeltextheight, labeltextfontstring, sliceClickFunction, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'PieChart', controlNameId);
    var totalvalue = 0;
    for (var i = 0; i < data.length; i++) {
        totalvalue += data[i][1];
    }
    pieChartsPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Data: data,
        Title: title, TitleTextColor: titletextcolor, TitleTextHeight: titletextheight, TitleTextFontString: titletextfontstring,
        CurrentRadius: 20, TotalValue: totalvalue, LabelTextColor: labeltextcolor, LabelTextHeight: labeltextheight, 
        LabelTextFontString: labeltextfontstring, AlreadyUnregisteredAnimation: 0, DeltaI: -1,
        DeltaX: 0, DeltaY: 0, SliceClickFunction: sliceClickFunction, Tag: tag
    });
    registerClickFunction(windowid, function (canvasid1, windowid1, e) {
        
        var pieChartProps = getPieChartProps(canvasid1, windowid1);
        var data = pieChartProps.Data;
        var currRadius = (pieChartProps.Height - pieChartProps.TitleTextHeight - 24 - (pieChartProps.LabelTextHeight * 2)) / 2;
        var totalvalue = 0;
        for (var i = 0; i < data.length; i++) {
            totalvalue += data[i][1];
        }
        var clickx = e.calcX;
        var clicky = e.calcY;
        var pieoutangle = -1;
        var centerx = pieChartProps.X + (pieChartProps.Width - (currRadius * 2)) / 2 + currRadius;
        var centery = pieChartProps.Y + 16 + pieChartProps.TitleTextHeight + pieChartProps.LabelTextHeight + currRadius;
        if (currRadius * currRadius > (clickx - centerx) * (clickx - centerx) + (clicky - centery) * (clicky - centery)) {
            if (clickx > centerx && clicky == centery) {
                pieoutangle = 0;
            } else if (clickx > centerx && clicky > centery) {
                pieoutangle = (Math.atan((clicky - centery) / (clickx - centerx))) * 180 / Math.PI;
            } else if (clickx < centerx && clicky > centery) {
                pieoutangle = 180 - ((Math.atan((clicky - centery) / (clickx - centerx))) * 180 / Math.PI);
            } else if (clickx < centerx && clicky == centery) {
                pieoutangle = 180;
            } else if (clickx < centerx && clicky < centery) {
                pieoutangle = 180 + ((Math.atan((clicky - centery) / (clickx - centerx))) * 180 / Math.PI);
            } else if (clickx == centerx && clicky < centery) {
                pieoutangle = 270;
            } else if (clickx > centerx && clicky < centery) {
                pieoutangle = 360 + ((Math.atan((clicky - centery) / (clickx - centerx))) * 180 / Math.PI);
            }
        }
        var currangle = 0;
        var lastangle = 0;
        var founddelta = 0;
        for (i = 0; i < data.length; i++) {
            currangle += (data[i][1] * 360) / totalvalue;
            var deltax = 0;
            var deltay = 0;
            if (pieoutangle >= 0 && lastangle <= pieoutangle && currangle >= pieoutangle) {
                var deltaangle = lastangle + ((currangle - lastangle) / 2);
                if (deltaangle == 0) {
                    deltax = 40;
                    deltay = 0;
                } else if (deltaangle > 0 && deltaangle < 90) {
                    deltax = Math.cos(deltaangle * (Math.PI / 180)) * 40;
                    deltay = Math.sin(deltaangle * (Math.PI / 180)) * 40;
                } else if (deltaangle == 90) {
                    deltax = 0;
                    deltay = 40;
                } else if (deltaangle > 90 && deltaangle < 180) {
                    deltax = -(Math.cos((180 - deltaangle) * (Math.PI / 180)) * 40);
                    deltay = Math.sin((180 - deltaangle) * (Math.PI / 180)) * 40;
                } else if (deltaangle == 180) {
                    deltax = -40;
                    deltay = 0;
                } else if (deltaangle > 180 && deltaangle < 270) {
                    deltax = -(Math.cos((180 - deltaangle) * (Math.PI / 180)) * 40);
                    deltay = (Math.sin((180 - deltaangle) * (Math.PI / 180)) * 40);
                } else if (deltaangle == 270) {
                    deltax = 0;
                    deltay = -40;
                } else if (deltaangle > 270 && deltaangle < 360) {
                    deltax = Math.cos((360 - deltaangle) * (Math.PI / 180)) * 40;
                    deltay = -(Math.sin((360 - deltaangle) * (Math.PI / 180)) * 40);
                }
            }
            if (deltax != 0 || deltay != 0) {
                pieChartProps.DeltaX = deltax;
                pieChartProps.DeltaY = deltay;
                pieChartProps.DeltaI = i;
                founddelta = 1;
                if (pieChartProps.SliceClickFunction != null) {
                    pieChartProps.SliceClickFunction(canvasid1, windowid1, i);
                }
            }
            if (currangle < 90) {
                lastx = centerx + Math.cos((Math.PI / 180) * currangle) * currRadius;
                lasty = centery + Math.sin((Math.PI / 180) * currangle) * currRadius;
            } else if (currangle == 90) {
                lastx = centerx;
                lasty = centery + currRadius;
            } else if (currangle > 90 && currangle < 180) {
                lastx = centerx - Math.cos((Math.PI / 180) * (180 - currangle)) * currRadius;
                lasty = centery + Math.sin((Math.PI / 180) * (180 - currangle)) * currRadius;
            } else if (currangle == 180) {
                lastx = centerx - currRadius;
                lasty = centery;
            } else if (currangle > 180 && currangle < 270) {
                lastx = centerx + Math.cos((Math.PI / 180) * (currangle - 180)) * currRadius;
                lasty = centery + Math.sin((Math.PI / 180) * (currangle - 180)) * currRadius;
            } else if (currangle == 270) {
                lastx = centerx;
                lasty = centery - currRadius;
            } else if (currangle > 270 && currangle < 360) {
                lastx = centerx - Math.cos((Math.PI / 180) * (360 - currangle)) * currRadius;
                lasty = centery + Math.sin((Math.PI / 180) * (360 - currangle)) * currRadius;
            }
            lastangle = currangle;
        }
        if (founddelta == 0) {
            pieChartProps.DeltaX = 0;
            pieChartProps.DeltaY = 0;
            pieChartProps.DeltaI = -1;
        }
    }, canvasid);
    registerWindowDrawFunction(windowid, function (canvasid2, windowid2) {
        var pieChartProps = getPieChartProps(canvasid2, windowid2);
        var currRadius = pieChartProps.CurrentRadius;
        if (pieChartProps.AlreadyUnregisteredAnimation == 0 && currRadius >= (pieChartProps.Height - pieChartProps.TitleTextHeight - 24 - (pieChartProps.LabelTextHeight * 2)) / 2) {
            pieChartProps.AlreadyUnregisteredAnimation = 1;
            unregisterAnimatedWindow(canvasid2, windowid2);
        }
        var data = pieChartProps.Data;
        var centerx = pieChartProps.X + (pieChartProps.Width - (currRadius * 2)) / 2 + currRadius;
        var centery = pieChartProps.Y + 16 + pieChartProps.TitleTextHeight + pieChartProps.LabelTextHeight + currRadius;
        var ctx = getCtx(canvasid2);
        ctx.save();
        ctx.fillStyle = pieChartProps.TitleTextColor;
        ctx.font = pieChartProps.TitleTextFontString;
        ctx.fillText(pieChartProps.Title, pieChartProps.X + (pieChartProps.Width - ctx.measureText(pieChartProps.Title).width) / 2,
            pieChartProps.Y + 4 + pieChartProps.TitleTextHeight);
        ctx.font = pieChartProps.LabelTextFontString;
        var currangle = 0; //in degrees
        var lastangle = 0;
        for (var i = 0; i < data.length; i++) {
            currangle += (data[i][1] * 100 * 360) / (totalvalue * 100);
            var redcomp = parseInt(data[i][2].substr(1, 2), 16);
            var greencomp = parseInt(data[i][2].substr(3, 2), 16);
            var bluecomp = parseInt(data[i][2].substr(5, 2), 16);
            var gradient = ctx.createRadialGradient(centerx, centery, 0, centerx, centery, currRadius);
            gradient.addColorStop(0.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
            gradient.addColorStop(0.5, data[i][2]);
            gradient.addColorStop(1.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(centerx + (pieChartProps.DeltaI == i ? pieChartProps.DeltaX : 0), centery + (pieChartProps.DeltaI == i ?
                pieChartProps.DeltaY : 0));
            ctx.arc(centerx + (pieChartProps.DeltaI == i ? pieChartProps.DeltaX : 0), centery + (pieChartProps.DeltaI == i ?
                pieChartProps.DeltaY : 0), currRadius, (Math.PI / 180) * lastangle, (Math.PI / 180) * currangle, false);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = data[i][2];
            if (currangle < 90) {
                lastx = centerx + Math.cos((Math.PI / 180) * currangle) * currRadius;
                lasty = centery + Math.sin((Math.PI / 180) * currangle) * currRadius;
            } else if (currangle == 90) {
                lastx = centerx;
                lasty = centery + currRadius;
            } else if (currangle > 90 && currangle < 180) {
                lastx = centerx - Math.cos((Math.PI / 180) * (180 - currangle)) * currRadius;
                lasty = centery + Math.sin((Math.PI / 180) * (180 - currangle)) * currRadius;
            } else if (currangle == 180) {
                lastx = centerx - currRadius;
                lasty = centery;
            } else if (currangle > 180 && currangle < 270) {
                lastx = centerx + Math.cos((Math.PI / 180) * (currangle - 180)) * currRadius;
                lasty = centery + Math.sin((Math.PI / 180) * (currangle - 180)) * currRadius;
            } else if (currangle == 270) {
                lastx = centerx;
                lasty = centery - currRadius;
            } else if (currangle > 270 && currangle < 360) {
                lastx = centerx - Math.cos((Math.PI / 180) * (360 - currangle)) * currRadius;
                lasty = centery + Math.sin((Math.PI / 180) * (360 - currangle)) * currRadius;
            }
            lastangle = currangle;
        }
        if (currRadius < (pieChartProps.Height - pieChartProps.TitleTextHeight - 24 - (pieChartProps.LabelTextHeight * 2)) / 2) {
            pieChartProps.CurrentRadius += 5;
        }
        var currangle = 0;
        var lastangle = 0;
        ctx.font = pieChartProps.LabelTextFontString;
        for (var i = 0; i < data.length; i++) {
            currangle += (data[i][1] * 100 * 360) / (totalvalue * 100);
            ctx.fillStyle = data[i][2];
            drawPieChartLabels(ctx, data[i][0], currangle, lastangle, currRadius, totalvalue, data[i][1], data[i][2], 0, 0, centerx +
                (pieChartProps.DeltaI == i ? pieChartProps.DeltaX : 0), centery + (pieChartProps.DeltaI == i ?
                pieChartProps.DeltaY : 0), pieChartProps.LabelTextHeight);
            lastangle = currangle;
        }
        for (var o = 0; o < data.length; o++) {
            ctx.fillStyle = data[o][2];
            ctx.fillRect(pieChartProps.X + pieChartProps.Width - 100, pieChartProps.Y + pieChartProps.Height
                - 8 - pieChartProps.LabelTextHeight - (o * (8 + pieChartProps.LabelTextHeight)), 30, pieChartProps.LabelTextHeight);
            ctx.fillStyle = data[o][2];
            ctx.fillText(data[o][0], pieChartProps.X + pieChartProps.Width - 100 + 35, pieChartProps.Y + pieChartProps.Height
                - 8 - (o * (8 + pieChartProps.LabelTextHeight)));
        }
        ctx.restore();
    }, canvasid);
    registerAnimatedWindow(canvasid, windowid);
    return windowid;
}

function drawPieChartLabels(ctx, datastr, currangle, lastangle, currRadius, totalvalue, value, color, deltax, deltay, centerx, centery, textheight) {
    ctx.fillStyle = color;
    if ((((currangle - lastangle) / 2) + lastangle) < 90) {
        ctx.fillText(value.toString(), centerx + 5 + deltax + Math.cos((Math.PI / 180) * (((currangle - lastangle) / 2) + lastangle)) * currRadius,
                    centery + deltay + Math.sin((Math.PI / 180) * (((currangle - lastangle) / 2) + lastangle)) * currRadius);
    } else if ((((currangle - lastangle) / 2) + lastangle) == 90) {
        ctx.fillText(value.toString(), centerx + 5 + deltax + Math.cos((Math.PI / 180) * (((currangle - lastangle) / 2) + lastangle)) * currRadius,
                    centery + deltay + Math.sin((Math.PI / 180) * (((currangle - lastangle) / 2) + lastangle)) * currRadius);
    } else if ((((currangle - lastangle) / 2) + lastangle) > 90 && (((currangle - lastangle) / 2) + lastangle) < 180) {
        tw = ctx.measureText(value.toString()).width;
        ctx.fillText(value.toString(), centerx + deltax - tw - Math.cos((Math.PI / 180) * (180 - (((currangle - lastangle) / 2) + lastangle))) * currRadius,
                    centery + textheight + deltay + Math.sin((Math.PI / 180) * (180 - (((currangle - lastangle) / 2) + lastangle))) * currRadius);
    } else if ((((currangle - lastangle) / 2) + lastangle) == 180) {
        ctx.fillText(value.toString(), centerx + deltax - Math.cos((Math.PI / 180) * (180 - (((currangle - lastangle) / 2) + lastangle))) * currRadius,
                    centery + textheight + deltay + Math.sin((Math.PI / 180) * (180 - (((currangle - lastangle) / 2) + lastangle))) * currRadius);
    } else if ((((currangle - lastangle) / 2) + lastangle) > 180 && (((currangle - lastangle) / 2) + lastangle) < 270) {
        tw = ctx.measureText(value.toString()).width;
        ctx.fillText(value.toString(), centerx - textheight + deltax - tw - Math.cos((Math.PI / 180) * ((((currangle - lastangle) / 2) + lastangle) - 180)) * currRadius,
                    centery + deltay - Math.sin((Math.PI / 180) * ((((currangle - lastangle) / 2) + lastangle) - 180)) * currRadius);
    } else if ((((currangle - lastangle) / 2) + lastangle) == 270) {
        tw = ctx.measureText(value.toString()).width;
        ctx.fillText(value.toString(), centerx - textheight + deltax - tw - Math.cos((Math.PI / 180) * ((((currangle - lastangle) / 2) + lastangle) - 180)) * currRadius,
                    centery + deltay - Math.sin((Math.PI / 180) * ((((currangle - lastangle) / 2) + lastangle) - 180)) * currRadius);
    } else if ((((currangle - lastangle) / 2) + lastangle) > 270 && (((currangle - lastangle) / 2) + lastangle) < 360) {
        ctx.fillText(value.toString(), centerx + textheight + deltax + Math.cos((Math.PI / 180) * (360 - (((currangle - lastangle) / 2) + lastangle))) * currRadius,
                    centery + deltay - Math.sin((Math.PI / 180) * (360 - (((currangle - lastangle) / 2) + lastangle))) * currRadius);
    }
}

//Line Graph code starts here

var lineGraphsPropsArray = new Array();

function getLineGraphProps(canvasid, windowid) {
    for (var i = 0; i < lineGraphsPropsArray.length; i++) {
        if (lineGraphsPropsArray[i].CanvasID == canvasid && lineGraphsPropsArray[i].WindowID == windowid) {
            return lineGraphsPropsArray[i];
        }
    }
}

function createLineGraph(canvasid, controlNameId, x, y, width, height, depth, data, xmaxvalue, nummarksx, ymaxvalue, nummarksy, title,
    titletextcolor, titletextheight, titletextfontstring, axislabelstextcolor, axislabelstextheight, axislabelstextfontstring,
    clickFunction, marginleft, islabeledxvalues, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'LineGraph', controlNameId);
    var hmax = 0;
    for (var j = 0; j < data.length; j++) {
        if (data[j][0].length > hmax)
            hmax = data[j][0].length;
    }
    lineGraphsPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Data: data,
        XMaxValue: xmaxvalue, NumMarksX: nummarksx, YMaxValue: ymaxvalue, NumMarksY: nummarksy, Title: title,
        TitleTextColor: titletextcolor, TitleTextHeight: titletextheight, TitleTextFontString: titletextfontstring,
        AxisLabelsTextColor: axislabelstextcolor, AxisLabelsTextHeight: axislabelstextheight, AxisLabelsTextFontString: axislabelstextfontstring,
        H: 2, HMax: hmax, LineXYs: new Array(), ClickFunction: clickFunction, AlreadyUnregisteredAnimation: 0, MarginLeft: marginleft,
        IsLabeledXValues: islabeledxvalues, Tag: tag
    });
    registerClickFunction(windowid, function (canvasid1, windowid1, e) {
        
        var lineGraphProps = getLineGraphProps(canvasid1, windowid1);
        if (lineGraphProps.ClickFunction != null) {
            var linexys = lineGraphProps.LineXYs;
            var clickx = e.calcX;
            var clicky = e.calcY;
            for (var i = 0; i < linexys.length; i++) {
                for (var j = 0; j < linexys[i].length - 1; j++) {
                    if (clickx >= linexys[i][j][0] && clickx <= linexys[i][j + 1][0]) {
                        if ((clicky <= linexys[i][j][1] && clicky >= linexys[i][j + 1][1]) || (clicky >= linexys[i][j][1] && clicky <= linexys[i][j + 1][1])) {
                            y = (((linexys[i][j][1] - linexys[i][j + 1][1]) * (clickx - linexys[i][j][0])) / (linexys[i][j][0] - linexys[i][j + 1][0])) + linexys[i][j][1];
                            if (y + 4 > clicky && y - 4 < clicky) {
                                lineGraphProps.ClickFunction(canvasid1, windowid1, i);
                            }
                        }
                    }
                }
            }
        }
    }, canvasid);
    registerWindowDrawFunction(windowid, function (canvasid2, windowid2) {
        var lineGraphProps = getLineGraphProps(canvasid2, windowid2);
        if (lineGraphProps.AlreadyUnregisteredAnimation == 0 && lineGraphProps.H > lineGraphProps.HMax) {
            lineGraphProps.AlreadyUnregisteredAnimation = 1;
            unregisterAnimatedWindow(canvasid2, windowid2);
        }
        lineGraphProps.LineXYs = new Array();
        var ctx = getCtx(canvasid2);
        ctx.save();
        ctx.fillStyle = lineGraphProps.TitleTextColor;
        ctx.font = lineGraphProps.TitleTextFontString;
        ctx.fillText(lineGraphProps.Title, lineGraphProps.X + (lineGraphProps.Width - ctx.measureText(lineGraphProps.Title).width) / 2,
            lineGraphProps.Y + lineGraphProps.TitleTextHeight + 4);
        ctx.fillStyle = '#A0A0A0';
        ctx.font = lineGraphProps.AxisLabelsTextFontString;
        ctx.beginPath();
        ctx.moveTo(lineGraphProps.X + lineGraphProps.MarginLeft, lineGraphProps.Y + lineGraphProps.Height - lineGraphProps.AxisLabelsTextHeight - 8);
        ctx.lineTo(lineGraphProps.X + lineGraphProps.MarginLeft, lineGraphProps.Y + lineGraphProps.TitleTextHeight + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lineGraphProps.X + lineGraphProps.MarginLeft, lineGraphProps.Y + lineGraphProps.Height - lineGraphProps.AxisLabelsTextHeight - 8);
        ctx.lineTo(lineGraphProps.X + lineGraphProps.Width, lineGraphProps.Y + lineGraphProps.Height - lineGraphProps.AxisLabelsTextHeight - 8);
        ctx.stroke();
        var alternate = false;
        for (var c = 0; c < lineGraphProps.NumMarksX; c++) {
            if (alternate) {
                ctx.fillStyle = '#C0C0C0';
                alternate = false;
            } else {
                ctx.fillStyle = '#D0D0D0';
                alternate = true;
            }
            ctx.fillRect(lineGraphProps.X + lineGraphProps.MarginLeft + c * ((lineGraphProps.Width - lineGraphProps.MarginLeft) / lineGraphProps.NumMarksX),
                lineGraphProps.Y + lineGraphProps.TitleTextHeight + 8, ((lineGraphProps.Width - lineGraphProps.MarginLeft) / lineGraphProps.NumMarksX),
                lineGraphProps.Height - lineGraphProps.TitleTextHeight - lineGraphProps.AxisLabelsTextHeight - 16);
        }
        ctx.fillStyle = lineGraphProps.AxisLabelsTextColor;
        ctx.font = lineGraphProps.AxisLabelsTextFontString;
        ctx.strokeStyle = '#404040';
        for (var c = 0; c < lineGraphProps.NumMarksY; c++) {
            var val = (lineGraphProps.YMaxValue / lineGraphProps.NumMarksY) * c;
            var tw = ctx.measureText(val.toString()).width;
            ctx.fillText(val.toString(), lineGraphProps.X + lineGraphProps.MarginLeft - 4 - tw, lineGraphProps.Y + lineGraphProps.Height -
                lineGraphProps.AxisLabelsTextHeight - 8 - (c * ((lineGraphProps.Height - lineGraphProps.TitleTextHeight - lineGraphProps.AxisLabelsTextHeight -
                16) / lineGraphProps.NumMarksY)));
            ctx.beginPath();
            ctx.moveTo(lineGraphProps.X + lineGraphProps.MarginLeft - 3, lineGraphProps.Y + lineGraphProps.Height -
                lineGraphProps.AxisLabelsTextHeight - 8 - (c * ((lineGraphProps.Height - lineGraphProps.TitleTextHeight - lineGraphProps.AxisLabelsTextHeight -
                16) / lineGraphProps.NumMarksY)));
            ctx.lineTo(lineGraphProps.X + lineGraphProps.Width, lineGraphProps.Y + lineGraphProps.Height -
                lineGraphProps.AxisLabelsTextHeight - 8 - (c * ((lineGraphProps.Height - lineGraphProps.TitleTextHeight - lineGraphProps.AxisLabelsTextHeight -
                16) / lineGraphProps.NumMarksY)));
            ctx.stroke();
        }
        var xlabels = new Array();
        if (lineGraphProps.IsLabeledXValues == 1) {
            var maxnumlabels = 0;
            for (var i = 0; i < lineGraphProps.Data.length; i++) {
                if (lineGraphProps.Data[i][0].length > maxnumlabels) {
                    maxnumlabels = lineGraphProps.Data[i][0].length;
                }
            }
            for (var i = 0; i < maxnumlabels; i++) {
                for (var j = 0; j < lineGraphProps.Data.length; j++) {
                    if (i < lineGraphProps.Data[j][0].length) {
                        var foundlabel = 0;
                        for (var p = 0; p < xlabels.length; p++) {
                            if (xlabels[p] == lineGraphProps.Data[j][0][i][0]) {
                                foundlabel = 1;
                                break;
                            }
                        }
                        if (foundlabel == 0) {
                            xlabels.push(lineGraphProps.Data[j][0][i][0]);
                        }
                    }
                }
            }
        }
        for (var d = 0; d < lineGraphProps.NumMarksX; d++) {
            var val;
            var increment;
            if (lineGraphProps.IsLabeledXValues == 1) {
                increment =  xlabels.length / lineGraphProps.NumMarksX;
                if (xlabels.length % lineGraphProps.NumMarksX >= lineGraphProps.NumMarksX / 2) {
                    val = xlabels[d * Math.ceil(increment)];
                } else {
                    val = xlabels[d * Math.floor(increment)];
                }
            } else {
                val = (lineGraphProps.XMaxValue / lineGraphProps.NumMarksX) * d;
            }
            var tw = ctx.measureText(val.toString()).width;
            ctx.fillText(val.toString(), lineGraphProps.X + lineGraphProps.MarginLeft + ((d * (lineGraphProps.Width - lineGraphProps.MarginLeft))
                / lineGraphProps.NumMarksX) - (tw / 2), lineGraphProps.Y + lineGraphProps.Height - 4);
            ctx.beginPath();
            ctx.moveTo(lineGraphProps.X + lineGraphProps.MarginLeft + ((d * (lineGraphProps.Width - lineGraphProps.MarginLeft)) / lineGraphProps.NumMarksX),
                lineGraphProps.Y + lineGraphProps.Height - lineGraphProps.AxisLabelsTextHeight - 5);
            ctx.lineTo(lineGraphProps.X + lineGraphProps.MarginLeft + ((d * (lineGraphProps.Width - lineGraphProps.MarginLeft)) / lineGraphProps.NumMarksX),
                lineGraphProps.Y + lineGraphProps.TitleTextHeight + 8);
            ctx.stroke();
        }
        var i = 0;
        while (i < data.length) {
            drawline(canvasid, ctx, lineGraphProps, i, xlabels);
            i++;
        }
        if (lineGraphProps.H < lineGraphProps.HMax) {
            lineGraphProps.H += 1;
        }
        ctx.restore();
    }, canvasid);
    registerAnimatedWindow(canvasid, windowid);
    return windowid;
}

function findXLabelIndexForValue(xlabels, val) {
    for (var i = 0; i < xlabels.length; i++) {
        if (xlabels[i] == val) {
            return i;
        }
    }
}

function drawline(canvasid, ctx, lineGraphProps, x, xlabels) {
    var redcomp = parseInt(lineGraphProps.Data[x][1].substr(1, 2), 16);
    var greencomp = parseInt(lineGraphProps.Data[x][1].substr(3, 2), 16);
    var bluecomp = parseInt(lineGraphProps.Data[x][1].substr(5, 2), 16);
    ctx.strokeStyle = lineGraphProps.Data[x][1];
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.miterLimit = 0.0;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#' + getlowcomp(redcomp).toString(16) + getlowcomp(greencomp).toString(16) + getlowcomp(bluecomp).toString(16);
    ctx.beginPath();
    var linexys = new Array();
    linexys = linexys.concat([[lineGraphProps.X + lineGraphProps.MarginLeft + (lineGraphProps.IsLabeledXValues == 1 ?
        (findXLabelIndexForValue(xlabels, lineGraphProps.Data[x][0][0][0]) *
        (lineGraphProps.Width - lineGraphProps.MarginLeft)) / xlabels.length :
        ((lineGraphProps.Data[x][0][0][0] * (lineGraphProps.Width - lineGraphProps.MarginLeft)) / lineGraphProps.XMaxValue)),
        lineGraphProps.Y + lineGraphProps.Height - lineGraphProps.AxisLabelsTextHeight - 8 -
        ((lineGraphProps.Data[x][0][0][1] * (lineGraphProps.Height - lineGraphProps.TitleTextHeight - lineGraphProps.AxisLabelsTextHeight - 16)) /
        lineGraphProps.YMaxValue)]]);
    ctx.moveTo(lineGraphProps.X + lineGraphProps.MarginLeft + (lineGraphProps.IsLabeledXValues == 1 ? 
        (findXLabelIndexForValue(xlabels, lineGraphProps.Data[x][0][0][0]) *
        (lineGraphProps.Width - lineGraphProps.MarginLeft)) / xlabels.length : ((lineGraphProps.Data[x][0][0][0] * (lineGraphProps.Width -
        lineGraphProps.MarginLeft)) / lineGraphProps.XMaxValue)),
        lineGraphProps.Y + lineGraphProps.Height - lineGraphProps.AxisLabelsTextHeight - 8 - ((lineGraphProps.Data[x][0][0][1] *
        (lineGraphProps.Height - lineGraphProps.TitleTextHeight - lineGraphProps.AxisLabelsTextHeight - 16)) /
        lineGraphProps.YMaxValue));
    for (var i = 1; i < lineGraphProps.H && i < lineGraphProps.Data[x][0].length; i++) {
        linexys = linexys.concat([[lineGraphProps.X + lineGraphProps.MarginLeft + (lineGraphProps.IsLabeledXValues == 1 ?
            (findXLabelIndexForValue(xlabels, lineGraphProps.Data[x][0][i][0]) * (lineGraphProps.Width - lineGraphProps.MarginLeft)) / xlabels.length :
            ((lineGraphProps.Data[x][0][i][0] * (lineGraphProps.Width - lineGraphProps.MarginLeft)) / lineGraphProps.XMaxValue)),
            lineGraphProps.Y + lineGraphProps.Height - lineGraphProps.AxisLabelsTextHeight - 8 - ((lineGraphProps.Data[x][0][i][1] *
            (lineGraphProps.Height - lineGraphProps.TitleTextHeight - lineGraphProps.AxisLabelsTextHeight - 16)) / lineGraphProps.YMaxValue)]]);
        ctx.lineTo(lineGraphProps.X + lineGraphProps.MarginLeft + (lineGraphProps.IsLabeledXValues == 1 ? (findXLabelIndexForValue(xlabels,
            lineGraphProps.Data[x][0][i][0]) * (lineGraphProps.Width - lineGraphProps.MarginLeft)) / xlabels.length :
            ((lineGraphProps.Data[x][0][i][0] * (lineGraphProps.Width - lineGraphProps.MarginLeft)) / lineGraphProps.XMaxValue)),
            lineGraphProps.Y + lineGraphProps.Height - lineGraphProps.AxisLabelsTextHeight - 8 - ((lineGraphProps.Data[x][0][i][1] *
            (lineGraphProps.Height - lineGraphProps.TitleTextHeight - lineGraphProps.AxisLabelsTextHeight - 16)) / lineGraphProps.YMaxValue));
    }
    lineGraphProps.LineXYs.concat([[linexys]]);
    ctx.stroke();
}

//Gauage Chart code starts here

var gaugeChartPropsArray = new Array();

function getGaugeChartProps(canvasid, windowid) {
    for (var i = 0; i < gaugeChartPropsArray.length; i++) {
        if (gaugeChartPropsArray[i].CanvasID == canvasid && gaugeChartPropsArray[i].WindowID == windowid) {
            return gaugeChartPropsArray[i];
        }
    }
}

function createGauge(canvasid, controlNameId, x, y, width, height, depth, data, title, titletextcolor, titletextheight, titletextfontstring, gaugeradius,
    gaugelabeltextcolor, gaugelabeltextheight, gaugelabeltextfontstring, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'Gauge', controlNameId);
    gaugeChartPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Data: data,
        Title: title, TitleTextColor: titletextcolor, TitleTextHeight: titletextheight, TitleTextFontString: titletextfontstring,
        H: 1, CenterX: x + width / 2, CenterY: y + (height - 8 - titletextheight) / 2 + (height - 8 - titletextheight - (gaugeradius * 2)) / 2,
        GaugeRadius: gaugeradius, GaugeLabelTextColor: gaugelabeltextcolor, GaugeLabelTextHeight: gaugelabeltextheight,
        GaugeLabelTextFontString: gaugelabeltextfontstring, AlreadyUnregisteredAnimation: 0, Tag: tag
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var gaugeChartProps = getGaugeChartProps(canvasid1, windowid1);
        var ctx = getCtx(canvasid1);
        if (gaugeChartProps.AlreadyUnregisteredAnimation == 0 && gaugeChartProps.H > 100) {
            gaugeChartProps.AlreadyUnregisteredAnimation = 1;
            unregisterAnimatedWindow(canvaisd1, windowid1);
        }
        ctx.save();
        ctx.globalAlpha = gaugeChartProps.H / 100;
        ctx.fillStyle = gaugeChartProps.TitleTextColor;
        ctx.font = gaugeChartProps.TitleTextFontString;
        ctx.fillText(gaugeChartProps.Title, gaugeChartProps.X + ((gaugeChartProps.Width - ctx.measureText(title).width) / 2),
            gaugeChartProps.Y + gaugeChartProps.TitleTextHeight + 4);
        var gradient = ctx.createRadialGradient(gaugeChartProps.CenterX, gaugeChartProps.CenterY, 0, gaugeChartProps.CenterX,
            gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius - 5);
        gradient.addColorStop(0.0, '#C0C0C0');
        gradient.addColorStop(0.5, '#A0A0A0');
        gradient.addColorStop(1.0, '#D0D0D0');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(gaugeChartProps.CenterX, gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius, 0, 2 * Math.PI, false);
        ctx.arc(gaugeChartProps.CenterX, gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius - 5, 0, 2 * Math.PI, true);
        ctx.closePath();
        ctx.fill();
        var gradient2 = ctx.createRadialGradient(gaugeChartProps.CenterX, gaugeChartProps.CenterY, 0, gaugeChartProps.CenterX,
            gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius - 5);
        gradient2.addColorStop(0.0, '#0000C0');
        gradient2.addColorStop(0.5, '#0000A0');
        gradient2.addColorStop(1.0, '#0000D0');
        ctx.fillStyle = gradient2;
        ctx.beginPath();
        ctx.arc(gaugeChartProps.CenterX, gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius - 5, 0, 2 * Math.PI, false);
        ctx.fill();
        if (gaugeChartProps.H < 60)
            ctx.globalAlpha = 0.0;
        else
            ctx.globalAlpha = (gaugeChartProps.H - 60) / 100;
        var gradient3 = ctx.createRadialGradient(gaugeChartProps.CenterX, gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius - 50,
            gaugeChartProps.CenterX, gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius - 5);
        gradient3.addColorStop(0.0, '#000000');
        gradient3.addColorStop(1.0, '#FFFFFF');
        ctx.fillStyle = gradient3;
        ctx.beginPath();
        ctx.moveTo(gaugeChartProps.CenterX - (Math.sin(Math.PI / 8) * (gaugeChartProps.GaugeRadius - 10)),
            gaugeChartProps.CenterY + (Math.cos(Math.PI / 8) * (gaugeChartProps.GaugeRadius - 10)));
        ctx.arc(gaugeChartProps.CenterX, gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius - 10, (Math.PI / 180) * 112.5, (Math.PI / 180) * 67.5, false);
        ctx.lineTo(gaugeChartProps.CenterX + (Math.sin(Math.PI / 8) * (gaugeChartProps.GaugeRadius - 50)),
            gaugeChartProps.CenterY + (Math.cos(Math.PI / 8) * (gaugeChartProps.GaugeRadius - 50)));
        ctx.arc(gaugeChartProps.CenterX, gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius - 50, (Math.PI / 180) * 67.5, (Math.PI / 180) * 112.5, true);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = gaugeChartProps.H / 100;
        ctx.strokeStyle = '#000000';
        for (var i = 0; i < ((gaugeChartProps.Data[1] / gaugeChartProps.Data[5]) + 1) ; i++) {
            var angle = ((315 * i) / (gaugeChartProps.Data[1] / gaugeChartProps.Data[5])) + 112.5;
            if (angle > 360)
                angle -= 360;
            ctx.beginPath();
            if (angle == 0) {
                ctx.moveTo(gaugeChartProps.CenterX + (gaugeChartProps.GaugeRadius - 45), gaugeChartProps.CenterY);
                ctx.lineTo(gaugeChartProps.CenterX + (gaugeChartProps.GaugeRadius - 25), gaugeChartProps.CenterY);
            } else if (angle > 0 && angle < 90) {
                ctx.moveTo(gaugeChartProps.CenterX + (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)),
                    gaugeChartProps.CenterY + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)));
                ctx.lineTo(gaugeChartProps.CenterX + (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 25)),
                    gaugeChartProps.CenterY + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 25)));
            } else if (angle == 90) {
                ctx.moveTo(gaugeChartProps.CenterX, gaugeChartProps.CenterY + (gaugeChartProps.GaugeRadius - 45));
                ctx.lineTo(gaugeChartProps.CenterX, gaugeChartProps.CenterY + (gaugeChartProps.GaugeRadius - 25));
            } else if (angle > 90 && angle < 180) {
                angle = 180 - angle;
                ctx.moveTo(gaugeChartProps.CenterX - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)),
                    gaugeChartProps.CenterY + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)));
                ctx.lineTo(gaugeChartProps.CenterX - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 25)),
                    gaugeChartProps.CenterY + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 25)));
            } else if (angle == 180) {
                ctx.moveTo(gaugeChartProps.CenterX - (gaugeChartProps.GaugeRadius - 45), gaugeChartProps.CenterY);
                ctx.lineTo(gaugeChartProps.CenterX - (gaugeChartProps.GaugeRadius - 25), gaugeChartProps.CenterY);
            } else if (angle > 180 && angle < 270) {
                angle = angle - 180;
                ctx.moveTo(gaugeChartProps.CenterX - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)),
                    gaugeChartProps.CenterY - (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)));
                ctx.lineTo(gaugeChartProps.CenterX - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 25)),
                    gaugeChartProps.CenterY - (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 25)));
            } else if (angle == 270) {
                ctx.moveTo(gaugeChartProps.CenterX, gaugeChartProps.CenterY - (gaugeChartProps.GaugeRadius - 45));
                ctx.lineTo(gaugeChartProps.CenterX, gaugeChartProps.CenterY - (gaugeChartProps.GaugeRadius - 25));
            } else if (angle > 270 && angle < 360) {
                angle = angle - 270;
                ctx.moveTo(gaugeChartProps.CenterX + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)),
                    gaugeChartProps.CenterY - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)));
                ctx.lineTo(gaugeChartProps.CenterX + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 25)),
                    gaugeChartProps.CenterY - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 25)));
            }
            ctx.stroke();
        }
        ctx.fillStyle = gaugeChartProps.GaugeLabelTextColor;
        ctx.font = gaugeChartProps.GaugeLabelTextFontString;
        for (var i = 0; i < ((gaugeChartProps.Data[1] / gaugeChartProps.Data[5]) + 1) ; i++) {
            var angle = ((315 * i) / (gaugeChartProps.Data[1] / gaugeChartProps.Data[5])) + 112.5;
            if (angle > 360)
                angle -= 360;
            var txttodisplay = (i * gaugeChartProps.Data[5]).toString();
            var textwidth = ctx.measureText(txttodisplay).width;
            var textheight = gaugeChartProps.GaugeLabelTextHeight;
            if (angle == 0) {
                ctx.fillText(txttodisplay, gaugeChartProps.CenterX + (gaugeChartProps.GaugeRadius - 52) - ctx.measureText(txttodisplay).width, gaugeChartProps.CenterY);
            } else if (angle > 0 && angle < 90) {
                ctx.fillText(txttodisplay, gaugeChartProps.CenterX - textwidth + (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 52)),
                    gaugeChartProps.CenterY + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 52)));
            } else if (angle == 90) {
                ctx.fillText(txttodisplay, gaugeChartProps.CenterX - (textwidth / 2), gaugeChartProps.CenterY + (gaugeChartProps.GaugeRadius - 52) - textheight);
            } else if (angle > 90 && angle < 180) {
                angle = 180 - angle;
                ctx.fillText(txttodisplay, gaugeChartProps.CenterX - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 52)),
                    gaugeChartProps.CenterY + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 52)));
            } else if (angle == 180) {
                ctx.fillText(txttodisplay, gaugeChartProps.CenterX - (gaugeChartProps.GaugeRadius - 52), gaugeChartProps.CenterY - (textheight / 2));
            } else if (angle > 180 && angle < 270) {
                angle = angle - 180;
                ctx.fillText(txttodisplay, gaugeChartProps.CenterX - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 52)),
                    gaugeChartProps.CenterY + textheight - (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 52)));
            } else if (angle == 270) {
                ctx.fillText(txttodisplay, gaugeChartProps.CenterX - (textwidth / 2), gaugeChartProps.CenterY - (gaugeChartProps.GaugeRadius - 52) + textheight);
            } else if (angle > 270 && angle < 360) {
                angle = angle - 270;
                ctx.fillText(txttodisplay, gaugeChartProps.CenterX + (Math.sin((Math.PI / 180) * angle) * ((gaugeChartProps.GaugeRadius - 52) - textwidth)),
                    gaugeChartProps.CenterY - (Math.cos((Math.PI / 180) * angle) * ((gaugeChartProps.GaugeRadius - 52) - textwidth)));
            }
        }
        ctx.strokeStyle = '#000000';
        for (var i = 0; i < ((((gaugeChartProps.Data[1] / gaugeChartProps.Data[5]) * gaugeChartProps.Data[6])) + 1) ; i++) {
            if (i % gaugeChartProps.Data[6] > 0) {
                var angle = ((315 * i) / ((gaugeChartProps.Data[1] / gaugeChartProps.Data[5]) * gaugeChartProps.Data[6])) + 112.5;
                if (angle > 360)
                    angle -= 360;
                ctx.beginPath();
                if (angle == 0) {
                    ctx.moveTo(gaugeChartProps.CenterX + (gaugeChartProps.GaugeRadius - 45), gaugeChartProps.CenterY);
                    ctx.lineTo(gaugeChartProps.CenterX + (gaugeChartProps.GaugeRadius - 35), gaugeChartProps.CenterY);
                } else if (angle > 0 && angle < 90) {
                    ctx.moveTo(gaugeChartProps.CenterX + (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)),
                        gaugeChartProps.CenterY + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)));
                    ctx.lineTo(gaugeChartProps.CenterX + (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 35)),
                        gaugeChartProps.CenterY + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 35)));
                } else if (angle == 90) {
                    ctx.moveTo(gaugeChartProps.CenterX, gaugeChartProps.CenterY + (gaugeChartProps.GaugeRadius - 45));
                    ctx.lineTo(gaugeChartProps.CenterX, gaugeChartProps.CenterY + (gaugeChartProps.GaugeRadius - 35));
                } else if (angle > 90 && angle < 180) {
                    angle = 180 - angle;
                    ctx.moveTo(gaugeChartProps.CenterX - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)),
                        gaugeChartProps.CenterY + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)));
                    ctx.lineTo(gaugeChartProps.CenterX - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 35)),
                        gaugeChartProps.CenterY + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 35)));
                } else if (angle == 180) {
                    ctx.moveTo(gaugeChartProps.CenterX - (gaugeChartProps.GaugeRadius - 45), gaugeChartProps.CenterY);
                    ctx.lineTo(gaugeChartProps.CenterX - (gaugeChartProps.GaugeRadius - 35), gaugeChartProps.CenterY);
                } else if (angle > 180 && angle < 270) {
                    angle = angle - 180;
                    ctx.moveTo(gaugeChartProps.CenterX - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)),
                        gaugeChartProps.CenterY - (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)));
                    ctx.lineTo(gaugeChartProps.CenterX - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 35)),
                        gaugeChartProps.CenterY - (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 35)));
                } else if (angle == 270) {
                    ctx.moveTo(gaugeChartProps.CenterX, gaugeChartProps.CenterY - (gaugeChartProps.GaugeRadius - 45));
                    ctx.lineTo(gaugeChartProps.CenterX, gaugeChartProps.CenterY - (gaugeChartProps.GaugeRadius - 35));
                } else if (angle > 270 && angle < 360) {
                    angle = angle - 270;
                    ctx.moveTo(gaugeChartProps.CenterX + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)),
                        gaugeChartProps.CenterY - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 45)));
                    ctx.lineTo(gaugeChartProps.CenterX + (Math.sin((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 35)),
                        gaugeChartProps.CenterY - (Math.cos((Math.PI / 180) * angle) * (gaugeChartProps.GaugeRadius - 35)));
                }
                ctx.stroke();
            }
        }
        drawarc(ctx, gaugeChartProps.Data[2][2], gaugeChartProps.Data[2][0], gaugeChartProps.Data[2][1], gaugeChartProps.Data[1],
            gaugeChartProps.CenterX, gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius);
        drawarc(ctx, gaugeChartProps.Data[3][2], gaugeChartProps.Data[3][0], gaugeChartProps.Data[3][1], gaugeChartProps.Data[1],
            gaugeChartProps.CenterX, gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius);
        drawarc(ctx, gaugeChartProps.Data[4][2], gaugeChartProps.Data[4][0], gaugeChartProps.Data[4][1], gaugeChartProps.Data[1],
            gaugeChartProps.CenterX, gaugeChartProps.CenterY, gaugeChartProps.GaugeRadius);
        var needleangle = (((315 * gaugeChartProps.Data[7]) / gaugeChartProps.Data[1]) * (gaugeChartProps.H / 100)) + 112.5;
        if (needleangle > 360)
            needleangle -= 360;
        ctx.translate(gaugeChartProps.CenterX, gaugeChartProps.CenterY);
        ctx.rotate((Math.PI / 180) * needleangle);
        var colorstr = '#60007C';
        var gradient5 = ctx.createLinearGradient(0, 0, gaugeChartProps.GaugeRadius - 80, 0);
        var redcomp = parseInt(colorstr.substr(1, 2), 16);
        var greencomp = parseInt(colorstr.substr(3, 2), 16);
        var bluecomp = parseInt(colorstr.substr(5, 2), 16);
        gradient5.addColorStop(0.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
        gradient5.addColorStop(0.5, colorstr);
        gradient5.addColorStop(1.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
        ctx.fillStyle = gradient5;
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(0, -10);
        ctx.lineTo(gaugeChartProps.GaugeRadius - 40, 0);
        ctx.closePath();
        ctx.fill();
        var gradient3 = ctx.createRadialGradient(gaugeChartProps.CenterX, gaugeChartProps.CenterY, 0, gaugeChartProps.CenterX, gaugeChartProps.CenterY, 10);
        gradient3.addColorStop(0.0, '#C0C0C0');
        gradient3.addColorStop(0.5, '#A0A0A0');
        gradient3.addColorStop(1.0, '#D0D0D0');
        ctx.fillStyle = gradient3;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.restore();
        if (gaugeChartProps.H < 100) {
            gaugeChartProps.H++;
        }
    }, canvasid);
    registerAnimatedWindow(canvasid, windowid);
    return windowid;
}

function drawarc(ctx, colorstr, startval, endval, maxval, centerx, centery, gaugeradius) {
    var gradient4 = ctx.createRadialGradient(centerx, centery, gaugeradius - 100, centerx, centery, gaugeradius - 80);
    var redcomp = parseInt(colorstr.substr(1, 2), 16);
    var greencomp = parseInt(colorstr.substr(3, 2), 16);
    var bluecomp = parseInt(colorstr.substr(5, 2), 16);
    gradient4.addColorStop(0.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
    gradient4.addColorStop(0.5, colorstr);
    gradient4.addColorStop(1.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
    ctx.fillStyle = gradient4;
    var minrangeangle = ((315 * startval) / maxval) + 112.5;
    if (minrangeangle > 360)
        minrangeangle -= 360;
    var maxrangeangle = ((315 * endval) / maxval) + 112.5;
    if (maxrangeangle > 360)
        maxrangeangle -= 360;
    ctx.beginPath();
    var angle2 = 0;
    if (minrangeangle == 0) {
        ctx.moveTo(centerx + (gaugeradius - 100), centery);
    } else if (minrangeangle > 0 && minrangeangle < 90) {
        ctx.moveTo(centerx + (Math.cos((Math.PI / 180) * minrangeangle) * (gaugeradius - 100)), centery + (Math.sin((Math.PI / 180) * minrangeangle) * (gaugeradius - 100)));
    } else if (minrangeangle == 90) {
        ctx.moveTo(centerx, centery + (gaugeradius - 100));
    } else if (minrangeangle > 90 && minrangeangle < 180) {
        angle2 = 180 - minrangeangle;
        ctx.moveTo(centerx - (Math.cos((Math.PI / 180) * angle2) * (gaugeradius - 100)), centery + (Math.sin((Math.PI / 180) * angle2) * (gaugeradius - 100)));
    } else if (minrangeangle == 180) {
        ctx.moveTo(centerx - (gaugeradius - 100), centery);
    } else if (minrangeangle > 180 && minrangeangle < 270) {
        angle2 = minrangeangle - 180;
        ctx.moveTo(centerx - (Math.cos((Math.PI / 180) * angle2) * (gaugeradius - 100)), centery - (Math.sin((Math.PI / 180) * angle2) * (gaugeradius - 100)));
    } else if (minrangeangle == 270) {
        ctx.moveTo(centerx, centery - (gaugeradius - 100));
    } else if (minrangeangle > 270 && minrangeangle < 360) {
        angle2 = minrangeangle - 270;
        ctx.moveTo(centerx + (Math.sin((Math.PI / 180) * angle2) * (gaugeradius - 100)), centery - (Math.cos((Math.PI / 180) * angle2) * (gaugeradius - 100)));
    }
    ctx.arc(centerx, centery, (gaugeradius - 100), (Math.PI / 180) * minrangeangle, (Math.PI / 180) * maxrangeangle, false);
    ctx.arc(centerx, centery, (gaugeradius - 80), (Math.PI / 180) * maxrangeangle, (Math.PI / 180) * minrangeangle, true);
    ctx.closePath();
    ctx.fill();
}

//Radar Graph code starts here

var radarGraphPropsArray = new Array();

function getRadarGraphProps(canvasid, windowid) {
    for (var i = 0; i < radarGraphPropsArray.length; i++) {
        if (radarGraphPropsArray[i].CanvasID == canvasid && radarGraphPropsArray[i].WindowID == windowid) {
            return radarGraphPropsArray[i];
        }
    }
}

function createRadarGraph(canvasid, controlNameId, x, y, width, height, depth, data, maxvalue, colorstr, nummarks, title, titletextcolor, titletextheight,
    titletextfontstring, marklabeltextcolor, marklabeltextheight, marklabeltextfontstring, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'RadarGraph', controlNameId);
    radarGraphPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Data: data,
        MaxValue: maxvalue, ColorStr: colorstr, NumMarks: nummarks, Title: title, TitleTextColor: titletextcolor,
        TitleTextHeight: titletextheight, TitleTextFontString: titletextfontstring, H: 20,
        MarkLabelTextColor: marklabeltextcolor, MarkLabelTextHeight: marklabeltextheight, MarkLabelTextFontString: marklabeltextfontstring,
        AlreadyUnregisteredAnimation: 0, Tag: tag
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var radarGraphProps = getRadarGraphProps(canvasid1, windowid1);
        var ctx = getCtx(canvasid1);
        if (radarGraphProps.AlreadyUnregisteredAnimation == 0 && radarGraphProps.H >= ((radarGraphProps.Height - radarGraphProps.TitleTextHeight
            - 8 - radarGraphProps.MarkLabelTextHeight - 8 - 4) / 2)) {
            radarGraphProps.AlreadyUnregisteredAnimation = 1;
            unregisterAnimatedWindow(canvasid1, windowid1);
        }
        ctx.save();
        ctx.fillStyle = radarGraphProps.TitleTextColor;
        ctx.font = radarGraphProps.TitleTextFontString;
        ctx.fillText(radarGraphProps.Title, radarGraphProps.X + ((radarGraphProps.Width - ctx.measureText(radarGraphProps.Title).width) / 2),
            radarGraphProps.Y + radarGraphProps.TitleTextHeight + 4);
        ctx.font = radarGraphProps.MarkLabelTextFontString;
        var angleinc = (Math.PI * 360) / (180 * radarGraphProps.Data.length);
        ctx.translate(radarGraphProps.X + (radarGraphProps.Width / 2), radarGraphProps.Y + radarGraphProps.TitleTextHeight + 8 + ((radarGraphProps.Height -
            radarGraphProps.TitleTextHeight - 8 - radarGraphProps.MarkLabelTextHeight - 8) / 2) + radarGraphProps.MarkLabelTextHeight + 8);
        ctx.rotate(Math.PI * 270 / 180);
        var redcomp = parseInt(radarGraphProps.ColorStr.substr(1, 2), 16);
        var greencomp = parseInt(radarGraphProps.ColorStr.substr(3, 2), 16);
        var bluecomp = parseInt(radarGraphProps.ColorStr.substr(5, 2), 16);
        var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radarGraphProps.H);
        gradient.addColorStop(0.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
        gradient.addColorStop(0.5, radarGraphProps.ColorStr);
        gradient.addColorStop(1.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(radarGraphProps.Data[0] * radarGraphProps.H / radarGraphProps.MaxValue, 0);
        for (var i = 1; i < radarGraphProps.Data.length; i++) {
            ctx.rotate(angleinc);
            ctx.lineTo(radarGraphProps.Data[i] * radarGraphProps.H / radarGraphProps.MaxValue, 0);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = '#505050';
        ctx.translate(radarGraphProps.X + (radarGraphProps.Width / 2), radarGraphProps.Y + radarGraphProps.TitleTextHeight + 8 + ((radarGraphProps.Height -
            radarGraphProps.TitleTextHeight - 8 - radarGraphProps.MarkLabelTextHeight - 8) / 2) + radarGraphProps.MarkLabelTextHeight + 8);
        ctx.rotate((Math.PI * 270) / 180);
        for (var i = 0; i < radarGraphProps.Data.length; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(radarGraphProps.H, 0);
            ctx.closePath();
            ctx.stroke();
            var marksinc = radarGraphProps.H / radarGraphProps.NumMarks;
            for (var x = 0; x < radarGraphProps.NumMarks; x++) {
                ctx.beginPath();
                ctx.moveTo((x + 1) * marksinc, 3);
                ctx.lineTo((x + 1) * marksinc, -3);
                ctx.closePath();
                ctx.stroke();
            }
            ctx.rotate(angleinc);
        }
        ctx.restore();
        ctx.fillStyle = radarGraphProps.MarkLabelTextColor;
        ctx.font = radarGraphProps.MarkLabelTextFontString;
        if (radarGraphProps.H == ((radarGraphProps.Height - radarGraphProps.TitleTextHeight - 8 - radarGraphProps.MarkLabelTextHeight - 8 - 4) / 2)) {
            ctx.save();
            ctx.translate(radarGraphProps.X + (radarGraphProps.Width / 2), radarGraphProps.Y + radarGraphProps.TitleTextHeight + 8 + ((radarGraphProps.Height -
                radarGraphProps.TitleTextHeight - 8 - radarGraphProps.MarkLabelTextHeight - 8) / 2) + radarGraphProps.MarkLabelTextHeight + 8);
            for (var i = 0; i < radarGraphProps.NumMarks; i++) {
                var txt = (((i + 1) * radarGraphProps.MaxValue) / radarGraphProps.NumMarks).toString();
                ctx.fillText(txt, -(ctx.measureText(txt).width + 5), (radarGraphProps.MarkLabelTextHeight / 2) - ((i + 1) * (((radarGraphProps.Height -
                    radarGraphProps.TitleTextHeight - 8) / 2) / radarGraphProps.NumMarks)));
            }
            ctx.restore();
        }
        if (radarGraphProps.H + 5 <= ((radarGraphProps.Height - radarGraphProps.TitleTextHeight - 8 - radarGraphProps.MarkLabelTextHeight - 8 - 4) / 2)) {
            radarGraphProps.H += 5;
        } else {
            radarGraphProps.H = ((radarGraphProps.Height - radarGraphProps.TitleTextHeight - 8 - radarGraphProps.MarkLabelTextHeight - 8 - 4) / 2);
        }
    }, canvasid);
    registerAnimatedWindow(canvasid, windowid);
}

//Line Area Graph code starts here

var lineAreaGraphPropsArray = new Array();

function getLineAreaGraphProps(canvasid, windowid) {
    for (var i = 0; i < lineAreaGraphPropsArray.length; i++) {
        if (lineAreaGraphPropsArray[i].CanvasID == canvasid && lineAreaGraphPropsArray[i].WindowID == windowid) {
            return lineAreaGraphPropsArray[i];
        }
    }
}

function createLineAreaGraph(canvasid, controlNameId, x, y, width, height, depth, data, xmaxvalue, ymaxvalue, nummarksx, nummarksy, title,
    titletextcolor, titletextheight, titletextfontstring, axislabelscolor, axislabelsheight, axislabelsfontstring, marginleft,
    islabeledonxaxis, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'LineAreaGraph', controlNameId);
    lineAreaGraphPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Data: data,
        XMaxValue: xmaxvalue, YMaxValue: ymaxvalue, NumMarksX: nummarksx, NumMarksY: nummarksy, Title: title,
        TitleTextColor: titletextcolor, TitleTextHeight: titletextheight, TitleTextFontString: titletextfontstring,
        AxisLabelsColor: axislabelscolor, AxisLabelsHeight: axislabelsheight, AxisLabelsFontString: axislabelsfontstring,
        H: 0, MarginLeft: marginleft, AlreadyUnregisteredAnimation: 0, IsLabledOnXAxis: islabeledonxaxis, Tag: tag
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var lineAreaGraphProps = getLineAreaGraphProps(canvasid1, windowid1);
        if (lineAreaGraphProps.AlreadyUnregisteredAnimation == 0 && lineAreaGraphProps.H >= lineAreaGraphProps.Data[0].length - 1) {
            lineAreaGraphProps.AlreadyUnregisteredAnimation = 1;
            unregisterAnimatedWindow(canvasid1, windowid1);
        }
        var ctx = getCtx(canvasid1);
        ctx.save();
        ctx.fillStyle = lineAreaGraphProps.TitleTextColor;
        ctx.font = lineAreaGraphProps.TitleTextFontString;
        ctx.fillText(lineAreaGraphProps.Title, lineAreaGraphProps.X + ((lineAreaGraphProps.Width - ctx.measureText(lineAreaGraphProps.Title).width) / 2),
            lineAreaGraphProps.Y + 4 + lineAreaGraphProps.TitleTextHeight);
        ctx.font = lineAreaGraphProps.AxisLabelsFontString;
        ctx.beginPath();
        ctx.moveTo(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft, lineAreaGraphProps.Y + lineAreaGraphProps.Height - lineAreaGraphProps.AxisLabelsHeight - 8);
        ctx.lineTo(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft, lineAreaGraphProps.Y + lineAreaGraphProps.TitleTextHeight + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft, lineAreaGraphProps.Y + lineAreaGraphProps.Height - lineAreaGraphProps.AxisLabelsHeight - 8);
        ctx.lineTo(lineAreaGraphProps.X + lineAreaGraphProps.Width, lineAreaGraphProps.Y + lineAreaGraphProps.Height - lineAreaGraphProps.AxisLabelsHeight - 8);
        ctx.stroke();
        var alternate = false;
        for (var c = 0; c < lineAreaGraphProps.NumMarksX; c++) {
            if (alternate) {
                ctx.fillStyle = '#C0C0C0';
                alternate = false;
            } else {
                ctx.fillStyle = '#D0D0D0';
                alternate = true;
            }
            ctx.fillRect(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft + c * ((lineAreaGraphProps.Width - lineAreaGraphProps.MarginLeft) / lineAreaGraphProps.NumMarksX),
                lineAreaGraphProps.Y + lineAreaGraphProps.TitleTextHeight + 8,
                ((lineAreaGraphProps.Width - lineAreaGraphProps.MarginLeft) / lineAreaGraphProps.NumMarksX),
                lineAreaGraphProps.Height - lineAreaGraphProps.TitleTextHeight - lineAreaGraphProps.AxisLabelsHeight - 16);
        }
        ctx.fillStyle = lineAreaGraphProps.AxisLabelsColor;
        ctx.strokeStyle = '#404040';
        for (c = 0; c < lineAreaGraphProps.NumMarksY; c++) {
            var val = (lineAreaGraphProps.YMaxValue / lineAreaGraphProps.NumMarksY) * c;
            var tw = ctx.measureText(val.toString()).width;
            ctx.fillText(val.toString(), lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft - tw - 10, lineAreaGraphProps.Y + lineAreaGraphProps.Height -
                lineAreaGraphProps.AxisLabelsHeight - 8 - (c * ((lineAreaGraphProps.Height - lineAreaGraphProps.TitleTextHeight - lineAreaGraphProps.AxisLabelsHeight -
                16) / lineAreaGraphProps.NumMarksY)));
            ctx.beginPath();
            ctx.moveTo(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft - 5, lineAreaGraphProps.Y + lineAreaGraphProps.Height -
                lineAreaGraphProps.AxisLabelsHeight - 8 - (c * ((lineAreaGraphProps.Height - lineAreaGraphProps.TitleTextHeight - lineAreaGraphProps.AxisLabelsHeight -
                16) / lineAreaGraphProps.NumMarksY)));
            ctx.lineTo(lineAreaGraphProps.X + lineAreaGraphProps.Width, lineAreaGraphProps.Y + lineAreaGraphProps.Height -
                lineAreaGraphProps.AxisLabelsHeight - 8 - (c * ((lineAreaGraphProps.Height - lineAreaGraphProps.TitleTextHeight - lineAreaGraphProps.AxisLabelsHeight -
                16) / lineAreaGraphProps.NumMarksY)));
            ctx.stroke();
        }
        var xlabels = new Array();
        if (lineAreaGraphProps.IsLabledOnXAxis == 1) {
            for (var i = 0; i < lineAreaGraphProps.Data[0].length; i++) {
                xlabels.push(lineAreaGraphProps.Data[0][i][0]);
            }
        }
        ctx.fillStyle = lineAreaGraphProps.AxisLabelsColor;
        for (var d = 0; d < lineAreaGraphProps.NumMarksX; d++) {
            var val;
            if (lineAreaGraphProps.IsLabledOnXAxis == 1) {
                increment = xlabels.length / lineAreaGraphProps.NumMarksX;
                if (xlabels.length % lineAreaGraphProps.NumMarksX >= lineAreaGraphProps.NumMarksX / 2) {
                    val = xlabels[d * Math.ceil(increment)];
                } else {
                    val = xlabels[d * Math.floor(increment)];
                }
            } else {
                val = (lineAreaGraphProps.XMaxValue / lineAreaGraphProps.NumMarksX) * d;
            }
            var tw = ctx.measureText(val.toString()).width;
            ctx.fillText(val.toString(), lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft + (d * ((lineAreaGraphProps.Width - lineAreaGraphProps.MarginLeft) /
                lineAreaGraphProps.NumMarksX)) - (tw / 2), lineAreaGraphProps.Y + lineAreaGraphProps.Height - 4);
            ctx.beginPath();
            ctx.moveTo(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft + (d * ((lineAreaGraphProps.Width - lineAreaGraphProps.MarginLeft) /
                lineAreaGraphProps.NumMarksX)), lineAreaGraphProps.Y + lineAreaGraphProps.TitleTextHeight + 8 + (lineAreaGraphProps.Height -
                lineAreaGraphProps.TitleTextHeight - lineAreaGraphProps.AxisLabelsHeight - 16) + 5);
            ctx.lineTo(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft + (d * ((lineAreaGraphProps.Width - lineAreaGraphProps.MarginLeft) /
                lineAreaGraphProps.NumMarksX)), lineAreaGraphProps.Y + lineAreaGraphProps.TitleTextHeight + 8);
            ctx.stroke();
        }
        for (var c = 0; c < lineAreaGraphProps.Data[0][0][1].length; c++) {
            var colorstr = lineAreaGraphProps.Data[1][c];
            var gradient = ctx.createLinearGradient(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft, lineAreaGraphProps.Y + lineAreaGraphProps.Height -
                lineAreaGraphProps.AxisLabelsHeight - 8, lineAreaGraphProps.X + lineAreaGraphProps.Width - lineAreaGraphProps.MarginLeft, 
                lineAreaGraphProps.Y + lineAreaGraphProps.Height - lineAreaGraphProps.AxisLabelsHeight - 8);
            var redcomp = parseInt(colorstr.substr(1, 2), 16);
            var greencomp = parseInt(colorstr.substr(3, 2), 16);
            var bluecomp = parseInt(colorstr.substr(5, 2), 16);
            gradient.addColorStop(0.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
            gradient.addColorStop(0.5, colorstr);
            gradient.addColorStop(1.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft, lineAreaGraphProps.Y + lineAreaGraphProps.Height - lineAreaGraphProps.AxisLabelsHeight - 8);
            for (var i = 0; i < lineAreaGraphProps.H + 1; i++) {
                ctx.lineTo(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft + (lineAreaGraphProps.IsLabledOnXAxis == 1 ?
                    (findXLabelIndexForValue(xlabels, lineAreaGraphProps.Data[0][i][0]) *
                    (lineAreaGraphProps.Width - lineAreaGraphProps.MarginLeft)) / xlabels.length : ((lineAreaGraphProps.Data[0][i][0] * (lineAreaGraphProps.Width -
                    lineAreaGraphProps.MarginLeft)) / lineAreaGraphProps.XMaxValue)), lineAreaGraphProps.Y + lineAreaGraphProps.Height -
                    lineAreaGraphProps.AxisLabelsHeight - 8 - ((lineAreaGraphProps.Data[0][i][1][c] + sumyvalues(lineAreaGraphProps.Data, c, i)) *
                    (lineAreaGraphProps.Height - lineAreaGraphProps.TitleTextHeight - lineAreaGraphProps.AxisLabelsHeight - 16)) / lineAreaGraphProps.YMaxValue);
            }
            if (c == 0) {
                ctx.lineTo(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft + (lineAreaGraphProps.IsLabledOnXAxis == 1 ?
                    (findXLabelIndexForValue(xlabels, lineAreaGraphProps.Data[0][lineAreaGraphProps.H][0]) *
                    (lineAreaGraphProps.Width - lineAreaGraphProps.MarginLeft)) / xlabels.length : ((lineAreaGraphProps.Data[0][lineAreaGraphProps.H][0] * 
                    (lineAreaGraphProps.Width -
                    lineAreaGraphProps.MarginLeft)) / lineAreaGraphProps.XMaxValue)), lineAreaGraphProps.Y + lineAreaGraphProps.Height -
                    lineAreaGraphProps.AxisLabelsHeight - 8);
            } else {
                for (var i = lineAreaGraphProps.H; i >= 0; i--) {
                    ctx.lineTo(lineAreaGraphProps.X + lineAreaGraphProps.MarginLeft + (lineAreaGraphProps.IsLabledOnXAxis == 1 ?
                        (findXLabelIndexForValue(xlabels, lineAreaGraphProps.Data[0][i][0]) * (lineAreaGraphProps.Width - lineAreaGraphProps.MarginLeft)) / xlabels.length :
                        ((lineAreaGraphProps.Data[0][i][0] * (lineAreaGraphProps.Width -
                        lineAreaGraphProps.MarginLeft)) / lineAreaGraphProps.XMaxValue)), lineAreaGraphProps.Y + lineAreaGraphProps.Height -
                        lineAreaGraphProps.AxisLabelsHeight - 8 - ((lineAreaGraphProps.Data[0][i][1][c - 1] + sumyvalues(lineAreaGraphProps.Data, c - 1, i)) * 
                        (lineAreaGraphProps.Height - lineAreaGraphProps.TitleTextHeight - lineAreaGraphProps.AxisLabelsHeight - 16)) / lineAreaGraphProps.YMaxValue);
                }
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
        if (lineAreaGraphProps.H < lineAreaGraphProps.Data[0].length - 1) {
            lineAreaGraphProps.H++;
        }
    }, canvasid);
    registerAnimatedWindow(canvasid, windowid);
}

function sumyvalues(data, c, i) {
    var total = 0;
    for (var x = 0; x < c; x++) {
        total += data[0][i][1][x];
    }
    return total;
}

//Candlesticks Graph code starts here

var candlesticksGraphPropsArray = new Array();

function getCandlesticksGraphProps(canvasid, windowid) {
    for (var i = 0; i < candlesticksGraphPropsArray.length; i++) {
        if (candlesticksGraphPropsArray[i].CanvasID == canvasid && candlesticksGraphPropsArray[i].WindowID == windowid) {
            return candlesticksGraphPropsArray[i];
        }
    }
}

function createCandlesticksGraph(canvasid, controlNameId, x, y, width, height, depth, data, xmarkslabeldata, xmarkswidth, ymaxvalue, nummarksy, title,
    titlecolor, titleheight, titlefontstring, candlebodywidth, candelbodycolorstr, candellinecolorstr, marginleft,
    axislabelscolor, axislabelsheight, axislabelsfontstring, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'CandlesticksGraph', controlNameId);
    candlesticksGraphPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Data: data,
        XMarksLabelData: xmarkslabeldata, XMarksWidth: xmarkswidth, YMaxValue: ymaxvalue, NumMarksY: nummarksy, Title: title,
        TitleColor: titlecolor, TitleHeight: titleheight, TitleFontString: titlefontstring, CandleBodyWidth: candlebodywidth,
        CandleBodyColor: candelbodycolorstr, CandleLineColor: candellinecolorstr, MarginLeft: marginleft,
        AxisLabelsColor: axislabelscolor, AxisLabelsHeight: axislabelsheight, AxisLabelsFontString: axislabelsfontstring, Tag: tag
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var candlesticksGraphProps = getCandlesticksGraphProps(canvasid1, windowid1);
        var ctx = getCtx(canvasid1);
        ctx.save();
        ctx.fillStyle = candlesticksGraphProps.TitleColor;
        ctx.font = candlesticksGraphProps.TitleFontString;
        ctx.fillText(candlesticksGraphProps.Title, candlesticksGraphProps.X + (candlesticksGraphProps.Width - ctx.measureText(title).width) / 2,
            candlesticksGraphProps.Y + candlesticksGraphProps.TitleHeight + 4);
        ctx.strokeStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.moveTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft, candlesticksGraphProps.Y + candlesticksGraphProps.Height - 8 -
            candlesticksGraphProps.AxisLabelsHeight);
        ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft, candlesticksGraphProps.Y + candlesticksGraphProps.TitleHeight + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft, candlesticksGraphProps.Y + candlesticksGraphProps.Height - 8 -
            candlesticksGraphProps.AxisLabelsHeight);
        ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.Width, candlesticksGraphProps.Y + candlesticksGraphProps.Height - 8 -
            candlesticksGraphProps.AxisLabelsHeight);
        ctx.stroke();
        var alternate = false;
        for (var c = 0; c <= data.length; c++) {
            if (alternate) {
                ctx.fillStyle = '#C0C0C0';
                alternate = false;
            } else {
                ctx.fillStyle = '#D0D0D0';
                alternate = true;
            }
            ctx.fillRect(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + (c * candlesticksGraphProps.XMarksWidth), candlesticksGraphProps.Y +
                candlesticksGraphProps.TitleHeight + 8, candlesticksGraphProps.XMarksWidth, candlesticksGraphProps.Height -
                candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16);
        }
        ctx.fillStyle = candlesticksGraphProps.AxisLabelsColor;
        ctx.font = candlesticksGraphProps.AxisLabelsFontString;
        ctx.strokeStyle = '#404040';
        for (var c = 0; c < candlesticksGraphProps.NumMarksY; c++) {
            var val = (candlesticksGraphProps.YMaxValue / candlesticksGraphProps.NumMarksY) * c;
            var tw = ctx.measureText(val.toString()).width;
            ctx.fillText(val.toString(), candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft - 10 - tw, candlesticksGraphProps.Y +
                candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 -(c * ((candlesticksGraphProps.Height -
                candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.NumMarksY)));
            ctx.beginPath();
            ctx.moveTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft - 5, candlesticksGraphProps.Y + candlesticksGraphProps.Height -
                candlesticksGraphProps.AxisLabelsHeight - 8 -(c * ((candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight -
                candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.NumMarksY)));
            ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.Width, candlesticksGraphProps.Y + candlesticksGraphProps.Height -
                candlesticksGraphProps.AxisLabelsHeight - 8 -(c * ((candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight -
                candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.NumMarksY)));
            ctx.stroke();
        }
        for (var d = 0; d < candlesticksGraphProps.Data.length; d++) {
            ctx.beginPath();
            ctx.moveTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((d + 1) * candlesticksGraphProps.XMarksWidth), 
                candlesticksGraphProps.Y + candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 + 5);
            ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((d + 1) * candlesticksGraphProps.XMarksWidth), 
                candlesticksGraphProps.Y + candlesticksGraphProps.TitleHeight + 8);
            ctx.stroke();
        }
        for (var c = 0; c < candlesticksGraphProps.XMarksLabelData.length; c++) {
            var tw = ctx.measureText(candlesticksGraphProps.XMarksLabelData[c][1].toString()).width;
            ctx.fillText(candlesticksGraphProps.XMarksLabelData[c][1], candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft +
                ((candlesticksGraphProps.XMarksLabelData[c][0] + 1) * candlesticksGraphProps.XMarksWidth) - (tw / 2),
                candlesticksGraphProps.Y + candlesticksGraphProps.Height - 4);
        }
        for (var c = 0; c < candlesticksGraphProps.Data.length; c++) {
            var gradient = ctx.createLinearGradient(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) *
                candlesticksGraphProps.XMarksWidth), candlesticksGraphProps.Y + candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 -
                (candlesticksGraphProps.Data[c][0] * (candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight -
                16) / candlesticksGraphProps.YMaxValue), candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth),
                candlesticksGraphProps.Y + candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][1] *
                (candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.YMaxValue));
            var redcomp = parseInt(candlesticksGraphProps.CandleBodyColor.substr(1, 2), 16);
            var greencomp = parseInt(candlesticksGraphProps.CandleBodyColor.substr(3, 2), 16);
            var bluecomp = parseInt(candlesticksGraphProps.CandleBodyColor.substr(5, 2), 16);
            gradient.addColorStop(0.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
            gradient.addColorStop(0.5, candlesticksGraphProps.CandleBodyColor);
            gradient.addColorStop(1.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
            ctx.fillStyle = gradient;
            ctx.strokeStyle = candlesticksGraphProps.CandleLineColor;
            ctx.beginPath();
            if (candlesticksGraphProps.Data[c][0] < candlesticksGraphProps.Data[c][1]) {
                ctx.moveTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth) -
                    (candlesticksGraphProps.CandleBodyWidth / 2), candlesticksGraphProps.Y + candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight -
                    8 - (candlesticksGraphProps.Data[c][0] * (candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight -
                    16) / candlesticksGraphProps.YMaxValue));
                ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth) +
                    (candlesticksGraphProps.CandleBodyWidth / 2), candlesticksGraphProps.Y + candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight -
                    8 - (candlesticksGraphProps.Data[c][0] * (candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight -
                    16) / candlesticksGraphProps.YMaxValue));
                ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth) +
                    (candlesticksGraphProps.CandleBodyWidth / 2), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][1] *
                    (candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) /
                    candlesticksGraphProps.YMaxValue));
                ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth) -
                    (candlesticksGraphProps.CandleBodyWidth / 2), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][1] *
                    (candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) /
                    candlesticksGraphProps.YMaxValue));
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][0] *
                    (candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) /
                    candlesticksGraphProps.YMaxValue));
                ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][2] *
                    (candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) /
                    candlesticksGraphProps.YMaxValue));
                ctx.closePath();
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][1] *
                    (candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) /
                    candlesticksGraphProps.YMaxValue));
                ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][3] *
                    (candlesticksGraphProps.Height - candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) /
                    candlesticksGraphProps.YMaxValue));
                ctx.closePath();
                ctx.stroke();
            } else {
                ctx.strokeStyle = candlesticksGraphProps.CandleBodyColor;
                ctx.moveTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth) -
                    (candlesticksGraphProps.CandleBodyWidth / 2), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][0] * (candlesticksGraphProps.Height -
                    candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.YMaxValue));
                ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth) +
                    (candlesticksGraphProps.CandleBodyWidth / 2), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][0] * (candlesticksGraphProps.Height -
                    candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.YMaxValue));
                ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth) +
                    (candlesticksGraphProps.CandleBodyWidth / 2), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][1] * (candlesticksGraphProps.Height -
                    candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.YMaxValue));
                ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth) -
                    (candlesticksGraphProps.CandleBodyWidth / 2), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][1] * (candlesticksGraphProps.Height -
                    candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.YMaxValue));
                ctx.closePath();
                ctx.stroke();
                ctx.strokeStyle = candlesticksGraphProps.CandleLineColor;
                ctx.beginPath();
                ctx.moveTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][1] * (candlesticksGraphProps.Height -
                    candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.YMaxValue));
                ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][2] * (candlesticksGraphProps.Height -
                    candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.YMaxValue));
                ctx.closePath();
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][0] * (candlesticksGraphProps.Height -
                    candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.YMaxValue));
                ctx.lineTo(candlesticksGraphProps.X + candlesticksGraphProps.MarginLeft + ((c + 1) * candlesticksGraphProps.XMarksWidth), candlesticksGraphProps.Y +
                    candlesticksGraphProps.Height - candlesticksGraphProps.AxisLabelsHeight - 8 - (candlesticksGraphProps.Data[c][3] * (candlesticksGraphProps.Height -
                    candlesticksGraphProps.TitleHeight - candlesticksGraphProps.AxisLabelsHeight - 16) / candlesticksGraphProps.YMaxValue));
                ctx.closePath();
                ctx.stroke();
            }
        }
        ctx.restore();
    }, canvasid);
}

//Doughnut Chart Code starts here

var doughnutChartPropsArray = new Array();

function getDoughnutChartProps(canvasid, windowid) {
    for (var i = 0; i < doughnutChartPropsArray.length; i++) {
        if (doughnutChartPropsArray[i].CanvasID == canvasid && doughnutChartPropsArray[i].WindowID == windowid) {
            return doughnutChartPropsArray[i];
        }
    }
}

function createDoughnutChart(canvasid, controlNameId, x, y, width, height, depth, data, title, titlecolor, titletextheight, titlefontstring, innerradius, marginsides,
    labelcolor, labelheight, labelfontstring, legendwidth, legendheight, legendfontstring, sliceClickFunction, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'DoughnutChart', controlNameId);
    var totalvalue = 0;
    for (var i = 0; i < data.length; i++) {
        totalvalue += data[i][1];
    }
    doughnutChartPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Data: data,
        Title: title, TitleColor: titlecolor, TitleTextHeight: titletextheight, TitleFontString: titlefontstring, InnerRadius: innerradius,
        CurrentRadius: innerradius + 20, TotalValue: totalvalue, MarginSides: marginsides, LabelColor: labelcolor, LabelHeight: labelheight,
        LabelFontString: labelfontstring, LegendWidth: legendwidth, LegendHeight: legendheight, LegendFontString: legendfontstring,
        AnimationCompleted: 0, DeltaI: -1, DeltaX: 0, DeltaY: 0, SliceClickFunction: sliceClickFunction, Tag: tag
    });
    registerClickFunction(windowid, function (canvasid1, windowid1, e) {
        
        var doughnutChartProps = getDoughnutChartProps(canvasid1, windowid1);
        var data = doughnutChartProps.Data;
        var totalvalue = doughnutChartProps.TotalValue;
        var clickx = e.calcX;
        var clicky = e.calcY;
        var pieoutangle = -1;
        var centerx = doughnutChartProps.X + (doughnutChartProps.Width / 2) + doughnutChartProps.MarginSides;
        var centery = doughnutChartProps.Y + ((doughnutChartProps.Height - doughnutChartProps.TitleTextHeight - 8 - (doughnutChartProps.LabelHeight * 2))/2);
        if (150 * 150 > (clickx - centerx) * (clickx - centerx) + (clicky - centery) * (clicky - centery)) {
            if (clickx > centerx && clicky == centery) {
                pieoutangle = 0;
            } else if (clickx > centerx && clicky > centery) {
                pieoutangle = (Math.atan((clicky - centery) / (clickx - centerx))) * 180 / Math.PI;
            } else if (clickx < centerx && clicky > centery) {
                pieoutangle = 180 - ((Math.atan((clicky - centery) / (clickx - centerx))) * 180 / Math.PI);
            } else if (clickx < centerx && clicky == centery) {
                pieoutangle = 180;
            } else if (clickx < centerx && clicky < centery) {
                pieoutangle = 180 + ((Math.atan((clicky - centery) / (clickx - centerx))) * 180 / Math.PI);
            } else if (clickx == centerx && clicky < centery) {
                pieoutangle = 270;
            } else if (clickx > centerx && clicky < centery) {
                pieoutangle = 360 + ((Math.atan((clicky - centery) / (clickx - centerx))) * 180 / Math.PI);
            }
        }
        var currangle = 0;
        var lastangle = 0;
        var founddelta = 0;
        for (i = 0; i < data.length; i++) {
            currangle += (data[i][1] * 360) / totalvalue;
            var deltax = 0;
            var deltay = 0;
            if (pieoutangle >= 0 && lastangle <= pieoutangle && currangle >= pieoutangle) {
                var deltaangle = lastangle + ((currangle - lastangle) / 2);
                if (deltaangle == 0) {
                    deltax = 40;
                    deltay = 0;
                } else if (deltaangle > 0 && deltaangle < 90) {
                    deltax = Math.cos(deltaangle * (Math.PI / 180)) * 40;
                    deltay = Math.sin(deltaangle * (Math.PI / 180)) * 40;
                } else if (deltaangle == 90) {
                    deltax = 0;
                    deltay = 40;
                } else if (deltaangle > 90 && deltaangle < 180) {
                    deltax = -(Math.cos((180 - deltaangle) * (Math.PI / 180)) * 40);
                    deltay = Math.sin((180 - deltaangle) * (Math.PI / 180)) * 40;
                } else if (deltaangle == 180) {
                    deltax = -40;
                    deltay = 0;
                } else if (deltaangle > 180 && deltaangle < 270) {
                    deltax = -(Math.cos((180 - deltaangle) * (Math.PI / 180)) * 40);
                    deltay = (Math.sin((180 - deltaangle) * (Math.PI / 180)) * 40);
                } else if (deltaangle == 270) {
                    deltax = 0;
                    deltay = -40;
                } else if (deltaangle > 270 && deltaangle < 360) {
                    deltax = Math.cos((360 - deltaangle) * (Math.PI / 180)) * 40;
                    deltay = -(Math.sin((360 - deltaangle) * (Math.PI / 180)) * 40);
                }
            }
            if (deltax != 0 || deltay != 0) {
                doughnutChartProps.DeltaX = deltax;
                doughnutChartProps.DeltaY = deltay;
                doughnutChartProps.DeltaI = i;
                founddelta = 1;
                if (doughnutChartProps.SliceClickFunction != null) {
                    doughnutChartProps.SliceClickFunction(canvasid1, windowid1, i);
                }
            }
            lastangle = currangle;
        }
        if (founddelta == 0) {
            doughnutChartProps.DeltaX = 0;
            doughnutChartProps.DeltaY = 0;
            doughnutChartProps.DeltaI = -1;
        }
    }, canvasid);
    registerWindowDrawFunction(windowid, function (canvasid2, windowid2) {
        var doughnutChartProps = getDoughnutChartProps(canvasid2, windowid2);
        var ctx = getCtx(canvasid2);
        var totalvalue = doughnutChartProps.TotalValue;
        var data = doughnutChartProps.Data;
        var innerradius = doughnutChartProps.InnerRadius;
        var currRadius = doughnutChartProps.CurrentRadius;
        if (doughnutChartProps.AnimationCompleted == 0 && currRadius >= (doughnutChartProps.Width - (doughnutChartProps.MarginSides * 2) -
            doughnutChartProps.LegendWidth) / 2) {
            unregisterAnimatedWindow(canvasid2, windowid2);
            doughnutChartProps.AnimationCompleted = 1;
        }
        ctx.save();
        ctx.fillStyle = doughnutChartProps.TitleColor;
        ctx.font = doughnutChartProps.TitleFontString;
        ctx.fillText(doughnutChartProps.Title, doughnutChartProps.X + (doughnutChartProps.Width - ctx.measureText(doughnutChartProps.Title).width) / 2,
            doughnutChartProps.Y + doughnutChartProps.TitleTextHeight + 4);
        ctx.font = doughnutChartProps.LabelFontString;
        var centerx = doughnutChartProps.X + (doughnutChartProps.Width / 2) + doughnutChartProps.MarginSides;
        var centery = doughnutChartProps.Y + ((doughnutChartProps.Height - doughnutChartProps.TitleTextHeight - 8 - (doughnutChartProps.LabelHeight * 2)) / 2);
        var currangle = 0; //in degrees
        var lastangle = 0;
        for (var i = 0; i < data.length; i++) {
            currangle += (data[i][1] * 100 * 360) / (totalvalue * 100);
            var redcomp = parseInt(data[i][2].substr(1, 2), 16);
            var greencomp = parseInt(data[i][2].substr(3, 2), 16);
            var bluecomp = parseInt(data[i][2].substr(5, 2), 16);
            var gradient = ctx.createRadialGradient(centerx + (doughnutChartProps.DeltaI == i ? doughnutChartProps.DeltaX : 0),
                centery + (doughnutChartProps.DeltaI == i ? doughnutChartProps.DeltaY : 0), innerradius, centerx +
                (doughnutChartProps.DeltaI == i ? doughnutChartProps.DeltaX : 0), centery + (doughnutChartProps.DeltaI == i ?
                doughnutChartProps.DeltaY : 0), currRadius);
            gradient.addColorStop(0.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
            gradient.addColorStop(0.5, data[i][2]);
            gradient.addColorStop(1.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerx + (doughnutChartProps.DeltaI == i ? doughnutChartProps.DeltaX : 0), centery + (doughnutChartProps.DeltaI == i ?
                doughnutChartProps.DeltaY : 0), currRadius, (Math.PI / 180) * lastangle, (Math.PI / 180) * currangle, false);
            ctx.arc(centerx + (doughnutChartProps.DeltaI == i ? doughnutChartProps.DeltaX : 0), centery + (doughnutChartProps.DeltaI == i ?
                doughnutChartProps.DeltaY : 0), innerradius, (Math.PI / 180) * currangle, (Math.PI / 180) * lastangle, true);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = data[i][2];
            lastangle = currangle;
        }
        if (doughnutChartProps.AnimationCompleted == 0) {
            doughnutChartProps.CurrentRadius += 5;
        }
        var currangle = 0; //in degrees
        var lastangle = 0;
        for (var i = 0; i < data.length; i++) {
            currangle += (data[i][1] * 100 * 360) / (totalvalue * 100);
            ctx.strokeStyle = data[i][2];
            drawPieChartLabels(ctx, data[i][0], currangle, lastangle, currRadius, totalvalue, data[i][1], data[i][2], 0, 0,
                centerx + (doughnutChartProps.DeltaI == i ? doughnutChartProps.DeltaX : 0), centery + (doughnutChartProps.DeltaI == i ?
                doughnutChartProps.DeltaY : 0), doughnutChartProps.LabelHeight);
            lastangle = currangle;
        }
        ctx.font = doughnutChartProps.LegendFontString;
        for (var o = 0; o < data.length; o++) {
            ctx.fillStyle = data[o][2];
            ctx.fillRect(doughnutChartProps.X + doughnutChartProps.Width - doughnutChartProps.LegendWidth, doughnutChartProps.Y + doughnutChartProps.Height
                - 4 - doughnutChartProps.LegendHeight - (o * (doughnutChartProps.LegendHeight + 10)), 30, doughnutChartProps.LegendHeight);
            ctx.fillStyle = data[o][2];
            ctx.fillText(data[o][0], doughnutChartProps.X + doughnutChartProps.Width - doughnutChartProps.LegendWidth + 35, doughnutChartProps.Y + doughnutChartProps.Height
                - 4 - (o * (doughnutChartProps.LegendHeight + 10)));
        }
        ctx.restore();
    }, canvasid);
    registerAnimatedWindow(canvasid, windowid);
    return windowid;
}

//Bars mixed with labeled line graph

var barsMixedWithLabledLineGraphsPropsArray = new Array();

function getBarsMixedWithLabledLineGraphProps(canvasid, windowid) {
    for (var i = 0; i < barsMixedWithLabledLineGraphsPropsArray.length; i++) {
        if (barsMixedWithLabledLineGraphsPropsArray[i].CanvasID == canvasid && barsMixedWithLabledLineGraphsPropsArray[i].WindowID == windowid) {
            return barsMixedWithLabledLineGraphsPropsArray[i];
        }
    }
}

function createBarsMixedWithLabledLineGraph(canvasid, controlNameId, x, y, width, height, depth, data, maxvalue, nummarksy, title, titletextcolor,
    titletextheigth, titletextfontstring, barwidth, axisLabelsTextColor, axisLabelsTextHeight, axisLabelsTextFontString,
    marginleft, gapbetweenbars, barClickFunction, haslegend, marginright, linesData, lineClickFunction, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'BarsMixedWithLabeledLineGraph', controlNameId);
    barsMixedWithLabledLineGraphsPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Data: data,
        MaxValue: maxvalue, NumMarksY: nummarksy, Title: title, TitleTextColor: titletextcolor, TitleTextHeight: titletextheigth,
        TitleTextFontString: titletextfontstring, BarWidth: barwidth, BarLabelsWithBoundingBoxes: new Array(),
        H: height - axisLabelsTextHeight - 8 - 20, AxisLabelsTextHeight: axisLabelsTextHeight,
        AxisLabelsTextFontString: axisLabelsTextFontString, AxisLabelsTextColor: axisLabelsTextColor, MarginLeft: marginleft,
        GapBetweenBars: gapbetweenbars, BarClickFunction: barClickFunction, AlreadyUnregisteredAnimation: 0,
        HasLegend: haslegend, MarginRight: marginright, LinesData: linesData, LineXYs: new Array(), LineClickFunction: lineClickFunction,
        YMaxValue: maxvalue, Tag: tag
    });
    registerClickFunction(windowid, function (canvasid1, windowid1, e) {
        
        var barsMixedWithLabledLineGraphProps = getBarsMixedWithLabledLineGraphProps(canvasid1, windowid1);
        var clickx = e.calcX;
        var clicky = e.calcY;
        for (var i = 0; i < barsMixedWithLabledLineGraphProps.BarLabelsWithBoundingBoxes.length; i++) {
            if (clickx >= barsMixedWithLabledLineGraphProps.BarLabelsWithBoundingBoxes[i].X && clickx <= barsMixedWithLabledLineGraphProps.BarLabelsWithBoundingBoxes[i].X +
                barsMixedWithLabledLineGraphProps.BarLabelsWithBoundingBoxes[i].Width && clicky >= barsMixedWithLabledLineGraphProps.BarLabelsWithBoundingBoxes[i].Y &&
                clicky <= barsMixedWithLabledLineGraphProps.BarLabelsWithBoundingBoxes[i].Y + barsMixedWithLabledLineGraphProps.BarLabelsWithBoundingBoxes[i].Height) {
                if (barsMixedWithLabledLineGraphProps.BarClickFunction != null) {
                    barsMixedWithLabledLineGraphProps.BarClickFunction(canvasid1, windowid1, i);
                    return;
                }
            }
        }
        var linexys = barsMixedWithLabledLineGraphProps.LineXYs;
        for (var i = 0; i < linexys.length; i++) {
            for (var j = 0; j < linexys[i].length - 1; j++) {
                if (clickx >= linexys[i][j][0] && clickx <= linexys[i][j + 1][0]) {
                    if ((clicky <= linexys[i][j][1] && clicky >= linexys[i][j + 1][1]) || (clicky >= linexys[i][j][1] && clicky <= linexys[i][j + 1][1])) {
                        y = (((linexys[i][j][1] - linexys[i][j + 1][1]) * (clickx - linexys[i][j][0])) / (linexys[i][j][0] - linexys[i][j + 1][0])) + linexys[i][j][1];
                        if (y + 4 > clicky && y - 4 < clicky) {
                            barsMixedWithLabledLineGraphProps.LineClickFunction(canvasid1, windowid1, i);
                        }
                    }
                }
            }
        }
    }, canvasid);
    registerWindowDrawFunction(windowid, function (canvasid2, windowid2) {
        var barsMixedWithLabledLineGraphProps = getBarsMixedWithLabledLineGraphProps(canvasid2, windowid2);
        var ctx = getCtx(canvasid2);
        var h = barsMixedWithLabledLineGraphProps.H;
        if (barsMixedWithLabledLineGraphProps.AlreadyUnregisteredAnimation == 0 && h < barsMixedWithLabledLineGraphProps.TitleTextHeight + 8) {
            barsMixedWithLabledLineGraphProps.AlreadyUnregisteredAnimation = 1;
            unregisterAnimatedWindow(canvasid2, windowid2);
        }
        barsMixedWithLabledLineGraphProps.LineXYs = new Array();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.fillStyle = barsMixedWithLabledLineGraphProps.TitleTextColor;
        ctx.font = barsMixedWithLabledLineGraphProps.TitleTextFontString;
        ctx.lineWidth = 2;
        ctx.fillText(barsMixedWithLabledLineGraphProps.Title, barsMixedWithLabledLineGraphProps.X + (barsMixedWithLabledLineGraphProps.Width -
            ctx.measureText(barsMixedWithLabledLineGraphProps.Title).width) / 2, barsMixedWithLabledLineGraphProps.Y +
            barsMixedWithLabledLineGraphProps.TitleTextHeight + 4);
        ctx.lineWidth = 1;
        ctx.fillStyle = barsMixedWithLabledLineGraphProps.AxisLabelsTextColor;
        ctx.font = barsMixedWithLabledLineGraphProps.AxisLabelsTextFontString;
        var yaxisheight = barsMixedWithLabledLineGraphProps.Height - barsMixedWithLabledLineGraphProps.TitleTextHeight -
            barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight - 16;
        ctx.beginPath();
        ctx.moveTo(barsMixedWithLabledLineGraphProps.X + barsMixedWithLabledLineGraphProps.MarginLeft, barsMixedWithLabledLineGraphProps.Y +
            barsMixedWithLabledLineGraphProps.TitleTextHeight + 8 + yaxisheight);
        ctx.lineTo(barsMixedWithLabledLineGraphProps.X + barsMixedWithLabledLineGraphProps.MarginLeft, barsMixedWithLabledLineGraphProps.Y +
            barsMixedWithLabledLineGraphProps.TitleTextHeight + 8);
        ctx.stroke();
        for (var c = 0; c < barsMixedWithLabledLineGraphProps.NumMarksY; c++) {
            var val = (barsMixedWithLabledLineGraphProps.MaxValue / barsMixedWithLabledLineGraphProps.NumMarksY) * c;
            val = Math.round(val * 100) / 100;
            var tw = ctx.measureText(val.toString()).width;
            var yval = yaxisheight / barsMixedWithLabledLineGraphProps.NumMarksY;
            ctx.fillText(val.toString(), barsMixedWithLabledLineGraphProps.X + barsMixedWithLabledLineGraphProps.MarginLeft - tw - 5,
                barsMixedWithLabledLineGraphProps.Y + barsMixedWithLabledLineGraphProps.TitleTextHeight +
                8 + (barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight / 2) + yaxisheight - (c * yval));
            ctx.beginPath();
            ctx.moveTo(barsMixedWithLabledLineGraphProps.X + barsMixedWithLabledLineGraphProps.MarginLeft, barsMixedWithLabledLineGraphProps.Y +
                barsMixedWithLabledLineGraphProps.TitleTextHeight + 8 + yaxisheight - (c * yval));
            ctx.lineTo(barsMixedWithLabledLineGraphProps.X + barsMixedWithLabledLineGraphProps.MarginLeft +
                (barsMixedWithLabledLineGraphProps.Data.length * (barsMixedWithLabledLineGraphProps.BarWidth +
                barsMixedWithLabledLineGraphProps.GapBetweenBars)) + barsMixedWithLabledLineGraphProps.GapBetweenBars, barsMixedWithLabledLineGraphProps.Y +
                barsMixedWithLabledLineGraphProps.TitleTextHeight + 8 + yaxisheight - (c * yval));
            ctx.stroke();
        }
        barsMixedWithLabledLineGraphProps.BarLabelsWithBoundingBoxes = new Array();
        for (var i = 0; i < barsMixedWithLabledLineGraphProps.Data.length; i++) {
            if (barsMixedWithLabledLineGraphProps.HasLegend != 1) {
                var w = ctx.measureText(barsMixedWithLabledLineGraphProps.Data[i][0]).width;
                ctx.fillStyle = barsMixedWithLabledLineGraphProps.AxisLabelsTextColor;
                ctx.font = barsMixedWithLabledLineGraphProps.AxisLabelsTextFontString;
                if (w < barsMixedWithLabledLineGraphProps.BarWidth) {
                    ctx.fillText(barsMixedWithLabledLineGraphProps.Data[i][0], barsMixedWithLabledLineGraphProps.X +
                        barsMixedWithLabledLineGraphProps.MarginLeft + barsMixedWithLabledLineGraphProps.GapBetweenBars +
                        (i * (barsMixedWithLabledLineGraphProps.BarWidth + barsMixedWithLabledLineGraphProps.GapBetweenBars)) +
                        ((barsMixedWithLabledLineGraphProps.BarWidth - w) / 2), barsMixedWithLabledLineGraphProps.Y +
                        barsMixedWithLabledLineGraphProps.Height - 4);
                } else {
                    ctx.fillText(barsMixedWithLabledLineGraphProps.Data[i][0], barsMixedWithLabledLineGraphProps.X +
                        barsMixedWithLabledLineGraphProps.MarginLeft + barsMixedWithLabledLineGraphProps.GapBetweenBars +
                        (i * (barsMixedWithLabledLineGraphProps.BarWidth + barsMixedWithLabledLineGraphProps.GapBetweenBars)) -
                        ((w - barsMixedWithLabledLineGraphProps.BarWidth) / 2), barsMixedWithLabledLineGraphProps.Y +
                        barsMixedWithLabledLineGraphProps.Height - 4);
                }
            }
            drawrect(canvasid2, windowid2, ctx, barsMixedWithLabledLineGraphProps, i, yaxisheight);
        }
        var xlabels = new Array();
        var maxnumlabels = 0;
        for (var i = 0; i < barsMixedWithLabledLineGraphProps.LinesData.length; i++) {
            if (barsMixedWithLabledLineGraphProps.LinesData[i][0].length > maxnumlabels) {
                maxnumlabels = barsMixedWithLabledLineGraphProps.LinesData[i][0].length;
            }
        }
        for (var i = 0; i < maxnumlabels; i++) {
            for (var j = 0; j < barsMixedWithLabledLineGraphProps.LinesData.length; j++) {
                if (i < barsMixedWithLabledLineGraphProps.LinesData[j][0].length) {
                    var foundlabel = 0;
                    for (var p = 0; p < xlabels.length; p++) {
                        if (xlabels[p] == barsMixedWithLabledLineGraphProps.LinesData[j][0][i][0]) {
                            foundlabel = 1;
                            break;
                        }
                    }
                    if (foundlabel == 0) {
                        xlabels.push(barsMixedWithLabledLineGraphProps.LinesData[j][0][i][0]);
                    }
                }
            }
        }
        var i = 0;
        while (i < barsMixedWithLabledLineGraphProps.LinesData.length) {
            drawlineforbarsmixedwithlinesgraph(ctx, barsMixedWithLabledLineGraphProps, i, xlabels);
            i++;
        }
        if (barsMixedWithLabledLineGraphProps.HasLegend == 1) {
            for (var o = 0; o < barsMixedWithLabledLineGraphProps.Data.length; o++) {
                ctx.fillStyle = data[o][2];
                ctx.fillRect(barsMixedWithLabledLineGraphProps.X + barsMixedWithLabledLineGraphProps.Width - barsMixedWithLabledLineGraphProps.MarginRight,
                    barsMixedWithLabledLineGraphProps.Y + barsMixedWithLabledLineGraphProps.Height
                    - 8 - barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight - (o * (8 + barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight)),
                    30, barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight);
                ctx.fillText(data[o][0], barsMixedWithLabledLineGraphProps.X + barsMixedWithLabledLineGraphProps.Width -
                    barsMixedWithLabledLineGraphProps.MarginRight + 35, barsMixedWithLabledLineGraphProps.Y + barsMixedWithLabledLineGraphProps.Height
                    - 8 - (o * (8 + barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight)));
            }
        }
        if (h >= barsMixedWithLabledLineGraphProps.TitleTextHeight + 8) {
            barsMixedWithLabledLineGraphProps.H -= 5;
        }
        ctx.restore();
    }, canvasid);
    registerAnimatedWindow(canvasid, windowid);
    return windowid;
}


function drawlineforbarsmixedwithlinesgraph(ctx, barsMixedWithLabledLineGraphProps, x, xlabels) {
    var redcomp = parseInt(barsMixedWithLabledLineGraphProps.LinesData[x][1].substr(1, 2), 16);
    var greencomp = parseInt(barsMixedWithLabledLineGraphProps.LinesData[x][1].substr(3, 2), 16);
    var bluecomp = parseInt(barsMixedWithLabledLineGraphProps.LinesData[x][1].substr(5, 2), 16);
    ctx.strokeStyle = barsMixedWithLabledLineGraphProps.LinesData[x][1];
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.miterLimit = 0.0;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#' + getlowcomp(redcomp).toString(16) + getlowcomp(greencomp).toString(16) + getlowcomp(bluecomp).toString(16);
    ctx.beginPath();
    var linexys = new Array();
    linexys = linexys.concat([[barsMixedWithLabledLineGraphProps.X + barsMixedWithLabledLineGraphProps.MarginLeft + 
        (findXLabelIndexForValue(xlabels, barsMixedWithLabledLineGraphProps.LinesData[x][0][0][0]) *
        (barsMixedWithLabledLineGraphProps.Width - barsMixedWithLabledLineGraphProps.MarginLeft)) / xlabels.length,
        barsMixedWithLabledLineGraphProps.Y + barsMixedWithLabledLineGraphProps.Height - barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight - 8 -
        ((barsMixedWithLabledLineGraphProps.LinesData[x][0][0][1] * (barsMixedWithLabledLineGraphProps.Height -
        barsMixedWithLabledLineGraphProps.TitleTextHeight - barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight - 16)) /
        barsMixedWithLabledLineGraphProps.YMaxValue)]]);
    ctx.moveTo(barsMixedWithLabledLineGraphProps.X + barsMixedWithLabledLineGraphProps.MarginLeft + 
        barsMixedWithLabledLineGraphProps.GapBetweenBars + (barsMixedWithLabledLineGraphProps.BarWidth / 2) +
        (findXLabelIndexForValue(xlabels, barsMixedWithLabledLineGraphProps.LinesData[x][0][0][0]) *
        (barsMixedWithLabledLineGraphProps.Width - barsMixedWithLabledLineGraphProps.MarginLeft -
        barsMixedWithLabledLineGraphProps.GapBetweenBars - (barsMixedWithLabledLineGraphProps.BarWidth / 2))) / xlabels.length,
        barsMixedWithLabledLineGraphProps.Y + barsMixedWithLabledLineGraphProps.Height - barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight -
        8 - ((barsMixedWithLabledLineGraphProps.LinesData[x][0][0][1] *
        (barsMixedWithLabledLineGraphProps.Height - barsMixedWithLabledLineGraphProps.TitleTextHeight - barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight - 16)) /
        barsMixedWithLabledLineGraphProps.YMaxValue));
    for (var i = 1; i < barsMixedWithLabledLineGraphProps.H && i < barsMixedWithLabledLineGraphProps.LinesData[x][0].length; i++) {
        linexys = linexys.concat([[barsMixedWithLabledLineGraphProps.X + barsMixedWithLabledLineGraphProps.MarginLeft +
            (findXLabelIndexForValue(xlabels, barsMixedWithLabledLineGraphProps.LinesData[x][0][i][0]) * (barsMixedWithLabledLineGraphProps.Width - 
            barsMixedWithLabledLineGraphProps.MarginLeft)) / xlabels.length,
            barsMixedWithLabledLineGraphProps.Y + barsMixedWithLabledLineGraphProps.Height - barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight -
            8 - ((barsMixedWithLabledLineGraphProps.LinesData[x][0][i][1] *
            (barsMixedWithLabledLineGraphProps.Height - barsMixedWithLabledLineGraphProps.TitleTextHeight -
            barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight - 16)) / barsMixedWithLabledLineGraphProps.YMaxValue)]]);
        ctx.lineTo(barsMixedWithLabledLineGraphProps.X + barsMixedWithLabledLineGraphProps.MarginLeft +
            barsMixedWithLabledLineGraphProps.GapBetweenBars + (barsMixedWithLabledLineGraphProps.BarWidth / 2) + (findXLabelIndexForValue(xlabels,
            barsMixedWithLabledLineGraphProps.LinesData[x][0][i][0]) * (barsMixedWithLabledLineGraphProps.GapBetweenBars + barsMixedWithLabledLineGraphProps.BarWidth)),
            barsMixedWithLabledLineGraphProps.Y + barsMixedWithLabledLineGraphProps.Height - barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight -
            8 - ((barsMixedWithLabledLineGraphProps.LinesData[x][0][i][1] *
            (barsMixedWithLabledLineGraphProps.Height - barsMixedWithLabledLineGraphProps.TitleTextHeight -
            barsMixedWithLabledLineGraphProps.AxisLabelsTextHeight - 16)) / barsMixedWithLabledLineGraphProps.YMaxValue));
    }
    barsMixedWithLabledLineGraphProps.LineXYs.concat([[linexys]]);
    ctx.stroke();
}

//Stacked Bar Graph

var stackedBarGraphPropsArray = new Array();

function getstackedBarGraphProps(canvasid, windowid) {
    for (var i = 0; i < stackedBarGraphPropsArray.length; i++) {
        if (stackedBarGraphPropsArray[i].CanvasID == canvasid && stackedBarGraphPropsArray[i].WindowID == windowid) {
            return stackedBarGraphPropsArray[i];
        }
    }
}

function createStackedBarGraph(canvasid, controlNameId, x, y, width, height, depth, data, maxvalue, nummarksy, title, titlecolor, titleheight,
    titlefontstring, barwidth, gapbetweenbarssets, axislabelscolor, axislabelsheight, axislabelsfontstring, barClickFunction, marginleft, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'StackedBarGraph', controlNameId);
    stackedBarGraphPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height,
        Data: data, MaxValue: maxvalue, NumMarksY: nummarksy, Title: title, TitleColor: titlecolor, TitleHeight: titleheight,
        TitleFontString: titlefontstring, BarWidth: barwidth, GapBetweenBarSets: gapbetweenbarssets, H: height - titleheight - 16 -
        axislabelsheight, AxisLabelsColor: axislabelscolor, AxisLabelsHeight: axislabelsheight, AxisLabelsFontString: axislabelsfontstring,
        BarLabelsWithBoundingBoxes: new Array(), BarClickFunction: barClickFunction, AlreadyUnregisteredAnimation: 0,
        MarginLeft: marginleft, Tag: tag
    });
    registerClickFunction(windowid, function (canvasid1, windowid1, e) {
        var stackedBarGraphProps = getstackedBarGraphProps(canvasid1, windowid1);
        var data = stackedBarGraphProps.Data;
        var totalvalue = 0;
        for (var i = 0; i < data.length; i++) {
            totalvalue += data[i][1];
        }
        var clickx = e.calcX;
        var clicky = e.calcY;
        for (var i = 0; i < stackedBarGraphProps.BarLabelsWithBoundingBoxes.length; i++) {
            if (clickx >= stackedBarGraphProps.BarLabelsWithBoundingBoxes[i][1] && clickx <= stackedBarGraphProps.BarLabelsWithBoundingBoxes[i][3] &&
                clicky >= stackedBarGraphProps.BarLabelsWithBoundingBoxes[i][2] && clicky <= stackedBarGraphProps.BarLabelsWithBoundingBoxes[i][4]) {
                if (stackedBarGraphProps.BarClickFunction != null) {
                    stackedBarGraphProps.BarClickFunction(canvasid1, windowid1, i);
                }
            }
        }
    }, canvasid);
    registerWindowDrawFunction(windowid, function (canvasid2, windowid2) {
        var stackedBarGraphProps = getstackedBarGraphProps(canvasid2, windowid2);
        if (stackedBarGraphProps.AlreadyUnregisteredAnimation == 0 && stackedBarGraphProps.H < 100) {
            unregisterAnimatedWindow(canvasid2, windowid2);
            stackedBarGraphProps.AlreadyUnregisteredAnimation = 1;
        }
        var ctx = getCtx(canvasid2);
        ctx.save();
        ctx.fillStyle = stackedBarGraphProps.TitleColor;
        ctx.font = stackedBarGraphProps.TitleFontString;
        ctx.fillText(stackedBarGraphProps.Title, stackedBarGraphProps.X + (stackedBarGraphProps.Width - ctx.measureText(stackedBarGraphProps.Title).width) / 2, 
            stackedBarGraphProps.Y + stackedBarGraphProps.TitleHeight + 4);
        ctx.font = stackedBarGraphProps.AxisLabelsFontString;
        ctx.beginPath();
        ctx.moveTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft, stackedBarGraphProps.Y + stackedBarGraphProps.Height -
            stackedBarGraphProps.AxisLabelsHeight - 8);
        ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft, stackedBarGraphProps.Y + stackedBarGraphProps.TitleHeight + 8);
        ctx.stroke();
        for (var c = 0; c < stackedBarGraphProps.NumMarksY; c++) {
            var val = (stackedBarGraphProps.MaxValue / stackedBarGraphProps.NumMarksY) * c;
            val = Math.round(val * 100) / 100;
            var tw = ctx.measureText(val.toString()).width;
            var yval = (stackedBarGraphProps.Height - stackedBarGraphProps.TitleHeight - stackedBarGraphProps.AxisLabelsHeight - 16) / stackedBarGraphProps.NumMarksY;
            ctx.fillText(val.toString(), stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft - 10 - tw, stackedBarGraphProps.Y +
                stackedBarGraphProps.Height - stackedBarGraphProps.AxisLabelsHeight - 8 - (c * yval));
            ctx.beginPath();
            ctx.moveTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft - 5, stackedBarGraphProps.Y + stackedBarGraphProps.Height -
                stackedBarGraphProps.AxisLabelsHeight - 8 - (c * yval));
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.GapBetweenBarSets + (stackedBarGraphProps.Data.length *
                stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + stackedBarGraphProps.Height - stackedBarGraphProps.AxisLabelsHeight - 8 - (c * yval));
            ctx.stroke();
        }
        stackedBarGraphProps.BarLabelsWithBoundingBoxes = new Array();
        for (var i = 0; i < stackedBarGraphProps.Data.length; i++) {
            ctx.fillStyle = stackedBarGraphProps.AxisLabelsColor;
            ctx.font = stackedBarGraphProps.AxisLabelsFontString;
            var w = ctx.measureText(stackedBarGraphProps.Data[i][0]).width;
            if (w < stackedBarGraphProps.BarWidth) {
                ctx.fillText(stackedBarGraphProps.Data[i][0], stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + (i * stackedBarGraphProps.BarWidth) +
                    ((stackedBarGraphProps.BarWidth - w) / 2), stackedBarGraphProps.Y + stackedBarGraphProps.Height - 4);
            } else {
                ctx.fillText(stackedBarGraphProps.Data[i][0], stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + (i * stackedBarGraphProps.BarWidth),
                    stackedBarGraphProps.Y + stackedBarGraphProps.Height - stackedBarGraphProps.AxisLabelsHeight - 3);
            }
            drawmultiplerect(ctx, stackedBarGraphProps, i);
        }
        if (stackedBarGraphProps.AlreadyUnregisteredAnimation == 0 && stackedBarGraphProps.H > 100) {
            stackedBarGraphProps.H -= 5;
        }
        ctx.restore();
    }, canvasid);
    registerAnimatedWindow(canvasid, windowid);
    return windowid;
}

function drawmultiplerect(ctx, stackedBarGraphProps, i) {
    ctx.save();
    var hthis = stackedBarGraphProps.H;
    var total = 0;
    for (var x = 1; x < stackedBarGraphProps.Data.length; x++) {
        total += stackedBarGraphProps.Data[i][x][0];
    }
    var axisheight = stackedBarGraphProps.Height - stackedBarGraphProps.TitleHeight - stackedBarGraphProps.AxisLabelsHeight - 16;
    var topy = stackedBarGraphProps.Height - axisheight - stackedBarGraphProps.AxisLabelsHeight - 8;
    var bottomy = stackedBarGraphProps.Height - stackedBarGraphProps.AxisLabelsHeight - 8;
    if (stackedBarGraphProps.H < topy + (axisheight - (axisheight / stackedBarGraphProps.MaxValue) * total)) {
        hthis = topy + (axisheight - (axisheight / stackedBarGraphProps.MaxValue) * total);
    }
    stackedBarGraphProps.BarLabelsWithBoundingBoxes.push([stackedBarGraphProps.Data[i][0], stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft +
        ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) +
        (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - hthis,
        stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.GapBetweenBarSets + ((stackedBarGraphProps.BarWidth -
        stackedBarGraphProps.GapBetweenBarSets) / 2) + (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy]);
    var shift = 0;
    for (var x = 1; x < stackedBarGraphProps.Data[i].length; x++) {
        var colorstr = stackedBarGraphProps.Data[i][x][1];
        var gradient = ctx.createLinearGradient(stackedBarGraphProps.X, stackedBarGraphProps.Y, stackedBarGraphProps.X + stackedBarGraphProps.BarWidth,
            stackedBarGraphProps.Y + axisheight);
        var redcomp = parseInt(colorstr.substr(1, 2), 16);
        var greencomp = parseInt(colorstr.substr(3, 2), 16);
        var bluecomp = parseInt(colorstr.substr(5, 2), 16);
        gradient.addColorStop(0.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
        gradient.addColorStop(0.5, colorstr);
        gradient.addColorStop(1.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
        ctx.fillStyle = gradient;
        ctx.shadowOffsetX = 5;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#' + getlowcomp(redcomp).toString(16) + getlowcomp(greencomp).toString(16) + getlowcomp(bluecomp).toString(16);
        hthis = (bottomy - stackedBarGraphProps.H) * stackedBarGraphProps.Data[i][x][0] / total;
        if (stackedBarGraphProps.H < topy + (axisheight - (axisheight / stackedBarGraphProps.MaxValue) * total)) {
            hthis = axisheight * stackedBarGraphProps.Data[i][x][0] / stackedBarGraphProps.MaxValue;
        }
        ctx.shadowOffsetY = 0;
        if (x < stackedBarGraphProps.Data[i].length - 1) {
            ctx.beginPath();
            ctx.moveTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) +
                (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - (shift + hthis));
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.GapBetweenBarSets + ((stackedBarGraphProps.BarWidth - 
                stackedBarGraphProps.GapBetweenBarSets) / 2) + (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - (shift + hthis));
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.GapBetweenBarSets + ((stackedBarGraphProps.BarWidth -
                stackedBarGraphProps.GapBetweenBarSets) / 2) + (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - shift);
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) +
                (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - shift);
            ctx.closePath();
            ctx.fill();
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            ctx.shadowColor = '#FFFFFF';
            gradient = ctx.createLinearGradient(stackedBarGraphProps.X, stackedBarGraphProps.Y, stackedBarGraphProps.X + stackedBarGraphProps.BarWidth,
                stackedBarGraphProps.Y + axisheight);
            gradient.addColorStop(0.0, '#FFFFFF');
            gradient.addColorStop(0.5, '#000000');
            gradient.addColorStop(1.0, '#FFFFFF');
            ctx.fillStyle = gradient;
            ctx.globalAlpha = 0.1;
            ctx.beginPath();
            ctx.moveTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) +
                (i * stackedBarGraphProps.BarWidth) + 5, stackedBarGraphProps.Y + bottomy - (shift + hthis) + 5);
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.GapBetweenBarSets - 5 +
                ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) + (i * stackedBarGraphProps.BarWidth),
                stackedBarGraphProps.Y + bottomy - (shift + hthis) + 5);
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.GapBetweenBarSets - 5 +
                ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) + (i * stackedBarGraphProps.BarWidth),
                stackedBarGraphProps.Y + bottomy - shift - 5);
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + 5 + ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) +
                (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - shift - 5);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1.0;
        } else {
            ctx.beginPath();
            ctx.moveTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) +
                (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - (shift + hthis) + 5);
            ctx.arc(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + 5 + ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) +
                (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - (shift + hthis) + 5, 5, Math.PI, (Math.PI / 180) * 270, false);
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets - 5 +
                ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) + (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y +
                bottomy - (shift + hthis)); 
            ctx.arc(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.GapBetweenBarSets - 5 + ((stackedBarGraphProps.BarWidth - 
                stackedBarGraphProps.GapBetweenBarSets) / 2) + (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - (shift + hthis) + 5, 5, (Math.PI / 180) * 270, 0, false);
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.GapBetweenBarSets + ((stackedBarGraphProps.BarWidth - 
                stackedBarGraphProps.GapBetweenBarSets) / 2) + (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - shift);
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) +
                (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - shift);
            ctx.closePath();
            ctx.fill();
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            ctx.shadowColor = '#FFFFFF';
            gradient = ctx.createLinearGradient(stackedBarGraphProps.X, stackedBarGraphProps.Y, stackedBarGraphProps.X + stackedBarGraphProps.BarWidth,
                stackedBarGraphProps.Y + axisheight);
            gradient.addColorStop(0.0, '#FFFFFF');
            gradient.addColorStop(0.5, '#000000');
            gradient.addColorStop(1.0, '#FFFFFF');
            ctx.fillStyle = gradient;
            ctx.globalAlpha = 0.1;
            ctx.beginPath();
            ctx.moveTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + 5 + ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) +
                (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - (shift + hthis) + 10);
            ctx.arc(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + 10 + ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) +
                (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - (shift + hthis) + 10, 5, Math.PI, (Math.PI / 180) * 270, false);
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.GapBetweenBarSets - 10 + ((stackedBarGraphProps.BarWidth -
                stackedBarGraphProps.GapBetweenBarSets) / 2) + (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - (shift + hthis) + 5);
            ctx.arc(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.GapBetweenBarSets - 10 + ((stackedBarGraphProps.BarWidth -
                stackedBarGraphProps.GapBetweenBarSets) / 2) + (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - (shift + hthis) + 10, 5, (Math.PI / 180) * 270, 0, false);
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + stackedBarGraphProps.GapBetweenBarSets - 5 + ((stackedBarGraphProps.BarWidth - 
                stackedBarGraphProps.GapBetweenBarSets) / 2) + (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - 5 - shift);
            ctx.lineTo(stackedBarGraphProps.X + stackedBarGraphProps.MarginLeft + 5 + ((stackedBarGraphProps.BarWidth - stackedBarGraphProps.GapBetweenBarSets) / 2) +
                (i * stackedBarGraphProps.BarWidth), stackedBarGraphProps.Y + bottomy - 5 - shift);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = '#FFFFFF';
        shift += hthis;
        ctx.restore();
    }
}

//Tab Control code starts here

var tabPropsArray = new Array();

function getTabProps(canvasid, windowid) {
    for (var i = 0; i < tabPropsArray.length; i++) {
        if (tabPropsArray[i].CanvasID == canvasid && tabPropsArray[i].WindowID == windowid) {
            return tabPropsArray[i];
        }
    }
}

function createTabControl(canvasid, controlNameId, x, y, width, height, depth, tablabels, tablabelcolor, tablabelheight, tablabelfontstring,
    tablabelgradientstartcolor, tablabelgradientendcolor, panelHasBorder, panelBorderColor, panelHasBackgroundGradient,
    panelBackgroundStartColor, panelBackgroundEndColor, selectedTabID, gapbetweentabs, selectedtabbordercolor,
    selectedtabborderlinewidth, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'Tab', controlNameId);
    var panels = new Array();
    for (var i = 0; i < tablabels.length; i++) {
        var panelwindowid = createPanel(canvasid, controlNameId + 'Panel' + i.toString(), x, y + tablabelheight + 8, width, height - tablabelheight - 8, depth, panelHasBorder, panelBorderColor,
            panelHasBackgroundGradient, panelBackgroundStartColor, panelBackgroundEndColor);
        panels.push(panelwindowid);
        registerHiddenWindow(canvasid, panelwindowid, (i == selectedTabID ? 0 : 1));
        registerChildWindow(canvasid, panelwindowid, windowid);
    }
    tabPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height,
        TabLabels: tablabels, TabLabelColor: tablabelcolor, TabLabelHeight: tablabelheight, TabLabelFontString: tablabelfontstring,
        PanelWindowIDs: panels, SelectedTabID: selectedTabID, TabLabelGradientStartColor: tablabelgradientstartcolor, 
        TabLabelGradientEndColor: tablabelgradientendcolor, TabLabelHitAreas: new Array(),
        GapBetweenTabs: gapbetweentabs, SelectedTabBorderColor: selectedtabbordercolor, SelectedTabBorderLineWidth: selectedtabborderlinewidth, Tag: tag
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var tabProps = getTabProps(canvasid1, windowid1);
        var ctx = getCtx(canvasid1);
        ctx.font = tabProps.TabLabelFontString;
        var selectedTabWidth = ctx.measureText(tabProps.TabLabels[tabProps.SelectedTabID]).width + 8 + ((tabProps.TabLabelHeight + 8) * 2);
        var currWidthOffset = 0;
        var selectedWidthOffset = 0;
        tabProps.TabLabelHitAreas = new Array();
        var currentTabWidth = 0;
        for (var i = 0; i < tabProps.TabLabels.length; i++) {
            if (i == tabProps.SelectedTabID + 1) {
                currWidthOffset += selectedTabWidth;
            }
            if (i == tabProps.SelectedTabID) {
                selectedWidthOffset = currWidthOffset;
            } else {
                currentTabWidth = ctx.measureText(tabProps.TabLabels[i]).width + 8 + ((tabProps.TabLabelHeight + 8) * 2);
                if (i != tabProps.SelectedTabID && currWidthOffset + currentTabWidth < tabProps.Width) {
                    var tablabelgradient = ctx.createLinearGradient(tabProps.X + currWidthOffset, tabProps.Y, tabProps.X + currWidthOffset + currentTabWidth,
                        tabProps.Y + tabProps.TabLabelHeight + 8);
                    tablabelgradient.addColorStop(0, tabProps.TabLabelGradientStartColor);
                    tablabelgradient.addColorStop(1, tabProps.TabLabelGradientEndColor);
                    ctx.fillStyle = tablabelgradient;
                    ctx.beginPath();
                    ctx.moveTo(tabProps.X + currWidthOffset + ((i + 1) * tabProps.GapBetweenTabs), tabProps.Y + tabProps.TabLabelHeight + 8);
                    ctx.lineTo(tabProps.X + currWidthOffset + ((i + 1) * tabProps.GapBetweenTabs), tabProps.Y + 5);
                    ctx.arc(tabProps.X + currWidthOffset + ((i + 1) * tabProps.GapBetweenTabs) + 5, tabProps.Y + 5, 5, Math.PI, (Math.PI / 180) * 270, false);
                    ctx.lineTo(tabProps.X + currWidthOffset + ((i + 1) * tabProps.GapBetweenTabs) + currentTabWidth - 5, tabProps.Y);
                    ctx.arc(tabProps.X + currWidthOffset + ((i + 1) * tabProps.GapBetweenTabs) + currentTabWidth - 5, tabProps.Y + 5, 5, (Math.PI / 180) * 270, Math.PI * 2, false);
                    ctx.lineTo(tabProps.X + currWidthOffset + ((i + 1) * tabProps.GapBetweenTabs) + currentTabWidth, tabProps.Y + tabProps.TabLabelHeight + 8);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = tabProps.TabLabelColor;
                    ctx.fillText(tabProps.TabLabels[i], tabProps.X + currWidthOffset + ((i + 1) * tabProps.GapBetweenTabs) + tabProps.TabLabelHeight + 8 + 4,
                        tabProps.Y + tabProps.TabLabelHeight + 4);
                    tabProps.TabLabelHitAreas.push({
                        XStart: tabProps.X + currWidthOffset, XEnd: tabProps.X + currWidthOffset + ((tabProps.TabLabelHeight + 8) * 2) +
                            currentTabWidth + 8, YStart: tabProps.Y, YEnd: tabProps.Y + tabProps.TabLabelHeight + 8, PanelWindowID: tabProps.PanelWindowIDs[i],
                            TabID: i
                    });
                }
                currWidthOffset += currentTabWidth;
            }
        }
        currWidthOffset = selectedWidthOffset;
        var tablabelgradient = ctx.createLinearGradient(tabProps.X, tabProps.Y, tabProps.X, tabProps.Y + tabProps.TabLabelHeight + 8);
        tablabelgradient.addColorStop(0, tabProps.TabLabelGradientStartColor);
        tablabelgradient.addColorStop(1, tabProps.TabLabelGradientEndColor);
        ctx.fillStyle = tablabelgradient;
        ctx.beginPath();
        ctx.moveTo(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs), tabProps.Y + tabProps.TabLabelHeight + 8);
        ctx.lineTo(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs), tabProps.Y + 5);
        ctx.arc(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs) + 5, tabProps.Y + 5, 5, Math.PI, (Math.PI / 180) * 270, false);
        ctx.lineTo(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs) + currentTabWidth - 5, tabProps.Y);
        ctx.arc(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs) + currentTabWidth - 5, tabProps.Y + 5, 5, (Math.PI / 180) * 270, Math.PI * 2, false);
        ctx.lineTo(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs) + currentTabWidth, tabProps.Y + tabProps.TabLabelHeight + 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = tabProps.TabLabelColor;
        ctx.fillText(tabProps.TabLabels[tabProps.SelectedTabID], tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs) + tabProps.TabLabelHeight + 8 + 4,
            tabProps.Y + tabProps.TabLabelHeight + 4);
        ctx.strokeStyle = tabProps.SelectedTabBorderColor;
        ctx.lineWidth = tabProps.SelectedTabBorderLineWidth;
        ctx.beginPath();
        ctx.moveTo(tabProps.X, tabProps.Y + tabProps.TabLabelHeight + 8);
        ctx.lineTo(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs), tabProps.Y + tabProps.TabLabelHeight + 8);
        ctx.lineTo(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs), tabProps.Y + 5);
        ctx.arc(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs) + 5, tabProps.Y + 5, 5, Math.PI, (Math.PI / 180) * 270, false);
        ctx.lineTo(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs) + currentTabWidth - 5, tabProps.Y);
        ctx.arc(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs) + currentTabWidth - 5, tabProps.Y + 5, 5, (Math.PI / 180) * 270, Math.PI * 2, false);
        ctx.lineTo(tabProps.X + currWidthOffset + ((tabProps.SelectedTabID + 1) * tabProps.GapBetweenTabs) + currentTabWidth, tabProps.Y + tabProps.TabLabelHeight + 8);
        ctx.lineTo(tabProps.X + tabProps.Width, tabProps.Y + tabProps.TabLabelHeight + 8);
        ctx.lineTo(tabProps.X + tabProps.Width, tabProps.Y + tabProps.Height);
        ctx.stroke();
        ctx.lineWidth = 1;
        tabProps.TabLabelHitAreas.push({
            XStart: tabProps.X + currWidthOffset, XEnd: tabProps.X + currWidthOffset + ((tabProps.TabLabelHeight + 8) * 2) +
                currentTabWidth + 8, YStart: tabProps.Y, YEnd: tabProps.Y + tabProps.TabLabelHeight + 8, PanelWindowID: tabProps.PanelWindowIDs[tabProps.SelectedTabID],
                TabID: tabProps.SelectedTabID
        });
    }, canvasid);
    registerClickFunction(windowid, function (canvasid2, windowid2, e) {
        var tabProps = getTabProps(canvasid2, windowid2);
        var clickx = e.calcX;
        var clicky = e.calcY;
        for (var i = 0; i < tabProps.TabLabelHitAreas.length; i++) {
            if (clickx > tabProps.TabLabelHitAreas[i].XStart && clickx < tabProps.TabLabelHitAreas[i].XEnd &&
                clicky > tabProps.TabLabelHitAreas[i].YStart && clicky < tabProps.TabLabelHitAreas[i].YEnd) {
                for (var p = 0; p < tabProps.PanelWindowIDs.length; p++) {
                    if (p != tabProps.TabLabelHitAreas[i].PanelWindowID) {
                        setHiddenWindowStatus(canvasid2, tabProps.PanelWindowIDs[p], 1);
                    }
                }
                setHiddenWindowStatus(canvasid2, tabProps.TabLabelHitAreas[i].PanelWindowID, 0);
                tabProps.SelectedTabID = tabProps.TabLabelHitAreas[i].TabID;
            }
        }
    }, canvasid);
    return windowid;
}

//ImageMap Control code starts here

var imageMapPropsArray = new Array();

function getImageMapProps(canvasid, windowid) {
    for (var i = 0; i < imageMapPropsArray.length; i++) {
        if (imageMapPropsArray[i].CanvasID == canvasid && imageMapPropsArray[i].WindowID == windowid) {
            return imageMapPropsArray[i];
        }
    }
}

function createImageMapControl(canvasid, controlNameId, x, y, width, height, depth, imgurl, pinxys, pinClickFunction, hasZoom,
    imagetopleftxoffset, imagetopleftyoffset, scale, scaleincrementfactor, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'ImageMap', controlNameId);
    var image = new Image();
    image.src = imgurl;
    image.onload = function () {
        invalidateRect(canvasid, null, x, y, width, height);
    };
    imageMapPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height,
        ImgUrl: imgurl, Image: image, PinXYs: pinxys, PinClickFunction: pinClickFunction, HasZoom: hasZoom,
        ImageTopLeftXOffset: imagetopleftxoffset, ImageTopLeftYOffset: imagetopleftyoffset, MovingMap: 0,
        LastMovingX: 0, LastMovingY: 0, Scale: scale, ScaleIncrementFactor: scaleincrementfactor, Tag: tag
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var imageMapProps = getImageMapProps(canvasid1, windowid1);
        var ctx = getCtx(canvasid1);
        ctx.save();
        ctx.drawImage(imageMapProps.Image, imageMapProps.ImageTopLeftXOffset, imageMapProps.ImageTopLeftYOffset,
            imageMapProps.Width / imageMapProps.Scale, imageMapProps.Height / imageMapProps.Scale,
            imageMapProps.X, imageMapProps.Y, imageMapProps.Width, imageMapProps.Height);
        for (var i = 0; i < imageMapProps.PinXYs.length; i++) {
            if (imageMapProps.PinXYs[i][0] * imageMapProps.Scale > imageMapProps.ImageTopLeftXOffset * imageMapProps.Scale &&
                imageMapProps.PinXYs[i][0] * imageMapProps.Scale < (imageMapProps.ImageTopLeftXOffset * imageMapProps.Scale) +
                (imageMapProps.Width * imageMapProps.Scale) && imageMapProps.PinXYs[i][1] * imageMapProps.Scale >
                imageMapProps.ImageTopLeftYOffset * imageMapProps.Scale && imageMapProps.PinXYs[i][1] * imageMapProps.Scale <
                (imageMapProps.ImageTopLeftYOffset * imageMapProps.Scale) + (imageMapProps.Height * imageMapProps.Scale)) {
                var g = ctx.createRadialGradient(imageMapProps.X + (imageMapProps.PinXYs[i][0] * imageMapProps.Scale) -
                    (imageMapProps.ImageTopLeftXOffset * imageMapProps.Scale),
                    imageMapProps.Y + (imageMapProps.PinXYs[i][1] * imageMapProps.Scale) - (imageMapProps.ImageTopLeftYOffset * imageMapProps.Scale), 0,
                    imageMapProps.X + (imageMapProps.PinXYs[i][0] * imageMapProps.Scale) - (imageMapProps.ImageTopLeftXOffset * imageMapProps.Scale),
                    imageMapProps.Y + (imageMapProps.PinXYs[i][1] * imageMapProps.Scale) - (imageMapProps.ImageTopLeftYOffset * imageMapProps.Scale),
                    imageMapProps.PinXYs[i][2]);
                var redcomp = parseInt(imageMapProps.PinXYs[i][3].substr(1, 2), 16);
                var greencomp = parseInt(imageMapProps.PinXYs[i][3].substr(3, 2), 16);
                var bluecomp = parseInt(imageMapProps.PinXYs[i][3].substr(5, 2), 16);
                g.addColorStop(0.0, '#' + getlowcomp(redcomp) + getlowcomp(greencomp) + getlowcomp(bluecomp));
                g.addColorStop(0.5, imageMapProps.PinXYs[i][3]);
                g.addColorStop(1.0, '#' + gethighcomp(redcomp) + gethighcomp(greencomp) + gethighcomp(bluecomp));
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(imageMapProps.X + (imageMapProps.PinXYs[i][0] * imageMapProps.Scale) - (imageMapProps.ImageTopLeftXOffset * imageMapProps.Scale),
                    imageMapProps.Y + (imageMapProps.PinXYs[i][1] * imageMapProps.Scale) - (imageMapProps.ImageTopLeftYOffset * imageMapProps.Scale),
                    imageMapProps.PinXYs[i][2], 0, Math.PI * 2, false);
                ctx.fill();
            }
        }
        ctx.restore();
    }, canvasid);
    registerMouseDownFunction(windowid, function (canvasid2, windowid2) {
        var imageMapProps = getImageMapProps(canvasid2, windowid2);
        imageMapProps.MovingMap = 1;
    }, canvasid);
    registerLostFocusFunction(canvasid, windowid, function (canvasid3, windowid3) {
        var imageMapProps = getImageMapProps(canvasid3, windowid3);
        imageMapProps.MovingMap = 0;
    });
    registerMouseUpFunction(windowid, function (canvasid4, windowid4) {
        var imageMapProps = getImageMapProps(canvasid4, windowid4);
        imageMapProps.MovingMap = 0;
    }, canvasid);
    registerClickFunction(windowid, function (canvasid5, windowid5, e) {
        var imageMapProps = getImageMapProps(canvasid5, windowid5);
        var clickx = e.calcX;
        var clicky = e.calcY;
        for (var i = 0; i < imageMapProps.PinXYs.length; i++) {
            if (clickx > imageMapProps.X + (imageMapProps.PinXYs[i][0] * imageMapProps.Scale) - (imageMapProps.ImageTopLeftXOffset * imageMapProps.Scale) - imageMapProps.PinXYs[i][2] &&
                clickx < imageMapProps.X + (imageMapProps.PinXYs[i][0] * imageMapProps.Scale) - (imageMapProps.ImageTopLeftXOffset * imageMapProps.Scale) + imageMapProps.PinXYs[i][2] &&
                clicky > imageMapProps.Y + (imageMapProps.PinXYs[i][1]* imageMapProps.Scale) - (imageMapProps.ImageTopLeftYOffset * imageMapProps.Scale) - imageMapProps.PinXYs[i][2] &&
                clicky < imageMapProps.Y + (imageMapProps.PinXYs[i][1] * imageMapProps.Scale) - (imageMapProps.ImageTopLeftYOffset * imageMapProps.Scale) + imageMapProps.PinXYs[i][2]) {
                if (imageMapProps.PinClickFunction != null) {
                    imageMapProps.PinClickFunction(canvasid5, windowid5, i);
                }
            }
        }
    }, canvasid);
    registerMouseMoveFunction(windowid, function (canvasid6, windowid6, e) {
        var imageMapProps = getImageMapProps(canvasid6, windowid6);
        var x = e.calcX;
        var y = e.calcY;
        if (imageMapProps.MovingMap == 0) {
            imageMapProps.LastMovingX = x;
            imageMapProps.LastMovingY = y;
        } else if (imageMapProps.MovingMap == 1) {
            var deltax = x - imageMapProps.LastMovingX;
            var deltay = y - imageMapProps.LastMovingY;
            if (deltax != 0 && imageMapProps.ImageTopLeftXOffset + deltax > 0 && imageMapProps.ImageTopLeftXOffset + deltax +
                (imageMapProps.Width / imageMapProps.Scale) < imageMapProps.Image.width && deltay != 0 && imageMapProps.ImageTopLeftYOffset + deltay > 0 &&
                imageMapProps.ImageTopLeftYOffset + deltay + (imageMapProps.Height / imageMapProps.Scale) < imageMapProps.Image.height) {
                imageMapProps.ImageTopLeftXOffset += deltax;
                imageMapProps.ImageTopLeftYOffset += deltay;
            }
        }
    }, canvasid);
    if (hasZoom == 1) {
        registerMouseWheelFunction(windowid, function (canvasid7, windowid7, e) {
            var imageMapProps = getImageMapProps(canvasid7, windowid7);
            var lastscale = imageMapProps.Scale;
            imageMapProps.Scale += (e.wheelDelta / 120) * imageMapProps.ScaleIncrementFactor;
            if (imageMapProps.ImageTopLeftXOffset + (imageMapProps.Width / imageMapProps.Scale) >= imageMapProps.Image.width ||
                imageMapProps.ImageTopLeftYOffset + (imageMapProps.Height / imageMapProps.Scale) >= imageMapProps.Image.height) {
                imageMapProps.Scale = lastscale;
            }
        }, canvasid);
    }
    return windowid;
}

//Menu Bar code starts here

var menuBarPropsArray = new Array();
var subMenuBarPropsArray = new Array();

function getMenuBarProps(canvasid, windowid) {
    for (var i = 0; i < menuBarPropsArray.length; i++) {
        if (menuBarPropsArray[i].CanvasID == canvasid && menuBarPropsArray[i].WindowID == windowid) {
            return menuBarPropsArray[i];
        }
    }
}

function getSubMenuBarProps(canvasid, windowid) {
    for (var i = 0; i < subMenuBarPropsArray.length; i++) {
        if (subMenuBarPropsArray[i].CanvasID == canvasid && subMenuBarPropsArray[i].WindowID == windowid) {
            return subMenuBarPropsArray[i];
        }
    }
}

function createSubMenu(canvasid, controlNameId, parentWindowId, depth, data, xoffset, yoffset, parentIndexInParentMenu, dropdowncolorstart, dropdowncolorend, tag) {
    var ctx = getCtx(canvasid);
    var greatestLength = 0;
    var greatestHeight = 5;
    var newdata = new Array();
    for (var i = 0; i < data.length; i++) {
        ctx.font = data[i][3];
        var currWidth = ctx.measureText(data[i][0]).width + 10;
        if (currWidth > greatestLength) {
            greatestLength = currWidth;
        }
        greatestHeight += data[i][2] + 5;
        newdata.push([data[i][0], data[i][1], data[i][2], data[i][3], data[i][4], data[i][5]]);
    }
    var windowid = createWindow(canvasid, xoffset, yoffset, greatestLength, greatestHeight, depth, null, 'SubMenu', controlNameId);
    registerModalWindow(canvasid, windowid);
    registerHiddenWindow(canvasid, windowid, 1);
    var heightOffset = 5;
    var childMenuWindowIDs = new Array();
    for (var i = 0; i < data.length; i++) {
        if (data[i][6] != null) {
            childMenuWindowIDs.push(createSubMenu(canvasid, controlNameId + 'SubMenuLevel1_' + i.toString(), windowid, depth, data[i][6], xoffset + greatestLength,
                yoffset + heightOffset + 5, i, dropdowncolorstart, dropdowncolorend));
        }
        heightOffset += data[i][2] + 5;
    }
    subMenuBarPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: xoffset, Y: yoffset, Width: greatestLength, Height: greatestHeight,
        Data: newdata, ParentMenuWindowID: parentWindowId, ParentIndexInParentMenu: parentIndexInParentMenu, ChildMenuWindowIDs: childMenuWindowIDs,
        DropDownColorStart: dropdowncolorstart, DropDownColorEnd: dropdowncolorend, Tag: tag
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var subMenuBarProps = getSubMenuBarProps(canvasid1, windowid1);
        var parentMenuBarProps = getMenuBarProps(canvasid1, subMenuBarProps.ParentMenuWindowID);
        if (parentMenuBarProps == undefined || parentMenuBarProps == null) {
            parentMenuBarProps = getSubMenuBarProps(canvasid1, subMenuBarProps.ParentMenuWindowID);
        }
        if (parentMenuBarProps.Data[subMenuBarProps.ParentIndexInParentMenu][4] == 1) {
            var ctx = getCtx(canvasid1);
            var g = ctx.createLinearGradient(subMenuBarProps.X, subMenuBarProps.Y, subMenuBarProps.X, subMenuBarProps.Y + subMenuBarProps.Height);
            g.addColorStop(0, subMenuBarProps.DropDownColorStart);
            g.addColorStop(1, subMenuBarProps.DropDownColorEnd);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.rect(subMenuBarProps.X, subMenuBarProps.Y, subMenuBarProps.Width, subMenuBarProps.Height);
            ctx.fill();
            var heightOffset = 0;
            for (var i = 0; i < subMenuBarProps.Data.length; i++) {
                ctx.fillStyle = subMenuBarProps.Data[i][1];
                ctx.font = subMenuBarProps.Data[i][3];
                ctx.fillText(subMenuBarProps.Data[i][0], subMenuBarProps.X + 5, subMenuBarProps.Y + heightOffset + 5 + subMenuBarProps.Data[i][2]);
                heightOffset += subMenuBarProps.Data[i][2] + 5;
            }
        }
    }, canvasid);
    registerClickFunction(windowid, function (canvasid2, windowid2, e) {
        var subMenuBarProps = getSubMenuBarProps(canvasid2, windowid2);
        var x = e.calcX;
        var y = e.calcY;
        var heightOffset = 0;
        for (var i = 0; i < subMenuBarProps.Data.length; i++) {
            if (x > subMenuBarProps.X && x < subMenuBarProps.X + subMenuBarProps.Width && y > subMenuBarProps.Y + heightOffset + 5 &&
                y < subMenuBarProps.Y + heightOffset + 5 + subMenuBarProps.Data[i][2]) {
                if (typeof subMenuBarProps.Data[i][5] == 'function') {
                    subMenuBarProps.Data[i][5](canvasid2, windowid2, 1, i);
                } else {
                    var idx = 0;
                    for (var j = 0; j < subMenuBarProps.Data.length; j++) {
                        if (j == i) {
                            if (subMenuBarProps.Data[i][4] == 0) {
                                subMenuBarProps.Data[i][4] = 1;
                                setStatusForAllChildWindowsFromMenuBar(canvasid2, subMenuBarProps.ChildMenuWindowIDs, 0, idx, subMenuBarProps.ParentMenuWindowID);
                            } else {
                                subMenuBarProps.Data[i][4] = 0;
                                setStatusForAllChildWindowsFromMenuBar(canvasid2, subMenuBarProps.ChildMenuWindowIDs, 1, idx, subMenuBarProps.ParentMenuWindowID);
                            }
                        }
                        if (subMenuBarProps.Data[j][5] == null) {
                            idx++;
                        }
                    }
                }
            }
            heightOffset += subMenuBarProps.Data[i][2] + 5;
        }
    }, canvasid);
    registerLostFocusFunction(canvasid, windowid, function (canvasid3, windowid3) {
        if (checkIfAnyMenuHasFocusFromSubMenu(canvasid3, windowid3) == 0) {
            var subMenuBarProps = getSubMenuBarProps(canvasid3, windowid3);
            var parentMenuBarProps = getMenuBarProps(canvasid3, subMenuBarProps.ParentMenuWindowID);
            if (parentMenuBarProps == undefined || parentMenuBarProps == null) {
                parentMenuBarProps = getSubMenuBarProps(canvasid3, subMenuBarProps.ParentMenuWindowID);
            }
            parentMenuBarProps.Data[subMenuBarProps.ParentIndexInParentMenu][4] = 0;
            setStatusForAllChildWindowsFromMenuBar(canvasid3, subMenuBarProps.ChildMenuWindowIDs, 1, -1, subMenuBarProps.ParentMenuWindowID);
        }
    });
    return windowid;
}

function checkIfAnyMenuHasFocusFromSubMenu(canvasid, windowid) {
    var subMenuBarProps = getSubMenuBarProps(canvasid, windowid);
    if (doingEventForWindowID == windowid) {
        return 1;
    }
    for (var i = 0; i < subMenuBarProps.ChildMenuWindowIDs.length; i++) {
        if (doingEventForWindowID == subMenuBarProps.ChildMenuWindowIDs[i]) {
            return 1;
        }
    }
    var isParentMenuBarWindowID = 1;
    var parentMenuBarProps = getMenuBarProps(canvasid, subMenuBarProps.ParentMenuWindowID);
    if (parentMenuBarProps == undefined || parentMenuBarProps == null) {
        isParentMenuBarWindowID = 0;
        parentMenuBarProps = getSubMenuBarProps(canvasid, subMenuBarProps.ParentMenuWindowID);
    }
    if (doingEventForWindowID == parentMenuBarProps.WindowID) {
        return 1;
    }
    while (isParentMenuBarWindowID == 0) {
        isParentMenuBarWindowID = 1;
        parentMenuBarProps = getMenuBarProps(canvasid, parentMenuBarProps.ParentMenuWindowID);
        if (parentMenuBarProps == undefined || parentMenuBarProps == null) {
            isParentMenuBarWindowID = 0;
            parentMenuBarProps = getSubMenuBarProps(canvasid, subMenuBarProps.ParentMenuWindowID);
        }
        if (doingEventForWindowID == parentMenuBarProps.WindowID) {
            return 1;
        }
    }
    return 0;
}

function checkIfAnyMenuHasFocusFromParentMenu(canvasid, windowid) {
    var menuBarProps = getMenuBarProps(canvasid, windowid);
    if (doingEventForWindowID == windowid) {
        return 1;
    }
    for (var i = 0; i < menuBarProps.ChildMenuWindowIDs.length; i++) {
        if (doingEventForWindowID == menuBarProps.ChildMenuWindowIDs[i]) {
            return 1;
        }
    }
    return 0;
}

function createMenuBarControl(canvasid, controlNameId, x, y, width, height, depth, data, barcolorstart, barcolormiddle, barcolorend,
    dropdowncolorstart, dropdowncolorend, orientation, tag) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'MenuBar', controlNameId);
    var ctx = getCtx(canvasid);
    var widthOffset = 0;
    var childMenuWindowIds = new Array();
    for (var i = 0; i < data.length; i++) {
        ctx.font = data[i][3];
        if (data[i][6] != null) {
            childMenuWindowIds.push(createSubMenu(canvasid, controlNameId + i.toString(), windowid, depth, data[i][6], x + widthOffset + 5, y + height, i, dropdowncolorstart, dropdowncolorend));
        }
        widthOffset += ctx.measureText(data[i][0]).width + 5;
    }
    menuBarPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height,
        Data: data, BarColorStart: barcolorstart, BarColorMiddle: barcolormiddle, BarColorEnd: barcolorend,
        DropDownColorStart: dropdowncolorstart, DropDownColorEnd: dropdowncolorend, ChildMenuWindowIDs: childMenuWindowIds, Tag: tag
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var menuBarProps = getMenuBarProps(canvasid1, windowid1);
        var ctx = getCtx(canvasid1);
        var g = ctx.createLinearGradient(menuBarProps.X, menuBarProps.Y, menuBarProps.X, menuBarProps.Y + menuBarProps.Height);
        g.addColorStop(0, menuBarProps.BarColorStart);
        g.addColorStop(0.5, menuBarProps.BarColorMiddle);
        g.addColorStop(1, menuBarProps.BarColorEnd);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.rect(menuBarProps.X, menuBarProps.Y, menuBarProps.Width, menuBarProps.Height);
        ctx.fill();
        var widthOffset = 0;
        for (var i = 0; i < menuBarProps.Data.length; i++) {
            ctx.fillStyle = menuBarProps.Data[i][1];
            ctx.font = menuBarProps.Data[i][3];
            ctx.fillText(menuBarProps.Data[i][0], menuBarProps.X + widthOffset + 5, menuBarProps.Y + menuBarProps.Height - ((menuBarProps.Height - menuBarProps.Data[i][2]) / 2));
            widthOffset += ctx.measureText(menuBarProps.Data[i][0]).width + 5;
        }
    }, canvasid);
    registerClickFunction(windowid, function (canvasid2, windowid2, e) {
        var menuBarProps = getMenuBarProps(canvasid2, windowid2);
        var ctx = getCtx(canvasid2);
        var x = e.calcX;
        var y = e.calcY;
        var widthOffset = 0;
        for (var i = 0; i < menuBarProps.Data.length; i++) {
            ctx.font = menuBarProps.Data[i][3];
            currWidth = ctx.measureText(menuBarProps.Data[i][0]).width;
            if (x > menuBarProps.X + widthOffset + 5 && x < menuBarProps.X + widthOffset + currWidth + 5 &&
                y > menuBarProps.Y && y < menuBarProps.Y + menuBarProps.Height) {
                if (typeof menuBarProps.Data[i][6] == 'function') {
                    menuBarProps.Data[i][6](canvasid2, windowid2, 0, i);
                } else if (menuBarProps.Data[i][6] != null) {
                    var idx = 0;
                    for (var j = 0; j < menuBarProps.Data.length; j++) {
                        if (j == i) {
                            if (menuBarProps.Data[i][4] == 0) {
                                menuBarProps.Data[i][4] = 1;
                                setStatusForAllChildWindowsFromMenuBar(canvasid2, menuBarProps.ChildMenuWindowIDs, 0, idx, null);
                            } else {
                                menuBarProps.Data[i][4] = 0;
                                setStatusForAllChildWindowsFromMenuBar(canvasid2, menuBarProps.ChildMenuWindowIDs, 1, idx, null);
                            }
                        }
                        if (menuBarProps.Data[j][6] != null) {
                            idx++;
                        }
                    }
                } else if (menuBarProps.Data[i][5] != null) {
                    menuBarProps.Data[i][5](canvasid2, windowid2, 0, i);
                }
            }
            widthOffset += currWidth + 5;
        }
    }, canvasid);
    registerLostFocusFunction(canvasid, windowid, function (canvasid3, windowid3) {
        if (checkIfAnyMenuHasFocusFromParentMenu(canvasid3, windowid3) == 0) {
            var menuBarProps = getMenuBarProps(canvasid3, windowid3);
            for (var i = 0; i < menuBarProps.Data.length; i++) {
                if (menuBarProps.Data[i][4] == 1) {
                    setStatusForAllChildWindowsFromMenuBar(canvasid3, menuBarProps.ChildMenuWindowIDs, 1, -1, null);
                }
                menuBarProps.Data[i][4] = 0;
            }
        }
    });
    return windowid;
}

function setStatusForAllChildWindowsFromMenuBar(canvasid, childMenuWindowIDs, status, idx, parentMenuWindowID) {
    if (status == 0) {
        for (var i = 0; i < childMenuWindowIDs.length; i++) {
            setHiddenWindowStatus(canvasid, childMenuWindowIDs[i], (i == idx ? status : 1));
            var subMenuBarProps = getSubMenuBarProps(canvasid, childMenuWindowIDs[i]);
            for (var j = 0; j < subMenuBarProps.Data.length; j++) {
                subMenuBarProps.Data[j][4] = status;
            }
            setStatusForAllChildWindowsFromMenuBar(canvasid, subMenuBarProps.ChildMenuWindowIDs, status, -1);
        }
    } else {
        var subMenuBarProps = null;
        while (parentMenuWindowID) {
            subMenuBarProps = getSubMenuBarProps(canvasid, parentMenuWindowID);
            if (!subMenuBarProps) {
                subMenuBarProps = getMenuBarProps(canvasid, parentMenuWindowID);
            }
            parentMenuWindowID = subMenuBarProps.ParentMenuWindowID;
        }
        if (!subMenuBarProps) {
            for (var i = 0; i < menuBarPropsArray.length; i++) {
                var notFound = 0;
                for (var j = 0; j < childMenuWindowIDs.length; j++) {
                    var found = 0;
                    for (var x = 0; x < menuBarPropsArray[i].ChildMenuWindowIDs.length; x++) {
                        if (childMenuWindowIDs[j] == menuBarPropsArray[i].ChildMenuWindowIDs[x]) {
                            found = 1;
                            break;
                        }
                    }
                    if (found == 0) {
                        notFound = 1;
                        break;
                    }
                }
                if (notFound == 0) {
                    subMenuBarProps = menuBarPropsArray[i];
                    break;
                }
            }
        }
        for (var i = 0; i < subMenuBarProps.ChildMenuWindowIDs.length; i++) {
            setHiddenWindowStatus(canvasid, subMenuBarProps.ChildMenuWindowIDs[i], 1);
            var subMenuBarPropsChild = getSubMenuBarProps(canvasid, subMenuBarProps.ChildMenuWindowIDs[i]);
            if (subMenuBarPropsChild.ChildMenuWindowIDs.length > 0) {
                recurseHideSubMenuBarWindows(canvasid, subMenuBarPropsChild);
            }
        }
    }
}

function recurseHideSubMenuBarWindows(canvasid, subMenuBarProps) {
    for (var i = 0; i < subMenuBarProps.ChildMenuWindowIDs.length; i++) {
        setHiddenWindowStatus(canvasid, subMenuBarProps.ChildMenuWindowIDs[i], 1);
        var subMenuBarPropsChild = getSubMenuBarProps(canvasid, subMenuBarProps.ChildMenuWindowIDs[i]);
        if (subMenuBarPropsChild.ChildMenuWindowIDs.length > 0) {
            recurseHideSubMenuBarWindows(subMenuBarPropsChild);
        }
    }
}

//Textbox code starts here

var textBoxPropsArray = new Array();

function getTextBoxProps(canvasid, windowid) {
    for (var i = 0; i < textBoxPropsArray.length; i++) {
        if (textBoxPropsArray[i].CanvasID == canvasid && textBoxPropsArray[i].WindowID == windowid) {
            return textBoxPropsArray[i];
        }
    }
}

function getTextBoxPropsByDropDownWindowID(canvasid, windowid) {
    for (var i = 0; i < textBoxPropsArray.length; i++) {
        if (textBoxPropsArray[i].CanvasID == canvasid && textBoxPropsArray[i].DropDownWindowID == windowid) {
            return textBoxPropsArray[i];
        }
    }
}

function getTextBoxPropsByKeyboardID(canvasid, windowid) {
    for (var i = 0; i < textBoxPropsArray.length; i++) {
        if (textBoxPropsArray[i].CanvasID == canvasid && textBoxPropsArray[i].CustomKeyboardWindowID == windowid) {
            return textBoxPropsArray[i];
        }
    }
}

function textBoxTouchKeyPress(canvasid, windowid, keyboardChar) {
    var textBoxProps = getTextBoxPropsByKeyboardID(canvasid, windowid);
    switch (keyboardChar.toLowerCase()) {
        case 'left':
            //left arrow	 37
            if (textBoxProps.CaretPosIndex > -1) {
                textBoxProps.CaretPosIndex--;
                textBoxProps.SelectedTextStartIndex = -1;
                textBoxProps.SelectedTextEndIndex = -1;
                textBoxProps.WasSelecting = 0;
                textBoxProps.MouseDown = 0;
            }
            invalidateRect(canvasid, null, textBoxProps.X, textBoxProps.Y, textBoxProps.Width, textBoxProps.Height);
            return;
        case 'right':
            //right arrow	 39
            if (textBoxProps.CaretPosIndex > textBoxProps.UserInputText.length - 1) {
                textBoxProps.CaretPosIndex = textBoxProps.UserInputText.length - 1;
            } else {
                textBoxProps.CaretPosIndex++;
            }
            textBoxProps.SelectedTextStartIndex = -1;
            textBoxProps.SelectedTextEndIndex = -1;
            textBoxProps.MouseDown = 0;
            textBoxProps.WasSelecting = 0;
            invalidateRect(canvasid, null, textBoxProps.X, textBoxProps.Y, textBoxProps.Width, textBoxProps.Height);
            return;
        case 'backspacekey':
            //backspace	 8
            if (textBoxProps.CaretPosIndex > -1) {
                if (textBoxProps.CaretPosIndex == 0) {
                    if (textBoxProps.UserInputText.length > 1) {
                        textBoxProps.UserInputText = textBoxProps.UserInputText.substring(1, textBoxProps.UserInputText.length - 1);
                    } else {
                        textBoxProps.UserInputText = '';
                    }
                    textBoxProps.CaretPosIndex = -1;
                } else if (textBoxProps.CaretPosIndex == textBoxProps.UserInputText.length - 1) {
                    textBoxProps.UserInputText = textBoxProps.UserInputText.substring(0, textBoxProps.UserInputText.length - 1);
                    textBoxProps.CaretPosIndex--;
                } else if (textBoxProps.CaretPosIndex > 0) {
                    textBoxProps.UserInputText = textBoxProps.UserInputText.substring(0, textBoxProps.CaretPosIndex) +
                        textBoxProps.UserInputText.substring(textBoxProps.CaretPosIndex + 1);
                    textBoxProps.CaretPosIndex--;
                }
                textBoxProps.SelectedTextStartIndex = -1;
                textBoxProps.SelectedTextEndIndex = -1;
                textBoxProps.MouseDown = 0;
                textBoxProps.WasSelecting = 0;
            }
            if (textBoxProps.ListPossiblesAllChoices != null) {
                FindTextBoxPossible(textBoxProps, c);
            }
            invalidateRect(canvasid, null, textBoxProps.X, textBoxProps.Y, textBoxProps.Width, textBoxProps.Height);
            return;
        case 'spacebarkey':
            keyboardChar = ' ';
            break;
        case 'carriagereturnkey':
            return;
    }
    if (!textBoxProps.UserInputText || (textBoxProps.UserInputText && textBoxProps.UserInputText.length < textBoxProps.MaxChars)) {
        var c = keyboardChar;
        var foundPossibleMatch;
        if (textBoxProps.ListPossiblesAllChoices != null) {
            foundPossibleMatch = FindTextBoxPossible(textBoxProps, c);
        }
        if ((!textBoxProps.AllowedCharsRegEx || textBoxProps.AllowedCharsRegEx == null || textBoxProps.AllowedCharsRegEx.length == 0 || c.match(textBoxProps.AllowedCharsRegEx) == c) &&
            (!textBoxProps.LimitToListPossibles || (textBoxProps.LimitToListPossibles == 1 && foundPossibleMatch))) {
            if (textBoxProps.CaretPosIndex == -1) {
                textBoxProps.UserInputText = c + (textBoxProps.UserInputText ? textBoxProps.UserInputText : '');
                textBoxProps.CaretPosIndex++;
            } else if (textBoxProps.UserInputText && textBoxProps.CaretPosIndex == textBoxProps.UserInputText.length - 1) {
                textBoxProps.UserInputText = textBoxProps.UserInputText + c;
                textBoxProps.CaretPosIndex++;
            } else if (textBoxProps.UserInputText) {
                textBoxProps.UserInputText = textBoxProps.UserInputText.substring(0, textBoxProps.CaretPosIndex + 1) + c + textBoxProps.UserInputText.substring(textBoxProps.CaretPosIndex + 1);
                textBoxProps.CaretPosIndex++;
            }
            textBoxProps.SelectedTextStartIndex = -1;
            textBoxProps.SelectedTextEndIndex = -1;
            textBoxProps.MouseDown = 0;
            textBoxProps.WasSelecting = 0;
        }
    }
    invalidateRect(canvasid, null, textBoxProps.X, textBoxProps.Y, textBoxProps.Width, textBoxProps.Height);
}

function createTextBox(canvasid, controlNameId, x, y, width, height, depth, waterMarkText, waterMarkTextColor, waterMarkTextHeight, waterMarkTextFontString,
    textColor, textHeight, textFontString, maxChars, allowedCharsRegEx, isPassword, passwordChar, hasBorder, borderColor, borderLineWidth, hasShadow, shadowColor, shadowOffsetX, shadowOffsetY,
    shadowBlurValue, hasRoundedEdges, edgeRadius, hasBgGradient, bgGradientStartColor, bgGradientEndColor, hasBgImage, bgImageUrl, hasAutoComplete, listPossibles, 
    dropDownPossiblesListIfThereIsInputText, limitToListPossibles, listPossiblesTextColor, listPossiblesTextHeight, listPossiblesTextFontString, initialText, caretColor,
    textSelectionBgColor, hasFocusInitially, tag, customKeyboardWindowID) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'TextBox', controlNameId);
    var dropdownwindowid, vscrollbarwindowid;
    if (hasAutoComplete == 1) {
        dropdownwindowid = createWindow(canvasid, x, y + height, width, 100, depth, null, 'TextBoxDropDown', controlNameId + 'TextBoxDropDown');
        vscrollbarwindowid = createScrollBar(canvasid, controlNameId + 'VS', x + width - 15, y + height, 100, depth, listPossibles.length, 1, windowid);
        registerHiddenWindow(canvasid, dropdownwindowid, 1);
        registerModalWindow(canvasid, dropdownwindowid);
        registerHiddenWindow(canvasid, vscrollbarwindowid, 1);
        registerModalWindow(canvasid, vscrollbarwindowid);
        registerWindowDrawFunction(dropdownwindowid, function (canvasid9, windowid9) {
            var textBoxProps = getTextBoxPropsByDropDownWindowID(canvasid9, windowid9);
            var vscrollBarProps = getScrollBarProps(canvasid9, textBoxProps.VScrollBarWindowID);
            var ctx = getCtx(canvasid9);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.rect(textBoxProps.X, textBoxProps.Y + textBoxProps.Height, textBoxProps.Width - 15, 100);
            ctx.fill();
            ctx.fillStyle = textBoxProps.ListPossiblesTextColor;
            ctx.font = textBoxProps.ListPossiblesTextFontString;
            for (var i = vscrollBarProps.SelectedID; i < textBoxProps.ListPossibles.length && ((textBoxProps.ListPossiblesTextHeight + 6) *
                (i - vscrollBarProps.SelectedID + 1)) < 100; i++) {
                ctx.fillText(textBoxProps.ListPossibles[i], textBoxProps.X + 5, textBoxProps.Y + textBoxProps.Height +
                    ((textBoxProps.ListPossiblesTextHeight + 6) * (i - vscrollBarProps.SelectedID + 1)));
            }
            ctx.strokeStyle = '#b7bfc8';
            ctx.beginPath();
            ctx.rect(textBoxProps.X, textBoxProps.Y + textBoxProps.Height, textBoxProps.Width - 15, 100);
            ctx.stroke();
        }, canvasid);
        registerClickFunction(dropdownwindowid, function (canvasid10, windowid10, e) {
            var textBoxProps = getTextBoxPropsByDropDownWindowID(canvasid10, windowid10);
            var vscrollBarProps = getScrollBarProps(canvasid10, textBoxProps.VScrollBarWindowID);
            var x = e.calcX;
            var y = e.calcY;
            for (var i = vscrollBarProps.SelectedID; i < textBoxProps.ListPossibles.length && ((textBoxProps.ListPossiblesTextHeight + 6) * (i - vscrollBarProps.SelectedID + 1)) < 100; i++) {
                if (x > textBoxProps.X && y > textBoxProps.Y + textBoxProps.Height + ((textBoxProps.ListPossiblesTextHeight + 6) * (i - vscrollBarProps.SelectedID)) &&
                    x < textBoxProps.X + textBoxProps.Width - 15 && y < textBoxProps.Y + textBoxProps.Height + ((textBoxProps.ListPossiblesTextHeight + 6) *
                    (i - vscrollBarProps.SelectedID + 1))) {
                    if (textBoxProps.ListPossiblesSelectedID != i) {
                        textBoxProps.ListPossiblesSelectedID = i;
                        textBoxProps.UserInputText = textBoxProps.ListPossibles[i];
                        setHiddenWindowStatus(canvasid, textBoxProps.VScrollBarWindowID, 1);
                        setHiddenWindowStatus(canvasid, textBoxProps.DropDownWindowID, 1);
                    }
                    return;
                }
            }
        }, canvasid);
    }
    if (hasFocusInitially == 1) {
        setFocusToWindowID(canvasid, windowid);
    }
    var image = new Image(width, height);
    image.src = bgImageUrl;
    image.onload = function () {
        invalidateRect(canvasid, null, x, y, width, height);
    };
    if (navigator.userAgent.toLowerCase().indexOf('android') > -1 || navigator.userAgent.toLowerCase().indexOf('ipad') > -1 || navigator.userAgent.toLowerCase().indexOf('iphone') > -1 || navigator.userAgent.toLowerCase().indexOf('ipod') > -1) {
        if (!customKeyboardWindowID) {
            customKeyboardWindowID = createVirtualKeyboard(canvasid, controlNameId + 'VKB', x, y + height, 360, 180, depth, null, textBoxTouchKeyPress, 5, 5, 1, 12, '12pt Ariel', null);
            registerModalWindow(canvasid, customKeyboardWindowID);
            registerHiddenWindow(canvasid, customKeyboardWindowID, 0);
        }
    }
    textBoxPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, WaterMarkText: waterMarkText,
        WaterMarkTextColor: waterMarkTextColor, WaterMarkTextFontString: waterMarkTextFontString, TextColor: textColor, TextHeight: textHeight,
        TextFontString: textFontString, MaxChars: maxChars, AllowedCharsRegEx: allowedCharsRegEx, IsPassword: isPassword, PasswordChar: passwordChar,
        HasBorder: hasBorder, BorderColor: borderColor, BorderLineWidth: borderLineWidth, HasShadow: hasShadow, ShadowOffsetX: shadowOffsetX, ShadowOffsetY: shadowOffsetY,
        ShadowBlurValue: shadowBlurValue, HasRoundedEdges: hasRoundedEdges, EdgeRadius: edgeRadius, HasBgGradient: hasBgGradient, BgGradientStartColor: bgGradientStartColor,
        BgGradientEndColor: bgGradientEndColor, HasBgImage: hasBgImage, BgImageUrl: bgImageUrl, Image: image, HasAutoComplete: hasAutoComplete, ListPossibles: new Array(),
        DropDownPossiblesListIfThereIsInputText: dropDownPossiblesListIfThereIsInputText, LimitToListPossibles: limitToListPossibles, ListPossiblesTextHeight: listPossiblesTextHeight,
        ListPossiblesTextFontString: listPossiblesTextFontString, CaretPosIndex: -1, UserInputText: initialText, ShadowColor: shadowColor, ShowCaret: 0, CaretColor: caretColor,
        SelectedTextStartIndex: -1, SelectedTextEndIndex: -1, TextSelectionBgColor: textSelectionBgColor, MouseDown: 0, WasSelecting: 0, MouseDownTime: 0, Tag: tag,
        DropDownWindowID: dropdownwindowid, ListPossiblesTextColor: listPossiblesTextColor, VScrollBarWindowID: vscrollbarwindowid, ListPossiblesSelectedID: -1,
        ListPossiblesAllChoices: listPossibles, CaretTime: Date.now(), CustomKeyboardWindowID: customKeyboardWindowID
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var textBoxProps = getTextBoxProps(canvasid1, windowid1);
        var ctx = getCtx(canvasid1);
        ctx.save();
        if (textBoxProps.HasBgGradient) {
            var g = ctx.createLinearGradient(textBoxProps.X, textBoxProps.Y, textBoxProps.X, textBoxProps.Y + textBoxProps.Height);
            g.addColorStop(0.0, textBoxProps.BgGradientStartColor);
            g.addColorStop(1.0, textBoxProps.BgGradientEndColor);
            ctx.fillStyle = g;
        } else {
            ctx.fillStyle = '#FFFFFF';
        }
        if (textBoxProps.HasShadow) {
            ctx.shadowBlur = textBoxProps.ShadowBlurValue;
            ctx.shadowColor = textBoxProps.ShadowColor;
            ctx.shadowOffsetX = textBoxProps.ShadowOffsetX;
            ctx.shadowOffsetY = textBoxProps.ShadowOffsetY;
        }
        if (textBoxProps.HasBgImage == 1) {
            ctx.drawImage(textBoxProps.Image, 0, 0, textBoxProps.Image.width, textBoxProps.Image.height, textBoxProps.X, textBoxProps.Y, textBoxProps.Width, textBoxProps.Height);
        } else {
            ctx.beginPath();
            if (textBoxProps.HasRoundedEdges == 1) {
                ctx.moveTo(textBoxProps.X, textBoxProps.Y + textBoxProps.EdgeRadius);
                ctx.arc(textBoxProps.X + textBoxProps.EdgeRadius, textBoxProps.Y + textBoxProps.EdgeRadius, textBoxProps.EdgeRadius, Math.PI, (Math.PI / 180) * 270, false);
                ctx.lineTo(textBoxProps.X + textBoxProps.Width - textBoxProps.EdgeRadius, textBoxProps.Y);
                ctx.arc(textBoxProps.X + textBoxProps.Width - textBoxProps.EdgeRadius, textBoxProps.Y + textBoxProps.EdgeRadius, textBoxProps.EdgeRadius, (Math.PI / 180) * 270, Math.PI * 2, false);
                ctx.lineTo(textBoxProps.X + textBoxProps.Width, textBoxProps.Y + textBoxProps.Height - textBoxProps.EdgeRadius);
                ctx.arc(textBoxProps.X + textBoxProps.Width - textBoxProps.EdgeRadius, textBoxProps.Y + textBoxProps.Height - textBoxProps.EdgeRadius, textBoxProps.EdgeRadius, 0, Math.PI / 2, false);
                ctx.lineTo(textBoxProps.X + textBoxProps.EdgeRadius, textBoxProps.Y + textBoxProps.Height);
                ctx.arc(textBoxProps.X + textBoxProps.EdgeRadius, textBoxProps.Y + textBoxProps.Height - textBoxProps.EdgeRadius, textBoxProps.EdgeRadius, Math.PI / 2, Math.PI, false);
                ctx.closePath();
            } else {
                ctx.rect(textBoxProps.X, textBoxProps.Y, textBoxProps.Width, textBoxProps.Height);
            }
            ctx.fill();
        }
        ctx.restore();
        if (textBoxProps.HasBorder == 1) {
            ctx.strokeStyle = textBoxProps.BorderColor;
            ctx.lineWidth = textBoxProps.BorderLineWidth;
            ctx.beginPath();
            if (textBoxProps.HasRoundedEdges == 1) {
                ctx.moveTo(textBoxProps.X, textBoxProps.Y + textBoxProps.EdgeRadius);
                ctx.arc(textBoxProps.X + textBoxProps.EdgeRadius, textBoxProps.Y + textBoxProps.EdgeRadius, textBoxProps.EdgeRadius, Math.PI, (Math.PI / 180) * 270, false);
                ctx.lineTo(textBoxProps.X + textBoxProps.Width - textBoxProps.EdgeRadius, textBoxProps.Y);
                ctx.arc(textBoxProps.X + textBoxProps.Width - textBoxProps.EdgeRadius, textBoxProps.Y + textBoxProps.EdgeRadius, textBoxProps.EdgeRadius, (Math.PI / 180) * 270, Math.PI * 2, false);
                ctx.lineTo(textBoxProps.X + textBoxProps.Width, textBoxProps.Y + textBoxProps.Height - textBoxProps.EdgeRadius);
                ctx.arc(textBoxProps.X + textBoxProps.Width - textBoxProps.EdgeRadius, textBoxProps.Y + textBoxProps.Height - textBoxProps.EdgeRadius, textBoxProps.EdgeRadius, 0, Math.PI / 2, false);
                ctx.lineTo(textBoxProps.X + textBoxProps.EdgeRadius, textBoxProps.Y + textBoxProps.Height);
                ctx.arc(textBoxProps.X + textBoxProps.EdgeRadius, textBoxProps.Y + textBoxProps.Height - textBoxProps.EdgeRadius, textBoxProps.EdgeRadius, Math.PI / 2, Math.PI, false);
                ctx.closePath();
            } else {
                ctx.rect(textBoxProps.X, textBoxProps.Y, textBoxProps.Width, textBoxProps.Height);
            }
            ctx.stroke();
        }
        if (textBoxProps.UserInputText && textBoxProps.UserInputText.length > 0) {
            ctx.fillStyle = textBoxProps.TextColor;
            ctx.font = textBoxProps.TextFontString;
            if (textBoxProps.IsPassword == 1) {
                var tmpstr = '';
                for (var i = 0; i < textBoxProps.UserInputText.length; i++) {
                    tmpstr += textBoxProps.PasswordChar;
                }
                ctx.fillText(tmpstr, textBoxProps.X + 4, textBoxProps.Y + textBoxProps.Height - ((textBoxProps.Height - textBoxProps.TextHeight) / 2));
            } else {
                if (textBoxProps.SelectedTextStartIndex > -1 && textBoxProps.SelectedTextEndIndex > -1) {
                    ctx.fillStyle = textBoxProps.TextSelectionBgColor;
                    var tmptxt = (textBoxProps.SelectedTextEndIndex == textBoxProps.UserInputText.length - 1 ? textBoxProps.UserInputText.substring(textBoxProps.SelectedTextStartIndex) :
                        textBoxProps.UserInputText.substring(textBoxProps.SelectedTextStartIndex, textBoxProps.SelectedTextEndIndex - textBoxProps.SelectedTextStartIndex + 1));
                    var txtwidth = ctx.measureText(tmptxt).width;
                    var xoffset = (textBoxProps.SelectedTextStartIndex == 0 ? 0 : ctx.measureText(textBoxProps.UserInputText.substring(0, textBoxProps.SelectedTextStartIndex + 1)).width);
                    ctx.beginPath();
                    if (xoffset + txtwidth + 8 > textBoxProps.Width) {
                        ctx.rect(textBoxProps.X + xoffset + 4, textBoxProps.Y + ((textBoxProps.Height - textBoxProps.TextHeight) / 2), textBoxProps.Width - xoffset, textBoxProps.TextHeight);
                    } else {
                        ctx.rect(textBoxProps.X + xoffset + 4, textBoxProps.Y + ((textBoxProps.Height - textBoxProps.TextHeight) / 2), txtwidth, textBoxProps.TextHeight);
                    }
                    ctx.fill();
                }
                ctx.fillStyle = textBoxProps.TextColor;
                ctx.fillText(textBoxProps.UserInputText, textBoxProps.X + 4, textBoxProps.Y + textBoxProps.Height - ((textBoxProps.Height - textBoxProps.TextHeight) / 2));
            }
        } else if (textBoxProps.WaterMarkText && textBoxProps.WaterMarkText.length > 0) {
            ctx.fillStyle = textBoxProps.WaterMarkTextColor;
            ctx.font = textBoxProps.WaterMarkTextFontString;
            ctx.fillText(textBoxProps.WaterMarkText, textBoxProps.X + 4, textBoxProps.Y + textBoxProps.Height - ((textBoxProps.Height - textBoxProps.TextHeight) / 2));
        }
        if (doesWindowHaveFocus(canvasid1, windowid1) == 1) {
            if (textBoxProps.ShowCaret == 1) {
                if (Date.now() - textBoxProps.CaretTime > 250) {
                    textBoxProps.ShowCaret = 0;
                    textBoxProps.CaretTime = Date.now();
                }
                ctx.strokeStyle = textBoxProps.CaretColor;
                ctx.beginPath();
                if (textBoxProps.CaretPosIndex == -1) {
                    ctx.moveTo(textBoxProps.X, textBoxProps.Y + 4);
                    ctx.lineTo(textBoxProps.X + 3, textBoxProps.Y + 4);
                    ctx.moveTo(textBoxProps.X, textBoxProps.Y + textBoxProps.Height - 4);
                    ctx.moveTo(textBoxProps.X + 3, textBoxProps.Y + textBoxProps.Height - 4);
                    ctx.moveTo(textBoxProps.X + 2, textBoxProps.Y + 4);
                    ctx.lineTo(textBoxProps.X + 2, textBoxProps.Y + textBoxProps.Height - 4);
                } else if (textBoxProps.CaretPosIndex > -1) {
                    var tempstr = (textBoxProps.UserInputText && textBoxProps.UserInputText.length - 1 >= textBoxProps.CaretPosIndex ? textBoxProps.UserInputText.substring(0, textBoxProps.CaretPosIndex + 1) :
                        '');
                    ctx.font = textBoxProps.TextFontString;
                    var w = ctx.measureText(tempstr).width;
                    ctx.moveTo(textBoxProps.X + w, textBoxProps.Y + 4);
                    ctx.lineTo(textBoxProps.X + 3 + w, textBoxProps.Y + 4);
                    ctx.moveTo(textBoxProps.X + w, textBoxProps.Y + textBoxProps.Height - 4);
                    ctx.moveTo(textBoxProps.X + 3 + w, textBoxProps.Y + textBoxProps.Height - 4);
                    ctx.moveTo(textBoxProps.X + 2 + w, textBoxProps.Y + 4);
                    ctx.lineTo(textBoxProps.X + 2 + w, textBoxProps.Y + textBoxProps.Height - 4);
                }
                ctx.stroke();
            } else {
                if (Date.now() - textBoxProps.CaretTime > 500) {
                    textBoxProps.ShowCaret = 1;
                    textBoxProps.CaretTime = Date.now();
                }
            }
        }
    }, canvasid);
    registerMouseDownFunction(windowid, function (canvasid4, windowid4, e) {
        var textBoxProps = getTextBoxProps(canvasid4, windowid4);
        if (textBoxProps.UserInputText && textBoxProps.UserInputText.length > 0) {
            textBoxProps.MouseDown = 1;
            textBoxProps.MouseDownTime = (new Date()).getTime();
            var x = e.calcX;
            var ctx = getCtx(canvasid4);
            ctx.font = textBoxProps.TextFontString;
            if (x > textBoxProps.X && x < textBoxProps.X + 4) {
                textBoxProps.SelectedTextStartIndex = -1;
            } else if (x > textBoxProps.X + ctx.measureText(textBoxProps.UserInputText).width + 4) {
                textBoxProps.SelectedTextStartIndex = textBoxProps.UserInputText.length - 1;
            } else {
                var letterExtents = new Array();
                var lastWidth = 0;
                for (var i = 0; i < textBoxProps.UserInputText.length; i++) {
                    var currWidth = ctx.measureText(textBoxProps.UserInputText.substring(0, i + 1)).width;
                    letterExtents.push({ Width: currWidth - lastWidth });
                    lastWidth = currWidth;
                }
                if (x > textBoxProps.X + 4 && x < textBoxProps.X + letterExtents[0].Width) {
                    textBoxProps.SelectedTextStartIndex = 0;
                } else {
                    var lastWidth = letterExtents[0].Width;
                    for (var i = 1; i < letterExtents.length; i++) {
                        if (x > textBoxProps.X + lastWidth && x < textBoxProps.X + lastWidth + letterExtents[i].Width) {
                            textBoxProps.SelectedTextStartIndex = i;
                            break;
                        }
                        lastWidth += letterExtents[i].Width;
                    }
                }
            }
            if (textBoxProps.SelectedTextStartIndex > textBoxProps.SelectedTextEndIndex) {
                var tmp = textBoxProps.SelectedTextStartIndex;
                textBoxProps.SelectedTextStartIndex = textBoxProps.SelectedTextEndIndex;
                textBoxProps.SelectedTextEndIndex = tmp;
            }
        }
    }, canvasid);
    registerMouseMoveFunction(windowid, function (canvasid5, windowid5, e) {
        var textBoxProps = getTextBoxProps(canvasid5, windowid5);
        if (textBoxProps.MouseDown == 1 && (new Date()).getTime() - textBoxProps.MouseDownTime > 500 &&  textBoxProps.UserInputText && textBoxProps.UserInputText.length > 0) {
            var x = e.calcX;
            var ctx = getCtx(canvasid5);
            ctx.font = textBoxProps.TextFontString;
            if (x > textBoxProps.X && x < textBoxProps.X + 4) {
                textBoxProps.SelectedTextEndIndex = -1;
            } else if (x > textBoxProps.X + ctx.measureText(textBoxProps.UserInputText).width + 4) {
                textBoxProps.SelectedTextEndIndex = textBoxProps.UserInputText.length - 1;
            } else {
                var letterExtents = new Array();
                var lastWidth = 0;
                for (var i = 0; i < textBoxProps.UserInputText.length; i++) {
                    var currWidth = ctx.measureText(textBoxProps.UserInputText.substring(0, i + 1)).width;
                    letterExtents.push({ Width: currWidth - lastWidth });
                    lastWidth = currWidth;
                }
                if (x > textBoxProps.X + 4 && x < textBoxProps.X + letterExtents[0].Width) {
                    textBoxProps.SelectedTextEndIndex = 0;
                } else {
                    var lastWidth = letterExtents[0].Width;
                    for (var i = 1; i < letterExtents.length; i++) {
                        if (x > textBoxProps.X + lastWidth && x < textBoxProps.X + lastWidth + letterExtents[i].Width) {
                            textBoxProps.SelectedTextEndIndex = i;
                            break;
                        }
                        lastWidth += letterExtents[i].Width;
                    }
                }
            }
            if (textBoxProps.SelectedTextStartIndex > textBoxProps.SelectedTextEndIndex) {
                var tmp = textBoxProps.SelectedTextStartIndex;
                textBoxProps.SelectedTextStartIndex = textBoxProps.SelectedTextEndIndex;
                textBoxProps.SelectedTextEndIndex = tmp;
            }
        }
    }, canvasid);
    registerMouseUpFunction(windowid, function (canvasid6, windowid6, e) {
        var textBoxProps = getTextBoxProps(canvasid6, windowid6);
        if (textBoxProps.MouseDown == 1) {
            textBoxProps.MouseDown = 0;
            if ((new Date()).getTime() - textBoxProps.MouseDownTime > 500) {
                if (textBoxProps.UserInputText && textBoxProps.UserInputText.length > 0) {
                    textBoxProps.WasSelecting = 1;
                    var x = e.calcX;
                    var ctx = getCtx(canvasid6);
                    ctx.font = textBoxProps.TextFontString;
                    if (x > textBoxProps.X && x < textBoxProps.X + 4) {
                        textBoxProps.SelectedTextEndIndex = -1;
                    } else if (x > textBoxProps.X + ctx.measureText(textBoxProps.UserInputText).width + 4) {
                        textBoxProps.SelectedTextEndIndex = textBoxProps.UserInputText.length - 1;
                    } else {
                        var letterExtents = new Array();
                        var lastWidth = 0;
                        for (var i = 0; i < textBoxProps.UserInputText.length; i++) {
                            var currWidth = ctx.measureText(textBoxProps.UserInputText.substring(0, i + 1)).width;
                            letterExtents.push({ Width: currWidth - lastWidth });
                            lastWidth = currWidth;
                        }
                        if (x > textBoxProps.X + 4 && x < textBoxProps.X + letterExtents[0].Width) {
                            textBoxProps.SelectedTextEndIndex = 0;
                        } else {
                            var lastWidth = letterExtents[0].Width;
                            for (var i = 1; i < letterExtents.length; i++) {
                                if (x > textBoxProps.X + lastWidth && x < textBoxProps.X + lastWidth + letterExtents[i].Width) {
                                    textBoxProps.SelectedTextEndIndex = i;
                                    break;
                                }
                                lastWidth += letterExtents[i].Width;
                            }
                        }
                    }
                    if (textBoxProps.SelectedTextStartIndex > textBoxProps.SelectedTextEndIndex) {
                        var tmp = textBoxProps.SelectedTextStartIndex;
                        textBoxProps.SelectedTextStartIndex = textBoxProps.SelectedTextEndIndex;
                        textBoxProps.SelectedTextEndIndex = tmp;
                    }
                }
            }
        }
    }, canvasid);
    registerClickFunction(windowid, function (canvasid2, windowid2, e) {
        var textBoxProps = getTextBoxProps(canvasid2, windowid2);
        var x = e.calcX;
        var ctx = getCtx(canvasid2);
        ctx.font = textBoxProps.TextFontString;
        if(x > textBoxProps.X && x < textBoxProps.X + 4){
            textBoxProps.CaretPosIndex = -1;
        } else if (textBoxProps.UserInputText && x > textBoxProps.X + ctx.measureText(textBoxProps.UserInputText).width + 4) {
            textBoxProps.CaretPosIndex = textBoxProps.UserInputText.length - 1;
        } else if (textBoxProps.UserInputText) {
            var letterExtents = new Array();
            var lastWidth = 0;
            for (var i = 0; i < textBoxProps.UserInputText.length; i++) {
                var currWidth = ctx.measureText(textBoxProps.UserInputText.substring(0, i + 1)).width;
                letterExtents.push({ Width: currWidth - lastWidth });
                lastWidth = currWidth;
            }
            if (x > textBoxProps.X + 4 && x < textBoxProps.X + letterExtents[0].Width) {
                textBoxProps.CaretPosIndex = 0;
            } else {
                var lastWidth = letterExtents[0].Width;
                for (var i = 1; i < letterExtents.length; i++) {
                    if (x > textBoxProps.X + lastWidth && x < textBoxProps.X + lastWidth + letterExtents[i].Width) {
                        textBoxProps.CaretPosIndex = i;
                        break;
                    }
                    lastWidth += letterExtents[i].Width;
                }
            }
        }
        if (textBoxProps.WasSelecting == 1) {
            textBoxProps.WasSelecting = 0;
        } else {
            textBoxProps.SelectedTextStartIndex = -1;
            textBoxProps.SelectedTextEndIndex = -1;
        }
    }, canvasid);
    if (!(navigator.userAgent.toLowerCase().indexOf('android') > -1 || navigator.userAgent.toLowerCase().indexOf('ipad') > -1 || navigator.userAgent.toLowerCase().indexOf('iphone') > -1 || navigator.userAgent.toLowerCase().indexOf('ipod') > -1)) {
        registerKeyDownFunction(canvasid, function (canvasid3, windowid3, e) {
            var textBoxProps = getTextBoxProps(canvasid3, windowid3);
            switch (e.keyCode) {
                case 37:
                    //left arrow	 37
                    if (textBoxProps.CaretPosIndex > -1) {
                        textBoxProps.CaretPosIndex--;
                        textBoxProps.SelectedTextStartIndex = -1;
                        textBoxProps.SelectedTextEndIndex = -1;
                        textBoxProps.WasSelecting = 0;
                        textBoxProps.MouseDown = 0;
                    }
                    return;
                case 39:
                    //right arrow	 39
                    if (textBoxProps.CaretPosIndex > textBoxProps.UserInputText.length - 1) {
                        textBoxProps.CaretPosIndex = textBoxProps.UserInputText.length - 1;
                    } else {
                        textBoxProps.CaretPosIndex++;
                    }
                    textBoxProps.SelectedTextStartIndex = -1;
                    textBoxProps.SelectedTextEndIndex = -1;
                    textBoxProps.MouseDown = 0;
                    textBoxProps.WasSelecting = 0;
                    return;
                case 46:
                    //delete	 46
                    if (textBoxProps.CaretPosIndex < textBoxProps.UserInputText.length - 1) {
                        if (textBoxProps.CaretPosIndex == -1) {
                            textBoxProps.UserInputText = textBoxProps.UserInputText.substring(1);
                        } else if (textBoxProps.CaretPosIndex == textBoxProps.UserInputText.length - 2) {
                            textBoxProps.UserInputText = textBoxProps.UserInputText.substring(0, textBoxProps.UserInputText.length - 1);
                        } else {
                            textBoxProps.UserInputText = textBoxProps.UserInputText.substring(0, textBoxProps.CaretPosIndex + 1) +
                                textBoxProps.UserInputText.substring(textBoxProps.CaretPosIndex + 2);
                        }
                        textBoxProps.SelectedTextStartIndex = -1;
                        textBoxProps.SelectedTextEndIndex = -1;
                        textBoxProps.MouseDown = 0;
                        textBoxProps.WasSelecting = 0;
                    }
                    if (textBoxProps.ListPossiblesAllChoices != null) {
                        FindTextBoxPossible(textBoxProps, c);
                    }
                    return;
                case 8:
                    //backspace	 8
                    if (textBoxProps.CaretPosIndex > -1) {
                        if (textBoxProps.CaretPosIndex == 0) {
                            if (textBoxProps.UserInputText.length > 1) {
                                textBoxProps.UserInputText = textBoxProps.UserInputText.substring(1, textBoxProps.UserInputText.length - 1);
                            } else {
                                textBoxProps.UserInputText = '';
                            }
                            textBoxProps.CaretPosIndex = -1;
                        } else if (textBoxProps.CaretPosIndex == textBoxProps.UserInputText.length - 1) {
                            textBoxProps.UserInputText = textBoxProps.UserInputText.substring(0, textBoxProps.UserInputText.length - 1);
                            textBoxProps.CaretPosIndex--;
                        } else if (textBoxProps.CaretPosIndex > 0) {
                            textBoxProps.UserInputText = textBoxProps.UserInputText.substring(0, textBoxProps.CaretPosIndex) +
                                textBoxProps.UserInputText.substring(textBoxProps.CaretPosIndex + 1);
                            textBoxProps.CaretPosIndex--;
                        }
                        textBoxProps.SelectedTextStartIndex = -1;
                        textBoxProps.SelectedTextEndIndex = -1;
                        textBoxProps.MouseDown = 0;
                        textBoxProps.WasSelecting = 0;
                    }
                    if (textBoxProps.ListPossiblesAllChoices != null) {
                        FindTextBoxPossible(textBoxProps, c);
                    }
                    return;
            }
            if (e.ctrlKey && String.fromCharCode(e.keyCode).toLowerCase() == 'a') {
                textBoxProps.SelectedTextStartIndex = 0;
                textBoxProps.SelectedTextEndIndex = textBoxProps.UserInputText.length - 1;
            } else if (e.ctrlKey && String.fromCharCode(e.keyCode).toLowerCase() == 'c' && window.clipboardData) {
                if (textBoxProps.SelectedTextStartIndex > -1 && textBoxProps.SelectedTextEndIndex > -1 && textBoxProps.UserInputText && textBoxProps.SelectedTextEndIndex < textBoxProps.UserInputText.length) {
                    window.clipboardData.setData('Text', (textBoxProps.UserInputText && textBoxProps.SelectedTextEndIndex == textBoxProps.UserInputText.length - 1 ?
                        textBoxProps.UserInputText.substring(textBoxProps.SelectedTextStartIndex) :
                        textBoxProps.UserInputText.substring(textBoxProps.SelectedTextStartIndex, textBoxProps.SelectedTextEndIndex - textBoxProps.SelectedTextStartIndex + 1)));
                }
            } else if (!textBoxProps.UserInputText || (textBoxProps.UserInputText && textBoxProps.UserInputText.length < textBoxProps.MaxChars)) {
                var c = getCharFromKeyCode(e);
                var foundPossibleMatch;
                if (textBoxProps.ListPossiblesAllChoices != null) {
                    foundPossibleMatch = FindTextBoxPossible(textBoxProps, c);
                }
                if ((!textBoxProps.AllowedCharsRegEx || textBoxProps.AllowedCharsRegEx == null || textBoxProps.AllowedCharsRegEx.length == 0 || c.match(textBoxProps.AllowedCharsRegEx) == c) &&
                    (!textBoxProps.LimitToListPossibles || (textBoxProps.LimitToListPossibles == 1 && foundPossibleMatch))) {
                    if (textBoxProps.CaretPosIndex == -1) {
                        textBoxProps.UserInputText = c + (textBoxProps.UserInputText ? textBoxProps.UserInputText : '');
                        textBoxProps.CaretPosIndex++;
                    } else if (textBoxProps.UserInputText && textBoxProps.CaretPosIndex == textBoxProps.UserInputText.length - 1) {
                        textBoxProps.UserInputText = textBoxProps.UserInputText + c;
                        textBoxProps.CaretPosIndex++;
                    } else if (textBoxProps.UserInputText) {
                        textBoxProps.UserInputText = textBoxProps.UserInputText.substring(0, textBoxProps.CaretPosIndex + 1) + c + textBoxProps.UserInputText.substring(textBoxProps.CaretPosIndex + 1);
                        textBoxProps.CaretPosIndex++;
                    }
                    textBoxProps.SelectedTextStartIndex = -1;
                    textBoxProps.SelectedTextEndIndex = -1;
                    textBoxProps.MouseDown = 0;
                    textBoxProps.WasSelecting = 0;
                }
            }
        }, windowid);
    }
    registerLostFocusFunction(canvasid, windowid, function (canvasid8, windowid8) {
        var textBoxProps = getTextBoxProps(canvasid8, windowid8);
        if (navigator.userAgent.toLowerCase().indexOf('android') > -1 || navigator.userAgent.toLowerCase().indexOf('ipad') > -1 || navigator.userAgent.toLowerCase().indexOf('iphone') > -1 || navigator.userAgent.toLowerCase().indexOf('ipod') > -1) {
            if (doesWindowHaveFocus(canvasid8, textBoxProps.CustomKeyboardWindowID) == 0 && doingEventForWindowID != textBoxProps.CustomKeyboardWindowID) {
                setHiddenWindowStatus(canvasid8, textBoxProps.CustomKeyboardWindowID, 1);
            } else {
                setHiddenWindowStatus(canvasid8, textBoxProps.CustomKeyboardWindowID, 0);
            }
        }
        if (doesWindowHaveFocus(canvasid8, textBoxProps.VScrollBarWindowID) == 0 &&
            doesWindowHaveFocus(canvasid8, textBoxProps.DropDownWindowID) == 0 &&
            doingEventForWindowID != textBoxProps.DropDownWindowID &&
            doingEventForWindowID != textBoxProps.VScrollBarWindowID) {
            textBoxProps.SelectedTextStartIndex = -1;
            textBoxProps.SelectedTextEndIndex = -1;
            textBoxProps.MouseDown = 0;
            textBoxProps.WasSelecting = 0;
            setHiddenWindowStatus(canvasid8, textBoxProps.DropDownWindowID, 1);
            setHiddenWindowStatus(canvasid8, textBoxProps.VScrollBarWindowID, 1);
        }
    });
    registerGotFocusFunction(canvasid, windowid, function (canvasid1, windowid1) {
        var textBoxProps = getTextBoxProps(canvasid1, windowid1);
        setHiddenWindowStatus(canvasid1, textBoxProps.CustomKeyboardWindowID, 0);
    });
    registerAnimatedWindow(canvasid, windowid);
    return windowid;
}

function FindTextBoxPossible(textBoxProps, c) {
    var str = '';
    if (textBoxProps.CaretPosIndex == -1) {
        str = c + (textBoxProps.UserInputText ? textBoxProps.UserInputText : '');
    } else if (textBoxProps.UserInputText && textBoxProps.CaretPosIndex == textBoxProps.UserInputText.length - 1) {
        str = textBoxProps.UserInputText + c;
    } else if (textBoxProps.UserInputText) {
        str = textBoxProps.UserInputText.substring(0, textBoxProps.CaretPosIndex + 1) + c + textBoxProps.UserInputText.substring(textBoxProps.CaretPosIndex + 1);
    }
    textBoxProps.ListPossibles = new Array();
    var found = false;
    for (var i = 0; textBoxProps.ListPossiblesAllChoices && i < textBoxProps.ListPossiblesAllChoices.length; i++) {
        if (textBoxProps.ListPossiblesAllChoices[i].indexOf(str) == 0) {
            found = true;
            textBoxProps.ListPossibles.push(textBoxProps.ListPossiblesAllChoices[i]);
        }
    }
    if (found) {
        setHiddenWindowStatus(textBoxProps.CanvasID, textBoxProps.DropDownWindowID, 0);
        setHiddenWindowStatus(textBoxProps.CanvasID, textBoxProps.VScrollBarWindowID, 0);
    } else {
        setHiddenWindowStatus(textBoxProps.CanvasID, textBoxProps.DropDownWindowID, 1);
        setHiddenWindowStatus(textBoxProps.CanvasID, textBoxProps.VScrollBarWindowID, 1);
        textBoxProps.ListPossiblesSelectedID = -1;
    }
    return found;
}

//Image fader code starts here

var imageFaderPropsArray = new Array();

function getImageFaderProps(canvasid, windowid) {
    for (var i = 0; i < imageFaderPropsArray.length; i++) {
        if (imageFaderPropsArray[i].CanvasID == canvasid && imageFaderPropsArray[i].WindowID == windowid) {
            return imageFaderPropsArray[i];
        }
    }
}

function createImageFader(canvasid, controlNameId, x, y, width, height, depth, imageURLs, fadeStartValue, fadeEndValue, fadeStepValue, holdForTicks, clickFunction, overlayimages) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'ImageFader');
    var images = new Array();
    for (var i = 0; i < imageURLs.length; i++) {
        var image = new Image();
        images.push(image);
        image.onload = function () {
            invalidateRect(canvasid, null, x, y, width, height);
        };
        image.src = imageURLs[i];
    }
    var drawingCanvas = document.createElement('canvas');
    drawingCanvas.width = width;
    drawingCanvas.height = height;
    var drawingCanvasCtx = drawingCanvas.getContext('2d');
    imageFaderPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, ImageURLs: imageURLs, Images: images,
        FadeStartValue: fadeStartValue, FadeEndValue: fadeEndValue, FadeStepValue: fadeStepValue, HoldForTicks: holdForTicks, ClickFunction: clickFunction,
        HoldCountDown: holdForTicks, CurrentImageIndex: 0, CurrentGlobalAlphaValue: fadeStartValue, OverlayImages: overlayimages, DrawingCanvas: drawingCanvas,
        DrawingCanvasCtx: drawingCanvasCtx
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var imageFaderProps = getImageFaderProps(canvasid1, windowid1);
        var ctx = imageFaderProps.DrawingCanvasCtx;
        var realCtx = getCtx(canvasid1);
        ctx.save();
        if (imageFaderProps.HoldCountDown == 0) {
            if (imageFaderProps.CurrentGlobalAlphaValue == imageFaderProps.FadeStartValue) {
                if (imageFaderProps.CurrentImageIndex + 1 >= imageFaderProps.Images.length) {
                    imageFaderProps.CurrentImageIndex = 0;
                } else {
                    imageFaderProps.CurrentImageIndex++;
                }
            }
            if (imageFaderProps.CurrentGlobalAlphaValue < imageFaderProps.FadeEndValue) {
                imageFaderProps.CurrentGlobalAlphaValue += imageFaderProps.FadeStepValue;
                if (imageFaderProps.CurrentGlobalAlphaValue > 1) {
                    imageFaderProps.CurrentGlobalAlphaValue = 1;
                }
                ctx.globalAlpha = imageFaderProps.CurrentGlobalAlphaValue;
            } else {
                imageFaderProps.CurrentGlobalAlphaValue = imageFaderProps.FadeStartValue;
                ctx.globalAlpha = imageFaderProps.CurrentGlobalAlphaValue;
                imageFaderProps.HoldCountDown = imageFaderProps.HoldForTicks;
            }
            if (imageFaderProps.OverlayImages == 1 && imageFaderProps.CurrentGlobalAlphaValue != imageFaderProps.FadeEndValue) {
                var prevImageIndex = 0;
                if (imageFaderProps.CurrentImageIndex - 1 < 0) {
                    prevImageIndex = imageFaderProps.Images.length - 1;
                } else {
                    prevImageIndex = imageFaderProps.CurrentImageIndex - 1;
                }
                if (imageFaderProps.FadeEndValue - ctx.globalAlpha > 0 && imageFaderProps.FadeEndValue - ctx.globalAlpha < 1) {
                    var saveAlpha = ctx.globalAlpha;
                    ctx.globalAlpha = imageFaderProps.FadeEndValue - saveAlpha;
                    ctx.drawImage(imageFaderProps.Images[prevImageIndex], 0, 0);
                    ctx.globalAlpha = saveAlpha;
                }
            }
            ctx.drawImage(imageFaderProps.Images[imageFaderProps.CurrentImageIndex], 0, 0);
            realCtx.drawImage(imageFaderProps.DrawingCanvas, imageFaderProps.X, imageFaderProps.Y);
        } else {
            imageFaderProps.HoldCountDown--;
            ctx.globalAlpha = imageFaderProps.FadeEndValue;
            realCtx.drawImage(imageFaderProps.Images[imageFaderProps.CurrentImageIndex], imageFaderProps.X, imageFaderProps.Y);
        }
        ctx.restore();
    }, canvasid);
    if (clickFunction) {
        registerClickFunction(windowid, function (canvasid2, windowid2, e) {
            var imageFaderProps = getImageFaderProps(canvasid2, windowid2);
            imageFaderProps.ClickFunction(canvasid2, windowid2, e, imageFaderProps.CurrentImageIndex);
        }, canvasid);
    }
    registerAnimatedWindow(canvasid, windowid);
    return windowid;
}

//Image slider code starts here

var imageSliderPropsArray = new Array();

function getImageSliderProps(canvasid, windowid) {
    for (var i = 0; i < imageSliderPropsArray.length; i++) {
        if (imageSliderPropsArray[i].CanvasID == canvasid && imageSliderPropsArray[i].WindowID == windowid) {
            return imageSliderPropsArray[i];
        }
    }
}

function createImageSlider(canvasid, controlNameId, x, y, width, height, depth, imageURLs, direction, stepIncrement, holdForTicks, clickFunction) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'ImageSlider');
    var images = new Array();
    for (var i = 0; i < imageURLs.length; i++) {
        var image = new Image();
        images.push(image);
        image.onload = function () {
            invalidateRect(canvasid, null, x, y, width, height);
        };
        image.src = imageURLs[i];
    }
    imageSliderPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, ImageURLs: imageURLs, Images: images,
        Direction: direction, StepIncrement: stepIncrement, ClickFunction: clickFunction, HoldForTicks: holdForTicks, CurrentImageIndex: 0,
        Slide: 0, HoldCountDown: holdForTicks
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var imageSliderProps = getImageSliderProps(canvasid1, windowid1);
        var ctx = getCtx(canvasid1);
        if (imageSliderProps.HoldCountDown == 0) {
            imageSliderProps.Slide += imageSliderProps.StepIncrement;
            if (imageSliderProps.Direction == 1) {
                if (Math.abs(imageSliderProps.Slide) >= imageSliderProps.Width) {
                    imageSliderProps.HoldCountDown = imageSliderProps.HoldForTicks;
                    if (imageSliderProps.Slide > 0) {
                        if (imageSliderProps.CurrentImageIndex == 0) {
                            imageSliderProps.CurrentImageIndex = imageSliderProps.ImageURLs.length - 1;
                        } else {
                            imageSliderProps.CurrentImageIndex--;
                        }
                    } else if (imageSliderProps.Slide < 0) {
                        if (imageSliderProps.CurrentImageIndex + 1 < imageSliderProps.ImageURLs.length) {
                            imageSliderProps.CurrentImageIndex++;
                        } else {
                            imageSliderProps.CurrentImageIndex = 0;
                        }
                    }
                    imageSliderProps.Slide = 0;
                    imageSliderProps.HoldCountDown = imageSliderProps.HoldForTicks;
                    ctx.drawImage(imageSliderProps.Images[imageSliderProps.CurrentImageIndex], imageSliderProps.X, imageSliderProps.Y);
                } else {
                    if (imageSliderProps.Slide > 0) {
                        var prevImageIndex;
                        if (imageSliderProps.CurrentImageIndex == 0) {
                            prevImageIndex = imageSliderProps.ImageURLs.length - 1;
                        } else {
                            prevImageIndex = imageSliderProps.CurrentImageIndex - 1;
                        }
                        ctx.drawImage(imageSliderProps.Images[prevImageIndex], imageSliderProps.X - imageSliderProps.Width + imageSliderProps.Slide, imageSliderProps.Y);
                        ctx.drawImage(imageSliderProps.Images[imageSliderProps.CurrentImageIndex], imageSliderProps.X + imageSliderProps.Slide, imageSliderProps.Y);
                    } else {
                        var nextImageIndex;
                        if (imageSliderProps.CurrentImageIndex + 1 < imageSliderProps.ImageURLs.length) {
                            nextImageIndex = imageSliderProps.CurrentImageIndex + 1;
                        } else {
                            nextImageIndex = 0;
                        }
                        ctx.drawImage(imageSliderProps.Images[imageSliderProps.CurrentImageIndex], imageSliderProps.X + imageSliderProps.Slide, imageSliderProps.Y);
                        ctx.drawImage(imageSliderProps.Images[nextImageIndex], imageSliderProps.X + imageSliderProps.Width + imageSliderProps.Slide, imageSliderProps.Y);
                    }
                }
            } else {
                if (Math.abs(imageSliderProps.Slide) >= imageSliderProps.Height) {
                    imageSliderProps.HoldCountDown = imageSliderProps.HoldForTicks;
                    if (imageSliderProps.Slide > 0) {
                        if (imageSliderProps.CurrentImageIndex == 0) {
                            imageSliderProps.CurrentImageIndex = imageSliderProps.ImageURLs.length - 1;
                        } else {
                            imageSliderProps.CurrentImageIndex--;
                        }
                    } else if (imageSliderProps.Slide < 0) {
                        if (imageSliderProps.CurrentImageIndex + 1 < imageSliderProps.ImageURLs.length) {
                            imageSliderProps.CurrentImageIndex++;
                        } else {
                            imageSliderProps.CurrentImageIndex = 0;
                        }
                    }
                    imageSliderProps.Slide = 0;
                    imageSliderProps.HoldCountDown = imageSliderProps.HoldForTicks;
                    ctx.drawImage(imageSliderProps.Images[imageSliderProps.CurrentImageIndex], imageSliderProps.X, imageSliderProps.Y);
                } else {
                    if (imageSliderProps.Slide > 0) {
                        var prevImageIndex;
                        if (imageSliderProps.CurrentImageIndex == 0) {
                            prevImageIndex = imageSliderProps.ImageURLs.length - 1;
                        } else {
                            prevImageIndex = imageSliderProps.CurrentImageIndex - 1;
                        }
                        ctx.drawImage(imageSliderProps.Images[prevImageIndex], imageSliderProps.X, imageSliderProps.Y - imageSliderProps.Height + imageSliderProps.Slide);
                        ctx.drawImage(imageSliderProps.Images[imageSliderProps.CurrentImageIndex], imageSliderProps.X, imageSliderProps.Y + imageSliderProps.Slide);
                    } else {
                        var nextImageIndex;
                        if (imageSliderProps.CurrentImageIndex + 1 < imageSliderProps.ImageURLs.length) {
                            nextImageIndex = imageSliderProps.CurrentImageIndex + 1;
                        } else {
                            nextImageIndex = 0;
                        }
                        ctx.drawImage(imageSliderProps.Images[imageSliderProps.CurrentImageIndex], imageSliderProps.X, imageSliderProps.Y + imageSliderProps.Slide);
                        ctx.drawImage(imageSliderProps.Images[nextImageIndex], imageSliderProps.X, imageSliderProps.Y + imageSliderProps.Height + imageSliderProps.Slide);
                    }
                }
            }
        } else {
            imageSliderProps.HoldCountDown--;
            ctx.drawImage(imageSliderProps.Images[imageSliderProps.CurrentImageIndex], imageSliderProps.X, imageSliderProps.Y);
        }
    }, canvasid);
    if (clickFunction) {
        registerClickFunction(windowid, function (canvasid2, windowid2, e) {
            var imageSliderProps = getImageSliderProps(canvasid2, windowid2);
            imageSliderProps.ClickFunction(canvasid2, windowid2, e, imageSliderProps.CurrentImageIndex);
        }, canvasid);
    }
    registerAnimatedWindow(canvasid, windowid);
    return windowid;
}

//Multi Line Label code starts here

var multiLineLabelPropsArray = new Array();

function getMultiLineLabelProps(canvasid, windowid) {
    for (var i = 0; i < multiLineLabelPropsArray.length; i++) {
        if (multiLineLabelPropsArray[i].CanvasID == canvasid && multiLineLabelPropsArray[i].WindowID == windowid) {
            return multiLineLabelPropsArray[i];
        }
    }
}

//<NT> - normal text will use the default font color, height, font string - ex. <NT>some text to be drawn with default font metrics</NT>
//<N><C>color</C><F>12 pt Ariel</F><T>some text to draw using &lt;F&gt; value which is the font string</T></N>

function getMarkupFontString(idx, extents) {
    for (var i = 0; i < extents.length; i++) {
        if (idx >= extents[i][0] && idx <= extents[i][1]) {
            return extents[i][3];
        }
    }
}

function getMarkupFontColor(idx, extents) {
    for (var i = 0; i < extents.length; i++) {
        if (idx >= extents[i][0] && idx <= extents[i][1]) {
            return extents[i][2];
        }
    }
}

function getMarkupLineNumber(idx, extents) {
    for (var i = 0; i < extents.length; i++) {
        if (idx <= extents[i]) {
            return i;
        }
    }
    return extents.length;
}

function createMultiLineLabel(canvasid, controlNameId, x, y, width, depth, hasMarkup, text, textColor, textHeight, textFontString, lineSpacingInPixels, wordSensitive) {
    var height = textHeight + lineSpacingInPixels;
    var ctx = getCtx(canvasid);
    ctx.font = textFontString;
    var lineBreakIndexes = new Array();
    var markupText = '';
    var markupTextExtents = new Array();
    if (hasMarkup == 0) {
        if (wordSensitive == 0) {
            var currStrIndex = 0;
            var lastLineBreakIndex = 0;
            while (currStrIndex < text.length) {
                if (text.substr(currStrIndex, 1) == '\n') {
                    lineBreakIndexes.push(currStrIndex);
                    lastLineBreakIndex = currStrIndex;
                    height += textHeight + lineSpacingInPixels;
                } else if (ctx.measureText(text.substr(lastLineBreakIndex, currStrIndex - lastLineBreakIndex + 1)).width > width) {
                    lineBreakIndexes.push(currStrIndex);
                    lastLineBreakIndex = currStrIndex;
                    height += textHeight + lineSpacingInPixels;
                }
                currStrIndex++;
            }
        } else {
            var currStrIndex = 0;
            var lastLineBreakIndex = 0;
            var lastSpace = -1;
            while (currStrIndex < text.length) {
                if (text.substr(currStrIndex, 1) == '\n') {
                    lineBreakIndexes.push(currStrIndex);
                    lastLineBreakIndex = currStrIndex;
                } else if (ctx.measureText(text.substr(lastLineBreakIndex, currStrIndex - lastLineBreakIndex + 1)).width > width) {
                    if (lastSpace > -1) {
                        lineBreakIndexes.push(lastSpace);
                        lastLineBreakIndex = lastSpace;
                    } else {
                        lineBreakIndexes.push(currStrIndex);
                        lastLineBreakIndex = currStrIndex;
                    }
                }
                height += textHeight + lineSpacingInPixels;
                currStrIndex++;
                if (text.substr(currStrIndex, 1) == ' ') {
                    lastSpace = currStrIndex;
                }
            }
        }
    } else {
        if (window.DOMParser) {
            var parser = new DOMParser();
            xmlDoc = parser.parseFromString('<root>' + text + '</root>', "text/xml");
            for (var i = 0; i < xmlDoc.firstChild.childNodes.length; i++) {
                switch (xmlDoc.firstChild.childNodes[i].nodeName) {
                    case 'NT':
                        var tmp = markupText.length > 0 ? markupText.length - 1 : 0;
                        markupText += xmlDoc.firstChild.childNodes[i].childNodes.length > 0 ? xmlDoc.firstChild.childNodes[i].childNodes[0].nodeValue : xmlDoc.firstChild.childNodes[i].nodeValue;
                        markupTextExtents.push([tmp, markupText.length - 1, textColor, textFontString ]);
                        break;
                    case 'N':
                        var colorstr, fontstr, textstr;
                        for (var j = 0; j < xmlDoc.firstChild.childNodes[i].childNodes.length; j++) {
                            switch (xmlDoc.firstChild.childNodes[i].childNodes[j].nodeName) {
                                case 'C':
                                    colorstr = xmlDoc.firstChild.childNodes[i].childNodes[j].childNodes.length > 0 ? xmlDoc.firstChild.childNodes[i].childNodes[j].childNodes[0].nodeValue :
                                        xmlDoc.firstChild.childNodes[i].childNodes[j].nodeValue;
                                    break;
                                case 'F':
                                    fontstr = xmlDoc.firstChild.childNodes[i].childNodes[j].childNodes.length > 0 ? xmlDoc.firstChild.childNodes[i].childNodes[j].childNodes[0].nodeValue :
                                        xmlDoc.firstChild.childNodes[i].childNodes[j].nodeValue;
                                    break;
                                case 'T':
                                    textstr = xmlDoc.firstChild.childNodes[i].childNodes[j].childNodes.length > 0 ? xmlDoc.firstChild.childNodes[i].childNodes[j].childNodes[0].nodeValue :
                                        xmlDoc.firstChild.childNodes[i].childNodes[j].nodeValue;
                                    break;
                            }
                        }
                        var tmp = markupText.length - 1;
                        markupText += textstr;
                        markupTextExtents.push([tmp, markupText.length - 1, colorstr, fontstr]);
                        break;
                }
            }
            if (wordSensitive == 0) {
                var currStrIndex = 0;
                var lastLineBreakIndex = 0;
                var currLineWidth = 0;
                while (currStrIndex < markupText.length) {
                    ctx.font = getMarkupFontString(currStrIndex, markupTextExtents);
                    var tmpwidth = ctx.measureText(markupText.substr(currStrIndex, 1)).width;
                    if (markupText.substr(currStrIndex, 1) == '\n') {
                        lineBreakIndexes.push(currStrIndex);
                        currLineWidth = 0;
                        height += textHeight + lineSpacingInPixels;
                    } else if (currLineWidth + tmpwidth > width) {
                        lineBreakIndexes.push(currStrIndex - 1);
                        currLineWidth = 0;
                        height += textHeight + lineSpacingInPixels;
                    } else {
                        currLineWidth += tmpwidth;
                        currStrIndex++;
                    }
                }
            } else {
                var currStrIndex = 0;
                var lastLineBreakIndex = 0;
                var currLineWidth = 0;
                var lastSpace = -1;
                while (currStrIndex < markupText.length) {
                    ctx.font = getMarkupFontString(currStrIndex, markupTextExtents);
                    var tmpwidth = ctx.measureText(markupText.substr(currStrIndex, 1)).width;
                    if (markupText.substr(currStrIndex, 1) == '\n') {
                        lineBreakIndexes.push(currStrIndex);
                        currLineWidth = 0;
                        height += textHeight + lineSpacingInPixels;
                    } else if (currLineWidth + tmpwidth > width) {
                        if (lastSpace > -1) {
                            lineBreakIndexes.push(lastSpace);
                            currStrIndex = lastSpace;
                        } else {
                            lineBreakIndexes.push(currStrIndex - 1);
                        }
                        currLineWidth = 0;
                        height += textHeight + lineSpacingInPixels;
                    } else {
                        currLineWidth += tmpwidth;
                        currStrIndex++;
                    }
                    if (markupText.substr(currStrIndex, 1) == ' ') {
                        lastSpace = currStrIndex;
                    }
                }
            }
        }
    }
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'MultiLineLabel');
    multiLineLabelPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, HasMarkup: hasMarkup, Text: text, TextColor: textColor,
        TextHeight: textHeight, TextFontString: textFontString, LineSpacingInPixels: lineSpacingInPixels, LineBreakIndexes: lineBreakIndexes,
        MarkupTextExtents: markupTextExtents, MarkupText: markupText
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var multiLineLabelProps = getMultiLineLabelProps(canvasid1, windowid1);
        var ctx = getCtx(canvasid1);
        if (multiLineLabelProps.HasMarkup == 0) {
            ctx.font = multiLineLabelProps.TextFontString;
            ctx.fillStyle = multiLineLabelProps.TextColor;
            var lastLineBreakIndex = 0;
            for (var i = 0; i < multiLineLabelProps.LineBreakIndexes.length; i++) {
                ctx.fillText(removeTrailingSpacesAndLineBreaks(multiLineLabelProps.Text.substr((i > 0 ? multiLineLabelProps.LineBreakIndexes[i - 1] : 0), multiLineLabelProps.LineBreakIndexes[i] -
                    (i > 0 ? multiLineLabelProps.LineBreakIndexes[i - 1] : 0))), multiLineLabelProps.X, multiLineLabelProps.Y + multiLineLabelProps.TextHeight +
                    ((multiLineLabelProps.TextHeight + multiLineLabelProps.LineSpacingInPixels) * i));
            }
            if (multiLineLabelProps.LineBreakIndexes[multiLineLabelProps.LineBreakIndexes.length - 1] + 1 < multiLineLabelProps.Text.length) {
                ctx.fillText(removeTrailingSpacesAndLineBreaks(multiLineLabelProps.Text.substr(multiLineLabelProps.LineBreakIndexes[multiLineLabelProps.LineBreakIndexes.length - 1])),
                    multiLineLabelProps.X, multiLineLabelProps.Y + (multiLineLabelProps.TextHeight * (multiLineLabelProps.LineBreakIndexes.length + 1)) +
                    (multiLineLabelProps.LineSpacingInPixels * multiLineLabelProps.LineBreakIndexes.length));
            }
        } else {
            var currStrIndex = 0;
            var currLineWidth = 0;
            var lastLineNo = 0;
            while (currStrIndex < multiLineLabelProps.MarkupText.length) {
                ctx.font = getMarkupFontString(currStrIndex, multiLineLabelProps.MarkupTextExtents);
                ctx.fillStyle = getMarkupFontColor(currStrIndex, multiLineLabelProps.MarkupTextExtents);
                var lineno = getMarkupLineNumber(currStrIndex, multiLineLabelProps.LineBreakIndexes);
                if (lineno != lastLineNo) {
                    lastLineNo = lineno;
                    currLineWidth = 0;
                }
                ctx.fillText(multiLineLabelProps.MarkupText.substr(currStrIndex, 1), multiLineLabelProps.X + currLineWidth,
                    multiLineLabelProps.Y + multiLineLabelProps.TextHeight + ((multiLineLabelProps.TextHeight + multiLineLabelProps.LineSpacingInPixels) * lineno));
                currLineWidth += ctx.measureText(multiLineLabelProps.MarkupText.substr(currStrIndex, 1)).width;
                currStrIndex++;
            }
        }
    }, canvasid);
    return windowid;
}

//Word processor code starts here
//italic or normal - normal | small-caps - normal | bold | bolder | lighter | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 -  xx-small | x-small | small | medium | large | x-large | xx-large
//number pt | em | ex | % - serif | sans-serif | cursive | fantasy | monospace - highlight - text color

var wordProcessorPropsArray = new Array();

function getWordProcessorProps(canvasid, windowid) {
    for (var i = 0; i < wordProcessorPropsArray.length; i++) {
        if (wordProcessorPropsArray[i].CanvasID == canvasid && wordProcessorPropsArray[i].WindowID == windowid) {
            return wordProcessorPropsArray[i];
        }
    }
}

function getWordProcessorPropsByKeyboardID(canvasid, windowid) {
    for (var i = 0; i < wordProcessorPropsArray.length; i++) {
        if (wordProcessorPropsArray[i].CanvasID == canvasid && wordProcessorPropsArray[i].CustomKeyboardWindowID == windowid) {
            return wordProcessorPropsArray[i];
        }
    }
}

function wordProcessorTouchKeyPress(canvasid, windowid, keyboardChar) {
    var wordProcessorProps = getWordProcessorPropsByKeyboardID(canvasid, windowid);
    var skip = false;
    switch (keyboardChar.toLowerCase()) {
        case 'left':
            //left arrow	 37
            if (wordProcessorProps.CaretPosIndex > -1) {
                wordProcessorProps.CaretPosIndex--;
                wordProcessorProps.SelectedTextStartIndex = -1;
                wordProcessorProps.SelectedTextEndIndex = -1;
                wordProcessorProps.WasSelecting = 0;
                wordProcessorProps.MouseDown = 0;
            }
            skip = true;
            break;
        case 'up':
            //up arrow
            var caretLineNo = 0;
            if (wordProcessorProps.LineBreakIndexes.length > 0) {
                for (var p = 0; p < wordProcessorProps.LineBreakIndexes.length; p++) {
                    if ((p == 0 ? true : wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p - 1]) &&
                        wordProcessorProps.CaretPosIndex < wordProcessorProps.LineBreakIndexes[p]) {
                        caretLineNo = p;
                        break;
                    } else if (wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p]) {
                        caretLineNo = p + 1;
                    }
                }
                if (caretLineNo > 0) {
                    wordProcessorProps.CaretPosIndex = (caretLineNo == 1 ? 0 : wordProcessorProps.LineBreakIndexes[caretLineNo - 2]) + (wordProcessorProps.CaretPosIndex - wordProcessorProps.LineBreakIndexes[caretLineNo - 1]);
                }
            }
            skip = true;
            break;
        case 'right':
            //right arrow	 39
            if (wordProcessorProps.CaretPosIndex >= wordProcessorProps.UserInputText.length - 1) {
                wordProcessorProps.CaretPosIndex = wordProcessorProps.UserInputText.length - 1;
            } else {
                wordProcessorProps.CaretPosIndex++;
            }
            wordProcessorProps.SelectedTextStartIndex = -1;
            wordProcessorProps.SelectedTextEndIndex = -1;
            wordProcessorProps.MouseDown = 0;
            wordProcessorProps.WasSelecting = 0;
            skip = true;
            break;
        case 'down':
            //down arrow key
            var caretLineNo = 0;
            if (wordProcessorProps.LineBreakIndexes.length > 0) {
                for (var p = 0; p < wordProcessorProps.LineBreakIndexes.length; p++) {
                    if ((p == 0 ? true : wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p - 1]) &&
                        wordProcessorProps.CaretPosIndex < wordProcessorProps.LineBreakIndexes[p]) {
                        caretLineNo = p;
                        break;
                    } else if (wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p]) {
                        caretLineNo = p + 1;
                    }
                }
                if (caretLineNo < wordProcessorProps.LineBreakIndexes.length) {
                    wordProcessorProps.CaretPosIndex = wordProcessorProps.LineBreakIndexes[caretLineNo] + (wordProcessorProps.CaretPosIndex - (caretLineNo == 0 ? 0 : wordProcessorProps.LineBreakIndexes[caretLineNo - 1]));
                }
            }
            skip = true;
            break;
        case 'backspacekey':
            //backspace	 8
            if (wordProcessorProps.CaretPosIndex > -1) {
                if (wordProcessorProps.CaretPosIndex == 0) {
                    if (wordProcessorProps.UserInputText.length > 1) {
                        wordProcessorProps.UserInputText = wordProcessorProps.UserInputText.substring(1, wordProcessorProps.UserInputText.length - 1);
                    } else {
                        wordProcessorProps.UserInputText = '';
                    }
                    wordProcessorProps.CaretPosIndex = -1;
                } else if (wordProcessorProps.CaretPosIndex == wordProcessorProps.UserInputText.length - 1) {
                    wordProcessorProps.UserInputText = wordProcessorProps.UserInputText.substring(0, wordProcessorProps.UserInputText.length - 1);
                    wordProcessorProps.CaretPosIndex--;
                } else if (wordProcessorProps.CaretPosIndex > 0) {
                    wordProcessorProps.UserInputText = wordProcessorProps.UserInputText.substring(0, wordProcessorProps.CaretPosIndex) +
                        wordProcessorProps.UserInputText.substring(wordProcessorProps.CaretPosIndex + 1);
                    wordProcessorProps.CaretPosIndex--;
                }
                wordProcessorProps.SelectedTextStartIndex = -1;
                wordProcessorProps.SelectedTextEndIndex = -1;
                wordProcessorProps.MouseDown = 0;
                wordProcessorProps.WasSelecting = 0;
            }
            skip = true;
            break;
        case 'spacebarkey':
            keyboardChar = ' ';
            break;
        case 'carriagereturnkey':
            keyboardChar = '\n';
            break;
    }
    if (!skip) {
        if (!wordProcessorProps.UserInputText || (wordProcessorProps.UserInputText && wordProcessorProps.UserInputText.length < wordProcessorProps.MaxChars)) {
            var c = keyboardChar;
            var foundPossibleMatch;
            if ((!wordProcessorProps.AllowedCharsRegEx || wordProcessorProps.AllowedCharsRegEx == null || wordProcessorProps.AllowedCharsRegEx.length == 0 ||
                c.match(wordProcessorProps.AllowedCharsRegEx) == c || c == '\n')) {
                if (wordProcessorProps.CaretPosIndex == -1) {
                    wordProcessorProps.UserInputText = c + (wordProcessorProps.UserInputText ? wordProcessorProps.UserInputText : '');
                    wordProcessorProps.CaretPosIndex++;
                } else if (wordProcessorProps.UserInputText && wordProcessorProps.CaretPosIndex == wordProcessorProps.UserInputText.length - 1) {
                    wordProcessorProps.UserInputText = wordProcessorProps.UserInputText + c;
                    wordProcessorProps.CaretPosIndex++;
                } else if (wordProcessorProps.UserInputText) {
                    wordProcessorProps.UserInputText = wordProcessorProps.UserInputText.substring(0, wordProcessorProps.CaretPosIndex + 1) + c +
                        wordProcessorProps.UserInputText.substring(wordProcessorProps.CaretPosIndex + 1);
                    wordProcessorProps.CaretPosIndex++;
                }
                wordProcessorProps.SelectedTextStartIndex = -1;
                wordProcessorProps.SelectedTextEndIndex = -1;
                wordProcessorProps.MouseDown = 0;
                wordProcessorProps.WasSelecting = 0;
            }
        }
    }
    wordProcessorProps.LineBreakIndexes = new Array();
    if (wordProcessorProps.UserInputText && wordProcessorProps.UserInputText.length > 0) {
        var ctx = getCtx(canvasid);
        if (wordProcessorProps.WordSensitive == 0) {
            var currStrIndex = 0;
            var lastLineBreakIndex = 0;
            while (currStrIndex < wordProcessorProps.UserInputText.length) {
                if (wordProcessorProps.UserInputText.substr(lastLineBreakIndex, currStrIndex - lastLineBreakIndex + 1) == '\n') {
                    wordProcessorProps.LineBreakIndexes.push(currStrIndex);
                    lastLineBreakIndex = currStrIndex;
                } else if (ctx.measureText(wordProcessorProps.UserInputText.substr(lastLineBreakIndex, currStrIndex - lastLineBreakIndex + 1)).width +
                    wordProcessorProps.Margin > wordProcessorProps.Width - 15) {
                    wordProcessorProps.LineBreakIndexes.push(currStrIndex);
                    lastLineBreakIndex = currStrIndex;
                }
                currStrIndex++;
            }
        } else {
            var currStrIndex = 0;
            var lastLineBreakIndex = 0;
            var lastSpace = -1;
            while (currStrIndex < wordProcessorProps.UserInputText.length) {
                if (wordProcessorProps.UserInputText.substr(currStrIndex, 1) == '\n') {
                    wordProcessorProps.LineBreakIndexes.push(currStrIndex);
                    lastLineBreakIndex = currStrIndex;
                } else if (ctx.measureText(wordProcessorProps.UserInputText.substr(lastLineBreakIndex, currStrIndex - lastLineBreakIndex + 1)).width +
                    wordProcessorProps.Margin > wordProcessorProps.Width - 15) {
                    if (lastSpace > -1) {
                        wordProcessorProps.LineBreakIndexes.push(lastSpace);
                        lastLineBreakIndex = lastSpace;
                    } else {
                        wordProcessorProps.LineBreakIndexes.push(currStrIndex);
                        lastLineBreakIndex = currStrIndex;
                    }
                }
                currStrIndex++;
                if (wordProcessorProps.UserInputText.substr(currStrIndex, 1) == ' ') {
                    lastSpace = currStrIndex;
                }
            }
        }
        var vscrollbarProps = getScrollBarProps(canvasid, wordProcessorProps.VScrollBarWindowID);
        vscrollbarProps.MaxItems = wordProcessorProps.LineBreakIndexes.length;
        var caretLineNo = 0;
        if (wordProcessorProps.LineBreakIndexes.length > 0) {
            for (var p = 0; p < wordProcessorProps.LineBreakIndexes.length; p++) {
                if ((p == 0 ? true : wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p - 1]) &&
                    wordProcessorProps.CaretPosIndex < wordProcessorProps.LineBreakIndexes[p]) {
                    caretLineNo = p;
                    break;
                } else if (wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p]) {
                    caretLineNo = p + 1;
                }
            }
        }
        if (caretLineNo - vscrollbarProps.SelectedID + 1 > (wordProcessorProps.Height - (wordProcessorProps.Margin * 2)) / (wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels)) {
            vscrollbarProps.SelectedID = caretLineNo - Math.floor((wordProcessorProps.Height - (wordProcessorProps.Margin * 2)) / (wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels)) + 1;
        } else if (caretLineNo < vscrollbarProps.SelectedID) {
            vscrollbarProps.SelectedID = caretLineNo;
        }
    }
}

function createWordProcessor(canvasid, controlNameId, x, y, width, height, depth, hasMarkup, text, textColor, textHeight, textFontString, lineSpacingInPixels, wordSensitive,
    waterMarkText, waterMarkTextColor, waterMarkTextHeight, waterMarkTextFontString, maxChars, hasShadow, shadowColor, shadowOffsetX, shadowOffsetY,
    hasRoundedEdges, edgeRadius, hasBgGradient, bgGradientStartColor, bgGradientEndColor, hasBgImage, bgImageUrl, margin, hasBorder, borderColor, borderLineWidth,
    allowedCharsRegEx, caretColor, customKeyboardWindowID) {
    var windowid;
    if (hasMarkup == 1) {
        windowid = createWindow(canvasid, x, y + 20, width - 15, height - 20, depth, null, 'WordProcessor', controlNameId);
    } else {
        windowid = createWindow(canvasid, x, y, width - 15, height, depth, null, 'WordProcessor', controlNameId);
    }
    var image;
    if (hasBgImage == 1) {
        image = new Image();
        image.src = bgImageUrl;
        image.onload = function () {
            invalidateRect(canvasid, x, y, width, height);
        };
    }
    vscrollbarwindowid = createScrollBar(canvasid, controlNameId + 'VS', x + width - 15, y, height, depth, (textHeight + lineSpacingInPixels) * Math.floor(height / textHeight), 1, windowid);
    if (navigator.userAgent.toLowerCase().indexOf('android') > -1 || navigator.userAgent.toLowerCase().indexOf('ipad') > -1 || navigator.userAgent.toLowerCase().indexOf('iphone') > -1 || navigator.userAgent.toLowerCase().indexOf('ipod') > -1) {
        if (!customKeyboardWindowID) {
            customKeyboardWindowID = createVirtualKeyboard(canvasid, controlNameId + 'VKB', x, y + height, 360, 180, depth, null, wordProcessorTouchKeyPress, 5, 5, 1, 12, '12pt Ariel', null);
        }
    }
    wordProcessorPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, HasMarkup: hasMarkup, Text: text, TextColor: textColor, TextHeight: textHeight,
        TextFontString: textFontString, LineSpacingInPixels: lineSpacingInPixels, WordSensitive: wordSensitive, WaterMarkText: waterMarkText, WaterMarkTextColor: waterMarkTextColor,
        WaterMarkTextHeight: waterMarkTextHeight, WaterMarkTextFontString: waterMarkTextFontString, MaxChars: maxChars, HasShadow: hasShadow, ShadowColor: shadowColor,
        ShadowOffsetX: shadowOffsetX, ShadowOffsetY: shadowOffsetY, HasRoundedEdges: hasRoundedEdges, EdgeRadius: edgeRadius, HasBgGradient: hasBgGradient,
        BgGradientStartColor: bgGradientStartColor, BgGradientEndColor: bgGradientEndColor, HasBgImage: hasBgImage, BgImageUrl: bgImageUrl, Margin: margin,
        HasBorder: hasBorder, BorderColor: borderColor, BorderLineWidth: borderLineWidth, UserInputText: '', VScrollBarWindowID: vscrollbarwindowid, CaretPosIndex: -1,
        ShowCaret: 0, CaretColor: caretColor, LineBreakIndexes: new Array(), SelectedTextStartIndex: -1, SelectedTextEndIndex: -1, MouseDown: 0, WasSelecting: 0,
        AllowedCharsRegEx: allowedCharsRegEx, Image: image, CaretTime: Date.now(), CustomKeyboardWindowID: customKeyboardWindowID
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var wordProcessorProps = getWordProcessorProps(canvasid1, windowid1);
        var vscrollbarProps = getScrollBarProps(canvasid1, wordProcessorProps.VScrollBarWindowID);
        var ctx = getCtx(canvasid1);
        ctx.save();
        if (wordProcessorProps.HasBgGradient == 1) {
            var g = ctx.createLinearGradient(wordProcessorProps.X, wordProcessorProps.Y, wordProcessorProps.X, wordProcessorProps.Y + wordProcessorProps.Height);
            g.addColorStop(0, wordProcessorProps.BgGradientStartColor);
            g.addColorStop(1, wordProcessorProps.BgGradientEndColor);
            ctx.fillStyle = g;
        }
        if (wordProcessorProps.HasRoundedEdges == 1) {
            ctx.beginPath();
            ctx.moveTo(wordProcessorProps.X, wordProcessorProps.Y + wordProcessorProps.EdgeRadius);
            ctx.arc(wordProcessorProps.EdgeRadius + wordProcessorProps.X, wordProcessorProps.Y + wordProcessorProps.EdgeRadius, wordProcessorProps.EdgeRadius,
                Math.PI, (Math.PI / 180) * 270, false);
            ctx.lineTo(wordProcessorProps.X + wordProcessorProps.Width - 15 - wordProcessorProps.EdgeRadius, wordProcessorProps.Y);
            ctx.arc(wordProcessorProps.X + wordProcessorProps.Width - 15 - wordProcessorProps.EdgeRadius, wordProcessorProps.Y + wordProcessorProps.EdgeRadius,
                wordProcessorProps.EdgeRadius, (Math.PI / 180) * 270, Math.PI * 2, false);
            ctx.lineTo(wordProcessorProps.X + wordProcessorProps.Width - 15, wordProcessorProps.Y + wordProcessorProps.Height - wordProcessorProps.EdgeRadius);
            ctx.arc(wordProcessorProps.X + wordProcessorProps.Width - 15 - wordProcessorProps.EdgeRadius, wordProcessorProps.Y + wordProcessorProps.Height - wordProcessorProps.EdgeRadius,
                wordProcessorProps.EdgeRadius, 0, Math.PI / 2, false);
            ctx.lineTo(wordProcessorProps.X + wordProcessorProps.EdgeRadius, wordProcessorProps.Y + wordProcessorProps.Height);
            ctx.arc(wordProcessorProps.X + wordProcessorProps.EdgeRadius, wordProcessorProps.Y + wordProcessorProps.Height - wordProcessorProps.EdgeRadius,
                wordProcessorProps.EdgeRadius, Math.PI / 2, Math.PI, false);
            ctx.closePath();
            ctx.clip();
            if (wordProcessorProps.HasBgImage == 1 && wordProcessorProps.Image.complete == true) {
                ctx.drawImage(wordProcessorProps.Image, wordProcessorProps.X, wordProcessorProps.Y);
            } else if(wordProcessorProps.HasBgGradient == 1) {
                ctx.fill();
            }
            if (wordProcessorProps.HasBorder == 1) {
                ctx.strokeStyle = wordProcessorProps.BorderColor;
                ctx.lineWidth = wordProcessorProps.BorderLineWidth;
                ctx.stroke();
            }
        } else {
            ctx.beginPath();
            ctx.rect(wordProcessorProps.X, wordProcessorProps.Y, wordProcessorProps.Width - 15, wordProcessorProps.Height);
            ctx.clip();
            if (wordProcessorProps.HasBgImage == 1 && wordProcessorProps.Image.complete == true) {
                ctx.drawImage(wordProcessorProps.Image, wordProcessorProps.X, wordProcessorProps.Y);
            } else if (wordProcessorProps.HasBgGradient == 1) {
                ctx.fill();
            }
            if (wordProcessorProps.HasBorder == 1) {
                ctx.strokeStyle = wordProcessorProps.BorderColor;
                ctx.lineWidth = wordProcessorProps.BorderLineWidth;
                ctx.stroke();
            }
        }
        if (wordProcessorProps.HasMarkup == 0) {
            if (wordProcessorProps.UserInputText && wordProcessorProps.UserInputText.length > 0) {
                ctx.font = wordProcessorProps.TextFontString;
                ctx.fillStyle = wordProcessorProps.TextColor;
                var lastLineBreakIndex = 0;
                if (wordProcessorProps.LineBreakIndexes.length == 0 && wordProcessorProps.UserInputText && wordProcessorProps.UserInputText.length > 0) {
                    ctx.fillText(removeTrailingSpacesAndLineBreaks(wordProcessorProps.UserInputText), wordProcessorProps.X + wordProcessorProps.Margin,
                        wordProcessorProps.Y + wordProcessorProps.Margin + wordProcessorProps.TextHeight);
                } else {
                    var i;
                    for (i = vscrollbarProps.SelectedID; i < wordProcessorProps.LineBreakIndexes.length && (i - vscrollbarProps.SelectedID) * (wordProcessorProps.TextHeight +
                        wordProcessorProps.LineSpacingInPixels) < wordProcessorProps.Height - (wordProcessorProps.Margin * 2); i++) {
                        ctx.fillText(removeTrailingSpacesAndLineBreaks(wordProcessorProps.UserInputText.substr((i > 0 ? wordProcessorProps.LineBreakIndexes[i - 1] : 0), wordProcessorProps.LineBreakIndexes[i] -
                            (i > 0 ? wordProcessorProps.LineBreakIndexes[i - 1] : 0))), wordProcessorProps.X + wordProcessorProps.Margin,
                            wordProcessorProps.Y + wordProcessorProps.Margin + wordProcessorProps.TextHeight +
                            ((wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels) * (i - vscrollbarProps.SelectedID)));
                    }
                    if (wordProcessorProps.LineBreakIndexes[wordProcessorProps.LineBreakIndexes.length - 1] + 1 < wordProcessorProps.UserInputText.length) {
                        ctx.fillText(removeTrailingSpacesAndLineBreaks(wordProcessorProps.UserInputText.substr(wordProcessorProps.LineBreakIndexes[wordProcessorProps.LineBreakIndexes.length - 1])),
                            wordProcessorProps.X + wordProcessorProps.Margin, wordProcessorProps.Y + wordProcessorProps.Margin +
                            ((i - vscrollbarProps.SelectedID + 1) * (wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels)) - wordProcessorProps.LineSpacingInPixels);
                    }
                }
            } else {
                ctx.font = wordProcessorProps.WaterMarkTextFontString;
                ctx.fillStyle = wordProcessorProps.WaterMarkTextColor;
                ctx.fillText(wordProcessorProps.WaterMarkText, wordProcessorProps.X + wordProcessorProps.Margin, wordProcessorProps.Y + wordProcessorProps.Margin + wordProcessorProps.WaterMarkTextHeight);
            }
            if (doesWindowHaveFocus(canvasid1, windowid1) == 1) {
                if (wordProcessorProps.ShowCaret == 1) {
                    if (Date.now() - wordProcessorProps.CaretTime > 250) {
                        wordProcessorProps.ShowCaret = 0;
                        wordProcessorProps.CaretTime = Date.now();
                    }
                    ctx.strokeStyle = wordProcessorProps.CaretColor;
                    ctx.beginPath();
                    var caretLineNo = 0;
                    if (wordProcessorProps.LineBreakIndexes.length > 0) {
                        for (var p = 0; p < wordProcessorProps.LineBreakIndexes.length; p++) {
                            if ((p == 0 ? true : wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p - 1]) &&
                                wordProcessorProps.CaretPosIndex < wordProcessorProps.LineBreakIndexes[p]) {
                                caretLineNo = p;
                                break;
                            } else if (wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p]) {
                                caretLineNo = p + 1;
                            }
                        }
                    }
                    if (wordProcessorProps.CaretPosIndex == -1) {
                        ctx.moveTo(wordProcessorProps.X + wordProcessorProps.Margin, wordProcessorProps.Y + wordProcessorProps.Margin + 4);
                        ctx.lineTo(wordProcessorProps.X + wordProcessorProps.Margin + 3, wordProcessorProps.Y + wordProcessorProps.Margin + 4);
                        ctx.moveTo(wordProcessorProps.X + wordProcessorProps.Margin, wordProcessorProps.Y + wordProcessorProps.Margin + wordProcessorProps.TextHeight - 4);
                        ctx.moveTo(wordProcessorProps.X + wordProcessorProps.Margin + 3, wordProcessorProps.Y + wordProcessorProps.Margin + wordProcessorProps.TextHeight - 4);
                        ctx.moveTo(wordProcessorProps.X + wordProcessorProps.Margin + 2, wordProcessorProps.Y + wordProcessorProps.Margin + 4);
                        ctx.lineTo(wordProcessorProps.X + wordProcessorProps.Margin + 2, wordProcessorProps.Y + wordProcessorProps.Margin + wordProcessorProps.TextHeight - 4);
                    } else if (wordProcessorProps.CaretPosIndex > -1) {
                        var tempstr = removeTrailingSpacesAndLineBreaks(wordProcessorProps.UserInputText && wordProcessorProps.UserInputText.length - 1 >= wordProcessorProps.CaretPosIndex ?
                            (caretLineNo > 0 ? wordProcessorProps.UserInputText.substring(wordProcessorProps.LineBreakIndexes[caretLineNo - 1], wordProcessorProps.CaretPosIndex + 1) :
                            wordProcessorProps.UserInputText.substring(0, wordProcessorProps.CaretPosIndex + 1)) : '');
                        ctx.font = wordProcessorProps.TextFontString;
                        var w = ctx.measureText(tempstr).width;
                        caretLineNo -= getScrollBarProps(canvasid1, wordProcessorProps.VScrollBarWindowID).SelectedID;
                        ctx.moveTo(wordProcessorProps.X + wordProcessorProps.Margin + w, wordProcessorProps.Y + wordProcessorProps.Margin +
                            ((wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels) * caretLineNo));
                        ctx.lineTo(wordProcessorProps.X + wordProcessorProps.Margin + 3 + w, wordProcessorProps.Y + wordProcessorProps.Margin +
                            ((wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels) * caretLineNo));
                        ctx.moveTo(wordProcessorProps.X + wordProcessorProps.Margin + w, wordProcessorProps.Y + wordProcessorProps.Margin + wordProcessorProps.TextHeight +
                            ((wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels) * ((caretLineNo == 0 ? 1 : caretLineNo) - 1)));
                        ctx.moveTo(wordProcessorProps.X + wordProcessorProps.Margin + 3 + w, wordProcessorProps.Y + wordProcessorProps.Margin +
                            wordProcessorProps.TextHeight + ((wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels) * caretLineNo));
                        ctx.moveTo(wordProcessorProps.X + wordProcessorProps.Margin + 2 + w, wordProcessorProps.Y + wordProcessorProps.Margin +
                            ((wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels) * caretLineNo));
                        ctx.lineTo(wordProcessorProps.X + wordProcessorProps.Margin + 2 + w, wordProcessorProps.Y + wordProcessorProps.Margin + wordProcessorProps.TextHeight +
                            ((wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels) * caretLineNo));
                    }
                    ctx.stroke();
                } else {
                    if (Date.now() - wordProcessorProps.CaretTime > 500) {
                        wordProcessorProps.ShowCaret = 1;
                        wordProcessorProps.CaretTime = Date.now();
                    }
                }
            }
        }
        ctx.restore();
    }, canvasid);
    if (!(navigator.userAgent.toLowerCase().indexOf('android') > -1 || navigator.userAgent.toLowerCase().indexOf('ipad') > -1 || navigator.userAgent.toLowerCase().indexOf('iphone') > -1 || navigator.userAgent.toLowerCase().indexOf('ipod') > -1)) {
        registerKeyDownFunction(canvasid, function (canvasid3, windowid3, e) {
            var wordProcessorProps = getWordProcessorProps(canvasid3, windowid3);
            var skip = false;
            switch (e.keyCode) {
                case 37:
                    //left arrow	 37
                    if (wordProcessorProps.CaretPosIndex > -1) {
                        wordProcessorProps.CaretPosIndex--;
                        wordProcessorProps.SelectedTextStartIndex = -1;
                        wordProcessorProps.SelectedTextEndIndex = -1;
                        wordProcessorProps.WasSelecting = 0;
                        wordProcessorProps.MouseDown = 0;
                    }
                    skip = true;
                    break;
                case 38:
                    //up arrow
                    var caretLineNo = 0;
                    if (wordProcessorProps.LineBreakIndexes.length > 0) {
                        for (var p = 0; p < wordProcessorProps.LineBreakIndexes.length; p++) {
                            if ((p == 0 ? true : wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p - 1]) &&
                                wordProcessorProps.CaretPosIndex < wordProcessorProps.LineBreakIndexes[p]) {
                                caretLineNo = p;
                                break;
                            } else if (wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p]) {
                                caretLineNo = p + 1;
                            }
                        }
                        if (caretLineNo > 0) {
                            wordProcessorProps.CaretPosIndex = (caretLineNo == 1 ? 0 : wordProcessorProps.LineBreakIndexes[caretLineNo - 2]) + (wordProcessorProps.CaretPosIndex - wordProcessorProps.LineBreakIndexes[caretLineNo - 1]);
                        }
                    }
                    skip = true;
                    break;
                case 39:
                    //right arrow	 39
                    if (wordProcessorProps.CaretPosIndex >= wordProcessorProps.UserInputText.length - 1) {
                        wordProcessorProps.CaretPosIndex = wordProcessorProps.UserInputText.length - 1;
                    } else {
                        wordProcessorProps.CaretPosIndex++;
                    }
                    wordProcessorProps.SelectedTextStartIndex = -1;
                    wordProcessorProps.SelectedTextEndIndex = -1;
                    wordProcessorProps.MouseDown = 0;
                    wordProcessorProps.WasSelecting = 0;
                    skip = true;
                    break;
                case 40:
                    //down arrow key
                    var caretLineNo = 0;
                    if (wordProcessorProps.LineBreakIndexes.length > 0) {
                        for (var p = 0; p < wordProcessorProps.LineBreakIndexes.length; p++) {
                            if ((p == 0 ? true : wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p - 1]) &&
                                wordProcessorProps.CaretPosIndex < wordProcessorProps.LineBreakIndexes[p]) {
                                caretLineNo = p;
                                break;
                            } else if (wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p]) {
                                caretLineNo = p + 1;
                            }
                        }
                        if (caretLineNo < wordProcessorProps.LineBreakIndexes.length) {
                            wordProcessorProps.CaretPosIndex = wordProcessorProps.LineBreakIndexes[caretLineNo] + (wordProcessorProps.CaretPosIndex - (caretLineNo == 0 ? 0 : wordProcessorProps.LineBreakIndexes[caretLineNo - 1]));
                        }
                    }
                    skip = true;
                    break;
                case 46:
                    //delete	 46
                    if (wordProcessorProps.CaretPosIndex < wordProcessorProps.UserInputText.length - 1) {
                        if (wordProcessorProps.CaretPosIndex == -1) {
                            wordProcessorProps.UserInputText = wordProcessorProps.UserInputText.substring(1);
                        } else if (wordProcessorProps.CaretPosIndex == wordProcessorProps.UserInputText.length - 2) {
                            wordProcessorProps.UserInputText = wordProcessorProps.UserInputText.substring(0, wordProcessorProps.UserInputText.length - 1);
                        } else {
                            wordProcessorProps.UserInputText = wordProcessorProps.UserInputText.substring(0, wordProcessorProps.CaretPosIndex + 1) +
                                wordProcessorProps.UserInputText.substring(wordProcessorProps.CaretPosIndex + 2);
                        }
                        wordProcessorProps.SelectedTextStartIndex = -1;
                        wordProcessorProps.SelectedTextEndIndex = -1;
                        wordProcessorProps.MouseDown = 0;
                        wordProcessorProps.WasSelecting = 0;
                    }
                    skip = true;
                    break;
                case 8:
                    //backspace	 8
                    if (wordProcessorProps.CaretPosIndex > -1) {
                        if (wordProcessorProps.CaretPosIndex == 0) {
                            if (wordProcessorProps.UserInputText.length > 1) {
                                wordProcessorProps.UserInputText = wordProcessorProps.UserInputText.substring(1, wordProcessorProps.UserInputText.length - 1);
                            } else {
                                wordProcessorProps.UserInputText = '';
                            }
                            wordProcessorProps.CaretPosIndex = -1;
                        } else if (wordProcessorProps.CaretPosIndex == wordProcessorProps.UserInputText.length - 1) {
                            wordProcessorProps.UserInputText = wordProcessorProps.UserInputText.substring(0, wordProcessorProps.UserInputText.length - 1);
                            wordProcessorProps.CaretPosIndex--;
                        } else if (wordProcessorProps.CaretPosIndex > 0) {
                            wordProcessorProps.UserInputText = wordProcessorProps.UserInputText.substring(0, wordProcessorProps.CaretPosIndex) +
                                wordProcessorProps.UserInputText.substring(wordProcessorProps.CaretPosIndex + 1);
                            wordProcessorProps.CaretPosIndex--;
                        }
                        wordProcessorProps.SelectedTextStartIndex = -1;
                        wordProcessorProps.SelectedTextEndIndex = -1;
                        wordProcessorProps.MouseDown = 0;
                        wordProcessorProps.WasSelecting = 0;
                    }
                    skip = true;
                    break;
            }
            if (!skip) {
                if (e.ctrlKey && String.fromCharCode(e.keyCode).toLowerCase() == 'a') {
                    wordProcessorProps.SelectedTextStartIndex = 0;
                    wordProcessorProps.SelectedTextEndIndex = wordProcessorProps.UserInputText.length - 1;
                } else if (e.ctrlKey && String.fromCharCode(e.keyCode).toLowerCase() == 'c' && window.clipboardData) {
                    if (wordProcessorProps.SelectedTextStartIndex > -1 && wordProcessorProps.SelectedTextEndIndex > -1 && wordProcessorProps.UserInputText &&
                        wordProcessorProps.SelectedTextEndIndex < wordProcessorProps.UserInputText.length) {
                        window.clipboardData.setData('Text', (wordProcessorProps.UserInputText && wordProcessorProps.SelectedTextEndIndex == wordProcessorProps.UserInputText.length - 1 ?
                            wordProcessorProps.UserInputText.substring(wordProcessorProps.SelectedTextStartIndex) :
                            wordProcessorProps.UserInputText.substring(wordProcessorProps.SelectedTextStartIndex, wordProcessorProps.SelectedTextEndIndex -
                            wordProcessorProps.SelectedTextStartIndex + 1)));
                    }
                } else if (!wordProcessorProps.UserInputText || (wordProcessorProps.UserInputText && wordProcessorProps.UserInputText.length < wordProcessorProps.MaxChars)) {
                    var c = getCharFromKeyCode(e);
                    var foundPossibleMatch;
                    if ((!wordProcessorProps.AllowedCharsRegEx || wordProcessorProps.AllowedCharsRegEx == null || wordProcessorProps.AllowedCharsRegEx.length == 0 ||
                        c.match(wordProcessorProps.AllowedCharsRegEx) == c || c == '\n')) {
                        if (wordProcessorProps.CaretPosIndex == -1) {
                            wordProcessorProps.UserInputText = c + (wordProcessorProps.UserInputText ? wordProcessorProps.UserInputText : '');
                            wordProcessorProps.CaretPosIndex++;
                        } else if (wordProcessorProps.UserInputText && wordProcessorProps.CaretPosIndex == wordProcessorProps.UserInputText.length - 1) {
                            wordProcessorProps.UserInputText = wordProcessorProps.UserInputText + c;
                            wordProcessorProps.CaretPosIndex++;
                        } else if (wordProcessorProps.UserInputText) {
                            wordProcessorProps.UserInputText = wordProcessorProps.UserInputText.substring(0, wordProcessorProps.CaretPosIndex + 1) + c +
                                wordProcessorProps.UserInputText.substring(wordProcessorProps.CaretPosIndex + 1);
                            wordProcessorProps.CaretPosIndex++;
                        }
                        wordProcessorProps.SelectedTextStartIndex = -1;
                        wordProcessorProps.SelectedTextEndIndex = -1;
                        wordProcessorProps.MouseDown = 0;
                        wordProcessorProps.WasSelecting = 0;
                    }
                }
            }
            wordProcessorProps.LineBreakIndexes = new Array();
            if (wordProcessorProps.UserInputText && wordProcessorProps.UserInputText.length > 0) {
                var ctx = getCtx(canvasid3);
                if (wordProcessorProps.WordSensitive == 0) {
                    var currStrIndex = 0;
                    var lastLineBreakIndex = 0;
                    while (currStrIndex < wordProcessorProps.UserInputText.length) {
                        if (wordProcessorProps.UserInputText.substr(lastLineBreakIndex, currStrIndex - lastLineBreakIndex + 1) == '\n') {
                            wordProcessorProps.LineBreakIndexes.push(currStrIndex);
                            lastLineBreakIndex = currStrIndex;
                        } else if (ctx.measureText(wordProcessorProps.UserInputText.substr(lastLineBreakIndex, currStrIndex - lastLineBreakIndex + 1)).width +
                            wordProcessorProps.Margin > wordProcessorProps.Width - 15) {
                            wordProcessorProps.LineBreakIndexes.push(currStrIndex);
                            lastLineBreakIndex = currStrIndex;
                        }
                        currStrIndex++;
                    }
                } else {
                    var currStrIndex = 0;
                    var lastLineBreakIndex = 0;
                    var lastSpace = -1;
                    while (currStrIndex < wordProcessorProps.UserInputText.length) {
                        if (wordProcessorProps.UserInputText.substr(currStrIndex, 1) == '\n') {
                            wordProcessorProps.LineBreakIndexes.push(currStrIndex);
                            lastLineBreakIndex = currStrIndex;
                        } else if (ctx.measureText(wordProcessorProps.UserInputText.substr(lastLineBreakIndex, currStrIndex - lastLineBreakIndex + 1)).width +
                            wordProcessorProps.Margin > wordProcessorProps.Width - 15) {
                            if (lastSpace > -1) {
                                wordProcessorProps.LineBreakIndexes.push(lastSpace);
                                lastLineBreakIndex = lastSpace;
                            } else {
                                wordProcessorProps.LineBreakIndexes.push(currStrIndex);
                                lastLineBreakIndex = currStrIndex;
                            }
                        }
                        currStrIndex++;
                        if (wordProcessorProps.UserInputText.substr(currStrIndex, 1) == ' ') {
                            lastSpace = currStrIndex;
                        }
                    }
                }
                var vscrollbarProps = getScrollBarProps(canvasid3, wordProcessorProps.VScrollBarWindowID);
                vscrollbarProps.MaxItems = wordProcessorProps.LineBreakIndexes.length;
                var caretLineNo = 0;
                if (wordProcessorProps.LineBreakIndexes.length > 0) {
                    for (var p = 0; p < wordProcessorProps.LineBreakIndexes.length; p++) {
                        if ((p == 0 ? true : wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p - 1]) &&
                            wordProcessorProps.CaretPosIndex < wordProcessorProps.LineBreakIndexes[p]) {
                            caretLineNo = p;
                            break;
                        } else if (wordProcessorProps.CaretPosIndex > wordProcessorProps.LineBreakIndexes[p]) {
                            caretLineNo = p + 1;
                        }
                    }
                }
                if (caretLineNo - vscrollbarProps.SelectedID + 1 > (wordProcessorProps.Height - (wordProcessorProps.Margin * 2)) / (wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels)) {
                    vscrollbarProps.SelectedID = caretLineNo - Math.floor((wordProcessorProps.Height - (wordProcessorProps.Margin * 2)) / (wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels)) + 1;
                } else if (caretLineNo < vscrollbarProps.SelectedID) {
                    vscrollbarProps.SelectedID = caretLineNo;
                }
            }
        }, windowid);
    }
    registerClickFunction(windowid, function (canvasid1, windowid1, e) {
        var x = e.calcX;
        var y = e.calcY;
        var wordProcessorProps = getWordProcessorProps(canvasid1, windowid1);
        var ctx = getCtx(canvasid1);
        var vscrollbarProps = getScrollBarProps(canvasid1, wordProcessorProps.VScrollBarWindowID);
        if (wordProcessorProps.UserInputText.length > 0) {
            var caretLineNo = 0;
            if (wordProcessorProps.LineBreakIndexes.length > 0) {
                for (var i = vscrollbarProps.SelectedID; i < wordProcessorProps.LineBreakIndexes.length; i++) {
                    if (wordProcessorProps.Y + wordProcessorProps.Margin + ((wordProcessorProps.TextHeight + wordProcessorProps.LineSpacingInPixels) * (i - vscrollbarProps.SelectedID + 1)) > y) {
                        break;
                    } else {
                        caretLineNo = i + 1;
                    }
                }
            }
            if (caretLineNo == 0) {
                caretLineNo = vscrollbarProps.SelectedID;
            }
            for (var i = (caretLineNo == 0 ? 0 : wordProcessorProps.LineBreakIndexes[caretLineNo - 1]); i < (caretLineNo < wordProcessorProps.LineBreakIndexes.length ?
                wordProcessorProps.LineBreakIndexes[caretLineNo] : wordProcessorProps.UserInputText.length) ; i++) {
                if (x > wordProcessorProps.X + wordProcessorProps.Margin + ctx.measureText(wordProcessorProps.UserInputText.substr((caretLineNo == 0 ? 0 :
                    wordProcessorProps.LineBreakIndexes[caretLineNo - 1]), i - (caretLineNo == 0 ? 0 : wordProcessorProps.LineBreakIndexes[caretLineNo - 1]))).width) {
                    wordProcessorProps.CaretPosIndex = i;
                } else {
                    break;
                }
            }
        }
    }, canvasid);
    registerLostFocusFunction(canvasid, windowid, function (canvasid8, windowid8) {
        var wordProcessorProps = getWordProcessorProps(canvasid8, windowid8);
        if (navigator.userAgent.toLowerCase().indexOf('android') > -1 || navigator.userAgent.toLowerCase().indexOf('ipad') > -1 || navigator.userAgent.toLowerCase().indexOf('iphone') > -1 || navigator.userAgent.toLowerCase().indexOf('ipod') > -1) {
            if (doesWindowHaveFocus(canvasid8, wordProcessorProps.CustomKeyboardWindowID) == 0 && doingEventForWindowID != wordProcessorProps.CustomKeyboardWindowID) {
                setHiddenWindowStatus(canvasid8, wordProcessorProps.CustomKeyboardWindowID, 1);
            } else {
                setHiddenWindowStatus(canvasid8, wordProcessorProps.CustomKeyboardWindowID, 0);
            }
        }
    });
    registerGotFocusFunction(canvasid, windowid, function (canvasid1, windowid1) {
        var wordProcessorProps = getWordProcessorProps(canvasid1, windowid1);
        setHiddenWindowStatus(canvasid1, wordProcessorProps.CustomKeyboardWindowID, 0);
    });
    registerAnimatedWindow(canvasid, windowid);
    return windowid;
}

function removeTrailingSpacesAndLineBreaks(str) {
    while(str.length > 0) {
        if (str.substr(0, 1) == '\n' || str.substr(0, 1) == ' ') {
            str = (1 < str.length ? str.substr(1, str.length - 1) : '');
        } else {
            break;
        }
    }
    return str;
}

function getCharFromKeyCode(e) {
    switch (e.keyCode) {
        case 16:
            return '';
        case 190:
            return e.shiftKey || e.shiftLeft ? '>' : '.';
        case 32:
            return ' ';
        case 13:
            return '\n';
        case 9:
            return '    ';
        case 106:
            return '*';
        case 107:
            return '+';
        case 109:
            return '-';
        case 110:
            return e.shiftKey || e.shiftLeft ? '>' : '.';
        case 111:
            return '/';
        case 186:
            return e.shiftKey || e.shiftLeft ? ':' : ';';
        case 187:
            return e.shiftKey || e.shiftLeft ? '+' : '=';
        case 188:
            return e.shiftKey || e.shiftLeft ? '<' : ',';
        case 189:
            return e.shiftKey || e.shiftLeft ? '_' : '-';
        case 191:
            return e.shiftKey || e.shiftLeft ? '?' : '/';
        case 192:
            return e.shiftKey || e.shiftLeft ? '~' : '`';
        case 219:
            return e.shiftKey || e.shiftLeft ? '{' : '[';
        case 220:
            return e.shiftKey || e.shiftLeft ? '|' : '\\';
        case 221:
            return e.shiftKey || e.shiftLeft ? '}' : ']';
        case 48:
            return e.shiftKey || e.shiftLeft ? ')' : '0';
        case 49:
            return e.shiftKey || e.shiftLeft ? '!' : '1';
        case 50:
            return e.shiftKey || e.shiftLeft ? '@' : '2';
        case 51:
            return e.shiftKey || e.shiftLeft ? '#' : '3';
        case 52:
            return e.shiftKey || e.shiftLeft ? '$' : '4';
        case 53:
            return e.shiftKey || e.shiftLeft ? '%' : '5';
        case 54:
            return e.shiftKey || e.shiftLeft ? '^' : '6';
        case 55:
            return e.shiftKey || e.shiftLeft ? '&' : '7';
        case 56:
            return e.shiftKey || e.shiftLeft ? '*' : '8';
        case 57:
            return e.shiftKey || e.shiftLeft ? '(' : '9';
        case 65:
            return e.shiftKey || e.shiftLeft ? 'A' : 'a';
        case 66:
            return e.shiftKey || e.shiftLeft ? 'B' : 'b';
        case 67:
            return e.shiftKey || e.shiftLeft ? 'C' : 'c';
        case 68:
            return e.shiftKey || e.shiftLeft ? 'D' : 'd';
        case 69:
            return e.shiftKey || e.shiftLeft ? 'E' : 'e';
        case 70:
            return e.shiftKey || e.shiftLeft ? 'F' : 'f';
        case 71:
            return e.shiftKey || e.shiftLeft ? 'G' : 'g';
        case 72:
            return e.shiftKey || e.shiftLeft ? 'H' : 'h';
        case 73:
            return e.shiftKey || e.shiftLeft ? 'I' : 'i';
        case 74:
            return e.shiftKey || e.shiftLeft ? 'J' : 'j';
        case 75:
            return e.shiftKey || e.shiftLeft ? 'K' : 'k';
        case 76:
            return e.shiftKey || e.shiftLeft ? 'L' : 'l';
        case 77:
            return e.shiftKey || e.shiftLeft ? 'M' : 'm';
        case 78:
            return e.shiftKey || e.shiftLeft ? 'N' : 'n';
        case 79:
            return e.shiftKey || e.shiftLeft ? 'O' : 'o';
        case 80:
            return e.shiftKey || e.shiftLeft ? 'P' : 'p';
        case 81:
            return e.shiftKey || e.shiftLeft ? 'Q' : 'q';
        case 82:
            return e.shiftKey || e.shiftLeft ? 'R' : 'r';
        case 83:
            return e.shiftKey || e.shiftLeft ? 'S' : 's';
        case 84:
            return e.shiftKey || e.shiftLeft ? 'T' : 't';
        case 85:
            return e.shiftKey || e.shiftLeft ? 'U' : 'u';
        case 86:
            return e.shiftKey || e.shiftLeft ? 'V' : 'v';
        case 87:
            return e.shiftKey || e.shiftLeft ? 'W' : 'w';
        case 88:
            return e.shiftKey || e.shiftLeft ? 'X' : 'x';
        case 89:
            return e.shiftKey || e.shiftLeft ? 'Y' : 'y';
        case 90:
            return e.shiftKey || e.shiftLeft ? 'Z' : 'z';
        case 222:
            return e.shiftKey || e.shiftLeft ? '"' : '\'';
        default:
            return '';
    }
}

//Tablet, Smartphone Keyboard code starts here

var virtualKeyboardPropsArray = new Array();

function getVirtualKeyboardProps(canvasid, windowid) {
    for (var i = 0; i < virtualKeyboardPropsArray.length; i++) {
        if (virtualKeyboardPropsArray[i].CanvasID == canvasid && virtualKeyboardPropsArray[i].WindowID == windowid) {
            return virtualKeyboardPropsArray[i];
        }
    }
}

function createVirtualKeyboard(canvasid, controlNameId, x, y, width, height, depth, keys, keypressFunc, gapbetweenbuttons, gapbetweenrows, hasgloss, textheight, textfontstring, customDrawLetterFunc) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'VirtualKeyboard', controlNameId);
    var customkeys = (keys == null ? 0 : 1);
    if (!keys) {
        keys = [[[['Q', 30, 30], ['W', 30, 30], ['E', 30, 30], ['R', 30, 30], ['T', 30, 30], ['Y', 30, 30], ['U', 30, 30], ['I', 30, 30],
            ['O', 30, 30], ['P', 30, 30]], [['A', 30, 30], ['S', 30, 30], ['D', 30, 30], ['F', 30, 30], ['G', 30, 30],
            ['H', 30, 30], ['J', 30, 30], ['K', 30, 30], ['L', 30, 30]], [['shiftKey', 30, 30, ], ['Z', 30, 30], ['X', 30, 30],
            ['C', 30, 30], ['V', 30, 30], ['B', 30, 30], ['N', 30, 30], ['M', 30, 30], ['backspaceKey', 30, 30]],
            [['keyboardOff', 30, 30], [',', 30, 30], ['spacebarKey', 60, 30], ['.', 30, 30], ['12#', 30, 30, 1],
            ['carriageReturnKey', 30, 30]], [['up', 30, 30], ['down', 30, 30], ['left', 30, 30], ['right', 30, 30]]], [[['1', 30, 30], ['2', 30, 30], ['3', 30, 30], ['4', 30, 30],
            ['5', 30, 30], ['6', 30, 30], ['7', 30, 30], ['8', 30, 30], ['9', 30, 30], ['0', 30, 30]], [['!', 30, 30], ['@', 30, 30],
            ['#', 30, 30], ['$', 30, 30], ['%', 30, 30], ['&', 30, 30], ['*', 30, 30], ['?', 30, 30], ['/', 30, 30]], [['_', 30, 30],
            ['"', 30, 30], ['\'', 30, 30], ['(', 30, 30], [')', 30, 30], ['-', 30, 30], ['+', 30, 30], [';', 30, 30],
            ['backspaceKey', 30, 30]], [['keyboardOff', 30, 30], [':', 30, 30], [',', 30, 30],
            ['spacebarKey', 45, 30], ['.', 30, 30], ['ABC', 40, 30, 0], ['carriageReturnKey', 30, 30]], [['up', 30, 30], ['down', 30, 30], ['left', 30, 30], ['right', 30, 30]]]];
    }
    virtualKeyboardPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, Keys: keys, KeyPressFunction: keypressFunc, GapBetweenButtons: gapbetweenbuttons,
        GapBetweenRows: gapbetweenrows, CurrentKeyboardIndex: 0, KeyExtents: null, TextHeight: textheight, TextFontString: textfontstring, CustomKeys: customkeys,
        CustomDrawLetterFunction: customDrawLetterFunc, HasGloss: hasgloss, ShiftKeyPressed: 0
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var virtualKeyboardProps = getVirtualKeyboardProps(canvasid1, windowid1);
        virtualKeyboardProps.KeyExtents = new Array();
        var ctx = getCtx(canvasid1);
        ctx.fillStyle = '#3c4243';
        ctx.beginPath();
        ctx.rect(virtualKeyboardProps.X, virtualKeyboardProps.Y, virtualKeyboardProps.Width, virtualKeyboardProps.Height);
        ctx.fill();
        ctx.strokeStyle = '#353a3b';
        var extraWidth = (virtualKeyboardProps.Height / Math.tan(Math.PI/4));
        for (var i = 0; i < (virtualKeyboardProps.Width + extraWidth) / 10; i++) {
            ctx.beginPath();
            ctx.moveTo(virtualKeyboardProps.X - extraWidth + (i * 10), virtualKeyboardProps.Y);
            ctx.lineTo(virtualKeyboardProps.X + (i * 10), virtualKeyboardProps.Y + virtualKeyboardProps.Height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(virtualKeyboardProps.X - extraWidth + (i * 10), virtualKeyboardProps.Y + virtualKeyboardProps.Height);
            ctx.lineTo(virtualKeyboardProps.X + (i * 10), virtualKeyboardProps.Y);
            ctx.stroke();
        }
        var offsetY = virtualKeyboardProps.GapBetweenRows;
        for (var row = 0; row < virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex].length; row++) {
            var rowWidth = 0;
            for (var c = 0; c < virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row].length; c++) {
                rowWidth += virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] + virtualKeyboardProps.GapBetweenButtons;
            }
            var offsetX = virtualKeyboardProps.GapBetweenButtons + ((virtualKeyboardProps.Width - virtualKeyboardProps.GapBetweenButtons - rowWidth) / 2);
            for (var c = 0; c < virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row].length; c++) {
                ctx.beginPath();
                ctx.moveTo(offsetX + virtualKeyboardProps.X, offsetY + virtualKeyboardProps.Y + 5);
                ctx.arc(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + 5, 5, Math.PI, (Math.PI / 180) * 270, false);
                ctx.lineTo(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5, offsetY + virtualKeyboardProps.Y);
                ctx.arc(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5, offsetY + virtualKeyboardProps.Y + 5, 5,
                    (Math.PI / 180) * 270, Math.PI * 2, false);
                ctx.lineTo(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1], offsetY + virtualKeyboardProps.Y +
                    virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 5);
                ctx.arc(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5, offsetY + virtualKeyboardProps.Y +
                    virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 5, 5, 0, Math.PI / 2, false);
                ctx.lineTo(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2]);
                ctx.arc(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 5,
                    5, Math.PI / 2, Math.PI, false);
                ctx.closePath();
                virtualKeyboardProps.KeyExtents.push([offsetX + virtualKeyboardProps.X, offsetY + virtualKeyboardProps.Y, virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1],
                    virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2], virtualKeyboardProps.ShiftKeyPressed == 1 ?
                    virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][0] : virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][0].toLowerCase(),
                    row, c]);
                var g = ctx.createLinearGradient(offsetX + virtualKeyboardProps.X, offsetY + virtualKeyboardProps.Y, offsetX + virtualKeyboardProps.X, offsetY + virtualKeyboardProps.Y +
                    virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2]);
                g.addColorStop(0, '#536fa0');
                g.addColorStop(1, '#274580');
                ctx.fillStyle = g;
                ctx.fill();
                ctx.strokeStyle = '#1f3a73';
                ctx.stroke();
                if (virtualKeyboardProps.CustomKeys == 0) {
                    g = ctx.createLinearGradient(offsetX + virtualKeyboardProps.X, offsetY + virtualKeyboardProps.Y + ((virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2]
                        - virtualKeyboardProps.TextHeight) / 2), offsetX + virtualKeyboardProps.X,
                        offsetY + virtualKeyboardProps.Y - ((virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - virtualKeyboardProps.TextHeight) / 2) +
                        virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2]);
                    g.addColorStop(0, '#fafbfc');
                    g.addColorStop(1, '#dde2ea');
                    ctx.fillStyle = g;
                    ctx.strokeStyle = g;
                    ctx.shadowBlur = 5;
                    ctx.shadowColor = '#636e7f';
                    ctx.font = virtualKeyboardProps.TextFontString;
                    switch (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][0]) {
                        case 'shiftKey':
                            ctx.beginPath();
                            ctx.moveTo(offsetX + virtualKeyboardProps.X + (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] / 2),
                                offsetY + virtualKeyboardProps.Y + 5);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + 15);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] / 2) - 3,
                                offsetY + virtualKeyboardProps.Y + 15);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] / 2) - 3,
                                offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] / 2) + 3,
                                offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] / 2) + 3,
                                offsetY + virtualKeyboardProps.Y + 15);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5,
                                offsetY + virtualKeyboardProps.Y + 15);
                            ctx.closePath();
                            if (virtualKeyboardProps.ShiftKeyPressed == 1) {
                                ctx.save();
                                var g2 = ctx.createLinearGradient(offsetX + virtualKeyboardProps.X, offsetY + virtualKeyboardProps.Y, offsetX + virtualKeyboardProps.X, offsetY +
                                    virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2]);
                                g2.addColorStop(0, '#00FF00');
                                g2.addColorStop(1, '#FFFFFF');
                                ctx.fillStyle = g2;
                                ctx.fill();
                                ctx.restore();
                            } else {
                                ctx.fill();
                            }
                            break;
                        case 'backspaceKey':
                            ctx.beginPath();
                            ctx.moveTo(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] / 2));
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 14, offsetY + virtualKeyboardProps.Y + 5);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 14, offsetY + virtualKeyboardProps.Y + (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] / 2) - 3);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5,
                                offsetY + virtualKeyboardProps.Y + (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] / 2) - 3);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5,
                                offsetY + virtualKeyboardProps.Y + (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] / 2) + 3);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 14, offsetY + virtualKeyboardProps.Y + (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] / 2) + 3);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 14, offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 5);
                            ctx.closePath();
                            ctx.fill();
                            break;
                        case 'keyboardOff':
                            ctx.beginPath();
                            ctx.rect(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + 5, virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 10,
                                virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 10);
                            ctx.stroke();
                            for (var w = 0; w < (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 10) / 4; w++) {
                                for (var f = 0; f < (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 10) / 4; f++) {
                                    ctx.beginPath();
                                    ctx.rect(offsetX + virtualKeyboardProps.X + 5 + (w * 4), offsetY + virtualKeyboardProps.Y + 5 + (f * 4), 3, 3);
                                    ctx.stroke();
                                }
                            }
                            break;
                        case 'spacebarKey':
                            ctx.beginPath();
                            ctx.moveTo(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 10);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 5);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5,
                                offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 5);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5,
                                offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 10);
                            ctx.stroke();
                            break;
                        case 'carriageReturnKey':
                            ctx.beginPath();
                            ctx.moveTo(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + 22);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 14, offsetY + virtualKeyboardProps.Y + 15);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 14, offsetY + virtualKeyboardProps.Y + 19);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 19, offsetY + virtualKeyboardProps.Y + 19);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 19, offsetY + virtualKeyboardProps.Y + 5);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 25, offsetY + virtualKeyboardProps.Y + 5);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 25, offsetY + virtualKeyboardProps.Y + 25);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 14, offsetY + virtualKeyboardProps.Y + 25);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 14, offsetY + virtualKeyboardProps.Y + 29);
                            ctx.closePath();
                            ctx.fill();
                            break;
                        case 'up':
                            ctx.beginPath();
                            ctx.moveTo(offsetX + virtualKeyboardProps.X + 15, offsetY + virtualKeyboardProps.Y + 5);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 25, offsetY + virtualKeyboardProps.Y + 25);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + 25);
                            ctx.closePath();
                            ctx.fill();
                            break;
                        case 'down':
                            ctx.beginPath();
                            ctx.moveTo(offsetX + virtualKeyboardProps.X + 15, offsetY + virtualKeyboardProps.Y + 25);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + 5);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 25, offsetY + virtualKeyboardProps.Y + 5);
                            ctx.closePath();
                            ctx.fill();
                            break;
                        case 'left':
                            ctx.beginPath();
                            ctx.moveTo(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + 15);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 25, offsetY + virtualKeyboardProps.Y + 5);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 25, offsetY + virtualKeyboardProps.Y + 25);
                            ctx.closePath();
                            ctx.fill();
                            break;
                        case 'right':
                            ctx.beginPath();
                            ctx.moveTo(offsetX + virtualKeyboardProps.X + 25, offsetY + virtualKeyboardProps.Y + 15);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + 25);
                            ctx.lineTo(offsetX + virtualKeyboardProps.X + 5, offsetY + virtualKeyboardProps.Y + 5);
                            ctx.closePath();
                            ctx.fill();
                            break;
                            break;
                        case '12#':
                        case 'ABC':
                            ctx.fillText(virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][0], offsetX + virtualKeyboardProps.X +
                                ((virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] -
                                ctx.measureText(virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][0]).width) / 2),
                                offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] -
                                ((virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - virtualKeyboardProps.TextHeight) / 2));
                            break;
                        default:
                            ctx.fillText(virtualKeyboardProps.ShiftKeyPressed == 1 ? virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][0] :
                                virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][0].toLowerCase(), offsetX + virtualKeyboardProps.X +
                                ((virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] -
                                ctx.measureText(virtualKeyboardProps.ShiftKeyPressed == 1 ? virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][0] :
                                virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][0].toLowerCase()).width) / 2),
                                offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] -
                                ((virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - virtualKeyboardProps.TextHeight) / 2));
                            break;
                    }
                } else {
                    virtualKeyboardProps.CustomDrawLetterFunction(ctx, virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][0],
                        offsetX + virtualKeyboardProps.X, offsetY + virtualKeyboardProps.Y, virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1],
                        virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2]);
                }
                if (virtualKeyboardProps.HasGloss == 1) {
                    ctx.beginPath();
                    ctx.moveTo(offsetX + virtualKeyboardProps.X + 2, offsetY + virtualKeyboardProps.Y + 5 + 2);
                    ctx.arc(offsetX + virtualKeyboardProps.X + 5 + 2, offsetY + virtualKeyboardProps.Y + 5 + 2, 5, Math.PI, (Math.PI / 180) * 270, false);
                    ctx.lineTo(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5 - 2, offsetY + virtualKeyboardProps.Y + 2);
                    ctx.arc(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5 - 2, offsetY + virtualKeyboardProps.Y + 5 + 2, 5,
                        (Math.PI / 180) * 270, Math.PI * 2, false);
                    ctx.lineTo(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 2, offsetY + virtualKeyboardProps.Y +
                        virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 5 + 2);
                    ctx.arc(offsetX + virtualKeyboardProps.X + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] - 5 - 2, offsetY + virtualKeyboardProps.Y +
                        virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 5 + 2, 5, 0, Math.PI / 2, false);
                    ctx.lineTo(offsetX + virtualKeyboardProps.X + 5 + 2, offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] + 2);
                    ctx.arc(offsetX + virtualKeyboardProps.X + 5 + 2, offsetY + virtualKeyboardProps.Y + virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] - 5 + 2,
                        5, Math.PI / 2, Math.PI, false);
                    ctx.closePath();
                    var g = ctx.createLinearGradient(offsetX + virtualKeyboardProps.X + 2, offsetY + virtualKeyboardProps.Y + 2, offsetX + virtualKeyboardProps.X + 2, offsetY + virtualKeyboardProps.Y +
                    (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][2] / 2));;
                    g.addColorStop(0, 'rgba(255,255,255,0.4)');
                    g.addColorStop(1, 'rgba(255,255,255,0.05)');
                    ctx.fillStyle = g;
                    ctx.fill();
                }
                offsetX += virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][c][1] + virtualKeyboardProps.GapBetweenButtons;
            }
            offsetY += virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][row][0][2] + virtualKeyboardProps.GapBetweenRows;
        }
        registerClickFunction(windowid, function (canvasid1, windowid1, e) {
            donotredaw = 1;
            var x = e.calcX;
            var y = e.calcY;
            var virtualKeyboardProps = getVirtualKeyboardProps(canvasid1, windowid1);
            for (var i = 0; i < virtualKeyboardProps.KeyExtents.length; i++) {
                if (x > virtualKeyboardProps.KeyExtents[i][0] && x < virtualKeyboardProps.KeyExtents[i][0] + virtualKeyboardProps.KeyExtents[i][2] &&
                    y > virtualKeyboardProps.KeyExtents[i][1] && y < virtualKeyboardProps.KeyExtents[i][1] + virtualKeyboardProps.KeyExtents[i][3]) {
                    if (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][virtualKeyboardProps.KeyExtents[i][5]][virtualKeyboardProps.KeyExtents[i][6]].length == 4) {
                        virtualKeyboardProps.CurrentKeyboardIndex =
                            virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][virtualKeyboardProps.KeyExtents[i][5]][virtualKeyboardProps.KeyExtents[i][6]][3];
                    } else {
                        if (virtualKeyboardProps.Keys[virtualKeyboardProps.CurrentKeyboardIndex][virtualKeyboardProps.KeyExtents[i][5]][virtualKeyboardProps.KeyExtents[i][6]][0] == 'shiftKey') {
                            virtualKeyboardProps.ShiftKeyPressed = (virtualKeyboardProps.ShiftKeyPressed == 1 ? 0 : 1);
                        } else {
                            virtualKeyboardProps.KeyPressFunction(canvasid1, windowid1, virtualKeyboardProps.KeyExtents[i][4]);
                        }
                    }
                    return;
                }
            }
        }, canvasid);
    }, canvasid);
    return windowid;
}

//Splitter control code starts here

var splitterPropsArray = new Array();

function getSplitterProps(canvasid, windowid) {
    for (var i = 0; i < splitterPropsArray.length; i++) {
        if (splitterPropsArray[i].CanvasID == canvasid && splitterPropsArray[i].WindowID == windowid) {
            return splitterPropsArray[i];
        }
    }
}

function createSplitter(canvasid, controlNameId, x, y, width, height, depth, linecolor) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'Splitter', controlNameId);
    splitterPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, LineColor: linecolor, MouseDown: 0
    });
    registerWindowDrawFunction(windowid, function (canvasid, windowid) {
        var splitterProps = getSplitterProps(canvasid, windowid);
        var ctx = getCtx(canvasid);
        ctx.fillStyle = splitterProps.LineColor;
        ctx.rect(splitterProps.X, splitterProps.Y, splitterProps.Width, splitterProps.Height);
        ctx.fill();
    }, canvasid);
    registerMouseDownFunction(windowid, function (canvasid2, windowid2) {
        var splitterProps = getSplitterProps(canvasid, windowid);
        splitterProps.MouseDown = 1;
    }, canvasid);
    for (var i = 0; i < windows.length; i++) {
        if (windows[i].ParentWindowID == null && ((height > width && windows[i].X < x + width + 2 && windows[i].X + windows[i].Width > x - 2) ||
            (width > height && windows[i].Y < y + height && windows[i].Y + windows[i].Height > y - 2))) {
            registerMouseMoveFunction(windows[i].WindowCount, function (canvasid2, windowid2, e) {
                var splitterProps = getSplitterProps(canvasid, windowid);
                if (splitterProps.MouseDown == 1) {
                    var windowProps = getWindowProps(canvasid, windowid);
                    var e = correctEvent(canvasid, window.event);
                    var x = e.calcX;
                    var y = e.calcY;
                    var irx = 1000000;
                    var maxirw = 0;
                    var maxirh = 0;
                    var iry = 1000000;
                    if (splitterProps.Height > splitterProps.Width) {
                        var diffX = x - splitterProps.X;
                        if (diffX != 0) {
                            for (var i = 0; i < windows.length; i++) {
                                if (windows[i].WindowCount != windowid && windows[i].ParentWindowID == null &&
                                    splitterProps.X - 2 < windows[i].X + windows[i].Width && splitterProps.X + splitterProps.Width + 2 > windows[i].X) {
                                    if (windows[i].X < irx) {
                                        irx = windows[i].X;
                                    }
                                    if (windows[i].X + windows[i].Width > maxirw) {
                                        maxirw = windows[i].X + windows[i].Width;
                                    }
                                    if (windows[i].Y < iry) {
                                        iry = windows[i].Y;
                                    }
                                    if (windows[i].Y + windows[i].Height > maxirh) {
                                        maxirh = windows[i].Y + windows[i].Height;
                                    }
                                    if (windows[i].X + windows[i].Width < windowProps.X) {
                                        windows[i].Width += diffX;
                                        getWindowControlPropsByWindowProps(windows[i]).Width = windows[i].Width;
                                    } else if (windows[i].X > windowProps.X) {
                                        windows[i].X += diffX;
                                        windows[i].Width -= diffX;
                                        var tmp = getWindowControlPropsByWindowProps(windows[i]);
                                        tmp.X = windows[i].X;
                                        tmp.Width = windows[i].Width;
                                    }
                                    if (windows[i].Width < 0) {
                                        windows[i].Width = 0;
                                    }
                                }
                            }
                            windowProps.X = x;
                            splitterProps.X = x;
                            invalidateRect(canvasid, null, irx, iry, maxirw - irx, maxirh - iry);
                        }
                    } else if (splitterProps.Width > splitterProps.Height) {
                        var diffY = y - splitterProps.Y;
                        if (diffY != 0) {
                            for (var i = 0; i < windows.length; i++) {
                                if (windows[i].WindowCount != windowid && windows[i].ParentWindowID == null &&
                                    splitterProps.Y - 2 < windows[i].Y + windows[i].Height && splitterProps.Y + splitterProps.Height + 2 > windows[i].Y) {
                                    if (windows[i].X < irx) {
                                        irx = windows[i].X;
                                    }
                                    if (windows[i].X + windows[i].Width > maxirw) {
                                        maxirw = windows[i].X + windows[i].Width;
                                    }
                                    if (windows[i].Y < iry) {
                                        iry = windows[i].Y;
                                    }
                                    if (windows[i].Y + windows[i].Height > maxirh) {
                                        maxirh = windows[i].Y + windows[i].Height;
                                    }
                                    if (windows[i].Y + windows[i].Height < windowProps.Y) {
                                        windows[i].Height += diffY;
                                        getWindowControlPropsByWindowProps(windows[i]).Height = windows[i].Height;
                                    } else if (windows[i].Y > windowProps.Y) {
                                        windows[i].Y += diffY;
                                        windows[i].Height -= diffY;
                                        var tmp = getWindowControlPropsByWindowProps(windows[i]);
                                        tmp.Y = windows[i].Y;
                                        tmp.Height = windows[i].Height;
                                    }
                                    if (windows[i].Height < 0) {
                                        windows[i].Height = 0;
                                    }
                                }
                            }
                            windowProps.Y = y;
                            splitterProps.Y = y;
                            invalidateRect(canvasid, null, irx, iry, maxirw - irx, maxirh - iry);
                        }
                    }
                }
            }, canvasid);
        }
    }
    registerMouseUpFunction(windowid, function () {
        var splitterProps = getSplitterProps(canvasid, windowid);
        splitterProps.MouseDown = 0;
    }, canvasid);
}

//BoundaryFillableMap control code starts here

var boundaryFillableMapPropsArray = new Array();

function getBoundaryFillableMapProps(canvasid, windowid) {
    for (var i = 0; i < boundaryFillableMapPropsArray.length; i++) {
        if (boundaryFillableMapPropsArray[i].CanvasID == canvasid && boundaryFillableMapPropsArray[i].WindowID == windowid) {
            return boundaryFillableMapPropsArray[i];
        }
    }
}

function createBoundaryFillableMap(canvasid, controlNameId, x, y, width, height, depth, fillpoints, imgurl, imgwidth, imgheight) {
    var windowid = createWindow(canvasid, x, y, width, height, depth, null, 'BoundaryFillableMap', controlNameId);
    var image = new Image();
    image.onload = function () {
        invalidateRect(canvasid, null, x, y, width, height);
    };
    image.src = imgurl;
    boundaryFillableMapPropsArray.push({
        CanvasID: canvasid, WindowID: windowid, X: x, Y: y, Width: width, Height: height, FillPoints: fillpoints, ImgURL: imgurl, Image: image, ImageWidth: imgwidth,
        ImageHeight: imgheight
    });
    registerWindowDrawFunction(windowid, function (canvasid1, windowid1) {
        var boundaryFillableMapProps = getBoundaryFillableMapProps(canvasid1, windowid1);
        var ctxdest = getCtx(canvasid1);
        var canvas = document.createElement('canvas');
        canvas.width = boundaryFillableMapProps.ImageWidth;
        canvas.height = boundaryFillableMapProps.ImageHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(boundaryFillableMapProps.Image, 0, 0);
        var imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < boundaryFillableMapProps.FillPoints.length; i++) {
            imgdata = fillImageData(boundaryFillableMapProps.FillPoints[i], imgdata);
        }
        ctxdest.putImageData(imgdata, boundaryFillableMapProps.X, boundaryFillableMapProps.Y);
        gaussianBlur(null, ctxdest, boundaryFillableMapProps.X, boundaryFillableMapProps.Y, 500, 389, 95, 155, 155);
    }, canvasid);
}

function fillImageData(fillpoints, imgdata) {
    var buff = new Array();
    buff.push([fillpoints[0], fillpoints[1]]);
    while (buff.length > 0) {
        var x = buff[buff.length - 1][0];
        var y = buff[buff.length - 1][1];
        buff.pop();
        if (imgdata.data[(y * imgdata.width * 4) + (x * 4)] == fillpoints[6] && imgdata.data[(y * imgdata.width * 4) + (x * 4) + 1] == fillpoints[7] &&
            imgdata.data[(y * imgdata.width * 4) + (x * 4) + 2] == fillpoints[8] && imgdata.data[(y * imgdata.width * 4) + (x * 4) + 3] == fillpoints[9]) {
            imgdata.data[(y * imgdata.width * 4) + (x * 4)] = fillpoints[10];
            imgdata.data[(y * imgdata.width * 4) + (x * 4) + 1] = fillpoints[11];
            imgdata.data[(y * imgdata.width * 4) + (x * 4) + 2] = fillpoints[12];
            imgdata.data[(y * imgdata.width * 4) + (x * 4) + 3] = fillpoints[13];
            if (x - 1 > fillpoints[2]) {
                buff.push([x - 1, y]);
            }
            if (x + 1 < fillpoints[4]) {
                buff.push([x + 1, y]);
            }
            if (y - 1 > fillpoints[3]) {
                buff.push([x, y - 1]);
            }
            if (y + 1 < fillpoints[5]) {
                buff.push([x, y + 1]);
            }
        }
    }
    return imgdata;
}

//AJAX Postback code Starts here

function invokeServerSideFunction(ajaxURL, functionName, canvasid, windowid, callBackFunc, params) {
    var data = "[FunctionName]" + functionName + "[/FunctionName][CanvasID]" + canvasid + "[/CanvasID][WindowID]" + windowid.toString() + "[/WindowID][Vars]" + getEncodedVariables() +
        "[/Vars][SessionID]" + sessionID + "[/SessionID][Params]" + encodeParams(params) + "[/Params]";
	var xmlhttp;
    if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
        xmlhttp = new XMLHttpRequest();
    } else {// code for IE6, IE5
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200 && xmlhttp.responseText && xmlhttp.responseText.length > 0) {
            //Here is where you unwrap the data
            suspendDraw = 1;
            var arr = UnWrapVars(xmlhttp.responseText);
            suspendDraw = 0;
            if (callBackFunc) {
                callBackFunc(arr);
            }
        }
    };
    xmlhttp.open("POST", ajaxURL, true);
    if (navigator.userAgent.toLowerCase().indexOf('msie') == -1) {
        xmlhttp.overrideMimeType("application/octet-stream");
    }
//    xmlhttp.setRequestHeader('Connection', 'close');
    xmlhttp.setRequestHeader("Content-Type", "text/xml");
//    xmlhttp.setRequestHeader("Content-Length", data.length);
    xmlhttp.setRequestHeader("Cache-Control", "max-age=0");
    xmlhttp.send(data);
}

function encodeParams(params) {
    var str = '[Array]';
    if (params) {
        for (var i = 0; i < params.length; i++) {
            if (typeof params[i] === 'string' || typeof params[i] === 'number') {
                str += '[i]' + encodeAllBrackets(params[i].toString()) + '[/i]';
            } else if (params[i] instanceof Array) {
                str += '[Array]';
                for (var x = 0; x < params[i].length; x++) {
                    str += encodeParams(params[i][x]);
                }
                str += '[/Array]';
            }
        }
    }
    return str + '[/Array]';
}

var imageControlBackupImageUrls = new Array();
var textBoxBackupImageUrls = new Array();
var imageSliderBackupImageUrls = new Array();
var imageFaderBackupImageUrls = new Array();
var wordProcessorBackupImageUrls = new Array();
var treeviewBackupImageUrls = new Array();

function getEncodedVariables() {
    for (var i = 0; i < imageControlPropsArray.length; i++) {
        imageControlBackupImageUrls.push({ CanvasID: imageControlPropsArray[i].CanvasID, WindowID: imageControlPropsArray[i].WindowID, ImageUrl: imageControlPropsArray[i].ImageURL });
    }
    for (var i = 0; i < textBoxPropsArray.length; i++) {
        textBoxBackupImageUrls.push({ CanvasID: textBoxPropsArray[i].CanvasID, WindowID: textBoxPropsArray[i].WindowID, ImageUrl: textBoxPropsArray[i].BgImageUrl });
    }
    for (var i = 0; i < imageSliderPropsArray.length; i++) {
        imageSliderBackupImageUrls.push({ CanvasID: imageSliderPropsArray[i].CanvasID, WindowID: imageSliderPropsArray[i].WindowID, ImageUrls: imageSliderPropsArray[i].ImageURLs });
    }
    for (var i = 0; i < imageFaderPropsArray.length; i++) {
        imageFaderBackupImageUrls.push({ CanvasID: imageFaderPropsArray[i].CanvasID, WindowID: imageFaderPropsArray[i].WindowID, ImageUrls: imageFaderPropsArray[i].ImageURLs });
    }
    for (var i = 0; i < wordProcessorPropsArray.length; i++) {
        wordProcessorBackupImageUrls.push({ CanvasID: wordProcessorPropsArray[i].CanvasID, WindowID: wordProcessorPropsArray[i].WindowID, ImageUrls: wordProcessorPropsArray[i].BgImageUrl });
    }
    for (var i = 0; i < treeViewPropsArray.length; i++) {
        for (var z = 0; z < treeViewPropsArray[i].IconImages.length; z++) {
            treeviewBackupImageUrls.push({ CanvasID: treeViewPropsArray[i].CanvasID, WindowID: treeViewPropsArray[i].WindowID, ImageUrl: treeViewPropsArray[i].IconImages[z][0] });
        }
    }
    var strVars = '[Windows]';
    for (var i = 0; i < windows.length; i++) {
        strVars += '[i]' + stringEncodeObject(windows[i]) + '[/i]';
    }
    strVars += '[/Windows][labelPropsArray]';
    for (var i = 0; i < labelPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(labelPropsArray[i]) + '[/i]';
    }
    strVars += '[/labelPropsArray][buttonPropsArray]';
    for (var i = 0; i < buttonPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(buttonPropsArray[i]) + '[/i]';
    }
    strVars += '[/buttonPropsArray][scrollBarPropsArray]';
    for (var i = 0; i < scrollBarPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(scrollBarPropsArray[i]) + '[/i]';
    }
    strVars += '[/scrollBarPropsArray][gridPropsArray]';
    for (var i = 0; i < gridPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(gridPropsArray[i]) + '[/i]';
    }
    strVars += '[/gridPropsArray][comboboxPropsArray]';
    for (var i = 0; i < comboboxPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(comboboxPropsArray[i]) + '[/i]';
    }
    strVars += '[/comboboxPropsArray][checkboxPropsArray]';
    for (var i = 0; i < checkboxPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(checkboxPropsArray[i]) + '[/i]';
    }
    strVars += '[/checkboxPropsArray][radiobuttonPropsArray]';
    for (var i = 0; i < radiobuttonPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(radiobuttonPropsArray[i]) + '[/i]';
    }
    strVars += '[/radiobuttonPropsArray][imageControlPropsArray]';
    for (var i = 0; i < imageControlPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(imageControlPropsArray[i]) + '[/i]';
    }
    strVars += '[/imageControlPropsArray][treeViewPropsArray]';
    for (var i = 0; i < treeViewPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(treeViewPropsArray[i]) + '[/i]';
    }
    strVars += '[/treeViewPropsArray][calenderPropsArray]';
    for (var i = 0; i < calenderPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(calenderPropsArray[i]) + '[/i]';
    }
    strVars += '[/calenderPropsArray][progressBarPropsArray]';
    for (var i = 0; i < progressBarPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(progressBarPropsArray[i]) + '[/i]';
    }
    strVars += '[/progressBarPropsArray][sliderPropsArray]';
    for (var i = 0; i < sliderPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(sliderPropsArray[i]) + '[/i]';
    }
    strVars += '[/sliderPropsArray][datePickerPropsArray]';
    for (var i = 0; i < datePickerPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(datePickerPropsArray[i]) + '[/i]';
    }
    strVars += '[/datePickerPropsArray][panelPropsArray]';
    for (var i = 0; i < panelPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(panelPropsArray[i]) + '[/i]';
    }
    strVars += '[/panelPropsArray][barGraphsPropsArray]';
    for (var i = 0; i < barGraphsPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(barGraphsPropsArray[i]) + '[/i]';
    }
    strVars += '[/barGraphsPropsArray][pieChartsPropsArray]';
    for (var i = 0; i < pieChartsPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(pieChartsPropsArray[i]) + '[/i]';
    }
    strVars += '[/pieChartsPropsArray][lineGraphsPropsArray]';
    for (var i = 0; i < lineGraphsPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(lineGraphsPropsArray[i]) + '[/i]';
    }
    strVars += '[/lineGraphsPropsArray][gaugeChartPropsArray]';
    for (var i = 0; i < gaugeChartPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(gaugeChartPropsArray[i]) + '[/i]';
    }
    strVars += '[/gaugeChartPropsArray][radarGraphPropsArray]';
    for (var i = 0; i < radarGraphPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(radarGraphPropsArray[i]) + '[/i]';
    }
    strVars += '[/radarGraphPropsArray][lineAreaGraphPropsArray]';
    for (var i = 0; i < lineAreaGraphPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(lineAreaGraphPropsArray[i]) + '[/i]';
    }
    strVars += '[/lineAreaGraphPropsArray][candlesticksGraphPropsArray]';
    for (var i = 0; i < candlesticksGraphPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(candlesticksGraphPropsArray[i]) + '[/i]';
    }
    strVars += '[/candlesticksGraphPropsArray][doughnutChartPropsArray]';
    for (var i = 0; i < doughnutChartPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(doughnutChartPropsArray[i]) + '[/i]';
    }
    strVars += '[/doughnutChartPropsArray][barsMixedWithLabledLineGraphsPropsArray]';
    for (var i = 0; i < barsMixedWithLabledLineGraphsPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(barsMixedWithLabledLineGraphsPropsArray[i]) + '[/i]';
    }
    strVars += '[/barsMixedWithLabledLineGraphsPropsArray][stackedBarGraphPropsArray]';
    for (var i = 0; i < stackedBarGraphPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(stackedBarGraphPropsArray[i]) + '[/i]';
    }
    strVars += '[/stackedBarGraphPropsArray][tabPropsArray]';
    for (var i = 0; i < tabPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(tabPropsArray[i]) + '[/i]';
    }
    strVars += '[/tabPropsArray][imageMapPropsArray]';
    for (var i = 0; i < imageMapPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(imageMapPropsArray[i]) + '[/i]';
    }
    strVars += '[/imageMapPropsArray][menuBarPropsArray]';
    for (var i = 0; i < menuBarPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(menuBarPropsArray[i]) + '[/i]';
    }
    strVars += '[/menuBarPropsArray][subMenuBarPropsArray]';
    for (var i = 0; i < subMenuBarPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(subMenuBarPropsArray[i]) + '[/i]';
    }
    strVars += '[/subMenuBarPropsArray][textBoxPropsArray]';
    for (var i = 0; i < textBoxPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(textBoxPropsArray[i]) + '[/i]';
    }
    strVars += '[/textBoxPropsArray][imageFaderPropsArray]';
    for (var i = 0; i < imageFaderPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(imageFaderPropsArray[i]) + '[/i]';
    }
    strVars += '[/imageFaderPropsArray][imageSliderPropsArray]';
    for (var i = 0; i < imageSliderPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(imageSliderPropsArray[i]) + '[/i]';
    }
    strVars += '[/imageSliderPropsArray][multiLineLabelPropsArray]';
    for (var i = 0; i < multiLineLabelPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(multiLineLabelPropsArray[i]) + '[/i]';
    }
    strVars += '[/multiLineLabelPropsArray][wordProcessorPropsArray]';
    for (var i = 0; i < wordProcessorPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(wordProcessorPropsArray[i]) + '[/i]';
    }
    strVars += '[/wordProcessorPropsArray][virtualKeyboardPropsArray]';
    for (var i = 0; i < virtualKeyboardPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(virtualKeyboardPropsArray[i]) + '[/i]';
    }
    strVars += '[/virtualKeyboardPropsArray][splitterPropsArray]';
    for (var i = 0; i < splitterPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(splitterPropsArray[i]) + '[/i]';
    }
    strVars += '[/splitterPropsArray][boundaryFillableMapPropsArray]';
    for (var i = 0; i < boundaryFillableMapPropsArray.length; i++) {
        strVars += '[i]' + stringEncodeObject(boundaryFillableMapPropsArray[i]) + '[/i]';
    }
    strVars += '[/boundaryFillableMapPropsArray]';
    return strVars;
}

var savedImagesOnPostback = new Array();
var currentSavedImagesOnPostbackWindowID;
var currentSavedImagesOnPostbackCanvasID;
var savedFunctionsOnPostback = new Array();
var savedDrawingCanvas = new Array();
var savedDrawingCanvasCtx = new Array();
var savedImageArrayOnPostback = new Array();
var savedArrayFunctionsOnPostback = new Array();

function stringEncodeObject(obj) {
    var strIndexes = '';
    var str = '';
    for (var name in obj) {
        if (obj[name] != null) {
            if ((navigator.userAgent.toLowerCase().indexOf('opera') > -1 ? obj[name] instanceof Object && obj[name].hasOwnProperty && obj[name].src : obj[name] instanceof Image) || name == 'Image') {
                savedImagesOnPostback.push({ CanvasID: currentSavedImagesOnPostbackCanvasID, WindowID: currentSavedImagesOnPostbackWindowID, Image: obj[name] });
                continue;
            }
            if (name == 'DrawingCanvas') {
                savedDrawingCanvas.push({ CanvasID: currentSavedImagesOnPostbackCanvasID, WindowID: currentSavedImagesOnPostbackWindowID, DrawingCanvas: obj[name] });
                continue;
            }
            if (name == 'DrawingCanvasCtx') {
                savedDrawingCanvasCtx.push({ CanvasID: currentSavedImagesOnPostbackCanvasID, WindowID: currentSavedImagesOnPostbackWindowID, DrawingCanvasCtx: obj[name] });
                continue;
            }
            if (obj[name] && typeof obj[name] == 'function') {
                savedFunctionsOnPostback.push({ CanvasID: currentSavedImagesOnPostbackCanvasID, WindowID: currentSavedImagesOnPostbackWindowID, FunctionValue: obj[name], PropertyName: name });
                continue;
            }
            if (typeof obj[name] === 'string' || typeof obj[name] === 'number') {
                if (name == "WindowID") {
                    currentSavedImagesOnPostbackWindowID = obj[name].toString();
                }
                if (name == "CanvasID") {
                    currentSavedImagesOnPostbackCanvasID = obj[name].toString();
                }
                str += '[' + name + ']' + encodeAllBrackets(obj[name].toString()) + '[/' + name + ']';
            } else if (obj[name] instanceof Array) {
                str += '[' + name + ']';
                for (var i = 0; i < obj[name].length; i++) {
                    if (obj[name] != null) {
                        if ((navigator.userAgent.toLowerCase().indexOf('opera') > -1 ? obj[name][i] instanceof Object && obj[name][i].hasOwnProperty && obj[name][i].src : obj[name][i] instanceof Image)) {
                            savedImageArrayOnPostback.push({ CanvasID: currentSavedImagesOnPostbackCanvasID, WindowID: currentSavedImagesOnPostbackWindowID, Image: obj[name][i] });
                            continue;
                        }
                        if (obj[name][i] && typeof obj[name][i] == 'function') {
                            savedArrayFunctionsOnPostback.push({
                                CanvasID: currentSavedImagesOnPostbackCanvasID, WindowID: currentSavedImagesOnPostbackWindowID,
                                Index: i.toString(), Function: obj[name][i]
                            });
                            continue;
                        }
                        if (typeof obj[name][i] === 'string' || typeof obj[name][i] === 'number') {
                            str += '[i]' + encodeAllBrackets(obj[name][i].toString()) + '[/i]';
                        } else if (obj[name][i] instanceof Array) {
                            str += encodeArray(obj[name][i], (strIndexes && strIndexes.length > 0 ? strIndexes + ',' + i.toString() : i.toString()));
                        } else if(typeof obj[name] === 'object') {
                            str += '[i]' + stringEncodeValueObject(obj[name][i]) + '[/i]';
                        }
                    }
                }
                str += '[/' + name + ']';
            } else if(typeof obj[name] === 'object') {
                str += '[' + name + ']' + stringEncodeValueObject(obj[name]) + '[/' + name + ']';
            }
        }
    }
    return str;
}

function encodeAllBrackets(str) {
    str = str.replace(/&/g, '&amp;');
    str = str.replace(/</g, '&lt;');
    str = str.replace(/\[/g, '&lb;');
    str = str.replace(/\]/g, '&rb;');
    return str.replace(/>/g, '&gt;');
}

function encodeArray(arr, strIndexes) {
    var str = '[Array]';
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] != null) {
            if ((navigator.userAgent.toLowerCase().indexOf('opera') > -1 ? arr[i] instanceof Object && arr[i].hasOwnProperty && arr[i].src : arr[i] instanceof Image)) {
                savedImageArrayOnPostback.push({ CanvasID: currentSavedImagesOnPostbackCanvasID, WindowID: currentSavedImagesOnPostbackWindowID, Image: arr[i], URL: arr[i].src });
                continue;
            }
            if (arr[i] && typeof arr[i] == 'function') {
                savedArrayFunctionsOnPostback.push({
                    CanvasID: currentSavedImagesOnPostbackCanvasID, WindowID: currentSavedImagesOnPostbackWindowID,
                    Index: (strIndexes && strIndexes.length > 0 ? strIndexes + ',' + i.toString() : i.toString()), Function: arr[i]
                });
                continue;
            }
            if (typeof arr[i] === 'string' || typeof arr[i] === 'number') {
                str += '[i]' + encodeAllBrackets(arr[i].toString()) + '[/i]';
            } else if (arr[i] instanceof Array) {
                str += encodeArray(arr[i], (strIndexes && strIndexes.length > 0 ? strIndexes + ',' + i.toString() : i.toString()));
            } else if(typeof arr[i] === 'object') {
                str += '[i]' + stringEncodeValueObject(arr[i]) + '[/i]';
            }
        }
    }
    return str + '[/Array]';
}

function stringEncodeValueObject(obj) {
    var str = '[ObjectArray]';
    for (var name in obj) {
        //ParentNode is a recursive exception
        if (obj[name] != null && name != 'TreeviewNodeInstancesParentNode' && name != 'TreeviewNodeInstancesRootNodes' && name != 'TreeviewClickLabelExtentsNode') {
            if (obj[name] instanceof Array && obj[name].length > 0) {
                str += '[' + name + ']' + encodeArray(obj[name]) + '[/' + name + ']';
            } else if (typeof obj[name] === 'string' || typeof obj[name] === 'number') {
                str += '[' + name + ']' + encodeAllBrackets(obj[name].toString()) + '[/' + name + ']';
            } else if(typeof obj[name] === 'object' && !obj[name] instanceof Array){
                str += '[' + name + ']' + stringEncodeValueObject(obj[name]) + '[/' + name + ']';
            }
        }
    }
    return str + '[/ObjectArray]';
}

function rectifyNullFunctions(arr) {
    if (arr.length == 6) {
        arr.splice(5, 0, null);
    }
    if (arr.length >= 7 && arr[6] != null) {
        for (var i = 0; i < arr[6].length; i++) {
            if (typeof arr[6][i][5] != 'function' && typeof arr[6][i][5] == 'object') {
                arr[6][i].splice(5, 0, null);
                rectifyNullFunctions(arr[6][i][6]);
            }
        }
    } else if (arr.length == 6) {
        arr.push(null);
    }
}

function UnWrapVars(data) {
    var xmlDoc = null;
    data = data.replace(/\[/g, '<');
    data = data.replace(/\]/g, '>');
    data = data.replace(/[&]lb[;]/g, '[');
    data = data.replace(/[&]rb[;]/g, ']');
    if (window.DOMParser) {
        var parser = new DOMParser();
        xmlDoc = parser.parseFromString(data, "text/xml");
        for (var i = 0; i < xmlDoc.firstChild.childNodes[0].childNodes.length; i++) {
            eval(xmlDoc.firstChild.childNodes[0].childNodes[i].nodeName + " = new Array();");
            for (var x = 0; x < xmlDoc.firstChild.childNodes[0].childNodes[i].childNodes.length; x++) {
                var obj = new Object();
                recurseFillVars(xmlDoc.firstChild.childNodes[0].childNodes[i].childNodes[x], obj);
                eval(xmlDoc.firstChild.childNodes[0].childNodes[i].nodeName + ".push(obj);");
            }
        }
    }
    for (var i = 0; i < savedImagesOnPostback.length; i++) {
        for (var x = 0; x < imageMapPropsArray.length; x++) {
            if (imageMapPropsArray[x].CanvasID == savedImagesOnPostback[i].CanvasID && imageMapPropsArray[x].WindowID == savedImagesOnPostback[i].WindowID) {
                imageMapPropsArray[x].Image = savedImagesOnPostback[i].Image;
            }
        }
        for (var x = 0; x < imageControlPropsArray.length; x++) {
            if (imageControlPropsArray[x].CanvasID == savedImagesOnPostback[i].CanvasID && imageControlPropsArray[x].WindowID == savedImagesOnPostback[i].WindowID) {
                imageControlPropsArray[x].Image = savedImagesOnPostback[i].Image;
            }
        }
        for (var x = 0; x < textBoxPropsArray.length; x++) {
            if (textBoxPropsArray[x].CanvasID == savedImagesOnPostback[i].CanvasID && textBoxPropsArray[x].WindowID == savedImagesOnPostback[i].WindowID) {
                textBoxPropsArray[x].Image = savedImagesOnPostback[i].Image;
            }
        }
        for (var x = 0; x < wordProcessorPropsArray.length; x++) {
            if (wordProcessorPropsArray[x].CanvasID == savedImagesOnPostback[i].CanvasID && wordProcessorPropsArray[x].WindowID == savedImagesOnPostback[i].WindowID) {
                wordProcessorPropsArray[x].Image = savedImagesOnPostback[i].Image;
            }
        }
        for (var x = 0; x < treeViewPropsArray.length; x++) {
            if (treeViewPropsArray[x].CanvasID == savedImagesOnPostback[i].CanvasID && treeViewPropsArray[x].WindowID == savedImagesOnPostback[i].WindowID) {
                for (var z = 0; z < treeViewPropsArray[x].IconImages.length; z++) {
                    if (treeViewPropsArray[x].IconImages[z][0] == savedImagesOnPostback[i].URL) {
                        treeViewPropsArray[x].IconImages[z].push(savedImagesOnPostback[i].Image);
                    }
                }
            }
        }
    }
    for (var i = 0; i < savedDrawingCanvas.length; i++) {
        for (var x = 0; x < imageFaderPropsArray.length; x++) {
            if (imageFaderPropsArray[x].CanvasID == savedDrawingCanvas[i].CanvasID && imageFaderPropsArray[x].WindowID == savedDrawingCanvas[i].WindowID) {
                imageFaderPropsArray[x].DrawingCanvas = savedDrawingCanvas[i].DrawingCanvas;
            }
        }
    }
    for (var i = 0; i < savedDrawingCanvasCtx.length; i++) {
        for (var x = 0; x < imageFaderPropsArray.length; x++) {
            if (imageFaderPropsArray[x].CanvasID == savedDrawingCanvasCtx[i].CanvasID && imageFaderPropsArray[x].WindowID == savedDrawingCanvasCtx[i].WindowID) {
                imageFaderPropsArray[x].DrawingCanvasCtx = savedDrawingCanvasCtx[i].DrawingCanvasCtx;
            }
        }
    }
    for (var i = 0; i < imageFaderPropsArray.length; i++) {
        imageFaderPropsArray[i].Images = new Array();
    }
    for (var i = 0; i < savedImageArrayOnPostback.length; i++) {
        for (var x = 0; x < imageFaderPropsArray.length; x++) {
            if (imageFaderPropsArray[x].CanvasID == savedImageArrayOnPostback[i].CanvasID && imageFaderPropsArray[x].WindowID == savedImageArrayOnPostback[i].WindowID) {
                imageFaderPropsArray[x].Images.push(savedImageArrayOnPostback[i].Image);
            }
        }
    }
    for (var i = 0; i < imageSliderPropsArray.length; i++) {
        imageSliderPropsArray[i].Images = new Array();
    }
    for (var i = 0; i < savedImageArrayOnPostback.length; i++) {
        for (var x = 0; x < imageSliderPropsArray.length; x++) {
            if (imageSliderPropsArray[x].CanvasID == savedImageArrayOnPostback[i].CanvasID && imageSliderPropsArray[x].WindowID == savedImageArrayOnPostback[i].WindowID) {
                imageSliderPropsArray[x].Images.push(savedImageArrayOnPostback[i].Image);
            }
        }
    }
    for (var i = 0; i < imageSliderPropsArray.length; i++) {
        for (var j = 0; j < imageSliderPropsArray[i].ImageURLs.length; j++) {
            for (var u = 0; u < imageSliderBackupImageUrls.length; u++) {
                if (imageSliderPropsArray[i].CanvasID == imageSliderBackupImageUrls[u].CanvasID && imageSliderPropsArray[i].WindowID == imageSliderBackupImageUrls[u].WindowID) {
                    var found = 0;
                    for (var y = 0; y < imageSliderBackupImageUrls[u].ImageUrls.length; y++) {
                        if (imageSliderBackupImageUrls[u].ImageUrls[y] == imageSliderPropsArray[i].ImageURLs[j]) {
                            found = 1;
                            break;
                        }
                    }
                    if (found == 0) {
                        var image = new Image();
                        image.src = imageSliderPropsArray[i].imageURLs[j];
                        imageSliderPropsArray[i].Images[j] = image;
                        image.onload = function () { invalidateRect(imageSliderPropsArray[i].CanvasID, null, imageSliderPropsArray[i].X, imageSliderPropsArray[i].Y,
                            imageSliderPropsArray[i].Width, imageSliderPropsArray[i].Height); };
                    }
                }
            }
        }
    }
    for (var i = 0; i < imageFaderPropsArray.length; i++) {
        for (var j = 0; j < imageFaderPropsArray[i].ImageURLs.length; j++) {
            for (var u = 0; u < imageFaderBackupImageUrls.length; u++) {
                if (imageFaderPropsArray[i].CanvasID == imageFaderBackupImageUrls[u].CanvasID && imageFaderPropsArray[i].WindowID == imageFaderBackupImageUrls[u].WindowID) {
                    var found = 0;
                    for (var y = 0; y < imageFaderBackupImageUrls[u].ImageUrls.length; y++) {
                        if (imageFaderBackupImageUrls[u].ImageUrls[y] == imageFaderPropsArray[i].ImageURLs[j]) {
                            found = 1;
                            break;
                        }
                    }
                    if (found == 0) {
                        var image = new Image();
                        image.src = imageFaderPropsArray[i].imageURLs[j];
                        imageFaderPropsArray[i].Images[j] = image;
                        image.onload = function () { invalidateRect(imageFaderPropsArray[i].CanvasID, null, imageFaderPropsArray[i].X, imageFaderPropsArray[i].Y, 
                            imageFaderPropsArray[i].Width, imageFaderPropsArray[i].Height); };
                    }
                }
            }
        }
    }
    for (var i = 0; i < savedArrayFunctionsOnPostback.length; i++) {
        for (var j = 0; j < menuBarPropsArray.length; j++) {
            if (savedArrayFunctionsOnPostback[i].CanvasID == menuBarPropsArray[j].CanvasID &&
                savedArrayFunctionsOnPostback[i].WindowID == menuBarPropsArray[j].WindowID) {
                var arrayIndexes = savedArrayFunctionsOnPostback[i].Index.split(',');
                var dataptr = menuBarPropsArray[j].Data;
                for (var x = 0; x < arrayIndexes.length - 1; x++) {
                    dataptr = dataptr[dataptr.length - 1 > arrayIndexes[x] ? arrayIndexes[x] : dataptr.length - 1];
                }
                dataptr.splice(arrayIndexes[arrayIndexes.length - 1], 0, savedArrayFunctionsOnPostback[i].Function);
            }
        }
    }
    for (var j = 0; j < menuBarPropsArray.length; j++) {
        for (var k = 0; k < menuBarPropsArray[j].Data.length; k++) {
            rectifyNullFunctions(menuBarPropsArray[j].Data[k]);
        }
    }
    for (var i = 0; i < subMenuBarPropsArray.length; i++) {
        for (var j = 0; j < menuBarPropsArray.length; j++) {
            for (var c = 0; c < menuBarPropsArray[j].ChildMenuWindowIDs.length; c++) {
                if (subMenuBarPropsArray[i].WindowID == menuBarPropsArray[j].ChildMenuWindowIDs[c] &&
                    subMenuBarPropsArray[i].CanvasID == menuBarPropsArray[j].CanvasID) {
                    var x = 0;
                    for (var k = 0; k < menuBarPropsArray[j].Data.length; k++) {
                        if (menuBarPropsArray[j].Data[k][6] != null) {
                            if (x == c) {
                                subMenuBarPropsArray[i].Data = menuBarPropsArray[j].Data[k][6];
                            }
                            x++;
                        }
                    }
                }
            }
        }
    }
    for (var i = 0; i < menuBarPropsArray.length; i++) {
        for (var c = 0; menuBarPropsArray[i].ChildMenuWindowIDs && c < menuBarPropsArray[i].ChildMenuWindowIDs.length; c++) {
            for (var k = 0; k < subMenuBarPropsArray.length; k++) {
                if (subMenuBarPropsArray[k].CanvasID == menuBarPropsArray[i].CanvasID &&
                    subMenuBarPropsArray[k].WindowID == menuBarPropsArray[i].ChildMenuWindowIDs[c]) {
                    for (var m = 0; m < subMenuBarPropsArray[k].ChildMenuWindowIDs.length; m++) {
                        for (var j = 0; j < subMenuBarPropsArray.length; j++) {
                            if (subMenuBarPropsArray[j].CanvasID == subMenuBarPropsArray[k].CanvasID &&
                                subMenuBarPropsArray[j].WindowID == subMenuBarPropsArray[k].ChildMenuWindowIDs[m]) {
                                var x = 0;
                                for (var u = 0; u < subMenuBarPropsArray[k].Data.length; u++) {
                                    if (subMenuBarPropsArray[k].Data[u][6] != null) {
                                        if (x == m) {
                                            subMenuBarPropsArray[j].Data = subMenuBarPropsArray[k].Data[u][6];
                                        }
                                        x++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    for (var i = 0; i < savedFunctionsOnPostback.length; i++) {
        var o = getLabelProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getButtonProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getScrollBarProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getGridProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getComboboxPropsByTextAreaWindowId(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getcheckboxProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getRadioButtonProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getImageControlProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getTreeViewProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getCalenderProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getSliderProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getDatePickerPropsByTextBoxAreaWindowID(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getPanelProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getBarGraphProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getPieChartProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getLineGraphProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getGaugeChartProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getRadarGraphProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getLineAreaGraphProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getCandlesticksGraphProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getDoughnutChartProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getBarsMixedWithLabledLineGraphProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getstackedBarGraphProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getTabProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getImageMapProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getMenuBarProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getSubMenuBarProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getTextBoxProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getVirtualKeyboardProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
        var o = getSplitterProps(savedFunctionsOnPostback[i].CanvasID, savedFunctionsOnPostback[i].WindowID);
        if (setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) == 1) { continue; }
    }
    savedImagesOnPostback = new Array();
    for (var i = 0; i < imageControlPropsArray.length; i++) {
        for (var j = 0; j < imageControlBackupImageUrls.length; j++) {
            if (imageControlPropsArray[i].CanvasID == imageControlBackupImageUrls[j].CanvasID && imageControlPropsArray[i].WindowID == imageControlBackupImageUrls[j].WindowID &&
                imageControlPropsArray[i].ImageURL != imageControlBackupImageUrls[j].ImageURL) {
                var image = new Image();
                image.src = imageControlPropsArray[i].ImageURL;
                imageControlPropsArray[i].Image = image;
                image.onload = function () { invalidateRect(imageControlPropsArray[i].CanvasID, null, imageControlPropsArray[i].X, imageControlPropsArray[i].Y,
                    imageControlPropsArray[i].Width, imageControlPropsArray[i].Height); };
            }
        }
    }
    for (var i = 0; i < textBoxPropsArray.length; i++) {
        for (var j = 0; j < textBoxBackupImageUrls.length; j++) {
            if (textBoxPropsArray[i].CanvasID == textBoxBackupImageUrls[j].CanvasID && textBoxPropsArray[i].WindowID == textBoxBackupImageUrls[j].WindowID &&
                textBoxPropsArray[i].BgImageUrl != textBoxBackupImageUrls[j].BgImageUrl) {
                var image = new Image();
                image.src = textBoxPropsArray[i].BgImageUrl;
                textBoxPropsArray[i].Image = image;
                image.onload = function () { invalidateRect(textBoxPropsArray[i].CanvasID, null, textBoxPropsArray[i].X, textBoxPropsArray[i].Y, textBoxPropsArray[i].Width,
                    textBoxPropsArray[i].Height); };
            }
        }
    }
    for (var i = 0; i < wordProcessorPropsArray.length; i++) {
        for (var j = 0; j < wordProcessorBackupImageUrls.length; j++) {
            if (wordProcessorPropsArray[i].CanvasID == wordProcessorBackupImageUrls[j].CanvasID && wordProcessorPropsArray[i].WindowID == wordProcessorBackupImageUrls[j].WindowID &&
                wordProcessorPropsArray[i].BgImageUrl != wordProcessorBackupImageUrls[j].BgImageUrl) {
                var image = new Image();
                image.src = wordProcessorPropsArray[i].BgImageUrl;
                wordProcessorPropsArray[i].Image = image;
                image.onload = function () { invalidateRect(wordProcessorPropsArray[i].CanvasID, null, wordProcessorPropsArray[i].X, wordProcessorPropsArray[i].Y,
                    wordProcessorPropsArray[i].Width, wordProcessorPropsArray[i].Height); };
            }
        }
    }
    for (var i = 0; i < treeViewPropsArray.length; i++) {
        for (var j = 0; j < treeviewBackupImageUrls.length; j++) {
            if (treeViewPropsArray[i].CanvasID == treeviewBackupImageUrls[j].CanvasID && treeViewPropsArray[i].WindowID == treeviewBackupImageUrls[j].WindowID) {
                for (var z = 0; z < treeViewPropsArray[i].IconImages.length; z++) {
                    if (treeViewPropsArray[i].IconImages[z][0] == treeviewBackupImageUrls[j].ImageUrl) {
                        var image = new Image();
                        image.src = treeviewBackupImageUrls[j].ImageUrl;
                        treeViewPropsArray[i].IconImages[z].push(image);
                        image.onload = function () { };
                    }
                }
            }
        }
    }
    for (var i = 0; i < treeViewPropsArray.length; i++) {
        FixChildNodesForRecursionProblem(null, treeViewPropsArray[i].Nodes, treeViewPropsArray[i].Nodes);
        invalidateRect(treeViewPropsArray[i].CanvasID, treeViewPropsArray[i].ParentWindowID, treeViewPropsArray[i].X, treeViewPropsArray[i].Y,
            treeViewPropsArray[i].Width, treeViewPropsArray[i].Height);
    }
    return getParameters(xmlDoc.firstChild.childNodes[1].childNodes[0].childNodes);
}

function FixChildNodesForRecursionProblem(parentnode, childnodes, nodes) {
    for (var i = 0; i < childnodes.length; i++) {
        childnodes[i].TreeviewNodeInstancesParentNode = parentnode;
        childnodes[i].TreeviewNodeInstancesRootNodes = nodes;
        if (childnodes[i].ChildNodes && childnodes[i].ChildNodes.length > 0) {
            FixChildNodesForRecursionProblem(childnodes[i], childnodes[i].ChildNodes, nodes);
        } else {
            childnodes[i].ChildNodes = new Array();
        }
    }
}

function getParameters(nodes) {
    var arr = new Array();
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].nodeName == 'Array') {
            arr.push(getParameters(nodes[i].childNodes));
        } else {
            arr.push(correctValueTypes(nodes[i].childNodes.length > 0 ? nodes[i].childNodes[0].nodeValue : nodes[i].nodeValue));
        }
    }
    return arr;
}

function setSavedFunctionOnPostback(o, savedFunctionsOnPostback, i) {
    if (o != null) {
        o[savedFunctionsOnPostback[i].PropertyName] = savedFunctionsOnPostback[i].FunctionValue;
        return 1;
    }
    return 0;
}

function recurseFillVars(node, obj) {
    for (var i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].childNodes.length > 0 && node.childNodes[i].childNodes[0].nodeName == "Array") {
            var arr = new Array();
            obj[node.childNodes[i].nodeName] = arr;
            for (var x = 0; x < node.childNodes[i].childNodes[0].childNodes.length; x++) {
                if (node.childNodes[i].childNodes[0].childNodes[x].childNodes.length > 0 &&
                    node.childNodes[i].childNodes[0].childNodes[x].childNodes[0].nodeName == "Array") {
                    var arr2 = new Array();
                    recurseFillArray(arr2, node.childNodes[i].childNodes[0].childNodes[x]);
                    arr.push(arr2);
                } else if (node.childNodes[i].childNodes[0].childNodes[x].childNodes.length > 0 &&
                    node.childNodes[i].childNodes[0].childNodes[x].childNodes[0].nodeName == "ObjectArray") {
                    arr.push(FillObjectArrayValues(node.childNodes[i].childNodes[0].childNodes[x].childNodes[0]));
                } else {
                    arr.push(correctValueTypes(node.childNodes[i].childNodes[0].childNodes[x].childNodes.length > 0 ?
                        node.childNodes[i].childNodes[0].childNodes[x].childNodes[0].nodeValue :
                        node.childNodes[i].childNodes[0].childNodes[x].nodeValue));
                }
            }
        } else if (node.childNodes[i].childNodes.length > 0 && node.childNodes[i].childNodes[0].nodeName == "ObjectArray") {
            obj[node.childNodes[i].nodeName] = FillObjectArrayValues(node.childNodes[i].childNodes[0]);
        } else {
            obj[node.childNodes[i].nodeName] = correctValueTypes(node.childNodes[i].childNodes.length > 0 ? node.childNodes[i].childNodes[0].nodeValue : node.childNodes[i].nodeValue);
        }
    }
}

function FillObjectArrayValues(node) {
    var newobj = {};
    for (var p = 0; p < node.childNodes.length; p++) {
        if (node.childNodes[p].childNodes.length > 0 && node.childNodes[p].childNodes[0].nodeValue == 'Array') {
            var arr3 = new Array();
            recurseFillArray(arr3, node.childNodes[p].childNodes[0]);
            newobj[node.childNodes[p].nodeName] = arr3;
        } else if (node.childNodes[p].childNodes.length > 0 && node.childNodes[p].childNodes[0].nodeValue == 'ObjectArray') {
            newobj[node.childNodes[p].nodeName] = FillObjectArrayValues(node.childNodes[p].childNodes[0]);
        } else {
            newobj[node.childNodes[p].nodeName] = correctValueTypes(node.childNodes[p].childNodes.length > 0 ? node.childNodes[p].childNodes[0].nodeValue :
                node.childNodes[p].nodeValue);
        }
    }
    return newobj;
}

function correctValueTypes(o) {
    if (typeof o == 'string' && (parseInt(o) >= 0 || parseInt(o) < 0) && parseInt(o).toString() == o) {
        return parseInt(o);
    } else if (typeof o == 'string' && (parseFloat(o) >= 0 || parseFloat(o) < 0) && parseFloat(o).toString() == o) {
        return parseFloat(o);
    } else if (typeof o == 'string') {
        return o.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    return o;
}

function recurseFillArray(arr, node) {
    for (var i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].childNodes.length > 0 && node.childNodes[i].childNodes[0].nodeName == "Array") {
            var arr2 = new Array();
            recurseFillArray(arr2, node.childNodes[i].childNodes[0]);
            arr.push(arr2);
        } else if (node.childNodes[i].childNodes.length > 0 && node.childNodes[i].childNodes[0].nodeName == "ObjectArray") {
            arr.push(FillObjectArrayValues(node.childNodes[i].childNodes[0]));
        } else {
            arr.push(correctValueTypes(node.childNodes[i].childNodes.length > 0 ? node.childNodes[i].childNodes[0].nodeValue : node.childNodes[i].nodeValue));
        }
    }
}