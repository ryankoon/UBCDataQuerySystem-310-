/*
 Should export a rendered module of dropdowns populated with rooms.
 */
import * as React from 'react';
import * as request from 'superagent';
import {CourseForm} from "./CourseForm";
import {ResponseHandler} from "./ResponseHandler";
import {Alerts} from './Alert';


export class CourseExplorer extends React.Component<any, any> {
    constructor(props:any){
        super(props);
        this.state = {
            instructors : [],
            depts : [],
            titles: [],
            sizes : [],
            sections : [],
            responseContent : [],
            responseKeys : [],
            courseNumbers : [],
            output : false,
            triggerAlert : false,
            errorMessage : null
        }
    }
    handleResponse (data : any, sentStates : string) {
        if (data.body.result.length > 0) {
            var responseContent = data.body.result;

            var masterArray : Array<any> = [];
            var keys = Object.keys(responseContent[0]);


            for (var i=0; i < responseContent.length; i ++) {
                var tempArray = keys.map(key => responseContent[i][key]);
                masterArray.push(tempArray);
            }
            this.setState({
                responseContent : responseContent,
                output : true,
                responseKeys : keys,
                errorMessage : null,
                triggerAlert : false
            })
        }else{
            this.setState({
                triggerAlert : true,
                errorMessage : 'The course search retrieved no results.'
            });
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
                let arr_courseNumber : Array<any> = [];


                for (let i=0; i < arrayOfCourseObjects.length; i++) {
                    if (arr_instructors.indexOf(arrayOfCourseObjects[i].subcourses_instructor) === -1) {
                        if (arrayOfCourseObjects[i].subcourses_instructor.length > 0) { // TODO : Handles "" instructor, why does this exist. bug?
                            arr_instructors.push(arrayOfCourseObjects[i].subcourses_instructor)
                        }
                    }
                    if (arr_dept.indexOf(arrayOfCourseObjects[i].subcourses_dept) === -1) {
                        arr_dept.push(arrayOfCourseObjects[i].subcourses_dept)
                    }
                    if (arr_title.indexOf(arrayOfCourseObjects[i].subcourses_title) === -1){
                        arr_title.push(arrayOfCourseObjects[i].subcourses_title);
                    }
                    if (arr_section.indexOf(arrayOfCourseObjects[i].subcourses_Section)=== -1){
                        arr_section.push(arrayOfCourseObjects[i].subcourses_Section);
                    }
                    if (arr_size.indexOf(arrayOfCourseObjects[i].subcourses_Size)=== -1) {
                        arr_size.push(arrayOfCourseObjects[i].subcourses_Size);
                    }
                    if (arr_courseNumber.indexOf(arrayOfCourseObjects[i].subcourses_id)=== -1) {
                        arr_courseNumber.push(arrayOfCourseObjects[i].subcourses_id);
                    }
                }

                let sorted_size : Array<Number> = arr_size.sort(function (a : any,b : any) {
                    return a-b;
                });

                let sorted_courseNumber : Array<Number> = arr_courseNumber.sort(function(a: any, b : any){
                   return a-b;
                });

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
                    sizes : sorted_size,
                    courseNumbers : sorted_courseNumber
                })
            }).catch(err => {
            // TODO: need to display warning / error handling
            console.log (err);
        })
    }
    render(){
        if (this.state.output === false){
            if (this.state.triggerAlert === false){
                return (
                    <div>
                        <CourseForm handleResponse={this.handleResponse.bind(this)} tabSwap = {this.props.OnClick}
                                    courses = {this.state.courseNumbers}
                                    sizes = {this.state.sizes} instructors = {this.state.instructors} depts ={this.state.depts} sections = {this.state.sections} titles = {this.state.titles}  compiler="TypeScript" framework="React"/>
                    </div>
                );
            }
            else {
                return (
                    <div>
                        <Alerts alertStyle="danger" message = {this.state.errorMessage}></Alerts>
                        <CourseForm handleResponse={this.handleResponse.bind(this)} tabSwap={this.props.OnClick}
                                    courses = {this.state.courseNumbers}
                                    sizes={this.state.sizes} instructors={this.state.instructors}
                                    depts={this.state.depts} sections={this.state.sections} titles={this.state.titles}
                                    compiler="TypeScript" framework="React"/>
                    </div>
                );
            }
        }
        else{
            return(<div>
                <ResponseHandler formContext="courses" responseKeys = {this.state.responseKeys} responseContent={this.state.responseContent} compiler="TypeScript"
                                 framework="React"/>
            </div>);
        }
    }
}