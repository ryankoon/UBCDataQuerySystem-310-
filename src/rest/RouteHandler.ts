/**
 * Created by rtholmes on 2016-06-14.
 */
import restify = require('restify');
import fs = require('fs');

import DatasetController from '../controller/DatasetController';
import {Datasets} from '../controller/DatasetController';
import QueryController from '../controller/QueryController';

import {QueryRequest} from "../controller/QueryController";
import Log from '../Util';

export default class RouteHandler {

    private static datasetController = new DatasetController();

    public static deleteDataset(req: restify.Request, res:restify.Response, next: restify.Next) {
    //    Log.trace('RouteHandler::deleteDataSet(..) - params: ' + JSON.stringify(req.params));
        var id: string = req.params.id;
        try {
            let path: string = "./data/";
            let filePath: string = path + id + ".json";
            fs.unlink(filePath, (err) => {
                if (err) {
                    res.json(404, "The operation was unsuccessful because the delete was for a resource that was not previously PUT. ");
                }
                else {
                    RouteHandler.datasetController.deleteDataset(id);
                    res.json(204, {Message: 'The operation was successful.'});
                }
            });
        }
        catch (err) {
            res.send(400, 'ERROR: ' + err);
        }
    }

    public static getHomepage(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RoutHandler::getHomepage(..)');
        fs.readFile('./src/rest/views/index.html', 'utf8', function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }


    public static putDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace('RouteHandler::postDataset(..) - params: ' + JSON.stringify(req.params));
        try {
            var id: string = req.params.id;
            // stream bytes from request into buffer and convert to base64
            // adapted from: https://github.com/restify/node-restify/issues/880#issuecomment-133485821
            let buffer: any = [];
            req.on('data', function onRequestData(chunk: any) {
               // Log.trace('RouteHandler::postDataset(..) on data; chunk length: ' + chunk.length);
                buffer.push(chunk);
            });

            req.once('end', function () {
                let concated = Buffer.concat(buffer);
                req.body = concated.toString('base64');
              //  Log.trace('RouteHandler::postDataset(..) on end; total length: ' + req.body.length);

                let controller = RouteHandler.datasetController;


                controller.process(id, req.body)
                    .then(function (result) {
             //       Log.trace('RouteHandler::postDataset(..) - processed');
                    fs.stat('./data/' + id + '.json', (err, stats) => {
                        if (err){
                            console.error('Hi i am a fs.stat error : ' + err);
                        }
                        res.json(result, {Message: 'Success!'});
                    });
                }).catch(function (err: Error) {
              //      Log.trace('RouteHandler::postDataset(..) - ERROR: ' + err.message);
                    // format must be : {error :' message '}
                    res.json(400, {error: err.message});
                });
            });

        } catch (err) {
            Log.error('RouteHandler::postDataset(..) - ERROR: ' + err.message);
            res.send(400, {err: err.message});
        }
        return next();
    }

    public static postQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
     //   Log.trace('RouteHandler::postQuery(..) - params: ' + JSON.stringify(req.params));
        try {
            let query: QueryRequest = req.params;
            //let datasets: Datasets = RouteHandler.datasetController.getDatasets();
            let controller = new QueryController();
            let isValid = controller.isValid(query);

            if (isValid === true) {
              let firstGETKey: string = query.GET[0];
              let datasetId: string = controller.getDatasetId(firstGETKey);
              console.log("postQuery getting dataset with datasetId: " + datasetId);
              let dataset: any = RouteHandler.datasetController.getDataset(datasetId)
              .then((dataset: any) => {
                if (dataset) {
                console.log("postQuery got dataset: " + JSON.stringify(dataset));
                controller.setDataset(dataset);
                let result = controller.query(query);
                res.json(200, result);
              } else {
                res.json(424, {missing: [datasetId]});
              }
              });
            } else {
                res.json(400, {status: 'invalid query'});
            }
        } catch (err) {
            Log.error('RouteHandler::postQuery(..) - ERROR: ' + err);
            res.send(403);
        }
        return next();
    }
}
