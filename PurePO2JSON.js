/*
 * PurePO2JSON v2.0.1
 * by André Zanghelini (An_dz)
 *
 * with previous contributions by Roland Reck (QuHno)
 */

function specialChars(match, linefeed, special) {
    "use strict";
    // get rid of new lines
    if (linefeed === "n") {
        return "_10_";
    }
    if (linefeed === "r") {
        return "_13_";
    }
    // convert special chars to their code
    if (special !== undefined) {
        return "_" + match.charCodeAt(0) + "_";
    }
}

function purePO2JSON(file, minify) {
    "use strict";
    // Check line feed
    var lf = file.match(/(\r\n)|(\n)|(\r)/);
    lf = lf[1] || lf[2] || lf[3];
    file = file.split(lf);

    var space = " ";
    var tab = "\t";
    if (minify === true) {
        lf = "";
        space = "";
        tab = "";
    }

    var msgid = false;
    var msgstr = false;
    var msgctxt = "";
    var newFile = ["{"];
    var msg;
    var ignoreline = null;

    file.forEach(function choose(line) {
        // if the line has any text and does not begin with '#' (comment)
        if (line.length > 0 && line.charCodeAt(0) !== 35) {
            /* RegExp IDs and their meanings:
             0: msg*
             1: anything after msg
             2: msgid
             3: msgid_plural
             4: msgstr
             5: msgstr[]
             6: number in msgstr[#]
             7: msgctxt
             8: the text
             */
            msg = line.match(/msg((id)(_plural)?|(str)(\[(\d)\])?|(ctxt))\s"(.*)"$/);

            // First msgid found, start ignoring all lines
            if (ignoreline === null && msg[2] !== undefined) {
                ignoreline = true;
                return;
            }
            // Ignore all lines while msg* is not match
            if (ignoreline === true && (msg === null || msg[4])) {
                return;
            }
            ignoreline = false;

            // Just append strings to either msgid or msgstr
            if (msg === null) {
                msg = line.substring(1, line.length - 1);
                if (msgid !== false) {
                    msgid += msg;
                } else {
                    msgstr += msg;
                }
                return;
            }

            // msgid_plural
            if (msg[3]) {
                return;
            }

            // msgstr[*]
            else if (msg[6]) {
                if (msg[8].length < 1) {
                    msgstr = false;
                    return;
                }

                if (msg[6] === "0") {
                    // commit msgid
                    if (msgctxt.length > 0) {
                        // context and id are separated by _4_
                        msgctxt = msgctxt.replace(/\\(n|r)|([^a-z0-9])/g, specialChars) + "_4_";
                    }
                    // We change the special characters
                    msgid = msgid.replace(/\\(n|r)|([^a-z0-9])/g, specialChars);
                    msgctxt = msgctxt + msgid;
                }

                line = "\"" + msgctxt + msg[6] + "\":" + space + "{";

                if (msg[6] !== "0") {
                    line = tab + "\"message\":" + space + "\"" + msgstr.replace(/\\n/g, "\n") + "\"" + lf + "}," + lf + line;
                }

                msgstr = msg[8];
            }

            // msgstr
            else if (msg[4]) {
                if (msg[8].length < 1) {
                    msgstr = false;
                    return;
                }

                // commit msgid
                if (msgctxt.length > 0) {
                    // context and id are separated by _4_
                    msgctxt = msgctxt.replace(/\\(n|r)|([^a-z0-9])/g, specialChars) + "_4_";
                }
                // We change the special characters
                msgid = msgid.replace(/\\(n|r)|([^a-z0-9])/g, specialChars);
                msgctxt = msgctxt + msgid;

                line = "\"" + msgctxt + "0\":" + space + "{";
                msgstr = msg[8];
                msgid = false;
                msgctxt = "";
            }

            // msgid
            else if (msg[2]) {
                msgid = msg[8];
                if (msgstr) {
                    // commit msgstr
                    // Convert literal \n to real line breaks in msgstr
                    line = tab + "\"message\":" + space + "\"" + msgstr.replace(/\\n/g, "\n") + "\"" + lf + "},";
                    msgstr = false;
                    msgctxt = "";
                } else {
                    return;
                }
            }

            // msgctxt
            else if (msg[7]) {
                msgctxt = msg[8];
                // In case it's the first one
                if (msgstr) {
                    // commit msgstr
                    // Convert literal \n to real line breaks in msgstr
                    line = tab + "\"message\":" + space + "\"" + msgstr.replace(/\\n/g, "\n") + "\"" + lf + "},";
                    msgstr = false;
                } else {
                    return;
                }
            }

            // add line to file
            newFile.push(line);
        }
    });

    // The last one is not commited
    if (msgstr) {
        newFile.push(tab + "\"message\":" + space + "\"" + msgstr.replace(/\\n/g, "\n") + "\"" + lf + "}");
    } else {
        var l = newFile.length - 1;
        newFile[l] = newFile[l].substr(0, newFile[l].length - 1);
    }
    newFile.push("}");

    console.log("All done, just copy the content of the page now. ;D");

    // Join all lines again with the original line feed
    return newFile.join(lf);
}
