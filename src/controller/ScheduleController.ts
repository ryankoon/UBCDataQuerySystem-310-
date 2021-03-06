import {IObject} from "./IObject";
import Log from "../Util";
import {IRoom} from "./IBuilding";
import {ISubCourse} from "./CourseDataController";
import ExplorerController from "./ExplorerController";
/**
 * Created by Ryan on 11/27/2016.
 */

export interface CampusSchedule {
    scheduledSections: number;
    cost: number;
    roomSchedules: RoomSchedules;
}

export interface RoomSchedules {
    [index: string]: TimeTable; //unique id of a room
}

export interface TimeTable extends IObject{
    MWF: DAYMWF;
    TTH: DAYTTH;
}

//TODO check if numbers are escaped on compile
//Start times of courses
export interface DAYMWF extends IObject {
    800: IObject;
    900: IObject;
    1000: IObject;
    1100: IObject;
    1200: IObject;
    1300: IObject;
    1400: IObject;
    1500: IObject;
    1600: IObject;
}
//Start times of courses
export interface DAYTTH extends IObject {
    800: IObject;
    930: IObject;
    1100: IObject;
    1230: IObject;
    1400: IObject;
    1530: IObject;
}

export interface ScheduleResult {
    newSchedule: CampusSchedule;
    newTimetable: CampusTimetable;
    newRoomsBookedTimes: RoomsBookedTimes;
    cost: number;
}

export interface BestScheduleResult {
    bestSchedule: CampusSchedule;
    quality: number;
}


/**
 * IObject: key - course id (aka uuid), value - array of times (e.g ["800", " "1530"]
 * This represents all the times of the scheduled courses across rooms
 * Used to check for concurrent sections
 */
export interface CampusTimetable extends IObject {
    MWF: IObject;
    TTH: IObject;
}
/**
 * IObject: key - room name, value - Object of times (e.g {"800": "booked", "900": "open",...})
 * This represents all the times that are booked for the room
 * Used to check for concurrent sections
 */
export interface RoomsBookedTimes extends IObject {
    MWF: IObject;
    TTH: IObject;
}

export interface RoomAvailability extends IObject {
    MWF: string[];
    TTH: string[];
}

export default class ScheduleController {
    public allSchedules: CampusSchedule[];
    public static MWFTimes: string[] = ["800", "900", "1000", "1100", "1200", "1300", "1400", "1500", "1600"];
    public static TTHTimes: string[] = ["800", "930", "1100", "1230", "1400", "1530"];
    private searchCutoff: number = 0;

    constructor() {
        this.allSchedules = [];
    }

    /**
     * Inputs should be validated already (i.e. required number of sections to schedule)
     * @param courseSections
     * @param rooms
     * @returns {IObject}
     */
    public findBestSchedule(courseSections: ISubCourse[], rooms: IRoom[]): BestScheduleResult {
        let result: BestScheduleResult = {
            "bestSchedule": undefined,
            "quality": undefined
        };

        if (courseSections && courseSections.length > 0 && rooms && rooms.length > 0) {

        // 1. Find all possible schedules.
            let blankCampusSchedule = this.createblankCampusSchedule();
            let blankCampusTimetable = this.createblankCampusTimetable();
            let blankRoomsBookedTimes = this.createblankRoomsBookedTimes();
            this.findAllSchedulesRecursively(courseSections, 0, rooms, blankCampusSchedule, blankCampusTimetable,
                blankRoomsBookedTimes);

            if (this.allSchedules.length > 0) {

        // 2. Get the best schedule
                let bestSchedule: CampusSchedule = this.getBestSchedule(this.allSchedules);

        // 3. Calculate the quality
                let quality = this.calculateQuality(bestSchedule, courseSections.length);
                quality = Math.round(quality * 100) / 100;
                result = {"bestSchedule": bestSchedule, "quality": quality};
            } else {
                Log.error("No schedules were found!");
            }
        }

        return result;
    }

    public createblankCampusSchedule(): CampusSchedule {
        return {
            scheduledSections: 0,
            cost: 0,
            roomSchedules: {}
        };

    }

    public createblankCampusTimetable(): CampusTimetable {
        return {
            "MWF": {},
            "TTH": {}
        };
    }

    public createblankRoomsBookedTimes(): RoomsBookedTimes {
        return{
            "MWF": {},
            "TTH": {}
        }
    }

    /**
     * Precondition: room should be free and and no concurrent section has been found
     * Commit to scheduling section in room.
     */
    public updateScheduleTimetableRoomBookings(schedule: CampusSchedule, campusTimeTable: CampusTimetable,
                                               roomsTimeTable: RoomsBookedTimes, section: ISubCourse, room: IRoom,
                                               day: string, time: string, cost: number): ScheduleResult {
        let scheduleResult: ScheduleResult;
        let updatedCampusSchedule =  this.addSectionToSchedule(schedule, section, room.name, day, time, cost);
        let updatedCampusTimetable = this.addCourseToCampusTimetable(campusTimeTable, section.id, day, time);
        let updatedRoomsTimetables =  this.addTimeToRoomsBookings(roomsTimeTable, room.name, day, time);

        if (updatedCampusSchedule && updatedCampusTimetable && updatedRoomsTimetables) {
            scheduleResult = {
                newSchedule: updatedCampusSchedule,
                newTimetable: updatedCampusTimetable,
                newRoomsBookedTimes: updatedRoomsTimetables,
                cost: cost
            };

            return scheduleResult;
        } else {
            Log.error("Invalid updated schedules/timetables in updateScheduleTimetableRoomBookings!");
        }
    }

    public addSectionToSchedule(schedule: CampusSchedule, section: ISubCourse, roomName: string, day: string, time: string,
                                cost: number): CampusSchedule {
        let result: CampusSchedule = schedule;
        result.scheduledSections += 1;
        result.cost += cost;

        if (result.roomSchedules[roomName] === null || result.roomSchedules[roomName] === undefined) {
            let newTimetableMWF: DAYMWF = <DAYMWF>this.createTimeSlotsObject("MWF");
            let newTimetableTTH: DAYTTH = <DAYTTH>this.createTimeSlotsObject("TTH");
            let newTimetable: TimeTable = {"MWF": newTimetableMWF, "TTH": newTimetableTTH};

            result.roomSchedules[roomName] = newTimetable;
        }

        if (result.roomSchedules[roomName][day][time] === undefined) {
            result.roomSchedules[roomName][day][time] = section;
        } else {
            Log.error("FATAL - addSectionSchedule: room is already scheduled to a section! " +
                "Should not reach this state!");
        }

        return result;
    }

    public addCourseToCampusTimetable(timeTable: CampusTimetable, sectionId: number, day: string, time: string): CampusTimetable {
        let result: CampusTimetable = timeTable;

        if (timeTable && sectionId && day && time) {
            let sectionScheduledTimes = result[day][sectionId];
            if (sectionScheduledTimes === null || sectionScheduledTimes === undefined) {
                result[day][sectionId] = [];
            }
            if (result[day][sectionId].indexOf(time) === -1) {
                result[day][sectionId].push(time);
            } else {
                Log.error("FATAL - addCourseToCampusTimetable: Concurrent Section! Should not reach this state!");
            }
        } else {
            Log.error("Invalid parameters in addTimeToRoomsBookings!");
        }

        return result;
    }

    public addTimeToRoomsBookings(timeTable: RoomsBookedTimes, roomName: string, day: string, time: string): RoomsBookedTimes {
        let result: RoomsBookedTimes = timeTable;
        if (result && roomName && day && time) {
            let roomDayAvailabilities = result[day][roomName];
            if (roomDayAvailabilities === null || roomDayAvailabilities === undefined) {
                this.initializeRoomBookingObject(result, roomName, day);
            }
            if (result[day][roomName][time] === "booked") {
                Log.error("FATAL - addTimeToRoomsBookings: Time has been booked already! Should not reach this state!")
            } else {
                result[day][roomName][time] = "booked";
            }
        } else {
            Log.error("Invalid parameters in addTimeToRoomsBookings!");
        }

        return result;
    }

    public initializeRoomBookingObject(timeTable: RoomsBookedTimes, roomName: string, day: string) {
        if (day === "MWF") {
            let allOpenMWF: IObject = {
                800: "open",
                900: "open",
                1000: "open",
                1100: "open",
                1200: "open",
                1300: "open",
                1400: "open",
                1500: "open",
                1600: "open"
            };
            timeTable.MWF[roomName] = allOpenMWF;
        } else if (day === "TTH") {
            let allOpenTTH: IObject = {
                800: "open",
                930: "open",
                1100: "open",
                1230: "open",
                1400: "open",
                1530: "open"
            };
            timeTable.TTH[roomName] = allOpenTTH;
        }
    }

    public createTimeSlotsObject(day: string): IObject {
        let result = {};

        if (day === "MWF") {
            result = {
                800: undefined,
                900: undefined,
                1000: undefined,
                1100: undefined,
                1200: undefined,
                1300: undefined,
                1400: undefined,
                1500: undefined,
                1600: undefined,
            };
        } else if (day === "TTH") {
            result = {
                800: undefined,
                930: undefined,
                1100: undefined,
                1230: undefined,
                1400: undefined,
                1530: undefined,
            };
        }

        return result;
    }

    /**
     * Check room size >= section size
     * Check concurrent sections
     * Check room is available
     * @param section
     * @param room
     * @param time
     * @param schedule
     * @param timetable
     * @param roomTimeTable
     * @returns {number}
     */
    public getSchedulingCost(section: ISubCourse, room: IRoom, day: string, time: string,
                             timetable: CampusTimetable, roomTimeTable: RoomsBookedTimes): number {
        let cost = -1;
        if (section && room && day && time && timetable && roomTimeTable) {
            let sectionId = section.id;
            let sectionScheduledTimes = timetable[day][sectionId];
            if (section.Size <= room.seats && (roomTimeTable[day][time] === undefined ||
                roomTimeTable[day][time] === "open") && (sectionScheduledTimes === undefined ||
                sectionScheduledTimes.indexOf(time) === -1)) {

                if (room.seats && section.Size) {
                    cost = room.seats - section.Size;
                }
            }
        } else {
            Log.error("A parameter is invalid for getSchedulingCost!");
        }

        return cost;
    }

    public findAvailableRoomTimeslots(room: IRoom, roomsBookedTimes: RoomsBookedTimes): RoomAvailability {
        let roomAvailability: RoomAvailability = {
            "MWF": [],
            "TTH": []
        };

        if (room && roomsBookedTimes) {
            let MWFBooked = roomsBookedTimes.MWF;
            let TTHBooked = roomsBookedTimes.TTH;
            let roomName = room.name;

            let roomBookedMWF: IObject = MWFBooked[roomName];
            let roomBookedTTH: IObject = TTHBooked[roomName];

            let availableMWF: string[] = [];
            ScheduleController.MWFTimes.forEach(mwfTime => {
                //TODO Double check RoomsBookedTimes Structure
               if (roomBookedMWF === undefined || roomBookedMWF[mwfTime] === undefined || roomBookedMWF[mwfTime] === "open") {
                   availableMWF.push(mwfTime);
               }
            });

            let availableTTH: string[] = [];
            ScheduleController.TTHTimes.forEach(tthTime => {
                if (roomBookedTTH === undefined || roomBookedTTH[tthTime] === undefined || roomBookedTTH[tthTime] === "open") {
                    availableTTH.push(tthTime);
                }
            });

            roomAvailability.MWF = availableMWF;
            roomAvailability.TTH = availableTTH;
        } else {
            Log.error("Room or roomsbookedtimes is null!");
        }
        return roomAvailability;
    }

    /**
     * Schedule course at the next available timeslot at the least cost room
     * Returns the updated schedule and timetable with the cost of scheduling
     * Cost - cannot be scheduled = -1,  scheduled = number >= 0
     * @param section
     * @param room
     */
    public scheduleSection(section: ISubCourse, rooms: IRoom[], schedule: CampusSchedule,
                           timetable: CampusTimetable, roomsBookedTimes: RoomsBookedTimes): ScheduleResult {
        let result: ScheduleResult = {
            newSchedule: null,
            newTimetable: null,
            newRoomsBookedTimes: null,
            cost: -1
        };

        let leastCost: number = -1;
        let bestRoom: IRoom;
        let bestDay: string;
        let bestTime: string;

        rooms.some(room => {
            let roomAvailability: RoomAvailability = this.findAvailableRoomTimeslots(room, roomsBookedTimes);
            //Find the next available timeslot, does not have to be adjacent to last scheduled course
            roomAvailability.MWF.some(mwfTime => {
                let cost = this.getSchedulingCost(section, room, "MWF", mwfTime, timetable, roomsBookedTimes);
                if (cost != -1 && (leastCost === -1 || leastCost > cost)) {
                    leastCost = cost;
                    bestRoom = room;
                    bestDay = "MWF";
                    bestTime = mwfTime;
                }
                if (leastCost === 0) {
                    // stop searching if section can the room without any empty seat at an available time
                    return true;
                }
            });

            roomAvailability.TTH.some(tthTime => {
                let cost = this.getSchedulingCost(section, room, "TTH", tthTime, timetable, roomsBookedTimes);
                if (cost != -1 && (leastCost === -1 || leastCost > cost)) {
                    leastCost = cost;
                    bestRoom = room;
                    bestDay = "TTH";
                    bestTime = tthTime;
                }
                if (leastCost === 0) {
                    // stop searching if section can the room without any empty seat at an available time
                    return true;
                }
            });

            if (leastCost === 0) {
                return true;
            }
        });

        if (leastCost !== -1 && bestRoom && bestDay && bestTime) {
            result = this.updateScheduleTimetableRoomBookings(schedule, timetable, roomsBookedTimes, section, bestRoom,
                bestDay, bestTime, leastCost)
        } else if (leastCost === -1) {
            // should not have changed
        } else {
            Log.error("Error with scheduling a section!");
        }
        return result;
    }

    /**
     * Recursively find all possible schedules and save to global variable allSchedules
     * @param sections
     * @param currIndex
     * @param rooms
     * @param schedule
     * @param campusTimetable
     * @returns {number}
     */
    public findAllSchedulesRecursively(sections: ISubCourse[], currIndex: number, rooms: IRoom[], schedule: CampusSchedule,
                                       campusTimetable: CampusTimetable, roomsBookedTimes: RoomsBookedTimes): void {
        //clone objects - http://heyjavascript.com/4-creative-ways-to-clone-objects
        let oldSections = (JSON.parse(JSON.stringify(sections)));
        let oldRooms = (JSON.parse(JSON.stringify(rooms)));
        let oldSchedule = (JSON.parse(JSON.stringify(schedule)));
        let oldCampusTimetable = (JSON.parse(JSON.stringify(campusTimetable)));
        let oldRoomsBookedTimes = (JSON.parse(JSON.stringify(roomsBookedTimes)));
        this.searchCutoff += 1;
        if (currIndex > sections.length - 1) {
            if (schedule.scheduledSections > 0) {
                this.allSchedules.push(schedule);
            }
        } else {
           let scheduleResult = this.scheduleSection(sections[currIndex], rooms, schedule, campusTimetable, roomsBookedTimes);
           if (scheduleResult) {
               if (scheduleResult.cost === -1) {
                   return this.findAllSchedulesRecursively(sections, currIndex + 1, rooms, schedule, campusTimetable,
                       roomsBookedTimes);
               } else {
                   let newSchedule = scheduleResult.newSchedule;
                   let newTimetable = scheduleResult.newTimetable;
                   let newRoomsBookedTimes = scheduleResult.newRoomsBookedTimes;
                   let cost = scheduleResult.cost;
                   // Skip this course anyways
                   if (this.searchCutoff < 5000) {
                       this.findAllSchedulesRecursively(oldSections, currIndex + 1, oldRooms, oldSchedule,
                           oldCampusTimetable, oldRoomsBookedTimes);
                   }
                   // Schedule this course
                   this.findAllSchedulesRecursively(sections, currIndex + 1, rooms, newSchedule,
                   newTimetable, newRoomsBookedTimes);
               }
           }
        }
    }

    public getBestSchedule(schedules: CampusSchedule[]): CampusSchedule {
        let result: CampusSchedule;
        let mostScheduledCourses: number = 0;

        if (schedules && schedules.length > 0) {
            schedules.forEach((schedule: CampusSchedule) => {
                if (schedule.scheduledSections > mostScheduledCourses) {
                    result = schedule;
                    mostScheduledCourses = schedule.scheduledSections;
                }
            })
        } else {
            Log.error("No schedule was given!");
        }
        return result;
    }

    public calculateQuality(schedule: CampusSchedule, requestedSections: number): number {
        let result: number = -1;
        if (schedule && requestedSections) {
            result = schedule.scheduledSections/requestedSections;
        }
       return result;
    }

}
