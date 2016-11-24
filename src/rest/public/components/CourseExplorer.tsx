/*
 Should export a rendered module of dropdowns populated with rooms.
 */
import * as React from 'react';
import * as request from 'superagent';
import * as ReactBootstrap from 'react-bootstrap';
import * as ReactDOM from 'react-dom';
import {CourseForm} from "./CourseForm";


export class CourseExplorer extends React.Component<any, any> {
    constructor(props:any){
        super(props);
        this.state = {
            instructors : [],
            depts : [],
            titles: [],
            sizes : [],
            sections : []
        }
    }
    componentWillMount() {
        request.get('http://localhost:4321/courseInfo')
            .then( res => {

                console.log(this);

                let arrayOfCourseObjects = res.body.result;

                let arr_instructors : Array<string> = [];
                let arr_dept : Array<string> = [];
                let arr_title : Array<string> = [];
                let arr_size : Array<Number> = [];
                let arr_section : Array<string> = [];


                for (let i=0; i < arrayOfCourseObjects.length; i++) {
                    if (arr_instructors.indexOf(arrayOfCourseObjects[i].courses_instructor) === -1) {
                        if (arrayOfCourseObjects[i].courses_instructor.length > 0) { // TODO : Handles "" instructor, why does this exist. bug?
                            arr_instructors.push(arrayOfCourseObjects[i].courses_instructor)
                        }
                    }
                    if (arr_dept.indexOf(arrayOfCourseObjects[i].courses_dept) === -1) {
                        arr_dept.push(arrayOfCourseObjects[i].courses_dept)
                    }
                    if (arr_title.indexOf(arrayOfCourseObjects[i].courses_title) === -1){
                        arr_title.push(arrayOfCourseObjects[i].courses_title);
                    }
                    if (arr_section.indexOf(arrayOfCourseObjects[i].courses_Section)=== -1){
                        arr_section.push(arrayOfCourseObjects[i].courses_Section);

                        // for each unique section, push the size.
                        let tempPass = arrayOfCourseObjects[i].courses_pass;
                        let tempFail = arrayOfCourseObjects[i].courses_fail;

                        let tempSize: Number = tempPass + tempFail;

                        arr_size.push(tempSize);
                    }
                }
                let sorted_arr_instructors : Array<string> = arr_instructors.sort(function (a,b)  {
                    if (a < b) return -1;
                    if (b > a) return 1;
                    return 0;
                });
                this.setState({
                    instructors : sorted_arr_instructors,
                    depts : arr_dept,
                    titles: arr_title,
                   sections : arr_section,
                    sizes : arr_size
                })
            }).catch(err => {
            // TODO: need to display warning / error handling
            console.log (err);
        })
    }
    render(){
        return (
            <div>
                <CourseForm sizes = {this.state.sizes} instructors = {this.state.instructors} depts ={this.state.depts} sections = {this.state.sections} titles = {this.state.titles}  compiler="TypeScript" framework="React"/>
            </div>
        );
    }
}