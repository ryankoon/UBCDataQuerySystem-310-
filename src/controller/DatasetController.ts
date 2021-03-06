/**
 * Created by rtholmes on 2016-09-03.
 */
import Log from "../Util";
import JSZip = require('jszip');
import fs = require('fs');
import path = require('path');
import HtmlParserUtility from './HtmlParserUtility';
import {ASTNode} from "parse5";
import {IBuilding, IRoom} from "./IBuilding";

/**
 * In memory representation of all datasets.
 */
export interface Datasets {
    [id: string]: {};
}
interface responseObject {
    message : string;
    status : Number;
    error : Error;
}
let htmlParsingUtility = new HtmlParserUtility();

export default class DatasetController {
    public testFlag = 0;
    private datasets: Datasets = {};

    constructor() {
        Log.trace('DatasetController::init()');
    }
    /*
        Loads data into memory from disk
     */
    private loadDataIntoMemory(id : string): any {
        return new Promise((fulfill, reject) => {
            var that = this;
            let pathname:string = path.resolve(__dirname, '..', '..','data',id + '.json');
            fs.readFile(pathname, (err, data) => {
                if (err || that.testFlag === 1) {
                    reject(err);
                }
                try {
                    if (that.testFlag === 2) {
                        throw new Error("testFlag set to 2!")
                    } else {
                        // we have a buffer here..sad story
                        // Uint8Array[67]
                        let out = JSON.parse(data.toString('utf8'));
                        that.datasets[id] = out;
                        fulfill(that.datasets[id]);
                    }
                }
                catch(err){
                    reject('Error : ' + err);
                }
            });
        });
    }


    /**
     * Returns the referenced dataset. If the dataset is not in memory, it should be
     * loaded from disk and put in memory. If it is not in disk, then it should return
     * null.
     *
     * @param id
     * @returns {{}}
     */
    public getDataset(id: string): Promise<any> {
        var that = this;
      return new Promise( (fulfill, reject) => {
        Log.trace('Entering getDataset ...');
        //let path:string = __dirname + '/../../data';
          let pathName:string = path.resolve(__dirname, '..', '..', 'data');
        fs.readdir(pathName, (err, files) => {
          if (err || that.testFlag === 1){
            reject("TestFlag: " + that.testFlag + " Error: " + err);
          }
          if (files.indexOf(id + '.json') === -1){
            fulfill(null);
          }
          else {
              that.loadDataIntoMemory(id)
                  .then(function (data: any) {
                      if (that.testFlag === 2) {
                          throw new Error("testFlag set to 2!")
                      } else {
                          fulfill(data);
                      }
                  })
                  .catch(function (err: any) {
                      reject("TestFlag: " + that.testFlag + " Error: " + err);
                  });
          }
        });
      });
    }
    /*
    *@function Should automatically create the data directory if it already doesn't exist. (sigh).
    * @param none
    * @returns Promise<any>
     */
    public createDataDirectory() : Promise<boolean> {
        return new Promise((fulfill,reject) =>{
            let that = this;
            let pathName: string = path.resolve(__dirname, "..", "..", "data");
            fs.stat(pathName, (err, stats) => {
                // if the pathname doesnt exist, stats will be undefined and an error will be passed.
                // annoyingly enough we can't determine more.
                if (err || !stats || that.testFlag === 1) {
                    fs.mkdir(pathName, (err) => {
                        if (err || that.testFlag === 1) {
                            reject(false);
                            Log.error('Error creating the data directory: ' + err);
                        }
                        fulfill(true);
                    })
                }
                else if (that.testFlag === 0 && stats && (stats.isDirectory() || stats.isFile())){
                    fulfill(true);
                }
                else {
                    reject(false);
                }
            });
        });
    }
    /*
    @function Checks disk for id
    @param string
    @returns boolean
     */
    private isDataOnDisk(id:string, pathname:string) : Promise<boolean> {
        return new Promise(function (fulfill, reject) {
            fs.stat(pathname, function (err, stats){
                if (err || !stats) { // then data doesnt exist.
                    fulfill(false);
                }
                if (stats && stats.isFile()){
                    fulfill(true);
                }
                else{ // some weird edge case
                    fulfill(false);
                }
            });
        });
    }
    /*
    @function parses out the last '.ext'.
     */
    public removeExtension(nameWithExtension: string) : string {
        let fileName:string = nameWithExtension.substr(0, nameWithExtension.lastIndexOf('.'));
        return fileName;
    }
    /*
    @function removes files that lead with dot resulting from fs usage.
     */
    public leadingDotCheck(list : Array<any>): Array<any>{
        let newList = list;
        let leadingDotCheck : RegExp = new RegExp('\^\[\.\]', 'g');
        newList.forEach( (item, index) => {
            if (leadingDotCheck.test(item)){
                newList.splice(index, 1);
            }
        });
        return newList;
    }
    /**
    @function: if datasets is empty, load all dataset files in ./data from disk
     Used to have a DataSets return value... but i dont think that's correct...
    */
    public getDatasets(): Promise<Datasets> {
        //setup loadData promise function.
        return new Promise((fulfill, reject) => {
            var that = this;
            let keysArray = Object.keys(that.datasets);
            if (keysArray.length === 0) {
                //let path:string = __dirname + '/../../data';
                let pathName:string = path.resolve(__dirname, '..', '..', 'data');
                // changed from ./data
                fs.readdir(pathName, (err, files) => {
                    if (err || that.testFlag === 1) {
                        Log.error('oh noes an err: ' + err);
                        reject("TestFlag: " + that.testFlag + " Error: " + err);
                    }
                    var promiseArray = new Array();
                    files = that.leadingDotCheck(files);
                    files.forEach((key, index) => {
                        let fileIdName:string = that.removeExtension(key);
                        if (fileIdName.length > 0) {
                            promiseArray.push(that.loadDataIntoMemory(fileIdName));
                        }
                    });
                    Promise.all(promiseArray)
                        .then(() => {
                            if (that.testFlag === 2) {
                                throw new Error("testFlag set to 2!")
                            } else {
                                fulfill(that.datasets);
                            }
                        })
                        .catch((err) => {
                            Log.error('Uhoh promise array failed to resolve: ' + err);
                            reject(err);
                        });
                });

            } else {
                fulfill(that.datasets);
            }
        });
    }

    /**
     * Delete the targeted dataset from memory.
     *
     * Returns: Boolean.
     */
    public deleteDataset(id: string) : Promise<responseObject> {
        return new Promise(function (fulfill, reject) {
            let filePath: string = path.resolve(__dirname, '..', '..', 'data', id + '.json');
            fs.unlink(filePath, (err) => {
                if (err) {
                    let responseObject : responseObject =
                    {status : 404,
                     message : 'the operation was unsuccessful because the delete was for a resource that was not previously PUT.',
                     error : err
                    }
                    reject(responseObject);
                }
                else {
                    // TODO: check maybe here for datasets?
                    if (this && !this.datasets && !this.datasets[id]) {
                        delete this.datasets[id];
                    }
                    let responseObject : responseObject =
                    {status : 204,
                        message : 'the operation was successful.',
                        error : null
                    }
                    fulfill(responseObject);
                }
            });
        });
    }

    // !!! how do we know the ID is new?
    // new is 204
    // old is 201 (prev cached or on the disk).
    // This will determine our Code.
    // I think if the zip ISNT base 64 encoded, we should throw an error.


    /**
     * Process the dataset; save it to disk when complete.
     *
     * @param id
     * @param data base64 representation of a zip file
     * @returns {Promise<Number>} returns true if successful; false if the dataset was invalid (for whatever reason)
     */
    public process(id: string, data: any): Promise<Number> {
      var that = this;
      return new Promise(function (fulfill, reject) {
        try {
            if (that.testFlag === 5) {
                throw new Error("testFlag set to 5!")
            }
            let myZip = new JSZip();
            myZip.loadAsync(data, {base64: true})
                .then(function processZipFile(zip: JSZip) {
                    if (that.testFlag === 4) {
                        throw new Error("testFlag set to 4!")
                    }
                    let processedDataset: {[key: string]: string} = {};
                    Log.trace('DatasetController::process(..) - unzipped');
                    var fileKeys = Object.keys(zip.files);
                    if (fileKeys.length <= 1) {
                        reject('Error this zip has no content in it');
                    }
                    let zipObject = zip.files;
                    let rootFolder: string = Object.keys(zipObject)[0];
                    let filePromises: Promise<any>[] = [];
                    if (fileKeys.indexOf('index.htm') > -1) {
                        zipObject['index.htm'].async('string')
                            .then(data => {
                                let buildingPromise: Promise<IBuilding>;
                                buildingPromise = htmlParsingUtility.intializeHtmlDataStorage(data, zip);
                                return buildingPromise;
                            })
                            .then(result => {
                                return that.createDataDirectory()
                                    .then(()=> {
                                        return that.save(id, result);
                                    });
                            })
                            .then((data: Number) => {
                                if (that.testFlag === 1) {
                                    throw new Error("testFlag set to 1!")
                                } else {
                                    fulfill(data);
                                }
                            })
                            .catch(err => {
                            Log.error('Error handling building promise on save : ' + err);
                            reject(400);
                        });
                    }
                    else {
                        delete zipObject[rootFolder]; // may not satisfy D3.
                        for (let filePath in zipObject) {
                            var fileName: string;
                            var splitPath: Array<string>;
                            var parsedFileName: string;

                            splitPath = zipObject[filePath]['name'].split(rootFolder);
                            // only remove root folder path if file is not in root folder
                            // e.g. list_courses is not in the courses folder
                            if (splitPath[0] == rootFolder) {
                                delete splitPath[0];
                            }

                            parsedFileName = splitPath.join("");

                            let filePromise: Promise<any> = new Promise((yes, reject) => {
                                let file = parsedFileName;
                                zipObject[filePath].async('string')
                                    .then(function storeDataFromFilesInDictionary(data) {
                                        if (that.testFlag === 2) {
                                            throw new Error("testFlag set to 2!")
                                        }
                                        try {
                                            if (that.testFlag === 3) {
                                                throw new Error("testFlag set to 3!")
                                            } else {
                                                processedDataset[file] = JSON.parse(data);
                                                yes();
                                            }
                                        }
                                        catch (err) {
                                            Log.error('Error for the parsing of JSON in Process: ' + err.message);
                                            err.message = 'Error for the parsing of JSON in Process: ' + err.message;
                                            reject(400);
                                        }
                                        // file can now be accessed in dictionary
                                    })
                                    .catch(function errorFromFailingToStoreInDict(err) {
                                        Log.error('Error! : ' + err);
                                        reject(false);
                                    });
                            });

                            filePromises.push(filePromise);
                        }
                        // wait until all files have been processed and stored in dictionary
                        Promise.all(filePromises)
                            .then(() => {
                                return that.createDataDirectory();
                            })
                            .then(() => {
                                return that.save(id, processedDataset);
                            }).then((data: Number) => {
                            fulfill(data);
                        }).catch((err) => {
                            Log.error('Error resolving filepromises... ' + err);
                            reject(400);

                        });
                    }
                })
                .catch(function (err) {
                    Log.trace('DatasetController::process(..) - unzip ERROR: ' + err.message);
                    reject(err);
                });
          }
        catch (err) {
            Log.trace('DatasetController::process(..) - ERROR: ' + err);
            reject(err);
        }
      });
    }

    /**
     * Writes the processed dataset to disk as 'id.json'. The function should overwrite
     * any existing dataset with the same name.
     *
     * @param id
     * @param processedDataset
     */
    public save(id: string, processedDataset: any) : Promise<any> {
        let that = this;
        Log.trace('DatasetController saving zip files to disk ...');
        return new Promise(function (fulfill, reject) {
            let jsonData:string;
            try {
                    jsonData = JSON.stringify(processedDataset);
            }
            catch(err){
                err.message = 'DatasetController save - stringify error : ' + err.message;
                reject(err);
            }
            var dataPath = path.resolve(__dirname, '..', '..','data',id + '.json');
            that.isDataOnDisk(id, dataPath)
            .then(function (isFileOnDisk) {
                    fs.writeFile(dataPath, jsonData, (err) => {
                        if (err) {
                            Log.trace('Writefile error! ' + err);
                            reject(err);
                        }
                        // if in memory, OR, not on DISK, return 204
                        // if not in memory OR not on disk, return 201
                        if (Object.keys(that.datasets).indexOf(id) === -1 && !isFileOnDisk) {
                            that.datasets[id] = processedDataset;
                            fulfill(204);
                        }
                        else {
                            that.datasets[id] = processedDataset;
                            fulfill(201);
                        }
                    });
            }).catch (function (err){
                Log.error('Ruhoh! AN ERROR SHAGGY! ' + err);
            });
        });
    }
  }
