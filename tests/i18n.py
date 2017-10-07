#!/usr/bin/env python
# Copyright (C) 2017 OpenMotics BVBA
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
    import re
    import sys
    import glob

    regex = re.compile(r""" t="[^\[]""")
    error = False
    for file_name in glob.glob('src/**/*.html', recursive=True):
         with open(file_name, 'r') as html_file:
             contents = html_file.read()
             if regex.search(contents):
                 print('[!!] File {0} contains t-tag'.format(file_name))
                 error = True
    if error is True:
        sys.exit(1)
