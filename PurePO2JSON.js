/*
 * PurePO2JSON v3.0.0
 * by André Zanghelini (An_dz)
 *
 * with previous contributions by Roland Reck (QuHno)
 * IBM i18n idea and formula from Roland Reck (QuHno)
 */
"use strict";

/**
 * @brief Convert special characters to their unicode number
 *
 * Used by the `replace` method to convert the characters to
 * their unicode values between underlines.
 */
function specialChars(match, linefeed, special) {
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
	return match;
}

/**
 * @brief Class representing a message
 *
 * This class is a construction for one message, it holds all
 * the data about the message, including original text, context
 * and all possible translations (if there are plurals)
 *
 * @warning: The setters append and don't replace
 */
class Message {
	/**
	 * @brief Construct a new message
	 *
	 * @param lf {string} The linefeed for each line,
	 * minimised JSON if left as an empty string
	 */
	constructor(lf, ibmi18n) {
		this.linefeed = lf;
		this.ibmi18n  = ibmi18n;
		this.tab      = (lf === "" ? "" : "\t");
		this.space    = (lf === "" ? "" : " ");
		this.str      = [];
		this.id       = "";
		this.ctxt     = "";
		this.lastUsed = null;
	}
	/**
	 * @brief Set or amend msgid
	 *
	 * @param text {string} The text to set
	 */
	set msgid(text) {
		this.id = text;
		this.lastUsed = this.id;
	}
	get msgid() {
		return this.id;
	}
	/**
	 * @brief Set the context
	 *
	 * @param context {string} The text to set
	 */
	set msgctxt(context) {
		this.ctxt = context;
		this.lastUsed = this.ctxt;
	}
	get msgctxt() {
		return this.ctxt;
	}
	/**
	 * @brief Set or amend msgid
	 *
	 * @param string {string} The text to set
	 */
	set msgstr(string) {
		const index = this.str.push(string) - 1;
		this.lastUsed = this.str[index];
	}
	get msgstr() {
		return this.str;
	}
	/**
	 * @brief Appends text to the last defined property
	 *
	 * @param string {string} The text to append
	 */
	set amend(string) {
		this.lastUsed += string;
	}
	/**
	 * @brief Increase string to safe length if enabled
	 *
	 * Applies the IBM algorithm that increases the length of the
	 * string to test screen space in multiple languages.
	 *
	 * @param string {string} the text to apply IBM algorithm
	 *
	 * @return {string} String with increase length or same string
	 */
	getIBM(string) {
		if (this.ibmi18n !== true) {
			return string;
		}

		const length = string.length;

		return `${string}${"-".repeat(
			(3 / Math.log(length) + 0.7) * length - length
		)}`;
	}
	/**
	 * @brief Return a constructed JSON as a string
	 *
	 * @return {string} JSON of the message
	 */
	toString() {
		const lf = this.linefeed;
		const tab = this.tab;
		const space = this.space;

		const msgctxt = (this.msgctxt.length > 0 ? "\x04" : "");

		const id = `${this.msgctxt}${msgctxt}${this.msgid}`.replace(
			/\\(n|r)|([^a-z0-9])/g, specialChars
		);

		const json = [];

		this.msgstr.forEach((string, index) => {
			if (string.length === 0) {
				string = this.msgid;
			}

			json.push(
				`${id}${index}:${space}{${lf}` +
					`${tab}"message":${space}"${this.getIBM(string)}"${lf}` +
				"}"
			);
		});

		return json.join(`,${lf}`);
	}
}

/**
 * @brief Gets a PO file and converts to JSON
 *
 * Gets a PO file as a `String` and returns a `String`
 * with the contents of a JSON file.
 *
 * @param[in] file    {String}  The PO file to convert
 * @param[in] minify  {Boolean} If the result must be minified (optional)
 * @param[in] ibmi18n {Boolean} If the result expands strings to match W3C
 * Internationalisation guideline. @see https://www.w3.org/International/articles/article-text-size
 *
 * @return {String} JSON file
 *
 * @info The W3C formula comes from a simplification of the following formula:  
 * X = (((3 * ln(length) + 0.7) * length) - length)  
 * Where:  
 * p = (300 * ln(length) + 70) <-- This returns the percentage of expansion  
 * p = (  3 * ln(length) + 0.7) <-- This returns the same but divided by 100  
 * e = (p * length) <-- This returns the final expanded length  
 * f = (e - length) <-- This returns the amount of chars to add
 */
function purePO2JSON(file, minify, ibmi18n) {
	// Check line feed
	const linefeed = file.match(/\r\n?|\n/)[0];
	file = file.split(linefeed);

	const lf = (minify ? "" : linefeed);

	const messages = [];
	let ignoreline = true;

	file.forEach(function choose(line) {
		// if the line has no text or begins with '#' (comment)
		if (line.length === 0 || line[0] === "#") {
			return;
		}

		const msg = line.match(
			/^msg(?:(id)(_plural)?|(str)(?:\[\d\])?|(ctxt))\s"(.*)"$/
		);
		const currentMessage = messages[messages.length - 1];

		// line is continuation of a string
		if (msg === null) {
			// only amend if there's anything to amend
			if (currentMessage !== undefined) {
				currentMessage.amend = line.substring(1, line.length - 1);
			}

			return;
		}

		const msgid        = Boolean(msg[1]);
		const msgid_plural = Boolean(msg[2]);
		const msgstr       = Boolean(msg[3]);
		const msgctxt      = Boolean(msg[4]);
		const text         = msg[5];

		// ignore the first msgid/msgstr pair
		if (ignoreline === true) {
			// stop ignoring after the first msgid
			if (msgstr === true) {
				ignoreline = false;
			}

			return;
		}

		if (msgctxt) {
			const length = messages.push(new Message(lf, ibmi18n));
			messages[length - 1].msgctxt = text;
			return;
		}

		if (msgid) {
			if (
				currentMessage === undefined     ||
				currentMessage.msgid.length > 0  ||
				currentMessage.msgctxt.length === 0
			) {
				const length = messages.push(new Message(lf, ibmi18n));
				messages[length - 1].msgid = text;
				return;
			}

			currentMessage.msgid = text;
			return;
		}

		if (msgid_plural) {
			return;
		}

		if (msgstr) {
			currentMessage.msgstr = text;
		}
	});

	console.info("All done, just copy the content of the page now. ;D");

	// Join all lines again with the original line feed
	return `{${lf}${messages.join(`,${lf}`)}${lf}}`;
}
