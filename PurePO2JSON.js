/*
 * PurePO2JSON v1.4
 * by André Zanghelini (An_dz)
 *
 * with modifications by Roland Reck (QuHno) to work with a web page, added some missing "," and "="
 */

function purePO2JSON( file ) {

// Remove useless header stuff
file = file.replace(/msgid ""\n/, "");
file = "{"+file.substring(file.indexOf("msgid"));
// Remove other comments
file = file.replace(/(#.*\n|"\n")/g, "");
// Change translation strings to JSON message
file = file.replace(/msgstr (".*")\n/g, "    {\"message\":$1},");

// Change msgid so Vivaldi can understand them
// Special and uppercase chars must be decimal unicode value
var start = 0,
    end = 0,
    i = 0,
    oldStr ='',
    newStr = '',
    s,
    tempStr = file;
// While we still find "msgid "
while (start > -1) {
    start = tempStr.search(/msgid /);
    if (start > -1) {
        end = start + tempStr.substr(start).search(/\n/);
        oldStr = tempStr.substring(start, end);
        newStr = oldStr.replace(/msgid /, "");
        s = 0;
        // We change the special characters for later manipulation
        newStr = newStr.replace(/([^a-z0-9\"])/g, "%$1_");
        // Now we get rid of the newlines which are written as \n
        // Remember that the above added a % in front of \n and an _ after \
        newStr = newStr.replace(/%\\_n/g, "_10_");
        // Add 0 at end of string name and : at end of string
        newStr = newStr.replace(/(.)"/, "$10\":");
        // Replace special chars and uppercase to char code
        while (s !== -1) {
            s = newStr.search(/%/);
            if (s > -1)
                newStr = newStr.replace(/%./, "_" + newStr.charCodeAt(s + 1));
        }

        file = file.replace(oldStr, newStr);
        // Just search where we did not search before
        tempStr = tempStr.substr(end + 1);
    }
}

// Replace plurals, start copying msgid
var arr = file.split("\nmsgid_plural"),
    msgid;
file = arr[0];
for (i = 1; i < arr.length; i++) {
    // Take msgid from previous part
    msgid = arr[i - 1].substring(arr[i - 1].lastIndexOf("\n\"") + 1, arr[i - 1].lastIndexOf(":") - 2);
    // remove msgid_plural and replace msgstr[0] in current part
    arr[i] = arr[i].replace(/.*\nmsgstr\[0\] (".*")/, "\n    {\"message\":$1},");
    // Replace other variations
    arr[i] = arr[i].replace(/msgstr\[(\d+)\] (".*")/g, msgid + "$1\":\n    {\"message\":$2},");
    // Join again to main
    file = file.concat(arr[i]);
}

// Add msgctxt string
arr = file.split("msgctxt ");
file = arr[0];
for (i = 1; i < arr.length; i++) {
    // Add # at begining, this will help our selector
    arr[i] = "#" + arr[i];
    // Find first newline
    end = arr[i].search(/\n/);
    // Find spaces, special chars and uppercase in first line
    newStr = arr[i].substring(1, end - 1).replace(/([^a-z0-9\"])/g, "%$1_");
    // Replace special chars and uppercase to char code
    s = 0;
    while (s !== -1) {
        s = newStr.search(/%/);
        if (s > -1)
            newStr = newStr.replace(/%./, "_" + newStr.charCodeAt(s + 1));
    }
    arr[i] = arr[i].replace(/#.*\n"/, newStr + "_4_");
    // arr[i] = arr[i].replace(/"\n"/, "_4_")
    file = file.concat(arr[i]);
}

// Remove double newline
file = file.replace(/\n\n/g, "\n");

// Replace last comma to closing bracket
file = file.substring(0, file.lastIndexOf(",")) + "\n}";

// return converted string and alert
console.log("Done, just copy the content of the page now. ;D");
return file;
}
