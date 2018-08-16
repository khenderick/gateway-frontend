/*
 * Copyright (C) 2018 OpenMotics BVBA
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
export class Data {
    edit = false;
    mode = undefined;
    scheduleId = undefined;
    schedule = undefined;
    actionType = 0;
    actionNumber = 0;
    start = undefined;
    end = undefined;
    dorepeat = false;
    advancedrepeat = false;
    simplerepeat = {
        day: {
            day0: false,
            day1: false,
            day2: false,
            day3: false,
            day4: false,
            day5: false,
            day6: false
        },
        doat: 1,
        at: undefined,
        every: 60
    };
    repeat = undefined;
    groupAction = undefined;
    groupActionId = undefined;
}
