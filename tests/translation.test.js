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
describe("the translation file", () => {
    const {readdirSync, statSync} = require("fs")
    const {join} = require("path")
    const dirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())
    var langs = dirs("src/locales/")
    var failures = [];

    const check_translation_against_base = function(base, trans, path) {

        Object.keys(base).forEach(key => {
            let tempPath = `${path}.${key}`;
            if (key == "icon" || key == "icons") {
                return;
            }
            if (typeof base[key] == "string") {
                if (!Object.keys(trans).includes(key) || typeof trans[key] != "string" || trans[key].startsWith("TRANSLATE:")) {
                    console.error("[!!] Missing translation " + tempPath); // Logging ends up in Jenkins build console
                    failures.push(tempPath);
                    return;
                }
            } else if (typeof base[key] == "object" && base[key] != null && !(base[key] instanceof Array) && !(base[key] instanceof Date)) {

                if (!Object.keys(trans).includes(key)) {
                    console.error("[!!] Missing translation " + tempPath);
                    failures.push(tempPath);
                    return;
                } else if (typeof base[key] != "object") {
                    console.error("[!!] Translation mismatch " + tempPath);
                    failures.push(tempPath);
                    return;
                }
                check_translation_against_base(base[key], trans[key], tempPath);
            }
        });
    }

    it("should contain translations for every key", () => {
        var base = require(`../src/locales/en/translation.json`); // Base translation is english
        for (let i = 0; i < langs.length; i++) {
            if (langs[i] === "en") {
                langs.splice(i, 1); // Removing the base from the list of translations
            }
        }
        for (let i = 0; i < langs.length; i++) {
            var translation = require(`../src/locales/${langs[i]}/translation.json`);
            check_translation_against_base(base, translation, ""); // Checking the base translation against all available translation 
            expect(failures.length).toEqual(0);
        }

        for (let i = 0; i < langs.length; i++) {
            var translation = require(`../src/locales/${langs[i]}/translation.json`);
            check_translation_against_base(translation, base, ""); // Checking all available translation against the base translation
            expect(failures.length).toEqual(0);
        }
    });
    it("should work with any dictionnary", () => {
        let dict_base = {
            "some_key": "some_value"
        }
        let dict_translation = {
            "some_key": "different_value",
            "extra_key": "extra_value"
        }
        check_translation_against_base(dict_base, dict_translation, "");
        expect(failures.length).toEqual(0); // All base keys appear in translation

        check_translation_against_base(dict_translation, dict_base, "");
        expect(failures.length).toEqual(1); // Not all translation keys appear in the base
        failures = [];
        // key doesn"t appear on the base translation
        dict_translation = {
            "extra_key": "extra_value"
        }
        check_translation_against_base(dict_base, dict_translation, "");
        expect(failures.length).toEqual(1); // expecting 1 missing translation to be logged.
        failures = [];

        check_translation_against_base(dict_translation, dict_base, "");
        expect(failures.length).toEqual(1); // expecting 1 missing translation to be logged.
        failures = [];

    });
});
