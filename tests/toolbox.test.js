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
import {Toolbox} from '../src/components/toolbox';

export class I18N_mock {
  static tr(string) {
      return string;
  }
}

export class Object_mock {
  constructor(attribute) {
      this.attribute = attribute;
  }
}

describe('the toolbox', () => {

  it('should return time in hours', () => {
      expect(Toolbox.minutesToString(67)).toBe('01:07');
      expect(Toolbox.minutesToString(52352)).toBe('872:32');
      expect(Toolbox.minutesToString('52352')).toBe('872:32');
      expect(Toolbox.minutesToString(null)).toBe('00:00');
  });

  it('should remove an element from the array', () => {
      let local_array = ['first', 'second', 'third', 'fourth'];
      Toolbox.removeElement(local_array, 'first', 0);
      expect(local_array).toEqual(['second', 'third', 'fourth']);

      local_array = ['first'];
      Toolbox.removeElement(local_array, 'first', undefined);
      expect(local_array).toEqual([]);
  });

  it('should check if array contains element', () => {
      let local_array = ['first', 'second', 'third', 'fourth'];
      expect(Toolbox.arrayHasElement(local_array, 'first', 0)).toBe(true);
      expect(Toolbox.arrayHasElement(local_array, 'fifth', 4)).toBe(false);
      expect(Toolbox.arrayHasElement(local_array, 'first')).toBe(true);
      expect(Toolbox.arrayHasElement(local_array, 'sixth')).toBe(false);
      expect(Toolbox.arrayHasElement(local_array, 'sixth', undefined)).toBe(false);
  });

  it('should check if array contains element', () => {
      let local_string = 'OpenMotics 2019 @~?.'
      expect(Toolbox.stringContains(local_string, 'op')).toBe(false);
      expect(Toolbox.stringContains(local_string, 'Op')).toBe(true);
      expect(Toolbox.stringContains(local_string, '@~?')).toBe(true);
      expect(Toolbox.stringContains(local_string, ' ')).toBe(true);
      expect(Toolbox.stringContains(local_string, 'OpenMotics 2019 @~?.')).toBe(true);
      expect(Toolbox.stringContains(local_string, 'OpenMotics 2019 @~?. ')).toBe(false); // Plus space
  });

  it('should convert seconds into hh:mm:ss format', () => {
      let returned_time = Toolbox.splitSeconds(84927);
      expect(returned_time.hours).toEqual(23);
      expect(returned_time.minutes).toEqual(35);
      expect(returned_time.seconds).toEqual(27);
  });

  it('should return total minutes after giving hh:mm format', () => {
      expect(Toolbox.parseTime('02:10')).toEqual(130);
      expect(Toolbox.parseTime('54:00')).toEqual(3240); // Case showing a scenario that should fail.
      expect(Toolbox.parseTime('54:00', '01:01')).toEqual(61);
  });

  it('should validate if two arrays are equal', () => {
      let local_array1 = ['first', 'second', 'third', 'fourth'];
      let local_array2 = ['first', 'second', 'third', 'fourth'];
      expect(Toolbox.arrayEquals(local_array1, local_array2)).toBe(true);

      local_array2 = ['second', 'first', 'third', 'fourth'];
      expect(Toolbox.arrayEquals(local_array1, local_array2)).toBe(false);

      local_array2 = ['first', 'second', 'third', 'fourtH']; // Upper case character in array
      expect(Toolbox.arrayEquals(local_array1, local_array2)).toBe(false);
      expect(Toolbox.arrayEquals('Hello there', 'Hello there')).toBe(true);

      let local_array3 = ['first', 'second', 'third', 'fourth', 'fifth'];
      expect(Toolbox.arrayEquals(local_array1, local_array3)).toBe(false);
      expect(Toolbox.arrayEquals(undefined, undefined)).toBe(false);
  });

  it('should make sure an int is within a limit', () => {
      expect(Toolbox.limit(8, 0, 10)).toEqual(8);
      expect(Toolbox.limit(Math.PI, 3, 3.15)).toBe(Math.PI);
      expect(Toolbox.limit(Math.PI, 3, 3.15)).toBeCloseTo(3.14);
      expect(Toolbox.limit(-6, -20, 0)).toBe(-6);
      expect(Toolbox.limit(1, 1, 1)).toBe(1);
      expect(Toolbox.limit(5, 6, 8)).toBe(6);
      expect(Toolbox.limit(91, 30, 90)).toBe(90);
      expect(Toolbox.limit(91, 30, null)).toBe(30);
      expect(Toolbox.limit(91, null, 90)).toBe(90);
      expect(Toolbox.limit(91, null, null)).toBe(0);
      expect(Toolbox.limit(null, 30, 90)).toBe(30);
      expect(Toolbox.limit('52', 30, 90)).toBe(52);
      expect(Toolbox.limit(60, '30', '90')).toBe(60);
  });

  it('should validate email', () => {
      expect(Toolbox.validEmail('support@openmotics.com')).toBe(true);
      expect(Toolbox.validEmail('support@@openmotics.com')).toBe(false);
      expect(Toolbox.validEmail('support@.com')).toBe(false);
      expect(Toolbox.validEmail('ohmyg@d what_is#this3mail@horrible.com')).toBe(false);
      expect(Toolbox.validEmail('ihavea#inmyemailbro@horrible.com')).toBe(true);
      expect(Toolbox.validEmail('" "@horrible.com')).toBe(true);
      expect(Toolbox.validEmail(' @horrible.com')).toBe(false);
  });

  it('should validate url', () => {
      expect(Toolbox.validUrl('www.working-example.com')).toBe(true);
      expect(Toolbox.validUrl('working-example.com')).toBe(true);
      expect(Toolbox.validUrl('common-mistake,com')).toBe(false);
      expect(Toolbox.validUrl('http://someone.somewhere.com')).toBe(true);
      expect(Toolbox.validUrl('facebook')).toBe(false);
      expect(Toolbox.validUrl('lots of spaces.com')).toBe(false);
      expect(Toolbox.validUrl('http://hey.be')).toBe(true);
      expect(Toolbox.validUrl('http://hi.be')).toBe(true);
      expect(Toolbox.validUrl('http://h.be')).toBe(true);
      expect(Toolbox.validUrl('http://h.be!')).toBe(false);
      expect(Toolbox.validUrl(undefined)).toBe(false);
      expect(Toolbox.validUrl(null)).toBe(false);
  });

  it('should combine seperated strings', () => {
      expect(Toolbox.combine('-', 'hello, there!', 'I see you looking at this test?', 'Alors, changeons de langue!')).toEqual('hello, there!-I see you looking at this test?-Alors, changeons de langue!');
      expect(Toolbox.combine('-', '', '', '')).toEqual('');
      expect(Toolbox.combine('-', '--', '--')).toEqual('-----');
  });

  it('should generate crontab', () => {
      expect(Toolbox.generateCrontab([true, false, false, false, false, false, false], '00:00', 60)).toEqual('00 00 * * sun');
      expect(Toolbox.generateCrontab([false, false, false, false, false, false, false], '00:00', 60)).toEqual('00 00 * * ');
      expect(Toolbox.generateCrontab([true, true, 0, 1], '00:00', 60)).toEqual('00 00 * * sun,mon,wed');
      expect(Toolbox.generateCrontab([true, false, false, false, false, false, false], undefined, 1)).toEqual('* * * * sun');
      expect(Toolbox.generateCrontab([true, false, false, false, false, false, false], undefined, 30)).toEqual('*/30 * * * sun');
  });

  it('should parse crontab', () => {
      let parsedCronTab = Toolbox.parseCrontab('00 10 * * sun');
      expect(parsedCronTab).toEqual([
          [true, false, false, false, false, false, false], '10:00', undefined
      ]);

      parsedCronTab = Toolbox.parseCrontab('* * * * sun');
      expect(parsedCronTab).toEqual([
          [true, false, false, false, false, false, false], undefined, 1
      ]);
  });

  it('should check if given data is  in given range', () => {
      expect(Toolbox.inRanges(3, [[10, 2]])).toBe(true);
      expect(Toolbox.inRanges(3, [[2, 10]])).toBe(true);
      expect(Toolbox.inRanges(3, [[4, 5]])).toBe(false);
  });

  it('should generate Hash with the given length', () => {
      let generated = Toolbox.generateHash(3);
      expect(generated).toBeDefined();
      expect(generated.length).toEqual(3);

      generated = Toolbox.generateHash(70);
      expect(generated).toBeDefined();
      expect(generated.length).toEqual(70);

      generated = Toolbox.generateHash(257);
      expect(generated).toBeDefined();
      expect(generated.length).toEqual(257);

      generated = Toolbox.generateHash('5');
      expect(generated).toBeDefined();
  });

  it('should return the time stamp', () => {
      let my_timestamp = new Date().getTime();
      let toolbox_timestamp = Toolbox.getTimestamp();
      expect(toolbox_timestamp).toBeDefined();
      expect(toolbox_timestamp).toBeCloseTo(my_timestamp);
  });

  it('should sort two elements', () => {
      expect(Toolbox.sort(3, 6)).toBeDefined();
      expect(Toolbox.sort(12, 6)).toBeDefined();
  });

  it('should check if two objects are the same at a specific key', () => {
      expect(Toolbox.match(['first_string'], ['first_string', 'another-string'], 0)).toBe(true);
      expect(Toolbox.match(['first_string'], ['another-string', 'first_string'], 0)).toBe(false);
      expect(Toolbox.match(['first_string'], ['another-string', 'first_string'], 1)).toBe(false);
      expect(Toolbox.match('ABCD', 'AEFG', 0)).toBe(true);
      expect(Toolbox.match('ABCD', 'AEFG', 1)).toBe(false);
      expect(Toolbox.match('ABCD', 'abcd', 0)).toBe(false);
      expect(Toolbox.match('ABCD', 'hello there!', -1)).toBe(true);

      let my_dict = {
          'id': 3,
          'name': 'Dr. Gordon Freeman',
          'area': 'Test chamber lambda core'
      };
      let my_2_dict = {
          'id': 4,
          'name': 'Dr. Isaac Kleiner',
          'area': 'Test chamber lambda core'
      };
      expect(Toolbox.match(my_dict, my_2_dict, 'area')).toBe(true);
      my_2_dict = {
          'id': 4,
          'name': 'Dr. Isaac Kleiner',
          'area': 'Unknown - missing'
      };
      expect(Toolbox.match(my_dict, my_2_dict, 'area')).toBe(false);
  });

  it('should return the difference between two dates', () => {
      let date1 = new Date('September 21, 1993 03:24:00');
      let date2 = new Date('September 21, 2018 03:24:00');
      expect(Toolbox.dateDifference(date1, date2)).toEqual(9131);

      date1 = new Date('December 31, 2018 00:00:00');
      date2 = new Date('January 01, 2019 00:00:00');
      expect(Toolbox.dateDifference(date1, date2)).toEqual(1);
      expect(() => Toolbox.dateDifference(null, date2)).toThrow(TypeError);
  });

  it('should parse string dates', () => {
      let myDate = Toolbox.parseDate('2015-03-25 12:00');
      expect(myDate).not.toBeNull();
      expect(typeof myDate).toBe('number');
      expect(myDate).toEqual(1427284800000);
  });

  it('should format bytes into Gibibytes', () => {
      let result = Toolbox.formatBytes(1073741824, I18N_mock);
      expect(result).toBeDefined();
      expect(result).toEqual('1.00 generic.units.gib');
  });

  it('should check if the given string is a date', () => {
      expect(Toolbox.isDate('2015-03-25 12:00')).toBe(true);
      expect(Toolbox.isDate('2015-03-25 12:00:00')).toBe(false);
      expect(Toolbox.isDate('December 12, 2012 12:12')).toBe(false);
      expect(Toolbox.isDate(undefined)).toBe(false);
      expect(() => Toolbox.isDate(null)).toThrow(TypeError);
  });

  it('should convert system64 to percent', () => {
      expect(Toolbox.system64ToPercent(56, 1)).toBeDefined();
      expect(Toolbox.system64ToPercent(56, 1)).toEqual(89);
      expect(Toolbox.system64ToPercent(123, 1)).toBeDefined();
      expect(Toolbox.system64ToPercent(123, 1)).toEqual(100);
      expect(Toolbox.system64ToPercent('56', 1)).toBeDefined();
      expect(Toolbox.system64ToPercent('56', 1)).toEqual(89);
      expect(Toolbox.system64ToPercent('some_string', 1)).toBeDefined();
      expect(Toolbox.system64ToPercent('some_string', 1)).toBe(NaN);
  });

  it('should convert percent to system64', () => {
      expect(Toolbox.percentToSystem64(89)).toBeDefined();
      expect(Toolbox.percentToSystem64(89)).toEqual(56);
      expect(Toolbox.percentToSystem64(100)).toBeDefined();
      expect(Toolbox.percentToSystem64(100)).toEqual(63);
      expect(Toolbox.percentToSystem64('89')).toBeDefined();
      expect(Toolbox.percentToSystem64('89')).toEqual(56);
      expect(Toolbox.percentToSystem64('some_string')).toBeDefined();
      expect(Toolbox.percentToSystem64('some_string')).toBe(NaN);
  });

  it('should format date', () => {
      let now = new Date();
      expect(Toolbox.formatDate(now, 'MM/dd/yyyy')).toBeDefined();
      expect(Math.trunc(Toolbox.formatDate(now, 'MM'))).toEqual(now.getMonth() + 1);
      expect(Math.trunc(Toolbox.formatDate(now, 'dd'))).toEqual(now.getDate());
      expect(Math.trunc(Toolbox.formatDate(now, 'yyyy'))).toEqual(now.getFullYear());
  });

  it('should get device view port', () => {
      expect(Toolbox.getDeviceViewport()).not.toBeDefined();
  });

  it('should ensure default value', () => {
      let my_object = Object_mock;
      Toolbox.ensureDefault(my_object, 'attribute', 'default');
      expect(my_object.attribute).toEqual('default');
  });

  it('should format range between two dates', () => {
      let date1 = new Date('October 21, 2018 03:24:00');
      let date2 = new Date('September 21, 2018 03:24:00');
      expect(Toolbox.formatDateRange(date1, date2, 'dd/MM/yyyy', I18N_mock)).toEqual('21/10/2018 - 21/09/2018');
      expect(Toolbox.formatDateRange(date1, date2, 'yyyy', I18N_mock)).toEqual('2018 - 2018');
  });

  it('should shorten numbers', () => {
      expect(Toolbox.shorten('132444445555555', 10, 2)).toEqual('132...555');
      expect(Toolbox.shorten('132400', 10, 2)).toEqual('132400');
      expect(Toolbox.shorten('132444445555555', 10, false)).toEqual('1324444...');
  });

  it('should shorten lists', () => {
      expect(Toolbox.shortenList(['one', 'two', 'three', 'four'], 4, I18N_mock)).toEqual('one, two, three, four');
      expect(Toolbox.shortenList(['9g06EJb8rMEqk98b88kF', 'mURAEpkGVU3BFbLDqW13', 'fpv9Gc9sfml0lZdjcmmo', 'XDkqIVhBHtqtKfPLUeFc'], 50, I18N_mock)).toEqual('9g06EJb8rMEqk98b88kFgeneric.andxmore');
      expect(Toolbox.shortenList(['one', 'two', 'three', 'four'], undefined, I18N_mock)).toEqual('one, two, three, four');
  });

  it('should return properly formatted strings to Title case.', () => {
      expect(Toolbox.titleCase('openmotics')).toEqual('Openmotics');
      expect(Toolbox.titleCase('b')).toEqual('B');
  });

  it('should sleep for the given time', () => {
      let MySleepyPromise = Toolbox.sleep(10000);
      expect(MySleepyPromise).toBeInstanceOf(Promise);
      MySleepyPromise.then(callback => {
          expect(callback).toHaveBeenCalledTimes(0);
          jest.runAllTimers();
          expect(callback).toBeCalled();
          expect(callback).toHaveBeenCalledTimes(1);
      });
  });

  it('should return true if the actual version is higher than the minimum required version', () => {
    expect(Toolbox.compareVersions('3.143.66', '0.0.0')).toBe(1);
    expect(Toolbox.compareVersions('3.143.66', '3.143.77')).toBe(-1);
    expect(Toolbox.compareVersions('4.0.0', '3.143.66')).toBe(1);
    expect(Toolbox.compareVersions('1.2.3', '2.1.3')).toBe(-1);
    expect(Toolbox.compareVersions('1.11.1', '1.11.1')).toBe(0);
    expect(Toolbox.compareVersions('1.11', '1.11.2')).toBe(-1);
});
});
