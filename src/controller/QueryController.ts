/**
 * Created by rtholmes on 2016-06-19.
 */
import {Datasets} from "./DatasetController";
import Log from "../Util";
import {IObject} from "./IObject";
import {IMComparison} from "./IEBNF";
import {ISComparison} from "./IEBNF";
import {ILogicComparison} from "./IEBNF";
import {IFilter} from "./IEBNF";

export interface QueryRequest {
    GET: string|string[];
    WHERE: IFilter;
    ORDER: string;
    AS: string;
}

export interface QueryResponse {
  render: string;
  result: IObject[];
}

export default class QueryController {
    private datasets: Datasets = null;

    constructor(datasets?: Datasets) {
        this.datasets = datasets;
    }

    public isValid(query: QueryRequest): boolean | string {
        if (typeof query === 'undefined') {
          return 'Query is undefined!';
        } else if (query === null) {
          return 'Query is null!';
        } else if (Object.keys(query).length === 0) {
          return 'Query is empty!';
        } else if (query.GET && query.GET.length === 0) {
          return 'Query GET does not have any keys!'
        } else if (query.ORDER && query.ORDER.length === 1) {
          // 'order key needs to be among the get keys'
          let result: boolean = true;
          if (query.GET.length === 1) {
            result = query.GET[0] === query.ORDER;
          } else {
            let queryGETArray: string[] = <string[]> query.GET;
            queryGETArray.forEach((getKey: string) => {
              result = result && getKey === query.ORDER;
            });
          }
            if (result === false) {
              // stop finding on first key that cannot be found in GET
              // behaviour similar to arrayFirst
                return 'A key in ORDER does not exist in GET!';
            }
        } else if (!query.AS) {
          return "Query AS has not been defined!";
        } else if (query.AS && query.AS !== 'TABLE') {
          return "Query AS must be 'TABLE'!"
        }

        return true;
    }

    /**
     * Splits the key (refer to EBNF for definition of key) into two parts:
     * 1. DatasetId   2.QueryKey (e.g. Professor)
     * 'courses_id' will be split into 'courses' and 'id'
     *
     * @param key
     */
    public splitKey(key: string): string[] {
      let parts: string[] = [];
      if (key) {
      parts = key.split('_');
      }
      return parts;
    }

    public getDatasetId(key: string) {
      let datasetId: string = '';
      let keyParts: string[] = this.splitKey(key);
      // make sure key is not null
      if (keyParts.length === 2) {
        datasetId = keyParts[0];
      }
      return datasetId;
    }

    // remove the first part of key to get the column name
    // e.g. courses_avg -> avg
    public getQueryKey(key: string) {
      let queryKey: string = '';
      let keyParts: string[] = this.splitKey(key);
      // make sure key is not null
      if (keyParts.length === 2) {
        queryKey = keyParts[1];
      }
      return queryKey;
    }

    public query(query: QueryRequest): QueryResponse {
      Log.trace('QueryController::query( ' + JSON.stringify(query) + ' )');
      let isValidQuery: boolean | string = this.isValid(query);
      if (isValidQuery === true) {
        //get dataset based on first item in GET array.
        let dataset: IObject;
        let firstGETKey: string = query.GET[0];
        let datasetId: string = this.getDatasetId(firstGETKey);

        if (datasetId != '') {
          //TODO call getDataset from DatasetController
          dataset = this.getStringIndexKVByNumber(this.datasets, 0)["value"];
        }

        // 1. FILTER
        let courses: string[] = Object.keys(dataset);
        let allCourseResults: IObject[] = [];
        let filteredResults: IObject[];

        console.log("dataset: " + dataset);
        console.log("courseKeys: " + courses);

        courses.forEach((course) => {
          // combine results of all courses
          let courseResults: IObject;
          courseResults = dataset[course]["results"];
          if (courseResults) {
              allCourseResults = allCourseResults.concat(courseResults);
          }
        });

        filteredResults = this.filterCourseResults(query.WHERE, allCourseResults);
        console.log("# of Matches: " + filteredResults.length);
        console.log("allMatches: " + JSON.stringify(filteredResults));

        // 2. ORDER (from A-Z, from 0, 1, 2,...)
        let orderQueryKey: string = this.getQueryKey(query.ORDER);

        //translate queryKey
        orderQueryKey = this.translateKey(orderQueryKey);
        let orderedResults: IObject[] = this.orderResults(filteredResults, orderQueryKey);
        console.log("orderedResults: " + JSON.stringify(orderedResults));

        // 3. BUILD
        let finalResults: IObject[] = this.buildResults(orderedResults, query)
        console.log("finalResults: " + JSON.stringify(finalResults));

        return {render: query.AS, result: finalResults};

      }  else {
        throw new Error(<string> isValidQuery);
      }
    }

    public filterCourseResults(queryFilter: IFilter, allCourseResults: IObject[]): IObject[] {
      // for each courseResult, add to results array if it matches
      // query conditions
      // translatekey as needed
      let queryFilterMatches: IObject[] = [];

      allCourseResults.forEach((courseResult: IObject) => {
        let queryResult: boolean = this.queryACourseResult(queryFilter, courseResult);
        console.log("course result satisfies query?: " + queryResult);

        if (queryResult !== null) {
          if(queryResult) {
          // add courseResult to matches collection
          queryFilterMatches.push(courseResult);
          console.log("pushed courseResult: " + queryFilterMatches);
          }
        } else {
          throw new Error('No match result returned from queryResult on courseResult!')
        }
      });

      return queryFilterMatches;
    }

    public queryACourseResult(queryFilter: IFilter, courseResult: IObject): boolean {
      // apply query on a result in a Course
      // return true if it matches the query
      //console.log("filtering a  course result: " + JSON.stringify(courseData));
      //console.log("queryfilter: " + JSON.stringify(queryFilter));
      let result: boolean;
      let queryKeys: string[] = Object.keys(queryFilter);

      queryKeys.forEach((queryKey) => {
        let keyValue: IObject;
        let newQueryFilter1: IObject;
        let newQueryFilter2: IObject;
        switch(queryKey) {
          case "AND":
          //console.log("AND case");
          let ANDResult: boolean = true;
          queryFilter.AND.forEach((filter) => {
            ANDResult = ANDResult && this.queryACourseResult(filter, courseResult);
          });
          result = ANDResult;
          break;

          case "OR":
          //console.log("OR case");
          let ORResult: boolean = false;
          queryFilter.OR.forEach((filter) => {
            ORResult = ORResult || this.queryACourseResult(filter, courseResult);
          });
          result = ORResult;
          break;

          case "NOT":
          //console.log("NOT case");
          result = !this.queryACourseResult(queryFilter.NOT, courseResult);
          break;

          case "LT":
          //console.log("LT case");
          result = this.numberCompare(queryFilter.LT, "LT", courseResult);
          break;

          case "GT":
          //console.log("GT case");
          result = this.numberCompare(queryFilter.GT, "GT", courseResult);
          break;

          case "EQ":
          //console.log("EQ case");
          result = this.numberCompare(queryFilter.EQ, "EQ", courseResult);
          break;

          case "IS":
          //console.log("IS case");
          result = this.stringCompare(queryFilter.IS, "IS", courseResult);
          break;

          default:
          //console.log("Default case");
          result = false;
          break;
        }
      });
      return result;
    }

    public numberCompare(queryKeyWithDatasetIDAndValue: IMComparison, operation: string, courseResult: IObject): boolean {
      let queryKeyWithDatasetID: string = this.getStringIndexKVByNumber(queryKeyWithDatasetIDAndValue, 0)["key"];

      let queryKey: string = this.getQueryKey(queryKeyWithDatasetID);
      let queryKeyValue: number = this.getStringIndexKVByNumber(queryKeyWithDatasetIDAndValue, 0)["value"];
      // translate querykey to corresponding datasetkey
      let dataKeyValue: number = courseResult[this.translateKey(queryKey)];
      switch(operation) {

        case "LT":
        console.log(dataKeyValue + " is less than " + queryKeyValue + "?");
        return dataKeyValue < queryKeyValue;

        case "GT":
        console.log(dataKeyValue + " is greater than " + queryKeyValue + "?");
        return dataKeyValue > queryKeyValue;

        case "EQ":
        console.log(dataKeyValue + " is equal to" + queryKeyValue + "?");
        return dataKeyValue == queryKeyValue;

        default:
        return false;
      }
    }

    public stringCompare(queryKeyWithDatasetIDAndValue: ISComparison, operation: string, courseResult: IObject): boolean {
      let queryKeyWithDatasetID: string = this.getStringIndexKVByNumber(queryKeyWithDatasetIDAndValue, 0)["key"];

      let queryKey: string = this.getQueryKey(queryKeyWithDatasetID);
      let queryKeyValue: number = this.getStringIndexKVByNumber(queryKeyWithDatasetIDAndValue, 0)["value"];
      // translate querykey to corresponding datasetkey
      let dataKeyValue: number = courseResult[this.translateKey(queryKey)];
      switch(operation) {

        case "IS":
        console.log(dataKeyValue + " is " + queryKeyValue + "?");
        return dataKeyValue === queryKeyValue;

        default:
        return false;
      }
    }

    public orderResults(filteredResults: IObject[], order: string): IObject[] {
      // implement sort method and pass in method to be able to compare letters
      let orderedResults: IObject[] = filteredResults;
      //check if querykey exists
      if (filteredResults && filteredResults.length > 1 && order && filteredResults[0][order] !== 'undefined') {
        // sort filtered results
        let sortByQueryKey = ((queryKey: string, unsortedResults: IObject[]): IObject[] => {
          console.log("sorting unsorted results: " + JSON.stringify(unsortedResults));
          return unsortedResults.sort((a: IObject, b: IObject) => {
            let aValue = this.lettersNumbersOnlyLowercase(a[queryKey]);
            let bValue = this.lettersNumbersOnlyLowercase(b[queryKey]);
          if(aValue < bValue){
            console.log(aValue + " is less than " + bValue);
              return -1;
          } else if(aValue > bValue){
              console.log(aValue + " is greater than " + bValue);
              return 1;
          }
            console.log(aValue + " is equal to " + bValue);
          return 0;
          });
        });

        orderedResults = sortByQueryKey(order, orderedResults);
      }
      return orderedResults;
    }

    public buildResults(orderedResults: IObject[], query: QueryRequest): IObject[] {
      let finalResults: IObject[] = [];
      //create new objects based on given columns and return format.
      let getQueryKeys: string | string[] = query.GET;
        let translatedQueryKeys: string[] = [];
      //check if there is more than one querykey in GET
      if (getQueryKeys.constructor === Array) {
        let getQueryKeysStringArray: string[] = <string[]> query.GET;
        getQueryKeysStringArray.forEach((key: string) => {
          // strip out datasetID
          key = this.getQueryKey(key);
          translatedQueryKeys.push(this.translateKey(key));
        });
      } else if (typeof(getQueryKeys) === 'string') {
        let getQueryKeysString: string = <string> query.GET;
        // strip out datasetID
        getQueryKeysString = this.getQueryKey(getQueryKeysString);
        translatedQueryKeys.push(this.translateKey(getQueryKeysString));
      }

      if (query.AS === 'TABLE') {
        orderedResults.forEach((result: IObject) => {
          let resultObject: IObject = {};
          translatedQueryKeys.forEach((querykey: string) => {
            // copy over keys and values defined in GET
            resultObject[querykey] = result[querykey];
          });

          finalResults.push(resultObject);
        });
      }

      return finalResults;
    }

    public lettersNumbersOnlyLowercase(input: any): any {
      let result: any = input;
      if (typeof(input) === 'string') {
        result = input.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "");
      }
      return result;
    }
    public getStringIndexKVByNumber(object: IObject, index: number): IObject {
      let keys: string[] = Object.keys(object);
      if (keys && keys.length > index){
        return {
          key: keys[index],
          value: object[keys[index]]
        };
      } else {
        console.log("index greater than number of keys!", "object: " + JSON.stringify(object), "index: " + index);
        return {key: "", value: ""};
      }
    }

    public buildObject(keys: string[], values: IObject[]){
      //length of keys must be equal to the length of values
      let newObject: IObject = {};
      for(let i = 0; i < keys.length; i++){
        if (values[i]) {
          newObject[keys[i]] = values[i];
        }
      }
      return newObject;
    }
    /**
     * Translates the keys in the query to the corresponding keys in the dataset
     * parses department and course id given the key of the current iteration in dataset
     *
     * @param queryKey
     * @param objectKey?
     */
    public translateKey(queryKey: string): string {
      let result: string;

      switch(queryKey) {
        case 'dept':
          result = 'Subject';
          break;

        case 'id':
          result = 'Course';
          break;

        case 'avg':
          result = 'Avg';
          break;

        case 'instructor':
          result = 'Professor';
          break;

        case 'title':
          result = 'Title';
          break;

        case 'pass':
          result = 'Pass';
          break;

        case 'fail':
          result = 'Fail';
          break;

        case 'audit':
          result = 'Audit';
          break;

        default:
          result = 'unknownKey'
          break
      }

      return result;
    }
}
