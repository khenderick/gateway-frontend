#!/usr/bin/env python

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
                json.dump(contents, json_file, indent=4, sort_keys=True, ensure_ascii=False)
                json_file.truncate()
            except Exception as ex:
                print('Error processing file: {0}'.format(ex))
    else:
        print('Path "{0}" does not exist'.format(path))
        sys.exit(1)
