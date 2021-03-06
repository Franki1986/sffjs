// This culture information has been generated using the Mono class library
// licensed under the terms of the MIT X11 license.
// See: http://www.mono-project.com/FAQ:_Licensing

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../sffjs')) :
   typeof define === 'function' && define.amd ? define(['../sffjs'], factory) :
   factory(global.sffjs)
}(this, function (sffjs) { 'use strict';
    sffjs.registerCulture({
        name: "it",
        d: "dd/MM/yyyy",
        D: "dddd d MMMM yyyy",
        M: "dd MMMM",
        Y: "MMMM yyyy",
        _am: "m.",
        _pm: "p.",
        _r: ",",
        _t: ".",
        _c: "#,0.00 '€'",
        _d: ["dom", "lun", "mar", "mer", "gio", "ven", "sab"],
        _D: ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"],
        _m: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
        _M: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    });
}));
