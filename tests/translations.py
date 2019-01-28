#!/usr/bin/env python
# Copyright (C) 2019 OpenMotics BVBA
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

    if len(sys.argv) != 1:
        print('[!!] Invalid usage of translation test')
        sys.exit(1)

    try:
        path = 'src/locales/en/translation.json'
        print('Validating sorting')
        with open(path, 'r', encoding='utf8') as json_file:
            original_contents = json_file.read()
            base_translation = json.loads(original_contents)
            new_contents = json.dumps(base_translation, indent=4, sort_keys=True, ensure_ascii=False)
            if new_contents.strip() != original_contents.strip():
                print('[!!] Default language (en) not sorted')
                sys.exit(1)

        print('Validating translations')
        path = 'src/locales/{0}/translation.json'
        base_path = 'src/locales'
        all_languages = os.listdir(base_path)
        all_languages.remove('en')
        for language in all_languages:
            print('  Processing {0}'.format(language))
            with open(path.format(language), 'r', encoding='utf8') as json_file:
                translation = json.load(json_file)

                def _extend_dict(base, trans):
                    for key, value in base.items():
                        if key in ['icon', 'icons']:
                            continue
                        if isinstance(value, str):
                            if key not in trans or not isinstance(trans[key], str) or trans[key].startswith('TRANSLATE:'):
                                print('[!!] Missing translation')
                                sys.exit(1)
                        elif isinstance(value, dict):
                            if key not in trans:
                                print('[!!] Missing translation')
                                sys.exit(1)
                            elif not isinstance(trans[key], dict):
                                print('[!!] Translation mismatch')
                                sys.exit(1)
                            _extend_dict(value, trans[key])

                def _shrink_dict(base, trans):
                    for key in list(trans.keys()):
                        if key in ['icon', 'incons']:
                            print('[!!] Unexpected translation')
                            sys.exit(1)
                        elif key not in base:
                            print('[!!] Unexpected translation')
                            sys.exit(1)
                        else:
                            value = trans[key]
                            if isinstance(value, dict):
                                _shrink_dict(base[key], value)

                _extend_dict(base_translation, translation)
                _shrink_dict(base_translation, translation)

    except Exception as ex:
        print('[!!] Error running translation test: {0}'.format(ex))
        sys.exit(1)
