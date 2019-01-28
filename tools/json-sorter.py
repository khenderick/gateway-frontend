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

    if len(sys.argv) != 2:
        print('Usage: ./tools/json-sorter.py <path to json file>')
        print('Example: ./tools/json-sorter.py ./src/locale/en/translation.json')
        sys.exit(1)

    path = sys.argv[1]
    if os.path.exists(path):
        with open(path, 'r+', encoding='utf8') as json_file:
            try:
                contents = json.load(json_file)
                json_file.seek(0)
                contents = json.dumps(contents, indent=4, sort_keys=True, ensure_ascii=False)
                json_file.write('{0}\n'.format(contents))
                json_file.truncate()
            except Exception as ex:
                print('Error processing file: {0}'.format(ex))
    else:
        print('Path "{0}" does not exist'.format(path))
        sys.exit(1)
