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
    const { readdirSync, statSync, readFileSync } = require("fs")
    const { join } = require("path")
    const dirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory())
    const FileSet = require('file-set');
    var langs = dirs("src/locales/")
    var failures = [];

    var regex_tag = new RegExp(' t="[^"]*?"')
    var regex_tr_no_reload = new RegExp('translate\.bind="[^"&]*?(?! & t)"')
    var regex_tr_missingquote = new RegExp('translate\.bind="([^"]*?)"')
    var regex_str_no_reload = new RegExp('\${\'[^}&]*?(?!\' & t)}')
    var regex_str_missingquote = new RegExp('\${([^}]*?)}')

    const check_translation_against_base = function(base, trans, path) {
        
        Object.keys(base).forEach(key => {
            let tempPath = `${path}.${key}`;
            if (key == "icon" || key == "icons"){
                return;
            }
            if (typeof base[key] == "string"){
                if (!Object.keys(trans).includes(key) || typeof trans[key] != "string" || trans[key].startsWith("TRANSLATE:")){
                    console.error("[!!] Missing translation "+tempPath); // Logging ends up in Jenkins build console
                    failures.push(tempPath)
                    return;
                }
            } else if(typeof base[key] == "object" && base[key] != null && !(base[key] instanceof Array) && !(base[key] instanceof Date)){

                if (!Object.keys(trans).includes(key)){
                    console.error("[!!] Missing translation "+tempPath);
                    failures.push(tempPath)
                    return;
                }
                else if(typeof base[key] != "object"){
                    console.error("[!!] Translation mismatch "+tempPath);
                    failures.push(tempPath)
                    return;
                }
               check_translation_against_base(base[key], trans[key], tempPath);
            }
    });
    }

    const check_translation_in_html = function(list_of_files) {      
        
        for(let i=0; i< list_of_files.length; i++){
            
           var contents = readFileSync(list_of_files[i], 'utf8');
           if (contents.match(regex_tag) !== null){
               console.error("[!!] File"+ list_of_files[i] +"contains t-tag");
               failures.push(list_of_files[i]+"."+contents);
           }
           if (contents.match(regex_tr_no_reload) !== null){
            console.error("[!!] File"+ list_of_files[i] +"contains translate-binding without signal");
            failures.push(list_of_files[i]+"."+contents);
           }
           let matches = contents.match(regex_tr_missingquote)
           if (matches !== null){
            for(let j=0; j<matches.length; j++){
                if (matches[j].count("'") % 2){  // if matches[j].count("'") % 2 > 0
                    console.error("[!!] File"+ list_of_files[i] +"contains translate-binding with mismatched quotes");  
                    failures.push(list_of_files[i]+"."+contents);
                }
            }
           }
           if(contents.match(regex_str_no_reload) !== null){
                console.error("[!!] File"+ list_of_files[i] +"contains string literal without signal");  
                failures.push(list_of_files[i]+"."+contents); 
           }
           matches = contents.match(regex_str_missingquote);

           if (matches !== null){
            for(let j=0; j<matches.length; j++){
                if (matches[j].count("'") % 2){  // if matches[j].count("'") % 2 > 0
                    console.error("[!!] File"+ list_of_files[i] +"contains string literal with mismatched quotes");  
                    failures.push(list_of_files[i]+"."+contents);
                }
            }
           }
        }
    }
    
    it("should contain translations for every key", () => {
        var base = require( `../src/locales/en/translation.json` ); // Base translation is english
        for( let i = 0; i < langs.length; i++){ 
            if ( langs[i] === "en") {
              langs.splice(i, 1);  // Removing the base from the list of translations
            }
        }
        for(let i=0; i<langs.length; i++){
            var translation = require( `../src/locales/${langs[i]}/translation.json` );
            check_translation_against_base(base, translation, ""); // Checking the base translation against all available translation 
            expect(failures.length).toEqual(0);
        }

        for(let i=0; i<langs.length; i++){
            var translation = require( `../src/locales/${langs[i]}/translation.json` );
            check_translation_against_base(translation, base, ""); // Checking all available translation against the base translation
            expect(failures.length).toEqual(0);
        }
      });
    it("should work with any dictionnary", () =>{
        let dict_base = {"some_key": "some_value"}
        let dict_translation = {"some_key": "different_value", "extra_key": "extra_value"}
        check_translation_against_base(dict_base, dict_translation, "");
        expect(failures.length).toEqual(0); // All base keys appear in translation

        check_translation_against_base(dict_translation, dict_base, "");
        expect(failures.length).toEqual(1); // Not all translation keys appear in the base
        failures = [];
        
        dict_translation = {"extra_key": "extra_value"}  // key doesn"t appear on the base translation
        check_translation_against_base(dict_base, dict_translation, "");
        expect(failures.length).toEqual(1);  // expecting 1 missing translation to be logged.
        failures = [];

        check_translation_against_base(dict_translation, dict_base, "");
        expect(failures.length).toEqual(1);  // expecting 1 missing translation to be logged.
        failures = [];

    });


    it("should find proper translated html files", () =>{
        let file_set = new FileSet('src/**/*.html');
        check_translation_in_html(file_set.files);
        expect(failures.length).toEqual(0);
    });
});

String.prototype.count=function(c) { 
    var result = 0, i = 0;
    for(i;i<this.length;i++)if(this[i]==c)result++;
    return result;
  };
