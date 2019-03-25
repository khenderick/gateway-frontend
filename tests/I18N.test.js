/*
 * Copyright (C) 2019 OpenMotics BVBA
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
describe("the html files", () => {
    const {readFileSync} = require("fs")
    const FileSet = require('file-set');
    var failures = [];
    var regex_tag = new RegExp(' t="[^"]*?"');
    var regex_tr_no_reload = new RegExp('translate\.bind="[^"&]*?(?! & t)"');
    var regex_tr_missingquote = new RegExp('translate\.bind="([^"]*?)"');
    var regex_str_no_reload = new RegExp('\${\'[^}&]*?(?!\' & t)}');
    var regex_str_missingquote = new RegExp('\${([^}]*?)}');

    const check_translation_in_html = function(list_of_files) {
        for (let file of list_of_files) {
            let contents = readFileSync(file, 'utf8');
            if (contents.match(regex_tag) !== null) {
                console.error(`[!!] File ${file} contains t-tag`);
                failures.push(`${file}.${contents}`);
            }
            if (contents.match(regex_tr_no_reload) !== null) {
                console.error(`[!!] File ${file} contains translate-binding without signal`);
                failures.push(`${file}.${contents}`);
            }
            let matches = contents.match(regex_tr_missingquote);
            if (matches !== null) {
                for (let match of matches) {
                    if (match.count("'") % 2) {
                        console.error(`[!!] File ${file} contains translate-binding with mismatched quotes`);
                        failures.push(`${file}.${contents}`);
                    }
                }
            }
            if (contents.match(regex_str_no_reload) !== null) {
                console.error(`[!!] File ${file} contains string literal without signal`);
                failures.push(`${file}.${contents}`);
            }
            matches = contents.match(regex_str_missingquote);
            if (matches !== null) {
                for (let match of matches) {
                    if (match.count("'") % 2) {
                        console.error(`[!!] File ${file} contains string literal with mismatched quotes`);
                        failures.push(`${file}.${contents}`);
                    }
                }
            }
        }
    }
    it("should find proper translated html files", () => {
        let file_set = new FileSet('src/**/*.html');
        check_translation_in_html(file_set.files);
        expect(failures.length).toEqual(0);
    });
});

String.prototype.count = function(c) {
    let result = 0,
        i = 0;
    for (i; i < this.length; i++){
        if (this[i] === c) result++;
    }
    return result;
};
