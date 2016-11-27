import {QueryRequest, default as QueryController} from "./QueryController";
import {IObject} from "./IObject";
import {IRoom} from "./IBuilding";
/**
 * Created by Ryan on 11/26/2016.
 */

export interface distanceRequestBody {
    newReqString: string;
    buildingNames: IObject; //Key: rooms_shortname Val: array of bulding codes to 'OR' in the query

}

export default class ExplorerController {

    /**
     * Builds a query based on the selected fields on an explorer pane
     * @param reqBody
     * @param type - 'courses' or 'rooms'
     * @returns {QueryRequest}
     */
    public buildQuery(reqBody: string, type: string, condition: string, OrValueObject?: IObject,
                      numComparison: string = "EQ"): QueryRequest {
        try {
            let reqBodyJson = JSON.parse(reqBody);

            let reqKeys = Object.keys(reqBodyJson);
            //remove latlon
            let tempKeys: string[] = [];
            reqKeys.forEach(key => {
                if (key !== "rooms_lat" && key !== "rooms_lon") {
                    tempKeys.push(key);
                }
            });
            reqKeys = tempKeys;


            let whereObject: IObject = {};
            let andObjects: IObject[] = [];
            let optionalOrObjects: IObject = {"OR": []};

            reqKeys.forEach(getKey => {
                let comparatorObj = this.generateComparatorObject(getKey, reqBodyJson[getKey], numComparison);
                // check for OR condition (ie when distance is set)
                // building name would not need to be the same
                if (condition === "OR" && getKey === "rooms_fullname") {
                    optionalOrObjects["OR"].push(comparatorObj);
                } else {
                    andObjects.push(comparatorObj);
                }
            });

            if (condition === "OR" && OrValueObject) {
                let orValuesKeys: any = Object.keys(OrValueObject);
                if (orValuesKeys && orValuesKeys.length === 1) {
                    let orValues: any = OrValueObject[orValuesKeys[0]];
                    let orObjects: IObject[] = [];
                    orValues.forEach((value: string) => {
                        let comparatorObj = this.generateComparatorObject(orValuesKeys[0], value);
                        orObjects.push(comparatorObj);
                    });

                    if(orObjects.length > 0) {
                        optionalOrObjects["OR"] = orObjects;
                    }
                }
            }

            whereObject["AND"] = andObjects;

            if (optionalOrObjects["OR"].length > 0) {
                // all given field values
                whereObject["AND"].push(optionalOrObjects);
            }

            // add required keys
            let queryController = new QueryController();
            let datasetId = queryController.getDatasetId(reqKeys[0]);

            // add required fields to return based on explorer types
            let requiredFields: string[];
            if (type === 'courses') {
                requiredFields = [datasetId + "_dept", datasetId + "_id", datasetId + "_Section", datasetId + "_SectionSize"];
            } else if (type === 'rooms') {
                requiredFields = [datasetId + "_name", datasetId + "_seats"];
            }
            let tempFields = requiredFields;
            reqKeys.forEach(field => {
                if (requiredFields.indexOf(field) === -1) {
                    tempFields.push(field);
                }
            });
            reqKeys = tempFields;

            let courseQuery: QueryRequest =
                {
                    "GET": reqKeys,
                    "WHERE": whereObject,
                    "GROUP": reqKeys,
                    "APPLY": [],
                    "AS": "TABLE"
                };

            return courseQuery;
        } catch (err) {
             console.log("Error building query: " + err);
        }
    }

    public generateComparatorObject(key: string, value: any, numComparator: string = "EQ"): IObject {
        let result: IObject = {};
        let valueType: string = typeof(value);
        let parsedFloat = Number(value);

        if (!isNaN(parsedFloat)){
            valueType = "number";
            result[key] = parsedFloat;
        } else {
            result[key] = value;
        }

        if (valueType === "string") {
            result = {"IS": result};
        } else if (valueType === "number") {
            let querykeyvalueObj = result;
                result = {};
                result[numComparator] = querykeyvalueObj;
        }

        return result;
    }


    /**
     *
     * @param reqBody
     * @param results - list of IRooms that contains one room from each nearby building
     */
    public transformRequestBody(reqBody: IObject, results: IRoom[]): distanceRequestBody {
        let reqBodytest = {
            rooms_lat: 49.26479,
            rooms_lon: -123.25249,
            rooms_distance: 0
        };

        let newReqBody: IObject = {};

        //grab all key values from request body except lat, lon, and distance
        let reqBodyKeys = Object.keys(reqBody);
        reqBodyKeys.forEach(reqBodyKey => {
            if (reqBodyKey !== "rooms_lat" && reqBodyKey !== "rooms_lon" && reqBodyKey !== "rooms_distance") {
                if (reqBodyKey === "rooms_seats"){
                    // add 1 to seats in query since we can will query with LT operator
                    newReqBody[reqBodyKey] = parseInt(reqBody[reqBodyKey]) + 1;
                } else {
                    newReqBody[reqBodyKey] = reqBody[reqBodyKey];
                }
            }
        });

        let orValues: string[] = [];
        results.forEach((room: IRoom) => {
            if (room.shortname) {
                orValues.push(room.shortname);
            }
        });

        //Stringify newReqBody
        let reqString: string = JSON.stringify(newReqBody);

        let distanceReqBody: distanceRequestBody = {
            newReqString: reqString,
            buildingNames: {"rooms_shortname": orValues}
        };

        return distanceReqBody;
    }
}