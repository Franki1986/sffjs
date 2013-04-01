﻿/**
 * String.format for JavaScript
 * Copyright (c) Daniel Mester Pirttijärvi 2013
 * 
 * This software is provided 'as-is', without any express or implied
 * warranty.  In no event will the authors be held liable for any damages
 * arising from the use of this software.
 * 
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 * 
 * 1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 * 
 * 2. Altered source versions must be plainly marked as such, and must not be
 *    misrepresented as being the original software.
 * 
 * 3. This notice may not be removed or altered from any source distribution.
 * 
 * -- END OF LICENSE --
 * 
 */

var msf = {};

(function() {

    // ***** Shortcuts *****
    var _Number = Number,
        _String = String;
   
    // This regular expression describes the syntax of a format item, and escaped braces.
    var FORMAT_TOKEN = /(\{+)((\d+|[a-zA-Z_$]\w+(?:\.[a-zA-Z_$]\w+|\[\d+\])*)(?:\,(-?\d*))?(?:\:([^\}]*))?)(\}+)|(\{+)|(\}+)/g;
    
    // ***** Private Methods *****
    
    // Minimization optimization 
    function toUpperCase(s) {
        return s.toUpperCase();
    }
    
    function getCulture(lcid) {
        /// <summary>This method generates a culture object from a specified IETF language code.</summary>
        
        lcid = toUpperCase(lcid);
        
        // Common format strings
        var t = {
            name: "en-GB",
            d: "dd/MM/yyyy",
            D: "dd MMMM yyyy",
            t: "HH:mm",
            T: "HH:mm:ss",
            M: "d MMMM",
            Y: "MMMM yyyy",
            s: "yyyy-MM-ddTHH:mm:ss",
            _m: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            _d: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            _r: ".", // Radix point
            _t: ",", // Thounsands separator
            _c: "£#,0.00", // Currency format string
            _ct: ",", // Currency thounsands separator
            _cr: ".",  // Currency radix point
            _am: "AM",
            _pm: "PM"
        };
        
        var language = lcid.substr(0, 2);
        var europeanNumbers;
        
        // Culture specific strings
        if (language == "SV") {
            t.name = "sv";
            t.d = "yyyy-MM-dd";
            t.D = "'den 'd MMMM yyyy";
            t._m = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];
            t._d = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
            t._r = t._cr = ",";
            t._t = " ";
            t._ct = ".";
            t._c = "#,0.00 kr";
        } else if (language == "DE") {
            t.name = "de";
            t.M = "d. MMMM";
            t.d = "yyyy-MM-dd";
            t.D = "dddd, d. MMMM yyyy";
            t._m = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
            t._d = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
            europeanNumbers = 1;
        } else if (language == "ES") {
            t.name = "es";
            t.M = "d' de 'MMMM";
            t.d = "dd/MM/yyyy";
            t.Y = "MMMM' de 'yyyy";
            t.D = "dddd, d' de 'MMMM' de 'yyyy";
            t._m = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
            t._d = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
            europeanNumbers = 1;
        } else if (language == "FR") {
            t.name = "fr";
            t._r = t._cr = ",";
            t._t = t._ct = " ";
            t._c = "#,0.00 €";
            t.M = "";
            t.d = "dd/MM/yyyy";
            t.D = "dddd d MMMM yyyy";
            t._m = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
            t._d = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
            europeanNumbers = 1;
        } else if (lcid != "EN-GB") {
            t.name = "en-US";
            t.t = "h:mm tt";
            t.T = "h:mm:ss tt";
            t.d = "M/d/yyyy";
            t.D = "dddd, MMMM d, yyyy";
            t.M = "MMMM d";
            t._c = "$#,0.00";
        }
        
        if (europeanNumbers) {
            t._r = t._cr = ",";
            t._t = t._ct = ".";
            t._c = "#,0.00 €";
        }
        
        // Composite formats
        t.f = t.D + " " + t.t;
        t.F = t.D + " " + t.T;
        t.g = t.d + " " + t.t;
        t.G = t.d + " " + t.T;
        t.m = t.M;
        t.y = t.Y;
        
        return t;
    }
    
    function numberPair(n) {
        /// <summary>Converts a number to a string that is at least 2 digit in length. A leading zero is inserted as padding if necessary.</summary>
        return (n < 10 ? "0" : "") + n;
    }

    function hasValue(value) {
        /// <summary>Returns true if <paramref name="value"/> is not null or undefined.</summary>
        return !(value === null || typeof value === "undefined");
    }
    
    function numberCoalesce(value1, value2) {
        /// <summary>Returns the first of the two values that is not NaN.</summary>
        return isNaN(value1) ? value2 : value1;
    }
    
    function resolvePath(path, value) {
        /// <summary>
        ///     This function resolves a path on the format <membername>(.<membername>|[<index>])*
        ///     and evaluates the value.
        /// </summary>
        /// <param name="path">A series of path components separated by points. Each component is either an index in square brackets.</param>
        /// <param name="value">An object on which the path is evaluated.</param>
        
        // Validate path
        if (!/^([a-zA-Z_$]\w+|\d+)(\.[a-zA-Z_$]\w+|\[\d+\])*$/.test(path)) {
            throw "Invalid path";
        }

        // Parse and evaluate path
        if (hasValue(value)) {
            var followingMembers = /(\.([a-zA-Z_$]\w+)|\[(\d+)\])/g,
                match = /^[a-zA-Z_$]\w+/.exec(path);
                
            value = value[match[0]];
            
            // Evaluate path until we reach the searched member or the value is undefined/null
            while (hasValue(value) && (match = followingMembers.exec(path))) {
                value = value[match[2] || _Number(match[3])];
            }
        }
        
        return value;
    };
    
    // Maths
    
    function absRound(number, decimals) {
        /// <summary>Rounds a number to the specified number of digits.</summary>
        /// <param name="number" type="Number">The value to be processed.</param>
        /// <param name="decimals" type="Number" integer="true" optional="true">The maximum number of decimals. If not specified, the value is not rounded.</param>
        /// <returns>The rounded absolute value as a string.</returns>
        var roundingFactor = Math.pow(10, decimals || 0);
        return "" + (Math.round(Math.abs(number) * roundingFactor) / roundingFactor);
    }
    
    function numberOfIntegralDigits(numberString) {
        /// <summary>Counts the number of integral digits in a number converted to a string by the JavaScript runtime.</summary>
        var point = numberString.indexOf(".");
        return point < 0 ? numberString.length : point;
    }
    
    function numberOfDecimalDigits(numberString) {
        /// <summary>Counts the number of decimal digits in a number converted to a string by the JavaScript runtime</summary>
        var point = numberString.indexOf(".");
        return point < 0 ? 0 : numberString.length - point - 1;
    }
    
    // Formatting helpers
    
    function groupedAppend(out, value) {
        /// <summary>Writes a value to an array in groups of three digits.</summary>
        /// <param name="out" type="Array">
        ///     An array used as string builder to which the grouped output will be appended. The array 
        ///     may have to properties that affect the output:
        ///
        ///         g: the number of integral digits left to write.
        ///         t: the thousand separator.
        ///
        //      If any of those properties are missing, the output is not grouped.
        /// </param>
        /// <param name="value" type="String">The value that will be written to <paramref name="out"/>.</param>
        
        for (var i = 0; i < value.length; i++) {
            // Write number
            out.push(value.charAt(i));

            // Begin a new group?
            if (out.g > 1 && out.g-- % 3 == 1) {
                out.push(out.t);
            }
        }
    }
    
    function unescapeBraces(braces, consumedBraces) {
        /// <summary>Replaces escaped brackets ({ and }) with their unescaped representation.</summary>
        /// <param name="braces">A string containing braces of a single type only.</param>
        /// <param name="consumedBraces">The number of braces that should be ignored when unescaping.</param>
        /// <returns>A string of the unescaped braces.</returns>
        return braces.substr(0, (braces.length + 1 - (consumedBraces || 0)) / 2);
    }
    
    function processFormatItem(pathOrIndex, align, formatString, args) {        
        /// <summary>Process a single format item in a composite format string</summary>
        /// <param name="pathOrIndex" type="String">The raw argument index or path component of the format item.</param>
        /// <param name="align" type="String">The raw alignment component of the format item.</param>
        /// <param name="formatString" type="String">The raw format string of the format item.</param>
        /// <param name="args" type="Array">The arguments that were passed to String.format, where index 0 is the full composite format string.</param>
        /// <returns>The formatted value as a string.</returns>
        
        var value;
        
        if (/^\d+$/.test(pathOrIndex)) {
            // Numeric mode
            
            // Read index and ensure it is within the bounds of the specified argument list
            var index = _Number(pathOrIndex);
            if (index > args.length - 2) {
                // Throw exception if argument is not specified (however undefined and null values are fine!)
                throw "Missing argument";
            }
            
            value = args[index + 1];
        } else {
            // Object path mode
            value = resolvePath(pathOrIndex, args[1]);
        }
        
        // If the object has a custom format method, use it,
        // otherwise use toString to create a string
        value = !hasValue(value) ? "" : value.__Format ? value.__Format(formatString) : "" + value;
        
        // Add padding (if necessary)
        align = _Number(align) || 0;
        
        var paddingLength = Math.abs(align) - value.length,
            padding = "";
            
        while (paddingLength-- > 0) {
            padding += " ";
        }
        
        // innerArgs[1] is the leading {'s
        return (align > 0 ? value + padding : padding + value);
    }
    
    function basicNumberFormatter(number, minIntegralDigits, minDecimals, maxDecimals, radixPoint, thousandSeparator) {
        /// <summary>Handles basic formatting used for standard numeric format strings.</summary>
        /// <param name="number" type="Number">The number to format.</param>
        /// <param name="minIntegralDigits" type="Number" integer="true">The minimum number of integral digits. The number is padded with leading zeroes if necessary.</param>
        /// <param name="minDecimals" type="Number" integer="true">The minimum number of decimal digits. The decimal part is padded with trailing zeroes if necessary.</param>
        /// <param name="maxDecimals" type="Number" integer="true">The maximum number of decimal digits. The number is rounded if necessary.</param>
        /// <param name="radixPoint" type="String">The string that will be appended to the output as a radix point.</param>
        /// <param name="thousandSeparator" type="String">The string that will be used as a thousand separator of the integral digits.</param>
        /// <returns>The formatted value as a string.</returns>
        
        var out = [];
        out.t = thousandSeparator;
        
        if (number < 0) {
            out.push("-");
        }
        
        number = absRound(number, maxDecimals);
        
        var integralDigits = numberOfIntegralDigits(number),
            decimals = numberOfDecimalDigits(number);
        
        minIntegralDigits -= (out.g = integralDigits);
        
        // Pad with zeroes
        while (minIntegralDigits-- > 0) {
            groupedAppend(out, "0");
        }
        
        // Add integer part
        groupedAppend(out, number.substr(0, integralDigits));
        
        // Add decimal point
        if (minDecimals || decimals) {
            out.push(radixPoint);
            
            minDecimals -= decimals;
            groupedAppend(out, number.substr(integralDigits + 1));

            // Pad with zeroes
            while (minDecimals-- > 0) {
                groupedAppend(out, "0");
            }
        }
        
        return out.join("");
    }
    
    function customNumberFormatter(number, format, radixPoint, thousandSeparator) {
        /// <summary>Handles formatting of custom numeric format strings.</summary>
        /// <param name="number" type="Number">The number to format.</param>
        /// <param name="format" type="String">A string specifying the format of the output.</param>
        /// <param name="radixPoint" type="String">The string that will be appended to the output as a radix point.</param>
        /// <param name="thousandSeparator" type="String">The string that will be used as a thousand separator of the integral digits.</param>
        /// <returns>The formatted value as a string.</returns>
        
        var digits = 0,
            forcedDigits = -1,
            integralDigits = -1,
            decimals = 0,
            forcedDecimals = -1,
            atDecimals = 0, // Bool
            inString = 0, // Bool
            unused = 1, // Bool, True until a digit has been written to the output
            c, i, f,
            out = [];

        // Analyse format string
        // Count number of digits, decimals, forced digits and forced decimals.
        for (i = 0; i < format.length; i++) {
            c = format.charAt(i);
            
            // Check if we are within a literal
            if (c == "'") {
                inString = !inString;
            } else if (!inString) {
            
                // Only 0 and # are digit placeholders, skip other characters in analyzing phase
                if (c == "0" || c == "#") {
                    decimals += atDecimals;

                    if (c == "0") {
                        // 0 is a forced digit
                        if (atDecimals) {
                            forcedDecimals = decimals;
                        } else if (forcedDigits < 0) {
                            forcedDigits = digits;
                        }
                    }

                    digits += !atDecimals;
                }

                // If the current character is ".", then we have reached the end of the integral part
                atDecimals = atDecimals || c == ".";
            }
        }
        forcedDigits = forcedDigits < 0 ? 1 : digits - forcedDigits;

        // Negative value? Begin string with a dash
        if (number < 0) {
            out.push("-");
        }

        // Round the number value to a specified number of decimals
        number = absRound(number, decimals);

        // Get integral length
        integralDigits = numberOfIntegralDigits(number);

        // Set initial number cursor position
        i = integralDigits - digits;

        // Initialize thousand grouping
        out.g = Math.max(integralDigits, forcedDigits);
        out.t = thousandSeparator;
        
        inString = 0;
        
        for (f = 0; f < format.length; f++) {
            c = format.charAt(f);
        
            // Check if we are within a literal
            if (c == "'") {
                inString = !inString;
            } else if (inString)  {
                out.push(c);
            
            // Digit placeholder
            } else if (c == "#" || c == "0") {
                if (i < integralDigits) {
                    // In the integral part
                    if (i >= 0) {
                        if (unused) {
                            groupedAppend(out, number.substr(0, i));
                        }
                        groupedAppend(out, number.charAt(i));

                        // Not yet inside the number number, force a zero?
                    } else if (i >= integralDigits - forcedDigits) {
                        groupedAppend(out, "0");
                    }

                    unused = 0;

                } else if (forcedDecimals-- > 0 || i < number.length) {
                    // In the fractional part
                    groupedAppend(out, i >= number.length ? "0" : number.charAt(i));
                }

                i++;

            // Radix point character according to current culture.
            } else if (c == ".") {
                if (number.length > ++i || forcedDecimals > 0) {
                    out.push(radixPoint);
                }

            // Other characters are written as they are, except from commas
            } else if (c !== ",") {
                out.push(c);
            }
        }
        
        return out.join("");
    }
    
    // ***** PUBLIC INTERFACE
    // ***** Number Formatting *****
    _Number.prototype.__Format = function(format) {
        /// <summary>
        ///     Formats this number according the specified format string.
        /// </summary>
        /// <param name="format">The formatting string used to format this number.</param>

        var number = _Number(this),
            radixPoint = msf.LC._r,
            thousandSeparator = msf.LC._t;
        
        // If not finite, i.e. ±Intifity and NaN, return the default JavaScript string notation
        if (!isFinite(number)) {
            return "" + number;
        }
        
        // Default formatting if no format string is specified
        if (!format && format !== "0") {
            return basicNumberFormatter(number, 0, 0, 10, radixPoint);
        }
        
        // EVALUATE STANDARD NUMERIC FORMAT STRING
        // See reference at
        // http://msdn.microsoft.com/en-us/library/dwhawy9k.aspx
        
        var standardFormatStringMatch = format.match(/^([a-zA-Z])(\d*)$/);
        if (standardFormatStringMatch)
        {
            var standardFormatStringMatch_UpperCase = toUpperCase(standardFormatStringMatch[1]),
                precision = parseInt(standardFormatStringMatch[2], 10); // parseInt used to ensure empty string is aprsed to NaN
            
            // Limit precision to max 15
            precision = precision > 15 ? 15 : precision;
            
            // Standard numeric format string
            switch (standardFormatStringMatch_UpperCase) {
                case "D":
                    // DECIMAL
                    // Precision: number of digits
                    
                    // Note: the .NET implementation throws an exception if used with non-integral 
                    // data types. However, this implementation follows the JavaScript manner being
                    // nice about arguments and thus rounds any floating point numbers to integers.
                    
                    return basicNumberFormatter(number, numberCoalesce(precision, 1), 0, 0);
                
                case "F":
                    // FIXED-POINT
                    // Precision: number of decimals
                    
                    thousandSeparator = "";
                    // Fall through to N, which has the same format as F, except no thousand grouping
                    
                case "N":
                    // NUMBER
                    // Precision: number of decimals
                    
                    return basicNumberFormatter(number, 1, numberCoalesce(precision, 2), numberCoalesce(precision, 2), radixPoint, thousandSeparator);
                
                case "G":
                    // GENERAL
                    // Precision: number of significant digits
                    
                    // Fall through to E, whose implementation is shared with G
                    
                case "E":
                    // EXPONENTIAL (SCIENTIFIC)
                    // Precision: number of decimals
                    
                    // Note that we might have fell through from G above!
                    
                    // Determine coefficient and exponent for normalized notation
                    var exponent = 0, coefficient = Math.abs(number);
                    
                    while (coefficient >= 10) {
                        coefficient /= 10;
                        exponent++;
                    }
                    
                    while (coefficient < 1) {
                        coefficient *= 10;
                        exponent--;
                    }
                    
                    var exponentPrefix = standardFormatStringMatch[1],
                        exponentPrecision = 3,
                        minDecimals, maxDecimals;
                    
                    if (standardFormatStringMatch_UpperCase == "G") {
                        if (exponent > -5 && (!precision || exponent < precision)) {
                            minDecimals = precision ? precision - (exponent > 0 ? exponent + 1 : 1) : 0;
                            maxDecimals = precision ? precision - (exponent > 0 ? exponent + 1 : 1) : 10;
                        
                            return basicNumberFormatter(number, 1, minDecimals, maxDecimals, radixPoint);
                        }
                    
                        exponentPrefix = exponentPrefix == "G" ? "E" : "e";
                        exponentPrecision = 2;
                        
                        // The precision of G is number of significant digits, not the number of decimals.
                        minDecimals = (precision || 1) - 1;
                        maxDecimals = (precision || 11) - 1;
                    } else {
                        minDecimals = maxDecimals = numberCoalesce(precision, 6);
                    }
                    
                    // If the exponent is negative, then the minus is added when formatting the exponent as a number.
                    // In the case of a positive exponent, we need to add the plus sign explicitly.
                    if (exponent >= 0) {
                        exponentPrefix += "+";
                    }
                    
                    // Consider if the coefficient is positive or negative.
                    // (the sign was lost when determining the coefficient)
                    if (number < 0) {
                        coefficient *= -1;
                    }
                    
                    return basicNumberFormatter("" + coefficient, 1, minDecimals, maxDecimals, radixPoint, thousandSeparator) + exponentPrefix + basicNumberFormatter(exponent, exponentPrecision, 0);
                
                case "P":
                    // PERCENT
                    // Precision: number of decimals
                    
                    return basicNumberFormatter(number * 100, 1, numberCoalesce(precision, 2), numberCoalesce(precision, 2), radixPoint, thousandSeparator) + " %";
                
                case "X":
                    // HEXADECIMAL
                    // Precision: number of digits
                    
                    // Note: the .NET implementation throws an exception if used with non-integral 
                    // data types. However, this implementation follows the JavaScript manner being
                    // nice about arguments and thus rounds any floating point numbers to integers.
                    
                    var result = Math.round(number).toString(16);
                    
                    if (standardFormatStringMatch[1] == "X") {
                        result = toUpperCase(result);
                    }
                    
                    // Add padding, remember precision might be NaN
                    precision -= result.length;
                    while (precision-- > 0) {
                        result = "0" + result;
                    }
                    
                    return result;
                
                case "C":
                    // CURRENCY
                    // Precision: ignored (number of decimals in the .NET implementation)
                    
                    // The currency format uses a custom format string specified by the culture.
                    // Precision is not supported and probably won't be supported in the future.
                    // Developers probably use explicit formatting of currencies anyway...
                    format = msf.LC._c;
                    radixPoint = msf.LC._cr;
                    thousandSeparator = msf.LC._ct;
                    break;
                
                case "R":
                    // ROUND-TRIP
                    // Precision: ignored
                    
                    // The result should be reparsable => just use Javascript default string representation.
                    
                    return "" + number;
            }
        }
        
        // EVALUATE CUSTOM NUMERIC FORMAT STRING
                
        // Thousands
        if (format.indexOf(",.") !== -1) {
            number /= 1000;
        }

        // Percent
        if (format.indexOf("%") !== -1) {
            number *= 100;
        }

        // Split groups ( positive; negative; zero, where the two last ones are optional)
        var groups = format.split(";");
        if (number < 0 && groups.length > 1) {
            number *= -1;
            format = groups[1];
        } else {
            format = groups[!number && groups.length > 2 ? 2 : 0];
        }
        
        return customNumberFormatter(number, format, radixPoint, format.match(/^[^\.]*[0#],[0#]/) && thousandSeparator);
    };

    // ***** Date Formatting *****
    Date.prototype.__Format = function(format) {
        var date = this, culture = msf.LC;
            
        if (format.length == 1) {
            format = culture[format] || format;
        }
		
		return format.replace(/('[^']*'|d{1,4}|M{1,4}|yyyy|yy|HH?|hh?|mm?|ss?|tt?)/g, 
			function () { 
                var argument = arguments[0], getFullYear = "getFullYear", getMonth = "getMonth", getSeconds = "getSeconds", getMinutes = "getMinutes", getHours = "getHours";

                return argument == "dddd" ? culture._d[date.getDay()] :
                        argument == "ddd" ? culture._d[date.getDay()].substr(0, 3) :
                        argument == "dd" ? numberPair(date.getDate()) :
                        argument == "d" ? date.getDate() :
                        argument == "MMMM" ? culture._m[date[getMonth]()] :
                        argument == "MMM" ? culture._m[date[getMonth]()].substr(0, 3) :
                        argument == "MM" ? numberPair(date[getMonth]() + 1) :
                        argument == "M" ? date[getMonth]() + 1 :
                        argument == "yyyy" ? date[getFullYear]() :
                        argument == "yy" ? ("" + date[getFullYear]()).substr(2) :
                        argument == "HH" ? numberPair(date[getHours]()) :
                        argument == "H" ? date[getHours]() :
                        argument == "hh" ? numberPair((date[getHours]() - 1) % 12 + 1) :
                        argument == "h" ? (date[getHours]() - 1) % 12 + 1 :
                        argument == "mm" ? numberPair(date[getMinutes]()) :
                        argument == "m" ? date[getMinutes]() :
                        argument == "ss" ? numberPair(date[getSeconds]()) :
                        argument == "s" ? date[getSeconds]() :
                        argument == "tt" ? (date[getHours]() < 12 ? culture._am : culture._pm) : 
                        argument == "t" ? (date[getHours]() < 12 ? culture._am : culture._pm).charAt(0) :
                        argument.substr(1, argument.length - 2);
			});
    };
    
    _String.__Format = function(str, obj0, obj1, obj2) {
        /// <summary>
        ///     Formats a string according to a specified formatting string.
        /// </summary>
        /// <param name="str">The formatting string used to format the additional arguments.</param>
        /// <param name="obj0">Object 1</param>
        /// <param name="obj1">Object 2 [optional]</param>
        /// <param name="obj2">Object 3 [optional]</param>

        var outerArgs = arguments;
        
        return str.replace(FORMAT_TOKEN, function () {
            var innerArgs = arguments, value;
            
            // Handle escaped {
            return innerArgs[7] ? unescapeBraces(innerArgs[7]) :
            
            // Handle escaped }
                innerArgs[8] ? unescapeBraces(innerArgs[8]) :
            
            // Handle case when both { and } are present, but one or both of them are escaped
                innerArgs[1].length % 2 == 0 || innerArgs[6].length % 2 == 0 ?
                    unescapeBraces(innerArgs[1]) +
                    innerArgs[2] +
                    unescapeBraces(innerArgs[6]) :
            
            // Valid format item
                unescapeBraces(innerArgs[1], 1) +
                processFormatItem(innerArgs[3], innerArgs[4], innerArgs[5], outerArgs) +
                unescapeBraces(innerArgs[6], 1);
        });
    };

    
    // ***** Initialize msf object *****

    /// <summary>
    ///     The current culture used for culture specific formatting.
    /// </summary>
    msf.LC = null;

    msf.setCulture = function(languageCode) {
        /// <summary>
        ///     Sets the current culture, used for culture specific formatting.
        /// </summary>
        /// <param name="LCID">The IETF language code of the culture, e.g. en-US or en.</param>
        msf.LC = getCulture(languageCode) || getCulture(languageCode.substr(0, 2)) || getCulture();
    };
    
    // Initiate culture
    /*global navigator */// <- for JSLint, just ignore
    msf.setCulture(navigator.systemLanguage || navigator.language || "en-US");
    
    // Set Format methods
    var pr = Date.prototype;
    pr.format = pr.format || pr.__Format;
    pr = _Number.prototype;
    pr.format = pr.format || pr.__Format;
    _String.format = _String.format || _String.__Format;

//#IF DEBUG
    msf.resolve = resolvePath;
    
    msf.doBenchmark = function (format, arg) {
        /// <summary>
        ///     Tests the performance of the String.format script.
        /// </summary>
        /// <param name="str">The format string to test</param>
        /// <param name="arg">The value {0} to be used as an argument to
        /// the String.format method.</param>
        /// <returns>Returns the time in milliseconds to complete 
        /// one format operation for the specified format string.</returns>
        
        // Number of variables in the test format string
        var num = 5000;
        
        // Construct a long format string
        var longformat = "";
        for (var i = 0; i < num; i++) {
            longformat += format;
        }
        
        // Perform test
        var start, end;
        start = new Date().valueOf();
        String.__Format(longformat, arg);
        end = new Date().valueOf();
        
        return (end - start) / num;
    };

//#END IF
 
})();

