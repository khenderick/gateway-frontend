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
    from subprocess import check_output

    if len(sys.argv) != 2:
        print('Usage: ./tools/fix-versions.py <path to package.json file>')
        print('Example: ./tools/fix-versions.py ./package.json')
        sys.exit(1)

    path = sys.argv[1]
    if os.path.exists(path):
        with open(path, 'r+', encoding='utf8') as json_file:
            try:
                versions = check_output(['npm', 'list', '--dept=0']).splitlines()[1:-1]
                version_map = {}
                for entry in versions:
                    entry = str(entry).split(' ', 1)[1]
                    if 'git' in entry:
                        package = entry.split('@', 1)[0]
                        version = 'git{0}'.format(entry.split('(git')[1].split('#')[0])
                    else:
                        package, version = entry.rsplit('@', 1)
                    version_map[package] = version.strip("'")
                contents = json.load(json_file)
                for kind in ['dependencies', 'devDependencies']:
                    for dep in contents[kind]:
                        if contents[kind][dep] != version_map[dep]:
                            print('Updated {0} from "{1}" to "{2}"'.format(dep, contents[kind][dep], version_map[dep]))
                            contents[kind][dep] = version_map[dep]
                json_file.seek(0)
                json.dump(contents, json_file, indent=4, sort_keys=True, ensure_ascii=False)
                json_file.truncate()
            except Exception as ex:
                print('Error processing file: {0}'.format(ex))
    else:
        print('Path "{0}" does not exist'.format(path))
        sys.exit(1)
