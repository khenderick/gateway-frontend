#!/usr/bin/env python
# Copyright (C) 2016 OpenMotics BVBA
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

if __name__ == '__main__':
    import os
    import sys
    import json

    if len(sys.argv) != 3:
        print('Usage: ./tools/translation_checker.py <path to translations location> <default language>')
        print('Example: ./tools/json-sorter.py ./src/locale en')
        sys.exit(1)

    base_path = sys.argv[1]
    language = sys.argv[2]
    if not os.path.exists(base_path):
        print('Path "{0}" does not exist'.format(base_path))
        sys.exit(1)
    file_path_template = '{0}/{{0}}/translation.json'.format(base_path)
    all_languages = os.listdir(base_path)
    if language not in all_languages:
        print('Language "{0}" could not be found'.format(language))
        sys.exit(1)
    all_languages.remove(language)
    default_language_path = file_path_template.format(language)
    if os.path.exists(default_language_path):
        with open(default_language_path, 'r+', encoding='utf8') as json_file:
            try:
                main = json.load(json_file)
            except Exception as ex:
                print('Error processing files: {0}'.format(ex))
                sys.exit(1)
        for language in all_languages:
            print('Processing: {0}'.format(language))
            language_path = file_path_template.format(language)
            with open(language_path, 'r+', encoding='utf8') as translation_file:
                try:
                    translation = json.load(translation_file)
                except Exception as ex:
                    print('Error loading translation file: {0}'.format(ex))
                    continue

                try:
                    def _extend_dict(base, trans):
                        for key, value in base.items():
                            path.append(key)
                            if key in ['icon', 'icons']:
                                path.pop()
                                continue
                            if isinstance(value, str):
                                if key not in trans or not isinstance(trans[key], str):
                                    trans[key] = 'TRANSLATE: {0}'.format(value)
                                    print(' Added translation: {0}'.format('.'.join(path)))
                            elif isinstance(value, dict):
                                if key not in trans:
                                    trans[key] = {}
                                    print(' Added key: {0}'.format('.'.join(path)))
                                elif not isinstance(trans[key], dict):
                                    trans[key] = {}
                                    print(' Reset key: {0}'.format('.'.join(path)))
                                _extend_dict(value, trans[key])
                            path.pop()

                    def _shrink_dict(base, trans):
                        for key in list(trans.keys()):
                            path.append(key)
                            if key in ['icon', 'incons']:
                                del trans[key]
                                print(' Removed icon: {0}'.format('.'.join(path)))
                            elif key not in base:
                                del trans[key]
                                print(' Removed key: {0}'.format('.'.join(path)))
                            else:
                                value = trans[key]
                                if isinstance(value, dict):
                                    _shrink_dict(base[key], value)
                            path.pop()

                    path = []
                    _extend_dict(main, translation)
                    path = []
                    _shrink_dict(main, translation)
                except Exception as ex:
                    print('Error processing translation: {0}'.format(ex))
                    continue

                try:
                    translation_file.seek(0)
                    json.dump(translation, translation_file, indent=4, sort_keys=True, ensure_ascii=False)
                    translation_file.truncate()
                except Exception as ex:
                    print('Error saving translation file: {0}'.format(ex))
                    continue
    else:
        print('Path "{0}" does not exist'.format(default_language_path))
        sys.exit(1)
