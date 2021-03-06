import * as React from 'react';
import * as ReactDom from 'react-dom';
import {Tab, Tabs, TabList, TabPanel} from 'react-tabs';
import {RoomExplorer} from './RoomExplorer';
import {CourseExplorer} from './CourseExplorer';
import {CourseScheduler} from "./CourseScheduler";
import {FacebookButton} from './FacebookButton';
export class App extends React.Component<any, any> {
    constructor(props : any){
        super(props)
        this.state = {

        }
        localStorage.removeItem('rooms');
        localStorage.removeItem('courses');

    }
    render() {
        return (
            <div>
                <h1>UBC Data Query System</h1>
                <FacebookButton compiler="TypeScript" framework="React"/>
                <Tabs>
                    <TabList>
                        <Tab >Course Explorer</Tab>
                        <Tab>Room Explorer</Tab>
                        <Tab>Course Scheduler</Tab>
                    </TabList>
                    <TabPanel >
                       <CourseExplorer compiler="TypeScript" framework="React" />
                    </TabPanel>
                    <TabPanel>
                        <RoomExplorer compiler="TypeScript" framework="React"/>
                    </TabPanel>
                    <TabPanel>
                        <CourseScheduler compiler="TypeScript" framework="React" />
                    </TabPanel>
                </Tabs>
            </div>
        );
    }
}
// Probably what I need to do... is to pass down a handler function to AjaxRoomDropDown
// NEed to pass the result of that to roomform?
// or.... I need to use jquery and do some updating schenan