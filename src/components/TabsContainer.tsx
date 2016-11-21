import * as React from 'react';
import * as ReactDom from 'react-dom';
import SingleTab from './SingleTab.tsx';

// TODO: This should be the container for all of our individual tab headers.

// somehow needs to read props :     let tabNameProps = [{name: 'Course Explorer'}, {name : 'Room Explorer'}, {name : 'Course Scheduler'}];


export class TabsContainer extends React.Component<any, any> {
    constructor(props : any){
        super(props);
    }
    render() {
        return(
            <nav>
                <ul>
                    <ul>
                        {this.props.tabProperties.map(function(val : any){
                           return(
                            <SingleTab
                                value = {val.value}
                                name = {val.name}
                            />
                           );
                        })}
                    </ul>
                </ul>
            </nav>
        );
    }
    handleClick (where : any) {
        this.props.swapTab(where);
    }
}